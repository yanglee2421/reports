import { contextBridge, ipcRenderer, webUtils } from "electron";
import * as channel from "./channel";
import type { Log } from "@/hooks/useIndexedStore";
import type {
  GetDataFromAccessDatabaseParams,
  Verify,
  VerifyData,
} from "@/api/database_types";
import type { AutoInputToVCParams } from "@/api/autoInput_types";
import type {
  GetRequest,
  GetResponse,
  PostResponse,
  SaveDataParams,
  UploadVerifiesParams,
} from "#/electron/hxzy_hmis";

type LogCallback = (data: Log) => void;
type SubscribeLog = (callback: LogCallback) => () => void;
type GetMem = () => Promise<{ totalmem: number; freemem: number }>;

const subscribeLog: SubscribeLog = (callback) => {
  const listener = (event: Electron.IpcRendererEvent, data: Log) => {
    // Prevent unused variable warning
    void event;
    callback(data);
  };

  ipcRenderer.on(channel.log, listener);

  return () => {
    ipcRenderer.off(channel.log, listener);
  };
};

const getPathForFile = (file: File) => {
  return webUtils.getPathForFile(file);
};

const openDevTools = () => {
  ipcRenderer.invoke(channel.openDevTools);
};

const getMem: GetMem = async () => {
  const data = await ipcRenderer.invoke(channel.mem);
  return data;
};

const getDataFromAccessDatabase = async <TRecord = unknown>(
  params: GetDataFromAccessDatabaseParams
) => {
  const data = await ipcRenderer.invoke(
    channel.getDataFromAccessDatabase,
    params
  );
  return data as TRecord[];
};

const autoInputToVC = async (params: AutoInputToVCParams) => {
  const data: string = await ipcRenderer.invoke(channel.autoInputToVC, params);
  return data;
};

const hxzy_hmis_get_data = async (params: GetRequest) => {
  const data = await ipcRenderer.invoke(channel.hxzy_hmis_get_data, params);
  return data as GetResponse;
};

const hxzy_hmis_save_data = async (params: SaveDataParams) => {
  const data = await ipcRenderer.invoke(channel.hxzy_hmis_save_data, params);
  return data as { result: PostResponse; dhs: string[] };
};

const hxzy_hmis_upload_verifies = async (params: UploadVerifiesParams) => {
  const data = await ipcRenderer.invoke(
    channel.hxzy_hmis_upload_verifies,
    params
  );
  return data as {
    verifies: Verify;
    verifiesData: VerifyData[];
  };
};

type ElectronAPI = {
  subscribeLog: SubscribeLog;
  getPathForFile: typeof getPathForFile;
  openDevTools: typeof openDevTools;
  getMem: GetMem;
  getDataFromAccessDatabase: typeof getDataFromAccessDatabase;
  autoInputToVC: typeof autoInputToVC;
  hxzy_hmis_get_data: typeof hxzy_hmis_get_data;
  hxzy_hmis_save_data: typeof hxzy_hmis_save_data;
  hxzy_hmis_upload_verifies: typeof hxzy_hmis_upload_verifies;
};

const electronAPI: ElectronAPI = {
  subscribeLog,
  getPathForFile,
  openDevTools,
  getMem,
  getDataFromAccessDatabase,
  autoInputToVC,
  hxzy_hmis_get_data,
  hxzy_hmis_save_data,
  hxzy_hmis_upload_verifies,
};

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("electronAPI", electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }

  // interface ImportMeta {
  //   myname: string;
  // }

  // interface ImportMetaEnv {
  //   myname: string;
  // }
}
