import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  protocol,
  shell,
} from "electron";
import path from "node:path";
import fs from "node:fs";
import * as XLSX from "xlsx";
import started from "electron-squirrel-startup";

// Must be called before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "localfile", privileges: { secure: true, supportFetchAPI: true } },
]);
import Store from "electron-store";

const store = new Store();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  protocol.handle("localfile", (request) => {
    return net.fetch(request.url.replace(/^localfile:/, "file:"));
  });
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("list-folder", async (_event, folderPath: string) => {
  const dirents = await fs.promises.readdir(folderPath, {
    withFileTypes: true,
  });
  const entries = dirents
    .filter((d) => !d.name.startsWith(".") && !d.name.startsWith("~$"))
    .map((d) => {
      const isDirectory = d.isDirectory();
      const ext = isDirectory
        ? ""
        : path.extname(d.name).slice(1).toLowerCase();
      return { name: d.name, isDirectory, ext };
    });
  entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return entries;
});

ipcMain.handle("get-file-info", async (_event, filePath: string) => {
  const stat = await fs.promises.stat(filePath);
  return {
    size: stat.size,
    birthtime: stat.birthtime.toISOString(),
    mtime: stat.mtime.toISOString(),
  };
});

ipcMain.handle(
  "read-sheet",
  async (_event, xlsxPath: string, sheetName: string) => {
    try {
      const buf = await fs.promises.readFile(xlsxPath);
      const workbook = XLSX.read(buf);
      const actualName = workbook.SheetNames.find(
        (n) => n.toLowerCase() === sheetName.toLowerCase(),
      );
      if (!actualName) return null;
      const sheet = workbook.Sheets[actualName];
      const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
      });
      if (rows.length === 0) return { headers: [], rows: [] };
      const [headerRow, ...dataRows] = rows;
      const headers = headerRow.map((h) => String(h ?? ""));
      const data = dataRows.map((r) =>
        headers.map((_, i) => String(r[i] ?? "")),
      );
      return { headers, rows: data };
    } catch (err) {
      console.error("read-sheet error:", err);
      return null;
    }
  },
);

ipcMain.handle("get-sheet-names", async (_event, xlsxPath: string) => {
  const buf = await fs.promises.readFile(xlsxPath);
  const workbook = XLSX.read(buf);
  return workbook.SheetNames;
});

ipcMain.handle(
  "update-sheet-row",
  async (
    _event,
    xlsxPath: string,
    sheetName: string,
    rowIndex: number,
    updatedValues: Record<string, string>,
  ) => {
    const buf = await fs.promises.readFile(xlsxPath);
    const workbook = XLSX.read(buf);
    const actualName = workbook.SheetNames.find(
      (n) => n.toLowerCase() === sheetName.toLowerCase(),
    );
    if (!actualName) throw new Error(`No ${sheetName} sheet found`);
    const sheet = workbook.Sheets[actualName];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    });
    const headers = rows[0].map((h) => String(h ?? ""));
    const dataRowIndex = rowIndex + 1; // +1 for header
    if (!rows[dataRowIndex]) rows[dataRowIndex] = headers.map(() => "");
    for (const [key, value] of Object.entries(updatedValues)) {
      const col = headers.indexOf(key);
      if (col !== -1) rows[dataRowIndex][col] = value;
    }
    const newSheet = XLSX.utils.aoa_to_sheet(rows);
    workbook.Sheets[actualName] = newSheet;
    await fs.promises.writeFile(
      xlsxPath,
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    );
    return rows[dataRowIndex].map((v) => String(v ?? ""));
  },
);

ipcMain.handle(
  "populate-files-tab",
  async (_event, folder: string, rootFolder: string) => {
    const dirents = await fs.promises.readdir(folder, { withFileTypes: true });
    const files = dirents.filter(
      (d) =>
        !d.isDirectory() && !d.name.startsWith(".") && !d.name.startsWith("~$"),
    );
    const fileRows = await Promise.all(
      files.map(async (d) => {
        const filePath = path.join(folder, d.name);
        const stat = await fs.promises.stat(filePath);
        const rel = filePath.slice(rootFolder.length).replace(/^[\\/]/, "");
        return [d.name, rel, stat.size, stat.mtime.toISOString()];
      }),
    );
    const sheetData = [["Filename", "Path", "Size", "Modified"], ...fileRows];
    let workbook: XLSX.WorkBook;
    try {
      const buf = await fs.promises.readFile(folder + "/archive.xlsx");
      workbook = XLSX.read(buf);
    } catch {
      workbook = XLSX.utils.book_new();
    }
    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    if (workbook.SheetNames.includes("Files")) {
      workbook.Sheets["Files"] = sheet;
    } else {
      XLSX.utils.book_append_sheet(workbook, sheet, "Files");
    }
    await fs.promises.writeFile(
      folder + "/archive.xlsx",
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    );
    return { count: files.length };
  },
);

ipcMain.handle(
  "create-archive",
  async (
    _event,
    folderPath: string,
    meta: { name: string; description: string },
  ) => {
    const xlsxPath = folderPath + "/archive.xlsx";
    const workbook = XLSX.utils.book_new();
    const rootDataset = XLSX.utils.aoa_to_sheet([
      ["Name", "Value"],
      ["@id", "./"],
      ["@type", "[Dataset, RepositoryCollection]"],
      ["name", meta.name],
      ["description", meta.description],
    ]);
    XLSX.utils.book_append_sheet(workbook, rootDataset, "RootDataset");
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([]),
      "Items",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([]),
      "Files",
    );
    await fs.promises.writeFile(
      xlsxPath,
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    );
    return { path: xlsxPath };
  },
);

ipcMain.handle(
  "add-sheet-row",
  async (
    _event,
    xlsxPath: string,
    sheetName: string,
    values: Record<string, string>,
  ) => {
    const buf = await fs.promises.readFile(xlsxPath);
    const workbook = XLSX.read(buf);
    const actualName = workbook.SheetNames.find(
      (n) => n.toLowerCase() === sheetName.toLowerCase(),
    );
    if (!actualName) throw new Error(`No ${sheetName} sheet found`);
    const sheet = workbook.Sheets[actualName];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    });
    const headers = (rows[0] ?? []).map((h) => String(h ?? ""));
    const newRow = headers.map((h) => values[h] ?? "");
    rows.push(newRow);
    workbook.Sheets[actualName] = XLSX.utils.aoa_to_sheet(rows);
    await fs.promises.writeFile(
      xlsxPath,
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    );
    return newRow;
  },
);

ipcMain.handle(
  "update-root-dataset",
  async (_event, xlsxPath: string, updates: Record<string, string>) => {
    const buf = await fs.promises.readFile(xlsxPath);
    const workbook = XLSX.read(buf);
    const actualName = workbook.SheetNames.find(
      (n) => n.toLowerCase() === "rootdataset",
    );
    if (!actualName) throw new Error("No RootDataset sheet found");
    const sheet = workbook.Sheets[actualName];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    });
    for (const row of rows) {
      const key = String(row[0] ?? "");
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        row[1] = updates[key];
      }
    }
    workbook.Sheets[actualName] = XLSX.utils.aoa_to_sheet(rows);
    await fs.promises.writeFile(
      xlsxPath,
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    );
    const updated: string[][] = XLSX.utils.sheet_to_json(
      workbook.Sheets[actualName],
      { header: 1, defval: "" },
    );
    const [headerRow, ...dataRows] = updated;
    const headers = (headerRow ?? []).map((h) => String(h ?? ""));
    return {
      headers,
      rows: dataRows.map((r) => headers.map((_, i) => String(r[i] ?? ""))),
    };
  },
);

ipcMain.handle("get-root-folder", () => {
  return store.get("rootFolder", null);
});

ipcMain.handle("choose-root-folder", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win.focus();
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
    title: "Choose root folder",
  });
  if (canceled || filePaths.length === 0) return null;
  store.set("rootFolder", filePaths[0]);
  return filePaths[0];
});

ipcMain.handle("create-places-folder", async (_event, rootFolder: string) => {
  const folderPath = path.join(rootFolder, "Places");
  await fs.promises.mkdir(folderPath, { recursive: true });
  const xlsxPath = path.join(folderPath, "archive.xlsx");
  const workbook = XLSX.utils.book_new();
  const rootDataset = XLSX.utils.aoa_to_sheet([
    ["Name", "Value"],
    ["@id", "./"],
    ["@type", "[Dataset, RepositoryCollection]"],
    ["name", "Places"],
    ["description", ""],
  ]);
  XLSX.utils.book_append_sheet(workbook, rootDataset, "RootDataset");
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([["@id", "@type", "name", "description"]]),
    "Items",
  );
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "Files");
  const localitiesSheet = XLSX.utils.aoa_to_sheet([
    ["@id", "@type", ".latitude", ".longitude", "asWKT"],
  ]);
  XLSX.utils.book_append_sheet(workbook, localitiesSheet, "Localities");
  await fs.promises.writeFile(
    xlsxPath,
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
  );
  return { path: folderPath };
});

ipcMain.handle(
  "create-people-orgs-folder",
  async (_event, rootFolder: string) => {
    const folderPath = path.join(rootFolder, "People & Organisations");
    await fs.promises.mkdir(folderPath, { recursive: true });
    const xlsxPath = path.join(folderPath, "archive.xlsx");
    const workbook = XLSX.utils.book_new();
    const peopleSheet = XLSX.utils.aoa_to_sheet([
      ["@id", "@type", "name", "givenName", "familyName", "email", "url"],
    ]);
    XLSX.utils.book_append_sheet(workbook, peopleSheet, "People");
    await fs.promises.writeFile(
      xlsxPath,
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    );
    return { path: folderPath };
  },
);

ipcMain.handle("open-file", async (_event, filePath: string) => {
  return shell.openPath(filePath);
});

ipcMain.handle("show-in-finder", (_event, filePath: string) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle("delete-file", async (_event, filePath: string) => {
  await fs.promises.unlink(filePath);
});
