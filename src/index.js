const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const Store = require("electron-store");

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
