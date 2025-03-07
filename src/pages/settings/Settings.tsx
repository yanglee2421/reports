import {
  useIndexedStore,
  useIndexedStoreHasHydrated,
} from "@/hooks/useIndexedStore";
import {
  BugReportOutlined,
  FileDownloadOutlined,
  FileUploadOutlined,
  FindInPageOutlined,
  SaveOutlined,
} from "@mui/icons-material";
import {
  Card,
  CardContent,
  CardHeader,
  Grid2,
  TextField,
  InputAdornment,
  IconButton,
  CardActions,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  Stack,
  Box,
  useTheme,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import * as channel from "@electron/channel";
import { ipcRenderer, webUtils } from "@/lib/utils";
import { useStore } from "@/hooks/useStore";
import { useSize } from "@/hooks/useSize";
import { queryOptions, useQuery } from "@tanstack/react-query";

const schema = z.object({
  path: z.string().min(1),
  dsn: z.string().min(1),
  refetchInterval: z.number().int().positive(),
});

const SettingsForm = () => {
  const [currentTab, setCurrentTab] = React.useState("database");

  const formId = React.useId();

  const [isPending, startTransition] = React.useTransition();

  const settings = useIndexedStore((s) => s.settings);
  const set = useIndexedStore((s) => s.set);
  const form = useForm({
    defaultValues: {
      path: settings.databasePath,
      dsn: settings.databaseDsn,
      refetchInterval: settings.refetchInterval,
    },

    resolver: zodResolver(schema),
  });
  const setMsg = useStore((s) => s.set);

  const renderDatabaseSetting = () => {
    return (
      <>
        <CardContent>
          <form
            id={formId}
            action={() =>
              form.handleSubmit((data) => {
                set((d) => {
                  d.settings.databasePath = data.path;
                  d.settings.databaseDsn = data.dsn;
                  d.settings.refetchInterval = data.refetchInterval;
                });
                setMsg((d) => {
                  d.msg = "Save successfully!";
                });
              }, console.error)()
            }
            onReset={() => form.reset()}
          >
            <Grid2 container spacing={6}>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Controller
                  control={form.control}
                  name="path"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      fullWidth
                      label="Database"
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton component="label">
                                <input
                                  type="file"
                                  accept="application/msaccess,application/vnd.ms-access,.mdb,.accdb"
                                  hidden
                                  value={""}
                                  onChange={(e) => {
                                    const file = e.target.files?.item(0);
                                    if (!file) return;

                                    field.onChange(
                                      webUtils.getPathForFile(file)
                                    );
                                  }}
                                />
                                <FindInPageOutlined />
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  )}
                />
              </Grid2>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Controller
                  control={form.control}
                  name="dsn"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      fullWidth
                      label="ODBC DSN"
                    />
                  )}
                />
              </Grid2>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Controller
                  control={form.control}
                  name="refetchInterval"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      onChange={(e) => {
                        const eVal = e.target.value;

                        if (eVal === "") {
                          field.onChange(eVal);
                          return;
                        }

                        const val = Number(eVal);

                        if (Number.isNaN(val)) {
                          field.onChange(eVal);
                        } else {
                          field.onChange(val);
                        }
                      }}
                      onBlur={(e) => {
                        field.onBlur();
                        field.onChange(
                          Number.parseInt(e.target.value, 10) || ""
                        );
                      }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      fullWidth
                      label="Refetch Interval"
                      slotProps={{ htmlInput: { inputMode: "numeric" } }}
                      placeholder="2000"
                    />
                  )}
                />
              </Grid2>
            </Grid2>
          </form>
        </CardContent>
        <CardActions>
          <Button type="submit" form={formId} startIcon={<SaveOutlined />}>
            Save
          </Button>
          <Button component="label" startIcon={<FileDownloadOutlined />}>
            <input
              type="file"
              accept="application/json,.json"
              hidden
              value={""}
              onChange={(e) => {
                const file = e.target.files?.item(0);
                if (!file) return;
                const reader = new FileReader();

                reader.onload = (e) => {
                  console.log(e.target?.result);
                };

                reader.readAsText(file);
              }}
            />
            Import
          </Button>
          <Button
            onClick={() => {
              // 创建 JSON 数据
              const data = useIndexedStore.getState();
              const version = useIndexedStore.persist.getOptions().version || 0;

              // 将 JSON 数据转换为字符串
              const jsonString = JSON.stringify(data, null, 2);

              // 创建 Blob 对象
              const blob = new Blob([jsonString], {
                type: "application/json",
              });

              // 创建下载链接
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = `backup-v${version}.json`; // 下载的文件名

              // 触发下载
              document.body.appendChild(link); // 将链接添加到 DOM
              link.click(); // 自动点击链接
              document.body.removeChild(link); // 下载后移除链接
            }}
            startIcon={<FileUploadOutlined />}
          >
            export
          </Button>
        </CardActions>
      </>
    );
  };

  const renderHmisSetting = () => {
    return (
      <>
        <CardContent>
          <Grid2 container spacing={6}>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="IP" />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="PORT" />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="单位码" />
            </Grid2>
          </Grid2>
        </CardContent>
        <CardActions>
          <Button startIcon={<SaveOutlined />}>Save</Button>
        </CardActions>
      </>
    );
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case "database":
        return renderDatabaseSetting();
      case "hmis":
        return renderHmisSetting();
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader
        title="Settings"
        action={
          <IconButton
            disabled={isPending}
            onClick={() => {
              startTransition(() => ipcRenderer.invoke(channel.openDevTools));
            }}
          >
            <BugReportOutlined />
          </IconButton>
        }
      />
      <Tabs
        value={currentTab}
        onChange={(e, val) => {
          void e;
          setCurrentTab(val);
        }}
        variant="scrollable"
      >
        <Tab label="Database" value="database" />
        <Tab label="HMIS" value="hmis" />
      </Tabs>
      {renderTabContent()}
    </Card>
  );
};
// Joney
type Mem = { totalmem: number; freemem: number };
const fetchMem = () =>
  queryOptions<Mem>({
    queryKey: [channel.mem],
    async queryFn() {
      const data = await ipcRenderer.invoke(channel.mem);
      return data;
    },
    networkMode: "offlineFirst",
  });

const minmax = (val: number, min: number, max: number) =>
  Math.min(max, Math.max(min, val));

const MemCard = () => {
  const [data, setData] = React.useState<Mem[]>([]);
  const [cursorX, setCursorX] = React.useState(0);
  const [showCursor, setShowCursor] = React.useState(false);

  const divRef = React.useRef(null);

  const theme = useTheme();
  const [size] = useSize(divRef);
  const mem = useQuery({
    ...fetchMem(),
    refetchInterval: 200,
    refetchIntervalInBackground: false,
  });

  const width = size?.contentBoxSize.at(0)?.inlineSize || 0;
  const height = 300;

  React.useEffect(() => {
    if (!mem.data) return;

    React.startTransition(() => setData((p) => [...p, mem.data].slice(-width)));
  }, [mem.data, width]);

  const handleCursorChange = (e: React.PointerEvent<HTMLDivElement>) => {
    const hasCapture = e.currentTarget.hasPointerCapture(e.pointerId);
    setShowCursor(hasCapture);

    if (!hasCapture) {
      setCursorX(0);
      return;
    }

    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    setCursorX(minmax(x, 0, width));
  };

  const renderAxis = () => {
    if (!mem.isSuccess) return null;

    return (
      <g>
        <line stroke={theme.palette.divider} x1={0} y1={0} x2={0} y2={height} />
        <line
          stroke={theme.palette.divider}
          x1={0}
          y1={height}
          x2={width}
          y2={height}
        />
        <text
          x={12}
          y={0 + 9}
          z={100}
          fill={theme.palette.action.disabled}
          font-size="12"
          height={9}
        >
          100% ({Number(mem.data.totalmem / 1024 ** 3).toFixed(1) + "G"})
        </text>
        <text
          x={12}
          y={height / 2}
          fill={theme.palette.action.disabled}
          font-size="12"
          z={100}
        >
          50%
        </text>
        <text
          x={12}
          y={height / 4}
          z={100}
          fill={theme.palette.action.disabled}
          font-size="12"
        >
          75%
        </text>
        <text
          x={12}
          y={(height / 4) * 3}
          z={100}
          fill={theme.palette.action.disabled}
          font-size="12"
        >
          25%
        </text>
        <circle cx={0} cy={height} r={4} fill={theme.palette.error.main} />
      </g>
    );
  };

  const renderMemVal = (x: number) => {
    if (!mem.isSuccess) return null;

    const totalmem = mem.data.totalmem;
    const freemem = data.find((i, idx) => {
      void i;
      return Object.is(idx, Math.floor(x));
    })?.freemem;

    if (!freemem) return null;

    const val = totalmem - freemem;

    return (val / 1024 ** 3).toFixed(2);
  };

  const renderCursor = () => {
    if (!showCursor) return null;

    return (
      <g>
        <line
          x1={cursorX}
          x2={cursorX}
          y1={0}
          y2={height}
          stroke={theme.palette.error.main}
          strokeWidth={1}
        />
        <text x={cursorX + 12} y={64} fill={theme.palette.error.main}>
          {renderMemVal(cursorX)}
        </text>
      </g>
    );
  };

  return (
    <Card>
      <CardHeader
        title="Memory"
        action={<Button>{renderMemVal(data.length - 1)}</Button>}
      />
      <CardContent>
        <Box ref={divRef} sx={{ position: "relative", height }}>
          <svg
            height={height}
            width={width}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            {renderAxis()}
            <polyline
              points={data
                .map(
                  (i, idx) =>
                    `${idx},${Math.floor((i.freemem / i.totalmem) * height)}`
                )
                .join(" ")}
              fill="none"
              pointsAtZ={50}
              z={50}
              stroke={theme.palette.primary.main}
              strokeWidth={1}
            />
            {renderCursor()}
          </svg>
          <Box
            sx={{
              touchAction: "none",
              position: "absolute",
              zIndex: (t) => t.zIndex.modal,
              inset: 0,
            }}
            onPointerDown={(e) => {
              if (!e.isPrimary) return;

              e.currentTarget.setPointerCapture(e.pointerId);
              handleCursorChange(e);
            }}
            onPointerMove={handleCursorChange}
            onPointerUp={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId);
              handleCursorChange(e);
            }}
          ></Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export const Settings = () => {
  const hasHydrated = useIndexedStoreHasHydrated();
  if (!hasHydrated) {
    return <CircularProgress />;
  }

  return (
    <Stack spacing={6}>
      <SettingsForm />
      <MemCard />
    </Stack>
  );
};
