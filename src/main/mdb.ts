import { ipcMain } from "electron";
import { settings } from "./store";
import { Worker } from "node:worker_threads";
import { withLog } from "./lib";
import workerPath from "./mdb.worker?modulePath";
import type { MDBWorkerData } from "./mdb.worker";
import { channel } from "./channel";

export const getDataFromMDB = async <TRows extends NonNullable<unknown>>(
  data: Payload,
) => {
  const databasePath = settings.get("databasePath");
  if (!databasePath) {
    throw new Error("Database path is not set");
  }

  if (typeof databasePath !== "string") {
    throw new Error("Database path is not a string");
  }

  const result = await new Promise<{
    total: number;
    rows: TRows[];
  }>((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: { ...data, databasePath },
    });
    worker.once("message", (data) => {
      resolve(data);
      worker.terminate();
    });
    worker.once("error", (error) => {
      reject(error);
      worker.terminate();
    });
  });

  return result;
};

export type Payload = Omit<MDBWorkerData, "databasePath">;

export const init = () => {
  ipcMain.handle(
    channel.MDB_READER,
    withLog(async (_, data: Payload) => {
      const result = await getDataFromMDB(data);
      return result;
    }),
  );
};
