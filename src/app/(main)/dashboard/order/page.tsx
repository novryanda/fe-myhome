"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, CreditCard, Download, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

import { PageHero } from "../_components/page-hero";
import { exportRowsToExcel } from "../dashboard/_components/export-excel";

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const dateLabel = (value?: string | Date | null) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "-";

const fileStamp = () => new Date().toISOString().slice(0, 19).replaceAll(":", "-").replace("T", "_");

type BookingRow = {
  id: string;
  bookingCode: string;
  tenant: {
    name: string;
    email: string;
  };
  property?: {
    name: string;
  } | null;
  roomType?: {
    name: string;
  } | null;
  room?: {
    roomNumber: string;
  } | null;
  status: string;
  latestPayment?: {
    status: string;
  } | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  currentPeriodEnd?: string | Date | null;
  checkInAt?: string | Date | null;
  checkOutAt?: string | Date | null;
};

type PaymentRow = {
  id: string;
  bookingCode: string;
  tenantName: string;
  propertyName?: string | null;
  roomTypeName?: string | null;
  roomNumber?: string | null;
  amount: number;
  status: string;
  category: string;
  paymentType?: string | null;
  paidAt?: string | Date | null;
  expiredAt?: string | Date | null;
  createdAt?: string | Date | null;
  midtransOrderId?: string | null;
};

const MANUAL_PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "QRIS", label: "QRIS" },
  { value: "EDC", label: "EDC" },
] as const;

async function fetchAllPages<T>(path: string, search?: string) {
  const firstResponse = await api.get(path, {
    params: {
      search,
      page: 1,
      size: 100,
    },
  });

  const firstData = firstResponse.data;
  const totalPages = firstData?.paging?.total_page || 1;
  const rows = [...(firstData?.data || [])] as T[];

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await api.get(path, {
      params: {
        search,
        page,
        size: 100,
      },
    });

    rows.push(...((response.data?.data || []) as T[]));
  }

  return rows;
}

export default function OrderPage() {
  const { data: session, isPending } = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("orders");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const [bookingPage, setBookingPage] = useState(1);
  const [bookingPageSize, setBookingPageSize] = useState(10);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentPageSize, setPaymentPageSize] = useState(10);
  const [isExportingBookings, setIsExportingBookings] = useState(false);
  const [isExportingPayments, setIsExportingPayments] = useState(false);
  const [selectedManualPayment, setSelectedManualPayment] = useState<PaymentRow | null>(null);
  const [manualPaymentMethod, setManualPaymentMethod] =
    useState<(typeof MANUAL_PAYMENT_METHODS)[number]["value"]>("CASH");

  const canManageCheckIn = session?.user?.role === "ADMIN";
  const canMarkManualPayment = session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN";

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setBookingPage(1);
    setPaymentPage(1);
  };

  const bookingQuery = useQuery({
    queryKey: ["dashboard-bookings", bookingPage, bookingPageSize, deferredSearch],
    queryFn: async () => {
      const response = await api.get("/api/bookings", {
        params: { search: deferredSearch, page: bookingPage, size: bookingPageSize },
      });
      return response.data;
    },
    enabled: !!session?.user && session.user.role !== "USER",
    placeholderData: keepPreviousData,
  });

  const bookingStatsQuery = useQuery({
    queryKey: ["dashboard-bookings-stats"],
    queryFn: async () => {
      const response = await api.get("/api/bookings/stats");
      return response.data.data;
    },
    enabled: !!session?.user && session.user.role !== "USER",
  });

  const paymentQuery = useQuery({
    queryKey: ["dashboard-payments", paymentPage, paymentPageSize, deferredSearch],
    queryFn: async () => {
      const response = await api.get("/api/payments", {
        params: { search: deferredSearch, page: paymentPage, size: paymentPageSize },
      });
      return response.data;
    },
    enabled: !!session?.user && session.user.role !== "USER",
    placeholderData: keepPreviousData,
  });

  const paymentStatsQuery = useQuery({
    queryKey: ["dashboard-payments-stats"],
    queryFn: async () => {
      const response = await api.get("/api/payments/stats");
      return response.data.data;
    },
    enabled: !!session?.user && session.user.role !== "USER",
  });

  const stats = useMemo(() => {
    const bookingStats = bookingStatsQuery.data;
    const paymentStats = paymentStatsQuery.data;

    return {
      totalBookings: bookingStats?.total ?? 0,
      activeBookings: bookingStats?.active ?? 0,
      pendingPayments: paymentStats?.pending ?? 0,
      totalRevenue: paymentStats?.paidAmount ?? 0,
    };
  }, [bookingStatsQuery.data, paymentStatsQuery.data]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "check-in" | "check-out" }) => {
      const response = await api.patch(`/api/bookings/${id}/${action}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.action === "check-in" ? "Check-in berhasil" : "Check-out berhasil");
      queryClient.invalidateQueries({ queryKey: ["dashboard-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bookings-stats"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Aksi gagal diproses");
    },
  });

  const markManualPaid = useMutation({
    mutationFn: async ({ paymentId, paymentType }: { paymentId: string; paymentType: string }) => {
      const response = await api.post(`/api/payments/${paymentId}/manual-paid`, {
        paymentType,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Pembayaran berhasil ditandai lunas.");
      setSelectedManualPayment(null);
      setManualPaymentMethod("CASH");
      queryClient.invalidateQueries({ queryKey: ["dashboard-payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-payments-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bookings-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Gagal menandai pembayaran.");
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
            <CardDescription>Halaman ini hanya tersedia untuk admin dan superadmin.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const bookings = (bookingQuery.data?.data || []) as BookingRow[];
  const bookingPaging = bookingQuery.data?.paging;
  const payments = (paymentQuery.data?.data || []) as PaymentRow[];
  const paymentPaging = paymentQuery.data?.paging;
  const isExportingActiveTab = activeTab === "orders" ? isExportingBookings : isExportingPayments;

  const handleExportBookings = async () => {
    setIsExportingBookings(true);
    try {
      const rows = await fetchAllPages<BookingRow>("/api/bookings", search || undefined);

      if (!rows.length) {
        toast.error("Tidak ada data order untuk diexport.");
        return;
      }

      await exportRowsToExcel(
        rows.map((booking) => ({
          Kode: booking.bookingCode,
          Tenant: booking.tenant?.name || "-",
          Email: booking.tenant?.email || "-",
          Properti: booking.property?.name || "-",
          "Tipe Kamar": booking.roomType?.name || "-",
          Kamar: booking.room?.roomNumber || "-",
          Status: booking.status,
          Payment: booking.latestPayment?.status || "-",
          "Tanggal Mulai": dateLabel(booking.startDate),
          "Akhir Periode": dateLabel(booking.currentPeriodEnd || booking.endDate),
          "Check-in": dateLabel(booking.checkInAt),
          "Check-out": dateLabel(booking.checkOutAt),
        })),
        {
          fileName: `order-booking-${fileStamp()}.xlsx`,
          sheetName: "Order",
        },
      );

      toast.success("Export order berhasil.");
    } catch {
      toast.error("Export order gagal.");
    } finally {
      setIsExportingBookings(false);
    }
  };

  const handleExportPayments = async () => {
    setIsExportingPayments(true);
    try {
      const rows = await fetchAllPages<PaymentRow>("/api/payments", search || undefined);

      if (!rows.length) {
        toast.error("Tidak ada data transaksi untuk diexport.");
        return;
      }

      await exportRowsToExcel(
        rows.map((payment) => ({
          Order: payment.bookingCode,
          Tenant: payment.tenantName,
          Properti: payment.propertyName || "-",
          "Tipe Kamar": payment.roomTypeName || "-",
          Kamar: payment.roomNumber || "-",
          Kategori: payment.category,
          Status: payment.status,
          Metode: payment.paymentType || "-",
          Nominal: payment.amount,
          Dibuat: dateLabel(payment.createdAt),
          Paid: dateLabel(payment.paidAt),
          Expired: dateLabel(payment.expiredAt),
          "Midtrans Order ID": payment.midtransOrderId || "-",
        })),
        {
          fileName: `order-transaksi-${fileStamp()}.xlsx`,
          sheetName: "Transaksi",
        },
      );

      toast.success("Export transaksi berhasil.");
    } catch {
      toast.error("Export transaksi gagal.");
    } finally {
      setIsExportingPayments(false);
    }
  };

  const handleOpenManualPaymentDialog = (payment: PaymentRow) => {
    setSelectedManualPayment(payment);
    setManualPaymentMethod("CASH");
  };

  const handleConfirmManualPayment = () => {
    if (!selectedManualPayment) {
      return;
    }

    markManualPaid.mutate({
      paymentId: selectedManualPayment.id,
      paymentType: manualPaymentMethod,
    });
  };

  return (
    <div className="space-y-6 p-8 pt-6">
      <PageHero
        title="Order & Transaksi"
        description="Pantau seluruh booking, pembayaran, dan aksi operasional kamar."
        action={
          <>
            <Input
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Cari booking, tenant, properti, kamar..."
              className="w-[320px]"
            />
            <Button
              variant="outline"
              onClick={activeTab === "orders" ? handleExportBookings : handleExportPayments}
              disabled={isExportingActiveTab}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExportingActiveTab ? "Mengexport..." : activeTab === "orders" ? "Export Order" : "Export Transaksi"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                bookingQuery.refetch();
                bookingStatsQuery.refetch();
                paymentQuery.refetch();
                paymentStatsQuery.refetch();
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Muat Ulang
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Order" value={stats.totalBookings.toString()} icon={ClipboardList} />
        <SummaryCard title="Booking Aktif" value={stats.activeBookings.toString()} icon={ClipboardList} />
        <SummaryCard title="Pembayaran Pending" value={stats.pendingPayments.toString()} icon={CreditCard} />
        <SummaryCard title="Revenue Terkonfirmasi" value={currency(stats.totalRevenue)} icon={CreditCard} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="orders">Order</TabsTrigger>
          <TabsTrigger value="payments">Transaksi</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Order</CardTitle>
              <CardDescription>
                {canManageCheckIn
                  ? "Seluruh lifecycle booking termasuk yang belum check-in."
                  : "Seluruh lifecycle booking tanpa aksi operasional check-in/check-out."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Properti</TableHead>
                      <TableHead>Kamar</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Periode</TableHead>
                      {canManageCheckIn ? <TableHead className="text-right">Aksi</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.length ? (
                      bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">{booking.bookingCode}</TableCell>
                          <TableCell>
                            <div>{booking.tenant.name}</div>
                            <div className="text-muted-foreground text-xs">{booking.tenant.email}</div>
                          </TableCell>
                          <TableCell>{booking.property?.name}</TableCell>
                          <TableCell>
                            <div>{booking.roomType?.name}</div>
                            <div className="text-muted-foreground text-xs">{booking.room?.roomNumber}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={booking.status === "ACTIVE" ? "default" : "secondary"}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={booking.latestPayment?.status === "PAID" ? "default" : "outline"}>
                              {booking.latestPayment?.status || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>{dateLabel(booking.startDate)}</div>
                            <div className="text-muted-foreground text-xs">
                              {dateLabel(booking.currentPeriodEnd || booking.endDate)}
                            </div>
                          </TableCell>
                          {canManageCheckIn ? (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {!booking.checkInAt && booking.status === "ACTIVE" && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateStatus.mutate({ id: booking.id, action: "check-in" })}
                                  >
                                    Check-in
                                  </Button>
                                )}
                                {booking.checkInAt && !booking.checkOutAt && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateStatus.mutate({ id: booking.id, action: "check-out" })}
                                  >
                                    Check-out
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={canManageCheckIn ? 8 : 7}
                          className="py-8 text-center text-muted-foreground"
                        >
                          Tidak ada order yang cocok.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <OrderTablePagination
                page={bookingPage}
                totalPages={bookingPaging?.total_page || 1}
                pageSize={bookingPageSize}
                totalItems={bookingPaging?.total_items || 0}
                onPageChange={setBookingPage}
                onPageSizeChange={(size) => {
                  setBookingPageSize(size);
                  setBookingPage(1);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Transaksi</CardTitle>
              <CardDescription>Riwayat pembayaran booking awal dan perpanjangan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Paid / Expired</TableHead>
                      {canMarkManualPayment ? <TableHead className="text-right">Aksi</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length ? (
                      payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="font-medium">{payment.bookingCode}</div>
                            <div className="text-muted-foreground text-xs">{payment.roomNumber}</div>
                          </TableCell>
                          <TableCell>{payment.tenantName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{payment.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={payment.status === "PAID" ? "default" : "outline"}>{payment.status}</Badge>
                          </TableCell>
                          <TableCell>{payment.paymentType || "-"}</TableCell>
                          <TableCell>{currency(payment.amount)}</TableCell>
                          <TableCell>
                            <div>{dateLabel(payment.paidAt)}</div>
                            <div className="text-muted-foreground text-xs">{dateLabel(payment.expiredAt)}</div>
                          </TableCell>
                          {canMarkManualPayment ? (
                            <TableCell className="text-right">
                              {payment.status === "PENDING" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={markManualPaid.isPending}
                                  onClick={() => handleOpenManualPaymentDialog(payment)}
                                >
                                  Tandai Lunas
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={canMarkManualPayment ? 8 : 7}
                          className="py-8 text-center text-muted-foreground"
                        >
                          Tidak ada transaksi yang cocok.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <OrderTablePagination
                page={paymentPage}
                totalPages={paymentPaging?.total_page || 1}
                pageSize={paymentPageSize}
                totalItems={paymentPaging?.total_items || 0}
                onPageChange={setPaymentPage}
                onPageSizeChange={(size) => {
                  setPaymentPageSize(size);
                  setPaymentPage(1);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!selectedManualPayment}
        onOpenChange={(open) => {
          if (!open && !markManualPaid.isPending) {
            setSelectedManualPayment(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembayaran Manual</DialogTitle>
            <DialogDescription>
              Tandai pembayaran ini sebagai lunas karena tenant sudah membayar langsung ke admin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg border p-4 text-sm">
              <div>
                <div className="text-muted-foreground">Order</div>
                <div className="font-medium">{selectedManualPayment?.bookingCode || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Tenant</div>
                <div className="font-medium">{selectedManualPayment?.tenantName || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Kategori</div>
                <div className="font-medium">{selectedManualPayment?.category || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Nominal</div>
                <div className="font-medium">{currency(selectedManualPayment?.amount || 0)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium text-sm">Metode pembayaran manual</div>
              <Select
                value={manualPaymentMethod}
                onValueChange={(value) =>
                  setManualPaymentMethod(value as (typeof MANUAL_PAYMENT_METHODS)[number]["value"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih metode pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-muted-foreground text-sm">
              Pembayaran manual tidak menambah saldo withdrawable sistem, karena uang diterima langsung oleh admin.
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedManualPayment(null)}
              disabled={markManualPaid.isPending}
            >
              Batal
            </Button>
            <Button onClick={handleConfirmManualPayment} disabled={markManualPaid.isPending}>
              {markManualPaid.isPending ? "Memproses..." : "Konfirmasi Lunas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon }: { title: string; value: string; icon: typeof ClipboardList }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium text-sm">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="font-bold text-2xl">{value}</div>
      </CardContent>
    </Card>
  );
}

function OrderTablePagination({
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
