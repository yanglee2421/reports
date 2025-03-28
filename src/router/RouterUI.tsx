import {
  createHashRouter,
  Outlet,
  RouteObject,
  RouterProvider,
} from "react-router";
import { AuthLayout } from "@/components/layout";
import React from "react";
import { NprogressBar } from "@/components/NprogressBar";
import {
  useIndexedStore,
  useIndexedStoreHasHydrated,
} from "@/hooks/useIndexedStore";
import { Box, CircularProgress } from "@mui/material";
import { ipcRenderer } from "@/lib/utils";
import * as channel from "@electron/channel";
import dayjs from "dayjs";
import type { Log } from "@/hooks/useIndexedStore";

const LogWrapper = (props: React.PropsWithChildren) => {
  const set = useIndexedStore((s) => s.set);

  React.useEffect(() => {
    const listener = (e: unknown, data: Log) => {
      void e;
      set((d) => {
        // Remove logs that are not today
        d.logs = d.logs.filter((i) =>
          dayjs(i.date).isAfter(dayjs().startOf("day"))
        );

        // Add new log
        d.logs.push(data);

        // Deduplicate logs by id
        const map = new Map<string, Log>();
        d.logs.forEach((i) => {
          map.set(i.id, i);
        });
        d.logs = Array.from(map.values());
      });
    };

    ipcRenderer.on(channel.log, listener);

    return () => {
      ipcRenderer.off(channel.log, listener);
    };
  }, [set]);

  return props.children;
};

export const RootRoute = () => {
  return (
    <>
      <NprogressBar />
      <Outlet />
    </>
  );
};

const renderOutlet = (hasHydrated: boolean) => {
  if (!hasHydrated) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 6,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return <Outlet />;
};

const AuthWrapper = () => {
  const hasHydrated = useIndexedStoreHasHydrated();

  return (
    <AuthLayout>
      <LogWrapper>{renderOutlet(hasHydrated)}</LogWrapper>
    </AuthLayout>
  );
};

const routes: RouteObject[] = [
  {
    id: "root",
    path: "",
    Component: RootRoute,
    children: [
      {
        id: "404",
        path: "*",
        lazy() {
          return import("@/pages/not-found/route");
        },
      },
      {
        id: "auth_layout",
        Component: AuthWrapper,
        children: [
          {
            id: "home",
            index: true,
            lazy: () => import("@/pages/home/route"),
          },
          {
            id: "detection",
            path: "detection",
            lazy: () => import("@/pages/detection/route"),
          },

          {
            id: "quartors",
            path: "quartors",
            lazy: () => import("@/pages/quartors/route"),
          },
          {
            id: "settings",
            path: "settings",
            lazy: () => import("@/pages/settings/route"),
          },
          { id: "log", path: "log", lazy: () => import("@/pages/log/route") },
          {
            id: "hxzy_hmis",
            path: "hxzy_hmis",
            lazy: () => import("@/pages/hxzy_hmis/route"),
          },
          {
            id: "hxzy_hmis_setting",
            path: "hxzy_hmis_setting",
            lazy: () => import("@/pages/hxzy_hmis_setting/route"),
          },
          {
            id: "hxzy_verifies",
            path: "hxzy_verifies",
            lazy: () => import("@/pages/hxzy_verifies/route"),
          },
          {
            id: "jtv_hmis",
            path: "jtv_hmis",
            lazy: () => import("@/pages/jtv_hmis/route"),
          },
        ],
      },
    ],
  },
];

const router = createHashRouter(routes);

export const RouterUI = () => {
  return <RouterProvider router={router} />;
};
