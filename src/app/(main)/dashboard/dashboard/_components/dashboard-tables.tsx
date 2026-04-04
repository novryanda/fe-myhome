"use client";

import { Download, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { DashboardTransactionsResponse, DashboardUsersResponse } from "./types";

const SKELETON_ROWS = ["user-1", "user-2", "user-3", "user-4", "user-5"] as const;
const TRANSACTION_SKELETON_ROWS = [
  "transaction-1",
  "transaction-2",
  "transaction-3",
  "transaction-4",
  "transaction-5",
] as const;

const dateLabel = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "-";

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export function DashboardUsersTable({
  role,
  search,
  onSearchChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onResetFilters,
  onExport,
  response,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
  isRefetching,
  isExporting,
}: {
  role: "ADMIN" | "SUPERADMIN";
  search: string;
  onSearchChange: (value: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onResetFilters: () => void;
  onExport: () => void;
  response?: DashboardUsersResponse;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading: boolean;
  isRefetching: boolean;
  isExporting: boolean;
}) {
  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>{role === "SUPERADMIN" ? "Daftar Pengguna" : "Daftar Tenant"}</CardTitle>
            <CardDescription>
              {role === "SUPERADMIN"
                ? "Akun terbaru yang terdaftar di platform."
                : "Tenant yang pernah bertransaksi di properti milik Anda."}
            </CardDescription>
          </div>
          <DashboardTableToolbar
            search={search}
            onSearchChange={onSearchChange}
            searchPlaceholder="Cari nama atau email..."
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
            onResetFilters={onResetFilters}
            onExport={onExport}
            isExporting={isExporting}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`overflow-hidden rounded-xl border transition-opacity ${isRefetching ? "opacity-60" : "opacity-100"}`}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Terdaftar</TableHead>
                  <TableHead>Total Booking</TableHead>
                  <TableHead>Booking Terakhir</TableHead>
                  <TableHead>Properti Terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? SKELETON_ROWS.map((key) => (
                      <TableRow key={key}>
                        <TableCell colSpan={8}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : response?.data.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === "ACTIVE" ? "default" : "destructive"}>{user.status}</Badge>
                        </TableCell>
                        <TableCell>{dateLabel(user.createdAt)}</TableCell>
                        <TableCell>{user.totalBookings}</TableCell>
                        <TableCell>{dateLabel(user.latestBookingAt)}</TableCell>
                        <TableCell>{user.latestPropertyName || "-"}</TableCell>
                      </TableRow>
                    ))}
                {!isLoading && !response?.data.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Tidak ada data pengguna yang cocok.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
        <DashboardTablePagination
          page={page}
          totalPages={response?.paging.total_page || 1}
          pageSize={pageSize}
          totalItems={response?.paging.total_items || 0}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </CardContent>
    </Card>
  );
}

export function DashboardTransactionsTable({
  search,
  onSearchChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onResetFilters,
  onExport,
  response,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
  isRefetching,
  isExporting,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onResetFilters: () => void;
  onExport: () => void;
  response?: DashboardTransactionsResponse;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading: boolean;
  isRefetching: boolean;
  isExporting: boolean;
}) {
  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Daftar Transaksi</CardTitle>
            <CardDescription>Riwayat pembayaran terbaru yang masuk ke sistem.</CardDescription>
          </div>
          <DashboardTableToolbar
            search={search}
            onSearchChange={onSearchChange}
            searchPlaceholder="Cari booking, tenant, properti..."
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
            onResetFilters={onResetFilters}
            onExport={onExport}
            isExporting={isExporting}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`overflow-hidden rounded-xl border transition-opacity ${isRefetching ? "opacity-60" : "opacity-100"}`}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode Booking</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Properti / Kamar</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead>Paid / Expired</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? TRANSACTION_SKELETON_ROWS.map((key) => (
                      <TableRow key={key}>
                        <TableCell colSpan={9}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : response?.data.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.bookingCode}</TableCell>
                        <TableCell>{transaction.tenantName}</TableCell>
                        <TableCell>
                          <div>{transaction.propertyName}</div>
                          <div className="text-muted-foreground text-xs">{transaction.roomNumber}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.status === "PAID" ? "default" : "secondary"}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.paymentType || "-"}</TableCell>
                        <TableCell>{currency(transaction.amount)}</TableCell>
                        <TableCell>{dateLabel(transaction.createdAt)}</TableCell>
                        <TableCell>
                          <div>{dateLabel(transaction.paidAt)}</div>
                          <div className="text-muted-foreground text-xs">{dateLabel(transaction.expiredAt)}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                {!isLoading && !response?.data.length ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      Tidak ada transaksi yang cocok.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
        <DashboardTablePagination
          page={page}
          totalPages={response?.paging.total_page || 1}
          pageSize={pageSize}
          totalItems={response?.paging.total_items || 0}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </CardContent>
    </Card>
  );
}

function DashboardTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onResetFilters,
  onExport,
  isExporting,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onResetFilters: () => void;
  onExport: () => void;
  isExporting: boolean;
}) {
  const isInvalidPeriod = !!startDate && !!endDate && startDate > endDate;
  const hasFilters = !!search || !!startDate || !!endDate;

  return (
    <div className="flex w-full flex-col gap-3 lg:max-w-3xl lg:items-end">
      <div className="relative w-full lg:max-w-sm">
        <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>
      <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => onStartDateChange(event.target.value)}
          />
          <Input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => onEndDateChange(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onResetFilters} disabled={!hasFilters}>
            Reset
          </Button>
          <Button onClick={onExport} disabled={isExporting || isInvalidPeriod}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Mengexport..." : "Export Excel"}
          </Button>
        </div>
      </div>
      {isInvalidPeriod ? (
        <div className="text-destructive text-sm">Tanggal akhir harus lebih besar atau sama dengan tanggal awal.</div>
      ) : null}
    </div>
  );
}

function DashboardTablePagination({
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
          <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}
