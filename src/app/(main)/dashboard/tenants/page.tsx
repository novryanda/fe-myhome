"use client";

import { useState } from "react";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

import { PageHero } from "../_components/page-hero";
import { exportRowsToExcel } from "../dashboard/_components/export-excel";

const dateLabel = (value?: string | Date | null) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "-";

const fileStamp = () => new Date().toISOString().slice(0, 19).replaceAll(":", "-").replace("T", "_");

type TenantRow = {
  id: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone?: string | null;
  propertyName: string;
  roomTypeName: string;
  roomNumber: string;
  checkInAt?: string | Date | null;
  currentPeriodEnd?: string | Date | null;
  nextDueDate?: string | Date | null;
  isSubscription: boolean;
  status: string;
  isOverdue: boolean;
  overdueDays: number;
};

async function fetchAllTenants(search?: string, dueStatus: "ALL" | "OVERDUE" | "ON_TIME" = "ALL") {
  const firstResponse = await api.get("/api/tenants", {
    params: {
      search,
      dueStatus: dueStatus === "ALL" ? undefined : dueStatus,
      page: 1,
      size: 100,
    },
  });

  const firstData = firstResponse.data;
  const totalPages = firstData?.paging?.total_page || 1;
  const rows = [...(firstData?.data || [])];

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await api.get("/api/tenants", {
      params: {
        search,
        dueStatus: dueStatus === "ALL" ? undefined : dueStatus,
        page,
        size: 100,
      },
    });

    rows.push(...(response.data?.data || []));
  }

  return rows;
}

export default function TenantsPage() {
  const { data: session, isPending } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dueStatus, setDueStatus] = useState<"ALL" | "OVERDUE" | "ON_TIME">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isExporting, setIsExporting] = useState(false);

  const tenantsQuery = useQuery({
    queryKey: ["tenants", search, dueStatus, page, pageSize],
    queryFn: async () => {
      const response = await api.get("/api/tenants", {
        params: {
          search,
          dueStatus: dueStatus === "ALL" ? undefined : dueStatus,
          page,
          size: pageSize,
        },
      });
      return response.data;
    },
    enabled: !!session?.user && session.user.role !== "USER",
    placeholderData: keepPreviousData,
  });

  const checkOut = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await api.patch(`/api/bookings/${bookingId}/check-out`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Penghuni berhasil check-out");
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bookings"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Gagal memproses check-out");
    },
  });

  if (isPending) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.24))] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (session?.user?.role === "USER") {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Akses Dibatasi</CardTitle>
            <CardDescription>Daftar penghuni hanya tersedia untuk admin dan superadmin.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const tenants = (tenantsQuery.data?.data || []) as TenantRow[];
  const tenantPaging = tenantsQuery.data?.paging;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleDueStatusChange = (value: "ALL" | "OVERDUE" | "ON_TIME") => {
    setDueStatus(value);
    setPage(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const rows = (await fetchAllTenants(search || undefined, dueStatus)) as TenantRow[];

      if (!rows.length) {
        toast.error("Tidak ada data penghuni untuk diexport.");
        return;
      }

      await exportRowsToExcel(
        rows.map((tenant) => ({
          Tenant: tenant.tenantName,
          Email: tenant.tenantEmail,
          Telepon: tenant.tenantPhone || "-",
          Properti: tenant.propertyName,
          "Tipe Kamar": tenant.roomTypeName,
          Kamar: tenant.roomNumber,
          "Check-in": dateLabel(tenant.checkInAt),
          "Akhir Periode": dateLabel(tenant.currentPeriodEnd),
          "Next Due": dateLabel(tenant.nextDueDate),
          "Status Tagihan": tenant.isOverdue ? `Terlambat ${tenant.overdueDays} hari` : "Aman",
          Subscription: tenant.isSubscription ? "Aktif" : "Tidak",
          Status: tenant.status,
        })),
        {
          fileName: `daftar-penghuni-${fileStamp()}.xlsx`,
          sheetName: "Penghuni",
        },
      );

      toast.success("Export penghuni berhasil.");
    } catch {
      toast.error("Export penghuni gagal.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 p-8 pt-6">
      <PageHero
        title="Daftar Penghuni"
        description="Penghuni aktif yang sudah check-in dan sedang menempati kamar."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Cari tenant, properti, kamar..."
              className="w-[320px]"
            />
            <Select value={dueStatus} onValueChange={(value) => handleDueStatusChange(value as typeof dueStatus)}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Filter tagihan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Tagihan</SelectItem>
                <SelectItem value="OVERDUE">Lewat Jatuh Tempo</SelectItem>
                <SelectItem value="ON_TIME">Masih Aman</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Mengexport..." : "Export Excel"}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Penghuni Aktif</CardTitle>
          <CardDescription>Tidak termasuk booking aktif yang belum check-in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Properti</TableHead>
                <TableHead>Kamar</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Akhir Periode</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Status Tagihan</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="font-medium">{tenant.tenantName}</div>
                    <div className="text-muted-foreground text-xs">{tenant.tenantEmail}</div>
                    <div className="text-muted-foreground text-xs">{tenant.tenantPhone || "-"}</div>
                  </TableCell>
                  <TableCell>{tenant.propertyName}</TableCell>
                  <TableCell>
                    <div>{tenant.roomTypeName}</div>
                    <div className="text-muted-foreground text-xs">{tenant.roomNumber}</div>
                  </TableCell>
                  <TableCell>{dateLabel(tenant.checkInAt)}</TableCell>
                  <TableCell>{dateLabel(tenant.currentPeriodEnd)}</TableCell>
                  <TableCell className={tenant.isOverdue ? "font-medium text-amber-600" : undefined}>
                    {dateLabel(tenant.nextDueDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenant.isOverdue ? "warning" : "success"}>
                      {tenant.isOverdue ? `Terlambat ${tenant.overdueDays} hari` : "Aman"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenant.isSubscription ? "default" : "secondary"}>
                      {tenant.isSubscription ? "Aktif" : "Tidak"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => checkOut.mutate(tenant.id)}>
                      Check-out
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TenantTablePagination
            page={page}
            totalPages={tenantPaging?.total_page || 1}
            pageSize={pageSize}
            totalItems={tenantPaging?.total_items || 0}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function TenantTablePagination({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-muted-foreground text-sm">Total {totalItems} data</div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Rows" />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 20, 30].map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} / halaman
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm">
          Halaman {page} dari {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}
