import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckOutlined,
  ClearOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  FilterListOutlined,
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
  TableFooter,
  TextField,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Button,
  Divider,
  Link,
  CircularProgress,
  TableContainer,
  LinearProgress,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import React from "react";
import { useDialogs, useNotifications } from "@toolpad/core";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cellPaddingMap, rowsPerPageOptions } from "@/lib/constants";
import {
  useAutoInputToVC,
  useKhHmisApiGet,
  useKhHmisApiSet,
  useKhHmisSqliteDelete,
  fetchKhHmisSqliteGet,
  fetchHxzyHmisSetting,
} from "@/api/fetch_preload";
import type { KhBarcode } from "#/schema";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers";

type ActionCellProps = {
  id: number;
};

const ActionCell = (props: ActionCellProps) => {
  const saveData = useKhHmisApiSet();
  const snackbar = useNotifications();
  const dialog = useDialogs();
  const deleteBarcode = useKhHmisSqliteDelete();

  const handleUpload = () => {
    saveData.mutate(props.id, {
      onError(error) {
        snackbar.show(error.message, {
          severity: "error",
        });
      },
      onSuccess() {
        snackbar.show("上传成功", {
          severity: "success",
        });
      },
    });
  };

  return (
    <>
      <IconButton disabled={saveData.isPending} onClick={handleUpload}>
        <CloudUploadOutlined />
      </IconButton>
      <IconButton
        onClick={async () => {
          const confirmed = await dialog.confirm("确定要删除这条记录吗？", {
            okText: "删除",
            cancelText: "取消",
            title: "警告",
          });
          if (confirmed) {
            deleteBarcode.mutate(props.id, {
              onError(error) {
                snackbar.show(error.message, {
                  severity: "error",
                });
              },
            });
          }
        }}
      >
        <DeleteOutlined color="error" />
      </IconButton>
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

const columnHelper = createColumnHelper<KhBarcode>();

const columns = [
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
      getValue() ? <CheckOutlined color="success" /> : <ClearOutlined />,
  }),
  columnHelper.display({
    id: "action",
    header: "操作",
    cell: ({ row }) => <ActionCell id={row.getValue("id")} />,
  }),
];

const initDate = () => dayjs();

export const Component = () => {
  "use no memo";
  const [date, setDate] = React.useState(initDate);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);
  const [showFilter, setShowFilter] = React.useState(false);

  const formRef = React.useRef<HTMLFormElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const formId = React.useId();

  const params = {
    pageIndex,
    pageSize,
    startDate: date.startOf("day").toISOString(),
    endDate: date.endOf("day").toISOString(),
  };

  const form = useScanerForm();
  const getData = useKhHmisApiGet();
  const snackbar = useNotifications();
  const autoInput = useAutoInputToVC();
  const { data: hmis } = useQuery(fetchHxzyHmisSetting());
  const barcode = useQuery(fetchKhHmisSqliteGet(params));

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
    rowCount: barcode.data?.count || 0,
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

  const refetchBarcode = barcode.refetch;
  React.useEffect(() => {
    const unsubscribe = window.electronAPI.subscribeKhHmisAPISet(() => {
      refetchBarcode();
    });

    return () => {
      unsubscribe();
    };
  }, [refetchBarcode]);

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

    return table.getRowModel().rows.map((row) => (
      <TableRow key={row.id}>
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id} padding={cellPaddingMap.get(cell.column.id)}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  const renderFilter = () => {
    if (!showFilter) return null;
    return (
      <>
        <Divider />
        <CardContent>
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
              <DatePicker
                label="日期"
                value={date}
                onChange={(e) => {
                  if (!e) return;
                  setDate(e);
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </>
    );
  };

  return (
    <Card>
      <CardHeader
        title="康华HMIS"
        subheader="安康"
        action={
          <IconButton onClick={() => setShowFilter((prev) => !prev)}>
            <FilterListOutlined color={showFilter ? "primary" : void 0} />
          </IconButton>
        }
      />
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
                    snackbar.show(error.message, {
                      severity: "error",
                    });
                  },
                });

                if (!hmis) return;
                if (!hmis.autoInput) return;

                autoInput.mutate(
                  {
                    zx: data.data.zx,
                    zh: data.data.zh,
                    czzzdw: data.data.czzzdw,
                    sczzdw: data.data.ldszdw,
                    mczzdw: data.data.ldmzdw,
                    czzzrq: data.data.czzzrq,
                    sczzrq: data.data.ldszrq,
                    mczzrq: data.data.ldmzrq,
                    ztx: "1",
                    ytx: "1",
                  },
                  {
                    onError(error) {
                      snackbar.show(error.message, {
                        severity: "error",
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
                                  <CircularProgress size={16} color="inherit" />
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
      {renderFilter()}
      {barcode.isFetching && <LinearProgress />}
      <TableContainer>
        <Table sx={{ minWidth: 720 }}>
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
        count={table.getRowCount()}
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
