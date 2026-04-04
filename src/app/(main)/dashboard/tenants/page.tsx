"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
};

async function fetchAllTenants(search?: string) {
  const firstResponse = await api.get("/api/tenants", {
    params: {
      search,
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
  const [isExporting, setIsExporting] = useState(false);

  const tenantsQuery = useQuery({
    queryKey: ["tenants", search],
    queryFn: async () => {
      const response = await api.get("/api/tenants", {
        params: { search, page: 1, size: 50 },
      });
      return response.data;
    },
    enabled: !!session?.user && session.user.role !== "USER",
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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const rows = (await fetchAllTenants(search || undefined)) as TenantRow[];

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
          <>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari tenant, properti, kamar..."
              className="w-[320px]"
            />
            <Button variant="outline" onClick={handleExport} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Mengexport..." : "Export Excel"}
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Penghuni Aktif</CardTitle>
          <CardDescription>Tidak termasuk booking aktif yang belum check-in.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Properti</TableHead>
                <TableHead>Kamar</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Akhir Periode</TableHead>
                <TableHead>Next Due</TableHead>
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
                  <TableCell>{dateLabel(tenant.nextDueDate)}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
