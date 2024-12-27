import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, constants } from "node:fs/promises";
import "@electron/log";
import { queryQuartors, queryVerifies } from "./channel";

const require = createRequire(import.meta.url);
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
  });

  win.setMenu(null);

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send(
      "main-process-message",
      "init msg",
    );
  });

  if (import.meta.env.DEV) {
    win.webContents.openDevTools();
  }

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

const winword_32 =
  "C:\\Program Files (x86)\\Microsoft Office\\Office16\\WINWORD.EXE";
const winword_64 =
  "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE";
const winword365_32 =
  "C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\WINWORD.EXE";
const winword365_64 =
  "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE";

const execFileP = promisify(execFile);
const execP = promisify(exec);

const getWinword = async (path: string) => {
  await access(path, constants.R_OK);
  return path;
};

const runWinword = async (data: string) => {
  const winwords = await Promise.allSettled([
    getWinword(winword_32),
    getWinword(winword_64),
    getWinword(winword365_32),
    getWinword(winword365_64),
  ]);

  const winword = winwords.find((i) => i.status === "fulfilled")?.value;

  if (!winword) {
    throw new Error("Find winword failed");
  }

  const cp = await execFileP(
    winword,
    [
      data,
      "/save",
      "/q",
      "/pxslt",
      "/a",
      "/mFilePrint",
      "/mFileCloseOrExit",
      "/n",
      "/w",
      "/x",
    ],
    { windowsVerbatimArguments: false, shell: false },
  );
  return cp;
};

ipcMain.on("printer", async (e, data: string) => {
  console.log(data);

  try {
    const cp = await runWinword(data).catch(() => execP(`start ${data}`));

    console.log(cp);
  } catch (error) {
    console.log(error);
  } finally {
    e.sender.send(
      "printer-standby",
    );
  }
});

// 连接 Access 数据库（.mdb 或 .accdb）
const connectionString = (path: string, password: string) =>
  `DSN=MS Access Database;Driver={Microsoft Access Driver (*.mdb)};DBQ=${path};PWD=${password}`;

const odbc: typeof import("odbc") = require("odbc");
const dbPwd = "Joney";
const dbPath = "D:\\数据12\\local.mdb";

ipcMain.on(queryQuartors, async (e) => {
  const connection = await odbc.connect(connectionString(dbPath, dbPwd));
  const quartors = await connection.query("SELECT * FROM quartors");

  e.sender.send(
    queryQuartors,
    { data: { rows: quartors }, errors: null },
  );

  await connection.close();
});

ipcMain.on(queryVerifies, async (e) => {
  const connection = await odbc.connect(connectionString(dbPath, dbPwd));
  const quartors = await connection.query("SELECT * FROM verifies");

  e.sender.send(
    queryVerifies,
    { data: { rows: quartors }, errors: null },
  );

  await connection.close();
});
