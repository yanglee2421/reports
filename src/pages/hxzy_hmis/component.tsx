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
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Link,
  CircularProgress,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import React from "react";
import { useSnackbar } from "notistack";
import {
  fetchHxzyHmisSqliteGet,
  fetchHxzyHmisSetting,
  useHxzyHmisApiGet,
  useHxzyHmisApiSet,
  useHxzyHmisSqliteDelete,
  useAutoInputToVC,
} from "@/api/fetch_preload";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cellPaddingMap, rowsPerPageOptions } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers";
import type { HxzyBarcode } from "#/electron/schema";

type ActionCellProps = {
  id: number;
};

const ActionCell = (props: ActionCellProps) => {
  const [showAlert, setShowAlert] = React.useState(false);

  const saveData = useHxzyHmisApiSet();
  const snackbar = useSnackbar();
  const deleteBarcode = useHxzyHmisSqliteDelete();

  const handleClose = () => setShowAlert(false);
  const handleDelete = () => {
    deleteBarcode.mutate(props.id, {
      onError: (error) => {
        snackbar.enqueueSnackbar(error.message, {
          variant: "error",
        });
      },
      onSuccess: () => {
        handleClose();
      },
    });
  };

  const handleUpload = () => {
    saveData.mutate(props.id, {
      onError(error) {
        snackbar.enqueueSnackbar(error.message, {
          variant: "error",
        });
      },
      onSuccess(data) {
        snackbar.enqueueSnackbar(`#${data}上传成功`, {
          variant: "success",
        });
        handleClose();
      },
    });
  };

  return (
    <>
      <IconButton onClick={handleUpload} disabled={saveData.isPending}>
        <CloudUploadOutlined />
      </IconButton>
      <IconButton
        onClick={() => setShowAlert(true)}
        disabled={saveData.isPending}
      >
        <DeleteOutlined color="error" />
      </IconButton>
      <Dialog open={showAlert} onClose={handleClose}>
        <DialogTitle>删除</DialogTitle>
        <DialogContent>
          <DialogContentText>确定要删除这条记录吗？</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>取消</Button>
          <Button
            onClick={handleDelete}
            disabled={deleteBarcode.isPending}
            color="error"
          >
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

const columnHelper = createColumnHelper<HxzyBarcode>();

const columns = [
  columnHelper.display({
    id: "checkbox",
    header: ({ table }) => (
      <Checkbox
        indeterminate={table.getIsSomeRowsSelected()}
        checked={table.getIsAllRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
    footer: ({ table }) => (
      <Checkbox
        indeterminate={table.getIsSomeRowsSelected()}
        checked={table.getIsAllRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
      />
    ),
  }),
  columnHelper.accessor("id", {
    header: "ID",
    footer: "ID",
    cell: ({ getValue }) => <Link underline="none">#{getValue()}</Link>,
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
    cell: ({ getValue }) => getValue()?.toLocaleString(),
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
    cell: ({ row }) => <ActionCell id={row.getValue("id")} />,
  }),
];

const initDate = () => dayjs();

export const Component = () => {
  const [date, setDate] = React.useState(initDate);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  const formRef = React.useRef<HTMLFormElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();

  const params = {
    pageIndex,
    pageSize,
    startDate: dayjs(date).startOf("day").toISOString(),
    endDate: dayjs(date).endOf("day").toISOString(),
  };

  const form = useScanerForm();
  const getData = useHxzyHmisApiGet();
  const snackbar = useSnackbar();
  const barcode = useQuery(fetchHxzyHmisSqliteGet(params));
  const { data: hmis } = useQuery(fetchHxzyHmisSetting());
  const autoInput = useAutoInputToVC();

  const setInputFocus = React.useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const data = React.useMemo(() => barcode.data?.rows || [], [barcode.data]);

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id.toString(),
    getCoreRowModel: getCoreRowModel(),

    manualPagination: true,
  });

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
      controller,
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
      <CardHeader title="华兴致远HMIS" subheader="成都北" />
      <CardContent>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 10, md: 8, lg: 6, xl: 4 }}>
            <form
              ref={formRef}
              id={formId}
              noValidate
              autoComplete="off"
              onSubmit={form.handleSubmit(async (values) => {
                if (getData.isPending) return;

                form.reset();
                const data = await getData.mutateAsync(values.barCode, {
                  onError: (error) => {
                    snackbar.enqueueSnackbar(error.message, {
                      variant: "error",
                    });
                  },
                });

                if (!hmis) return;
                if (!hmis.autoInput) return;

                autoInput.mutate(
                  {
                    zx: data.data[0].ZX,
                    zh: data.data[0].ZH,
                    czzzdw: data.data[0].CZZZDW,
                    sczzdw: data.data[0].SCZZDW,
                    mczzdw: data.data[0].MCZZDW,
                    czzzrq: data.data[0].CZZZRQ,
                    sczzrq: data.data[0].SCZZRQ,
                    mczzrq: data.data[0].MCZZRQ,
                    ztx: "1",
                    ytx: "1",
                  },
                  {
                    onError: (error) => {
                      snackbar.enqueueSnackbar(error.message, {
                        variant: "error",
                      });
                    },
                  },
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
                              endIcon={
                                getData.isPending ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <KeyboardReturnOutlined />
                                )
                              }
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
      <CardContent>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
            <DatePicker
              value={date}
              onChange={(e) => {
                if (!e) return;
                setDate(e);
              }}
              slotProps={{
                textField: {
                  label: "日期",
                  fullWidth: true,
                  helperText: "选择日期",
                },
              }}
            />
          </Grid>
        </Grid>
      </CardContent>
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
                      header.getContext(),
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
                      header.getContext(),
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
        page={pageIndex}
        count={barcode.data?.count ?? 0}
        rowsPerPage={pageSize}
        rowsPerPageOptions={rowsPerPageOptions}
        onPageChange={(e, page) => {
          void e;
          setPageIndex(page);
        }}
        onRowsPerPageChange={(e) => {
          setPageSize(Number.parseInt(e.target.value, 10));
        }}
        labelRowsPerPage="每页行数"
      />
    </Card>
  );
};
