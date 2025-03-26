import { app, BrowserWindow, ipcMain, shell } from "electron";
// import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as channel from "./channel";
import dayjs from "dayjs";
import {
  throwError,
  getCpuSerial,
  getMotherboardSerial,
  runWinword,
  execFileAsync,
} from "./lib";

// const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },

    autoHideMenuBar: false,

    width: 1024,
    height: 768,
  });

  win.menuBarVisible = false;

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    console.log("did-finish-load");
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);

ipcMain.handle(channel.openDevTools, () => {
  if (!win) return;
  win.webContents.openDevTools();
});

ipcMain.handle(channel.openPath, async (e, path: string) => {
  void e;
  const data = await shell.openPath(path);
  return data;
});

ipcMain.handle(channel.getActivateInfo, async () => {
  try {
    const [cpu, motherboard] = await Promise.all([
      getCpuSerial(),
      getMotherboardSerial(),
    ]);

    return [cpu, motherboard].join("");
  } catch (error) {
    throwError(error);
  }
});

ipcMain.handle(channel.printer, async (e, data: string) => {
  void e;
  try {
    const cp = await runWinword(data).catch(() => shell.openPath(data));
    return cp;
  } catch (error) {
    throwError(error);
  }
});

ipcMain.handle(channel.queryVerifies, async () => {
  const startDate = dayjs().year(2023).month(5).date(7).startOf("day");
  const endDate = dayjs().year(2023).month(5).date(7).endOf("day");
  const start = startDate.format("YYYY/MM/DD HH:mm:ss");
  const end = endDate.format("YYYY/MM/DD HH:mm:ss");

  const query = `SELECT * FROM quartors WHERE tmnow BETWEEN #${start}# AND #${end}#`;

  const exePath = "";

  try {
    const data = await execFileAsync(exePath, ["", query]);

    return { rows: [], data };
  } catch (e) {
    throwError(e);
  }
});

ipcMain.handle(channel.mem, async () => {
  const processMemoryInfo = await process.getProcessMemoryInfo();
  const freemem = processMemoryInfo.residentSet;

  return {
    totalmem: process.getSystemMemoryInfo().total,
    freemem,
  };
});
