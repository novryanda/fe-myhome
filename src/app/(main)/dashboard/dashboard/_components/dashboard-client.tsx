"use client";

import * as React from "react";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

import { PageHero } from "../../_components/page-hero";
import { ChartAreaInteractive } from "./chart-area-interactive";
import { DashboardTransactionsTable, DashboardUsersTable } from "./dashboard-tables";
import { exportRowsToExcel } from "./export-excel";
import { KpiDetailDialog } from "./kpi-detail-dialog";
import { SectionCards } from "./section-cards";
import type {
  DashboardKpi,
  DashboardOverview,
  DashboardRange,
  DashboardTransactionRow,
  DashboardTransactionsResponse,
  DashboardUserRow,
  DashboardUsersResponse,
} from "./types";

const generatedAtLabel = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "-";

const fileStamp = () => new Date().toISOString().slice(0, 19).replaceAll(":", "-").replace("T", "_");

const mapUsersExportRows = (rows: DashboardUserRow[]) =>
  rows.map((user) => ({
    Nama: user.name,
    Email: user.email,
    Role: user.role,
    Status: user.status,
    "Tanggal Daftar": generatedAtLabel(user.createdAt),
    "Total Booking": user.totalBookings,
    "Booking Terakhir": generatedAtLabel(user.latestBookingAt ?? undefined),
    "Properti Terakhir": user.latestPropertyName || "-",
  }));

const mapTransactionsExportRows = (rows: DashboardTransactionRow[]) =>
  rows.map((transaction) => ({
    "Kode Booking": transaction.bookingCode,
    Tenant: transaction.tenantName,
    Properti: transaction.propertyName,
    Kamar: transaction.roomNumber,
    Kategori: transaction.category,
    Status: transaction.status,
    Metode: transaction.paymentType || "-",
    Nominal: transaction.amount,
    Dibuat: generatedAtLabel(transaction.createdAt),
    Paid: generatedAtLabel(transaction.paidAt ?? undefined),
    Expired: generatedAtLabel(transaction.expiredAt ?? undefined),
  }));

export function DashboardClient({ role }: { role: "ADMIN" | "SUPERADMIN" }) {
  const [range, setRange] = React.useState<DashboardRange>("30d");
  const [selectedKpi, setSelectedKpi] = React.useState<DashboardKpi | null>(null);

  const [usersSearch, setUsersSearch] = React.useState("");
  const [usersPage, setUsersPage] = React.useState(1);
  const [usersPageSize, setUsersPageSize] = React.useState(10);
  const [usersStartDate, setUsersStartDate] = React.useState("");
  const [usersEndDate, setUsersEndDate] = React.useState("");
  const [isExportingUsers, setIsExportingUsers] = React.useState(false);
  const deferredUsersSearch = React.useDeferredValue(usersSearch);

  const [transactionsSearch, setTransactionsSearch] = React.useState("");
  const [transactionsPage, setTransactionsPage] = React.useState(1);
  const [transactionsPageSize, setTransactionsPageSize] = React.useState(10);
  const [transactionsStartDate, setTransactionsStartDate] = React.useState("");
  const [transactionsEndDate, setTransactionsEndDate] = React.useState("");
  const [isExportingTransactions, setIsExportingTransactions] = React.useState(false);
  const deferredTransactionsSearch = React.useDeferredValue(transactionsSearch);

  const handleUsersSearchChange = (value: string) => {
    setUsersSearch(value);
    setUsersPage(1);
  };

  const handleUsersStartDateChange = (value: string) => {
    setUsersStartDate(value);
    setUsersPage(1);
  };

  const handleUsersEndDateChange = (value: string) => {
    setUsersEndDate(value);
    setUsersPage(1);
  };

  const handleTransactionsSearchChange = (value: string) => {
    setTransactionsSearch(value);
    setTransactionsPage(1);
  };

  const handleTransactionsStartDateChange = (value: string) => {
    setTransactionsStartDate(value);
    setTransactionsPage(1);
  };

  const handleTransactionsEndDateChange = (value: string) => {
    setTransactionsEndDate(value);
    setTransactionsPage(1);
  };

  const overviewQuery = useQuery({
    queryKey: ["dashboard-overview", range],
    queryFn: async () => {
      const response = await api.get("/api/dashboard/overview", {
        params: { range },
      });
      return response.data.data as DashboardOverview;
    },
  });

  const usersQuery = useQuery({
    queryKey: ["dashboard-users", usersPage, usersPageSize, deferredUsersSearch, usersStartDate, usersEndDate, role],
    queryFn: async () => {
      const response = await api.get("/api/dashboard/users", {
        params: {
          page: usersPage,
          size: usersPageSize,
          search: deferredUsersSearch,
          startDate: usersStartDate || undefined,
          endDate: usersEndDate || undefined,
        },
      });
      return response.data as DashboardUsersResponse;
    },
    placeholderData: keepPreviousData,
  });

  const transactionsQuery = useQuery({
    queryKey: [
      "dashboard-transactions",
      transactionsPage,
      transactionsPageSize,
      deferredTransactionsSearch,
      transactionsStartDate,
      transactionsEndDate,
      role,
    ],
    queryFn: async () => {
      const response = await api.get("/api/dashboard/transactions", {
        params: {
          page: transactionsPage,
          size: transactionsPageSize,
          search: deferredTransactionsSearch,
          startDate: transactionsStartDate || undefined,
          endDate: transactionsEndDate || undefined,
        },
      });
      return response.data as DashboardTransactionsResponse;
    },
    placeholderData: keepPreviousData,
  });

  const handleUsersExport = async () => {
    if (usersStartDate && usersEndDate && usersStartDate > usersEndDate) {
      toast.error("Periode pengguna tidak valid.");
      return;
    }

    setIsExportingUsers(true);
    try {
      const response = await api.get("/api/dashboard/users/export", {
        params: {
          search: usersSearch || undefined,
          startDate: usersStartDate || undefined,
          endDate: usersEndDate || undefined,
        },
      });

      const rows = (response.data.data || []) as DashboardUserRow[];
      if (!rows.length) {
        toast.error("Tidak ada data pengguna untuk diexport.");
        return;
      }

      await exportRowsToExcel(mapUsersExportRows(rows), {
        fileName: `dashboard-pengguna-${fileStamp()}.xlsx`,
        sheetName: "Pengguna",
      });
      toast.success("Export pengguna berhasil.");
    } catch {
      toast.error("Export pengguna gagal.");
    } finally {
      setIsExportingUsers(false);
    }
  };

  const handleTransactionsExport = async () => {
    if (transactionsStartDate && transactionsEndDate && transactionsStartDate > transactionsEndDate) {
      toast.error("Periode transaksi tidak valid.");
      return;
    }

    setIsExportingTransactions(true);
    try {
      const response = await api.get("/api/dashboard/transactions/export", {
        params: {
          search: transactionsSearch || undefined,
          startDate: transactionsStartDate || undefined,
          endDate: transactionsEndDate || undefined,
        },
      });

      const rows = (response.data.data || []) as DashboardTransactionRow[];
      if (!rows.length) {
        toast.error("Tidak ada data transaksi untuk diexport.");
        return;
      }

      await exportRowsToExcel(mapTransactionsExportRows(rows), {
        fileName: `dashboard-transaksi-${fileStamp()}.xlsx`,
        sheetName: "Transaksi",
      });
      toast.success("Export transaksi berhasil.");
    } catch {
      toast.error("Export transaksi gagal.");
    } finally {
      setIsExportingTransactions(false);
    }
  };

  if (overviewQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard gagal dimuat</CardTitle>
          <CardDescription>Terjadi masalah saat mengambil data ringkasan dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => overviewQuery.refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Coba lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        title={role === "SUPERADMIN" ? "Dashboard Superadmin" : "Dashboard Admin"}
        description=""
        action={
          <>
            <div className="text-right text-muted-foreground text-sm">
              <div>Update terakhir</div>
              <div className="font-medium text-foreground">{generatedAtLabel(overviewQuery.data?.generatedAt)}</div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                overviewQuery.refetch();
                usersQuery.refetch();
                transactionsQuery.refetch();
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Muat Ulang
            </Button>
          </>
        }
      />

      <SectionCards kpis={overviewQuery.data?.kpis} isLoading={overviewQuery.isLoading} onSelect={setSelectedKpi} />

      <ChartAreaInteractive
        role={role}
        data={overviewQuery.data?.chart || []}
        range={range}
        onRangeChange={setRange}
        isLoading={overviewQuery.isLoading}
      />

      <div className="grid gap-6">
        <DashboardUsersTable
          role={role}
          search={usersSearch}
          onSearchChange={handleUsersSearchChange}
          startDate={usersStartDate}
          endDate={usersEndDate}
          onStartDateChange={handleUsersStartDateChange}
          onEndDateChange={handleUsersEndDateChange}
          onResetFilters={() => {
            setUsersSearch("");
            setUsersStartDate("");
            setUsersEndDate("");
            setUsersPage(1);
          }}
          onExport={handleUsersExport}
          response={usersQuery.data}
          page={usersPage}
          pageSize={usersPageSize}
          onPageChange={setUsersPage}
          onPageSizeChange={(size) => {
            setUsersPageSize(size);
            setUsersPage(1);
          }}
          isLoading={usersQuery.isLoading}
          isRefetching={usersQuery.isFetching}
          isExporting={isExportingUsers}
        />
        <DashboardTransactionsTable
          search={transactionsSearch}
          onSearchChange={handleTransactionsSearchChange}
          startDate={transactionsStartDate}
          endDate={transactionsEndDate}
          onStartDateChange={handleTransactionsStartDateChange}
          onEndDateChange={handleTransactionsEndDateChange}
          onResetFilters={() => {
            setTransactionsSearch("");
            setTransactionsStartDate("");
            setTransactionsEndDate("");
            setTransactionsPage(1);
          }}
          onExport={handleTransactionsExport}
          response={transactionsQuery.data}
          page={transactionsPage}
          pageSize={transactionsPageSize}
          onPageChange={setTransactionsPage}
          onPageSizeChange={(size) => {
            setTransactionsPageSize(size);
            setTransactionsPage(1);
          }}
          isLoading={transactionsQuery.isLoading}
          isRefetching={transactionsQuery.isFetching}
          isExporting={isExportingTransactions}
        />
      </div>

      <KpiDetailDialog kpi={selectedKpi} open={!!selectedKpi} onOpenChange={(open) => !open && setSelectedKpi(null)} />
    </div>
  );
}
