import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckOutlined,
  ClearOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  KeyboardReturnOutlined,
} from "@mui/icons-material";
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  IconButton,
  InputAdornment,
  Table,
  TableContainer,
  TableFooter,
  TextField,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import React from "react";
import { useSnackbar } from "notistack";
import { useGetData, useSaveData } from "./fetchers";
import { useIndexedStore } from "@/hooks/useIndexedStore";
import { useAutoInputToVC } from "@/hooks/useAutoInputToVC";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cellPaddingMap, rowsPerPageOptions } from "@/lib/constants";
import type { HistoryXuzhoubei } from "@/hooks/useIndexedStore";

type ActionCellProps = {
  row: HistoryXuzhoubei;
};

const ActionCell = (props: ActionCellProps) => {
  const [showAlert, setShowAlert] = React.useState(false);

  const saveData = useSaveData();
  const snackbar = useSnackbar();
  const set = useIndexedStore((s) => s.set);
  const settings = useIndexedStore((s) => s.settings);
  const hmis = useIndexedStore((s) => s.jtv_hmis_xuzhoubei);

  const handleClose = () => setShowAlert(false);

  const handleUpload = () => {
    saveData.mutate(
      {
        databasePath: settings.databasePath,
        driverPath: settings.driverPath,
        host: hmis.host,
        dh: props.row.barCode,
        zh: props.row.zh,
        date: props.row.date,
        PJ_ZZRQ: props.row.PJ_ZZRQ, // 制造日期
        PJ_ZZDW: props.row.PJ_ZZDW, // 制造单位
        PJ_SCZZRQ: props.row.PJ_SCZZRQ, // 首次组装日期
        PJ_SCZZDW: props.row.PJ_SCZZDW, // 首次组装单位
        PJ_MCZZRQ: props.row.PJ_MCZZRQ, // 末次组装日期
        PJ_MCZZDW: props.row.PJ_MCZZDW, // 末次组装单位
        username_prefix: hmis.username_prefix,
      },
      {
        onError(error) {
          snackbar.enqueueSnackbar(error.message, {
            variant: "error",
          });
        },
        onSuccess() {
          snackbar.enqueueSnackbar("上传成功", {
            variant: "success",
          });
        },
      }
    );
  };

  const handleDelete = () => {
    set((d) => {
      d.jtv_hmis_xuzhoubei.history = d.jtv_hmis_xuzhoubei.history.filter(
        (row) => row.id !== props.row.id
      );
    });
    handleClose();
  };

  return (
    <>
      <IconButton disabled={saveData.isPending} onClick={handleUpload}>
        <CloudUploadOutlined />
      </IconButton>
      <IconButton>
        <DeleteOutlined color="error" onClick={() => setShowAlert(true)} />
      </IconButton>
      <Dialog open={showAlert} onClose={handleClose}>
        <DialogTitle>删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要删除该记录吗？删除后无法恢复。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>取消</Button>
          <Button color="error" onClick={handleDelete}>
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const schema = z.object({
  barCode: z.string().min(1, { message: "请输入单号" }),
});

const useScanerForm = () =>
  useForm({
    defaultValues: {
      barCode: "",
    },
    resolver: zodResolver(schema),
  });

const columnHelper = createColumnHelper<HistoryXuzhoubei>();

const columns = [
  columnHelper.accessor("id", {
    header: "ID",
    footer: "ID",
    cell: ({ getValue }) => getValue().slice(0, 7),
  }),
  columnHelper.accessor("barCode", {
    header: "单号",
    footer: "单号",
  }),
  columnHelper.accessor("zh", {
    header: "轴号",
    footer: "轴号",
  }),
  columnHelper.accessor("date", {
    header: "时间",
    footer: "时间",
    cell: ({ getValue }) => new Date(getValue()).toLocaleString(),
  }),
  columnHelper.accessor("isUploaded", {
    header: "已上传",
    footer: "已上传",
    cell: ({ getValue }) =>
      getValue() ? <CheckOutlined /> : <ClearOutlined />,
  }),
  columnHelper.display({
    id: "action",
    header: "操作",
    cell: ({ row }) => <ActionCell row={row.original} />,
  }),
];

export const Component = () => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const formId = React.useId();

  const form = useScanerForm();
  const getData = useGetData();
  const saveData = useSaveData();
  const snackbar = useSnackbar();
  const autoInput = useAutoInputToVC();
  const hmis = useIndexedStore((s) => s.jtv_hmis_xuzhoubei);
  const setting = useIndexedStore((s) => s.settings);
  const history = useIndexedStore((s) => s.jtv_hmis_xuzhoubei.history);

  const setInputFocus = React.useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const table = useReactTable({
    data: history,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const uploadQueue = React.useMemo(
    () =>
      history
        .filter((row) => !row.isUploaded)
        .map((row) => ({
          dh: row.barCode,
          zh: row.zh,
          date: row.date,
          PJ_ZZRQ: row.PJ_ZZRQ, // 制造日期
          PJ_ZZDW: row.PJ_ZZDW, // 制造单位
          PJ_SCZZRQ: row.PJ_SCZZRQ, // 首次组装日期
          PJ_SCZZDW: row.PJ_SCZZDW, // 首次组装单位
          PJ_MCZZRQ: row.PJ_MCZZRQ, // 末次组装日期
          PJ_MCZZDW: row.PJ_MCZZDW, // 末次组装单位
        })),
    [history]
  );

  const saveDataMutate = saveData.mutate;

  React.useEffect(() => {
    if (!hmis.autoUpload) return;
    if (!uploadQueue.length) return;

    const timer = setInterval(() => {
      const firstItem = uploadQueue[0];
      if (!firstItem) return;

      saveDataMutate({
        databasePath: setting.databasePath,
        driverPath: setting.driverPath,
        host: hmis.host,
        dh: firstItem.dh,
        zh: firstItem.zh,
        date: firstItem.date,
        PJ_ZZRQ: firstItem.PJ_ZZRQ, // 制造日期
        PJ_ZZDW: firstItem.PJ_ZZDW, // 制造单位
        PJ_SCZZRQ: firstItem.PJ_SCZZRQ, // 首次组装日期
        PJ_SCZZDW: firstItem.PJ_SCZZDW, // 首次组装单位
        PJ_MCZZRQ: firstItem.PJ_MCZZRQ, // 末次组装日期
        PJ_MCZZDW: firstItem.PJ_MCZZDW, // 末次组装单位
        username_prefix: hmis.username_prefix,
      });
    }, hmis.autoUploadInterval);

    return () => {
      clearInterval(timer);
    };
  }, [
    uploadQueue,
    saveDataMutate,
    setting.databasePath,
    setting.driverPath,
    hmis.host,
    hmis.autoUpload,
    hmis.autoUploadInterval,
    hmis.username_prefix,
  ]);

  React.useEffect(() => {
    const unsubscribe = window.electronAPI.subscribeWindowFocus(setInputFocus);

    return () => {
      unsubscribe();
    };
  }, [setInputFocus]);

  React.useEffect(() => {
    const unsubscribe = window.electronAPI.subscribeWindowBlur(setInputFocus);

    return () => {
      unsubscribe();
    };
  }, [setInputFocus]);

  React.useEffect(() => {
    const controller = new AbortController();
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState !== "visible") return;
        setInputFocus();
      },
      controller
    );

    return () => {
      controller.abort();
    };
  }, [setInputFocus]);

  const renderRow = () => {
    if (!table.getRowCount()) {
      return (
        <TableRow>
          <TableCell colSpan={table.getAllLeafColumns().length} align="center">
            暂无数据
          </TableCell>
        </TableRow>
      );
    }

    return table.getRowModel().rows.map((row) => {
      return (
        <TableRow key={row.id}>
          {row.getVisibleCells().map((cell) => {
            return (
              <TableCell
                key={cell.id}
                padding={cellPaddingMap.get(cell.column.id)}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            );
          })}
        </TableRow>
      );
    });
  };

  return (
    <Card>
      <CardHeader title="京天威HMIS" subheader="徐州北" />
      <CardContent>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 10, md: 8, lg: 6, xl: 4 }}>
            <form
              ref={formRef}
              id={formId}
              noValidate
              autoComplete="off"
              onSubmit={form.handleSubmit(async (values) => {
                if (saveData.isPending) return;

                form.reset();

                const data = await getData.mutateAsync(
                  {
                    barCode: values.barCode,
                    host: hmis.host,
                  },
                  {
                    onError: (error) => {
                      snackbar.enqueueSnackbar(error.message, {
                        variant: "error",
                      });
                    },
                  }
                );

                if (!hmis.autoInput) return;

                await autoInput.mutateAsync(
                  {
                    driverPath: setting.driverPath,
                    zx: data[0].ZX,
                    zh: data[0].ZH,
                    czzzdw: data[0].CZZZDW,
                    sczzdw: data[0].SCZZDW,
                    mczzdw: data[0].MCZZDW,
                    czzzrq: data[0].CZZZRQ,
                    sczzrq: data[0].SCZZRQ,
                    mczzrq: data[0].MCZZRQ,
                    ztx: "1",
                    ytx: "1",
                  },
                  {
                    onError(error) {
                      snackbar.enqueueSnackbar(error.message, {
                        variant: "error",
                      });
                    },
                  }
                );
              }, console.warn)}
              onReset={() => form.reset()}
            >
              <Controller
                control={form.control}
                name="barCode"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    inputRef={inputRef}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <Button
                              form={formId}
                              type="submit"
                              endIcon={<KeyboardReturnOutlined />}
                              variant="contained"
                              disabled={getData.isPending}
                            >
                              录入
                            </Button>
                          </InputAdornment>
                        ),
                        autoFocus: true,
                      },
                    }}
                    label="条形码/二维码"
                    placeholder="请扫描条形码或二维码"
                  />
                )}
              />
            </form>
          </Grid>
        </Grid>
      </CardContent>
      <Divider />
      <TableContainer>
        <Table>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell
                    key={header.id}
                    padding={cellPaddingMap.get(header.column.id)}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>{renderRow()}</TableBody>
          <TableFooter>
            {table.getFooterGroups().map((footerGroup) => (
              <TableRow key={footerGroup.id}>
                {footerGroup.headers.map((header) => (
                  <TableCell
                    key={header.id}
                    padding={cellPaddingMap.get(header.column.id)}
                  >
                    {flexRender(
                      header.column.columnDef.footer,
                      header.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableFooter>
        </Table>
      </TableContainer>
      <TablePagination
        component={"div"}
        page={table.getState().pagination.pageIndex}
        count={table.getRowCount()}
        rowsPerPage={table.getState().pagination.pageSize}
        rowsPerPageOptions={rowsPerPageOptions}
        onPageChange={(e, page) => {
          void e;
          table.setPageIndex(page);
        }}
        onRowsPerPageChange={(e) => {
          table.setPageSize(Number.parseInt(e.target.value, 10));
        }}
        labelRowsPerPage="每页行数"
      />
    </Card>
  );
};
