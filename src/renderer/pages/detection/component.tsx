import {
  Alert,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import React from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  flexRender,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { cellPaddingMap, rowsPerPageOptions } from "@/lib/constants";
import {
  CheckOutlined,
  ClearOutlined,
  PrintOutlined,
  RefreshOutlined,
} from "@mui/icons-material";
import { DATE_FORMAT_DATABASE } from "@/lib/constants";
import type { Detection } from "#/cmd";
import { Loading } from "@/components/Loading";
import { fetchDataFromAccessDatabase } from "@/api/fetch_preload";
import { Link as RouterLink } from "react-router";
import { create } from "zustand";
import { WritableDraft } from "immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

const szIDToId = (szID: string) => szID.split(".").at(0)?.slice(-7);
const columnHelper = createColumnHelper<Detection>();

const columns = [
  columnHelper.display({
    id: "checkbox",
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
        indeterminate={table.getIsSomeRowsSelected()}
      />
    ),
    footer: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
        indeterminate={table.getIsSomeRowsSelected()}
      />
    ),
  }),
  columnHelper.accessor("szIDs", {
    cell: ({ getValue }) => {
      const szID = getValue();
      return (
        <Link component={RouterLink} to={`/detection/${szID}`}>
          #{szIDToId(szID)}
        </Link>
      );
    },
    header: "ID",
    footer: "ID",
  }),
  columnHelper.accessor("szIDsWheel", { header: "轴号", footer: "轴号" }),
  columnHelper.accessor("szWHModel", { header: "轴型", footer: "轴型" }),
  columnHelper.accessor("szUsername", { header: "检测员", footer: "检测员" }),
  // columnHelper.accessor("bSickLD", {}),
  // columnHelper.accessor("bSickRD", {}),
  columnHelper.accessor("bWheelLS", {
    cell: ({ getValue }) =>
      getValue() ? <CheckOutlined /> : <ClearOutlined />,
    header: "左轴承",
    footer: "左轴承",
  }),
  columnHelper.accessor("bWheelRS", {
    cell: ({ getValue }) =>
      getValue() ? <CheckOutlined /> : <ClearOutlined />,
    header: "右轴承",
    footer: "右轴承",
  }),
  columnHelper.accessor("tmnow", {
    header: "时间",
    footer: "时间",
    cell: ({ getValue }) => {
      const tmnow = getValue();
      if (!tmnow) return null;

      return new Date(tmnow).toLocaleString();
    },
  }),
  columnHelper.accessor("szResult", { header: "检测结果", footer: "检测结果" }),
];

type State = {
  date: string;
};

type Actions = {
  set(
    nextStateOrUpdater:
      | State
      | Partial<State>
      | ((state: WritableDraft<State>) => void),
  ): void;
};

type Store = State & Actions;

const useSessionStore = create<Store>()(
  persist(
    immer((set) => ({
      date: new Date().toISOString(),
      set,
    })),
    {
      storage: createJSONStorage(() => sessionStorage),
      name: "useSessionStore:detection",
    },
  ),
);

export const Component = () => {
  "use no memo";
  const selectDate = useSessionStore((s) => s.date);
  const set = useSessionStore((s) => s.set);

  const date = dayjs(selectDate);

  const [isPending, startTransition] = React.useTransition();

  const sql = `SELECT * FROM detections WHERE tmnow BETWEEN #${date
    .startOf("day")
    .format(DATE_FORMAT_DATABASE)}# AND #${date
    .endOf("day")
    .format(DATE_FORMAT_DATABASE)}#`;

  const query = useQuery(fetchDataFromAccessDatabase<Detection>(sql));
  const data = React.useMemo(() => query.data || [], [query.data]);

  const table = useReactTable({
    columns,
    data,
    getRowId: (row) => row.szIDs,

    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const setDate = (day: dayjs.Dayjs) =>
    set((d) => {
      d.date = day.toISOString();
    });

  const renderRow = () => {
    if (query.isPending) {
      return (
        <TableRow>
          <TableCell colSpan={table.getAllLeafColumns().length} align="center">
            <Loading
              slotProps={{
                box: { padding: 0 },
              }}
            />
          </TableCell>
        </TableRow>
      );
    }

    if (query.isError) {
      return (
        <TableRow>
          <TableCell colSpan={table.getAllLeafColumns().length}>
            <Alert severity="error" variant="filled">
              <AlertTitle>错误</AlertTitle>
              {query.error.message}
            </Alert>
          </TableCell>
        </TableRow>
      );
    }

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

  return (
    <Card>
      <CardHeader
        title="现车作业"
        action={
          <IconButton
            onClick={() => query.refetch()}
            disabled={query.isRefetching}
          >
            <RefreshOutlined />
          </IconButton>
        }
      />
      <CardContent>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <DatePicker
              value={date}
              onChange={(day) => {
                if (!day) return;
                setDate(day);
              }}
              slotProps={{
                textField: {
                  label: "日期",
                  fullWidth: true,
                },
              }}
            />
          </Grid>
        </Grid>
      </CardContent>
      <Divider />
      <CardContent>
        <Button
          onClick={() => {
            startTransition(window.electronAPI.xlsxCHR53A);
          }}
          disabled={isPending}
          startIcon={
            isPending ? (
              <CircularProgress color="inherit" size={16} />
            ) : (
              <PrintOutlined />
            )
          }
          variant="outlined"
        >
          Excel
        </Button>
      </CardContent>
      {query.isFetching && <LinearProgress />}
      <TableContainer>
        <Table sx={{ minWidth: 1024 }}>
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
      <Divider />
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
