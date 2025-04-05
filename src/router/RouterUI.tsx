import {
  queryOptions,
  usePrefetchQuery,
  useQuery,
} from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { useSnackbar } from "notistack";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  useTheme,
  GlobalStyles,
  Alert,
  AlertTitle,
  Typography,
} from "@mui/material";
import {
  ContentCopyOutlined,
  FindInPageOutlined,
  HomeOutlined,
} from "@mui/icons-material";
import {
  createHashRouter,
  RouteObject,
  RouterProvider,
  Outlet,
  useNavigation,
  useRouteError,
  isRouteErrorResponse,
  Link,
} from "react-router";
import NProgress from "nprogress";
import { useIndexedStore } from "@/hooks/useIndexedStore";
import { queryClient } from "@/lib/constants";
import { Loading } from "@/components/Loading";
import { AuthLayout } from "./layout";
import { getSerialFromStdout } from "@/lib/utils";

const motherboardSerial = window.electronAPI.getMotherboardSerial();

const activationSchema = z.object({
  activationCode: z.string().min(1, "激活码不能为空"),
});

const useActivationForm = () =>
  useForm({
    defaultValues: {
      activationCode: "",
    },
    resolver: zodResolver(activationSchema),
  });

const ActivationForm = () => {
  const motherboardSerialString = React.use(motherboardSerial);

  const formId = React.useId();

  const [isPending, startTransition] = React.useTransition();

  const snackbar = useSnackbar();
  const form = useActivationForm();
  const set = useIndexedStore((s) => s.set);

  const code = getSerialFromStdout(motherboardSerialString);

  return (
    <Card>
      <CardHeader title="未激活" subheader="请联系服务人员以激活应用" />
      <CardContent>
        <form
          id={formId}
          onSubmit={form.handleSubmit((data) => {
            set((d) => {
              d.activateCode = data.activationCode;
            });
          }, console.warn)}
        >
          <Grid container spacing={6}>
            <Grid size={12}>
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Box sx={{ bgcolor: "white", p: 3 }}>
                  <QRCodeSVG value={code} width={256} height={256} />
                </Box>
              </Box>
            </Grid>
            <Grid size={12}>
              <TextField
                label="识别码"
                fullWidth
                value={code}
                onChange={Boolean}
                slotProps={{
                  input: {
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          disabled={isPending}
                          onClick={() => {
                            startTransition(async () => {
                              await navigator.clipboard.writeText(code);
                              snackbar.enqueueSnackbar("复制成功", {
                                variant: "success",
                              });
                            });
                          }}
                        >
                          <ContentCopyOutlined />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>
            <Grid size={12}>
              <Controller
                control={form.control}
                name="activationCode"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    label="激活码"
                    fullWidth
                    rows={1}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton component="label">
                              <FindInPageOutlined />
                              <input
                                type="file"
                                value=""
                                onChange={async (e) => {
                                  const file = e.target.files?.item(0);
                                  if (!file) return;
                                  const text = await file.text();
                                  form.setValue("activationCode", text);
                                  snackbar.enqueueSnackbar("读取成功", {
                                    variant: "success",
                                  });
                                }}
                                hidden
                              />
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>
        </form>
      </CardContent>
      <CardActions>
        <Button type="submit" form={formId}>
          激活
        </Button>
      </CardActions>
    </Card>
  );
};

const fetchActivation = (code: string) =>
  queryOptions({
    queryKey: ["fetchActivateCode", code],
    queryFn: async () => {
      const data = await window.electronAPI.verifyActivation(code);
      return data;
    },
  });

const ActivationGuard = () => {
  const activateCode = useIndexedStore((s) => s.activateCode);

  const activation = useQuery({
    ...fetchActivation(activateCode),
    enabled: !!activateCode,

    retry: false,

    // Disable automatic refetching
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,

    // Disable garbage collection
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (!activateCode) {
    return <ActivationForm />;
  }

  if (activation.isPending) {
    return <Loading />;
  }

  if (activation.isError) {
    return <Box>{activation.error.message}</Box>;
  }

  if (!activation.data.isOk) {
    return <ActivationForm />;
  }

  return <Outlet />;
};

const useNprogress = () => {
  const navigation = useNavigation();

  React.useEffect(() => {
    switch (navigation.state) {
      case "submitting":
      case "loading":
        NProgress.start();
        break;
      case "idle":
      default:
        NProgress.done();
    }
  }, [navigation.state]);
};

const NprogressBar = () => {
  const theme = useTheme();
  useNprogress();

  return (
    <GlobalStyles
      styles={{
        "#nprogress": {
          position: "fixed",
          top: 0,
          inlineSize: "100dvw",

          zIndex: theme.zIndex.drawer + 1,
        },
        "#nprogress .bar": {
          backgroundColor: theme.palette.primary.main,
          blockSize: theme.spacing(1),
        },
      }}
    />
  );
};

const usePrefetchActivation = () => {
  const activateCode = useIndexedStore((s) => s.activateCode);

  usePrefetchQuery({
    ...fetchActivation(activateCode),

    retry: false,

    // Disable garbage collection
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

const RootRoute = () => {
  usePrefetchActivation();

  return (
    <>
      <NprogressBar />
      <Outlet />
    </>
  );
};

const renderError = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    return (
      <Alert severity="error" variant="outlined">
        <AlertTitle>{error.status}</AlertTitle>
        <Typography>{error.statusText}</Typography>
        <Link to="/">
          <Button startIcon={<HomeOutlined />}>返回首页</Button>
        </Link>
      </Alert>
    );
  }

  if (error instanceof Error) {
    return (
      <Alert severity="error" variant="outlined">
        <AlertTitle>错误</AlertTitle>
        <Typography>{error.message}</Typography>
        <Typography variant="body2">{error.stack}</Typography>
        <Link to="/">
          <Button startIcon={<HomeOutlined />} color="error">
            返回首页
          </Button>
        </Link>
      </Alert>
    );
  }

  return (
    <Alert severity="error" variant="outlined">
      <AlertTitle>错误</AlertTitle>
      <Typography>未知错误，请联系服务人员</Typography>
      <Link to="/">
        <Button startIcon={<HomeOutlined />} color="error">
          返回首页
        </Button>
      </Link>
    </Alert>
  );
};

const RootErrorBoundary = () => {
  const error = useRouteError();

  return <Box sx={{ padding: 6 }}>{renderError(error)}</Box>;
};

const routes: RouteObject[] = [
  {
    id: "root",
    path: "",
    Component: RootRoute,
    ErrorBoundary: RootErrorBoundary,
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
        Component: AuthLayout,
        children: [
          {
            id: "home",
            index: true,
            lazy: () => import("@/pages/home/route"),
          },
          {
            id: "settings",
            path: "settings",
            lazy: () => import("@/pages/settings/route"),
          },
          { id: "log", path: "log", lazy: () => import("@/pages/log/route") },
          {
            id: "activation_guard",
            path: "",
            Component: ActivationGuard,
            loader: async () => {
              const activateCode = useIndexedStore.getState().activateCode;
              // Do not to Verify when activation code is not exist
              if (!activateCode) return { isOk: false };
              const data = await queryClient.ensureQueryData(
                fetchActivation(activateCode)
              );
              return data;
            },
            children: [
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
              {
                id: "jtv_hmis_setting",
                path: "jtv_hmis_setting",
                lazy: () => import("@/pages/jtv_hmis_setting/route"),
              },
              {
                id: "jtv_hmis_xuzhoubei",
                path: "jtv_hmis_xuzhoubei",
                lazy: () => import("@/pages/jtv_hmis_xuzhoubei/route"),
              },
              {
                id: "jtv_hmis_xuzhoubei_setting",
                path: "jtv_hmis_xuzhoubei_setting",
                lazy: () => import("@/pages/jtv_hmis_xuzhoubei_setting/route"),
              },
              {
                id: "kh_hmis",
                path: "kh_hmis",
                lazy: () => import("@/pages/kh_hmis/route"),
              },
              {
                id: "kh_hmis_setting",
                path: "kh_hmis_setting",
                lazy: () => import("@/pages/kh_hmis_setting/route"),
              },
            ],
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
