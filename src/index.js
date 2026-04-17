const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const Store = require("electron-store");
const ExcelJS = require("exceljs");

const store = new Store();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
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
  mainWindow.loadFile(path.join(__dirname, "index.html"));
};

// IPC: return the currently stored root folder
ipcMain.handle("get-root-folder", () => {
  return store.get("rootFolder", null);
});

// IPC: open a folder picker, persist and return the chosen path
ipcMain.handle("choose-root-folder", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
    title: "Choose root folder",
  });
  if (canceled || filePaths.length === 0) return null;
  store.set("rootFolder", filePaths[0]);
  return filePaths[0];
});

// IPC: list the contents of a folder (excluding dotfiles)
ipcMain.handle("list-folder", async (_event, folderPath) => {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  return entries
    .filter((e) => !e.name.startsWith(".") && !e.name.startsWith("~$"))
    .map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      ext: e.isDirectory() ? null : path.extname(e.name).toLowerCase().slice(1),
    }))
    .sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
});

// MIME type map for encodingFormat
const MIME_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  aac: "audio/aac",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  webm: "video/webm",
  pdf: "application/pdf",
  txt: "text/plain",
  html: "text/html",
  css: "text/css",
  js: "text/javascript",
  json: "application/json",
  xml: "application/xml",
  md: "text/markdown",
  zip: "application/zip",
  gz: "application/gzip",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

// IPC: populate (or replace) the "Files" sheet in archive.xlsx
ipcMain.handle("populate-files-tab", async (_event, folderPath, rootFolder) => {
  const xlsxPath = path.join(folderPath, "archive.xlsx");

  // Read all direct children of the folder
  const allEntries = await fs.readdir(folderPath, { withFileTypes: true });
  const files = allEntries.filter(
    (e) =>
      e.isFile() &&
      !e.name.startsWith(".") &&
      !e.name.startsWith("~$") &&
      e.name !== "archive.xlsx",
  );

  // Build rows
  const rows = await Promise.all(
    files.map(async (e) => {
      const filePath = path.join(folderPath, e.name);
      const stat = await fs.stat(filePath);
      const relPath = path
        .relative(rootFolder, filePath)
        .split(path.sep)
        .join("/");
      const ext = path.extname(e.name).toLowerCase().slice(1);
      return {
        "@id": relPath,
        "@type": "File",
        contentSize: stat.size,
        dateCreated: stat.birthtime.toISOString(),
        dateModified: stat.mtime.toISOString(),
        encodingFormat: MIME_TYPES[ext] || "",
      };
    }),
  );

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);

  // Remove existing "Files" sheet if present, then add a fresh one
  const existing = workbook.getWorksheet("Files");
  if (existing) workbook.removeWorksheet(existing.id);
  const sheet = workbook.addWorksheet("Files");

  const COLUMNS = [
    "@id",
    "@type",
    "contentSize",
    "dateCreated",
    "dateModified",
    "encodingFormat",
  ];
  sheet.columns = COLUMNS.map((key) => ({ header: key, key }));

  // Style header row: 16pt bold
  const headerRow = sheet.getRow(1);
  headerRow.font = { size: 16, bold: true };
  headerRow.commit();

  // Add data rows with 16pt font
  for (const row of rows) {
    const r = sheet.addRow(row);
    r.font = { size: 16 };
    r.commit();
  }

  // Auto-fit column widths based on content
  sheet.columns.forEach((col) => {
    let maxLen = col.header ? col.header.length : 0;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const val = cell.value == null ? "" : String(cell.value);
      if (val.length > maxLen) maxLen = val.length;
    });
    col.width = maxLen + 2;
  });

  await workbook.xlsx.writeFile(xlsxPath);
  return { count: rows.length };
});

// IPC: read a named sheet from an xlsx file, returning headers + rows
// IPC: update a single row in a named sheet by 1-based data row index
ipcMain.handle(
  "update-sheet-row",
  async (_event, xlsxPath, rowIndex, updatedValues) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(xlsxPath);
    const sheet = workbook.getWorksheet("Items");
    if (!sheet) throw new Error("Items sheet not found");

    // rowIndex is 0-based data row; +2 to skip header and account for 1-based Excel rows
    const excelRow = sheet.getRow(rowIndex + 2);
    const headerRow = sheet.getRow(1);

    headerRow.eachCell((cell, colNumber) => {
      const key = String(cell.value ?? "");
      if (Object.prototype.hasOwnProperty.call(updatedValues, key)) {
        excelRow.getCell(colNumber).value = updatedValues[key];
      }
    });
    excelRow.font = { size: 16 };
    excelRow.commit();

    await workbook.xlsx.writeFile(xlsxPath);

    // Return the full updated row as a header→value map
    const result = {};
    headerRow.eachCell((cell, colNumber) => {
      result[String(cell.value ?? "")] =
        excelRow.getCell(colNumber).value ?? "";
    });
    return result;
  },
);

ipcMain.handle("read-sheet", async (_event, xlsxPath, sheetName) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) return null;

  const allRows = [];
  sheet.eachRow((row) => {
    allRows.push(row.values.slice(1)); // drop the 1-based empty first element
  });
  if (allRows.length === 0) return { headers: [], rows: [] };
  const [headers, ...rows] = allRows;
  return { headers, rows };
});

// IPC: return stat metadata for a file or folder
ipcMain.handle("get-file-info", async (_event, filePath) => {
  const stat = await fs.stat(filePath);
  return {
    size: stat.size,
    birthtime: stat.birthtime.toISOString(),
    mtime: stat.mtime.toISOString(),
  };
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
