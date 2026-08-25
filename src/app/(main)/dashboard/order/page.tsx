"use client";

import { useDeferredValue, useState } from "react";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, CreditCard, Download, type LucideIcon, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { AdminManualPaymentDialog } from "@/components/admin-manual-payment-dialog";
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
import { TransactionAuditDialog } from "../dashboard/_components/transaction-audit-dialog";

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const dateLabel = (value?: string | Date | null) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "-";

const categoryLabelMap: Record<string, string> = {
  BOOKING: "Pembayaran Awal",
  RENT: "Perpanjangan Sewa",
  DEPOSIT: "Deposit",
  PENALTY: "Denda",
};

const categoryLabel = (payment: PaymentRow) => {
  // RENT tanpa perpanjangan periode = pembayaran awal (admin-assign)
  if (payment.category === "RENT" && !payment.extension) {
    return "Pembayaran Awal";
  }
  return categoryLabelMap[payment.category] || payment.category;
};

const getPaymentPeriod = (payment: PaymentRow) => {
  if (payment.extension?.startDate) {
    return `${dateLabel(payment.extension.startDate)} - ${dateLabel(payment.extension.endDate)}`;
  }
  if (payment.bookingStartDate) {
    return `${dateLabel(payment.bookingStartDate)} - ${dateLabel(payment.bookingEndDate)}`;
  }
  return "-";
};

const fileStamp = () => new Date().toISOString().slice(0, 19).replaceAll(":", "-").replace("T", "_");

type PaymentRow = {
  id: string;
  bookingCode: string;
  tenantName: string;
  propertyId?: string | null;
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
  bookingStartDate?: string | Date | null;
  bookingEndDate?: string | Date | null;
  extension?: {
    id: string;
    startDate: string | Date;
    endDate: string | Date;
  } | null;
  latestManualProof?: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUIRED";
    transferAmount: number;
    adminNote?: string | null;
    createdAt: string;
  } | null;
};

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
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentPageSize, setPaymentPageSize] = useState(10);
  const [paymentMonth, setPaymentMonth] = useState("");
  const [isExportingPayments, setIsExportingPayments] = useState(false);
  const [selectedManualPayment, setSelectedManualPayment] = useState<PaymentRow | null>(null);
  const [selectedAuditTransaction, setSelectedAuditTransaction] = useState<{
    id: string;
    bookingCode: string;
  } | null>(null);

  const canMarkManualPayment = session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN";

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPaymentPage(1);
  };

  const paymentQuery = useQuery({
    queryKey: ["dashboard-payments", paymentPage, paymentPageSize, deferredSearch, paymentMonth],
    queryFn: async () => {
      const response = await api.get("/api/payments", {
        params: {
          search: deferredSearch,
          page: paymentPage,
          size: paymentPageSize,
          month: paymentMonth || undefined,
        },
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

  const paymentMonthStatsQuery = useQuery({
    queryKey: ["dashboard-payments-stats", paymentMonth],
    queryFn: async () => {
      const response = await api.get("/api/payments/stats", {
        params: { month: paymentMonth || undefined },
      });
      return response.data.data as { total: number; pending: number; paid: number; paidAmount: number };
    },
    enabled: !!session?.user && session.user.role !== "USER",
  });

  const paymentMonthStats = paymentMonthStatsQuery.data;

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

  const payments = (paymentQuery.data?.data || []) as PaymentRow[];
  const paymentPaging = paymentQuery.data?.paging;
  const paymentStats = paymentStatsQuery.data as
    | { total: number; pending: number; paid: number; paidAmount: number }
    | undefined;

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
          Kategori: categoryLabel(payment),
          Status: payment.status,
          Metode: payment.paymentType || "-",
          Nominal: payment.amount,
          Dibuat: dateLabel(payment.createdAt),
          Paid: dateLabel(payment.paidAt),
          Expired: dateLabel(payment.expiredAt),
          "Midtrans Order ID": payment.midtransOrderId || "-",
        })),
        {
          fileName: `transaksi-${fileStamp()}.xlsx`,
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
  };

  return (
    <div className="space-y-6 p-8 pt-6">
      <PageHero
        title="Transaksi"
        description="Seluruh transaksi pembayaran (pembayaran awal, perpanjangan, deposit) dari semua booking."
        action={
          <>
            <Input
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Cari booking, tenant, properti, kamar..."
              className="w-[320px]"
            />
            <Button variant="outline" onClick={handleExportPayments} disabled={isExportingPayments}>
              <Download className="mr-2 h-4 w-4" />
              {isExportingPayments ? "Mengexport..." : "Export Transaksi"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                paymentQuery.refetch();
                paymentStatsQuery.refetch();
                paymentMonthStatsQuery.refetch();
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Muat Ulang
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Transaksi" value={(paymentStats?.total ?? 0).toString()} icon={CreditCard} />
        <SummaryCard title="Transaksi Lunas" value={(paymentStats?.paid ?? 0).toString()} icon={CheckCircle2} />
        <SummaryCard title="Pembayaran Pending" value={(paymentStats?.pending ?? 0).toString()} icon={Clock} />
        <SummaryCard title="Revenue Terkonfirmasi" value={currency(paymentStats?.paidAmount ?? 0)} icon={CreditCard} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Transaksi</CardTitle>
          <CardDescription>Riwayat pembayaran booking awal dan perpanjangan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="payment-month-filter" className="font-medium text-muted-foreground text-xs">
                Filter Bulan
              </label>
              <Input
                id="payment-month-filter"
                type="month"
                value={paymentMonth}
                onChange={(event) => {
                  setPaymentMonth(event.target.value);
                  setPaymentPage(1);
                }}
                className="w-44"
              />
            </div>
            {paymentMonth ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPaymentMonth("");
                  setPaymentPage(1);
                }}
              >
                Reset Bulan
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg border bg-muted/30 px-4 py-2 text-sm">
              <span className="text-muted-foreground">Transaksi: </span>
              <span className="font-semibold">{paymentMonthStats?.total ?? 0}</span>
            </div>
            <div className="rounded-lg border bg-muted/30 px-4 py-2 text-sm">
              <span className="text-muted-foreground">Lunas ({paymentMonthStats?.paid ?? 0}): </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {currency(paymentMonthStats?.paidAmount ?? 0)}
              </span>
            </div>
            <div className="rounded-lg border bg-muted/30 px-4 py-2 text-sm">
              <span className="text-muted-foreground">Pending: </span>
              <span className="font-semibold">{paymentMonthStats?.pending ?? 0}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Properti</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Periode</TableHead>
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
                        <div>{payment.propertyName || "-"}</div>
                        {payment.roomTypeName ? (
                          <div className="text-muted-foreground text-xs">{payment.roomTypeName}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{categoryLabel(payment)}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">{getPaymentPeriod(payment)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.status === "PAID" ? "default" : "outline"}>{payment.status}</Badge>
                        {payment.latestManualProof ? (
                          <div className="mt-1 text-muted-foreground text-xs">
                            Proof: {payment.latestManualProof.status}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{payment.paymentType || "-"}</TableCell>
                      <TableCell className="font-medium">{currency(payment.amount)}</TableCell>
                      <TableCell>
                        <div>{dateLabel(payment.paidAt)}</div>
                        <div className="text-muted-foreground text-xs">{dateLabel(payment.expiredAt)}</div>
                      </TableCell>
                      {canMarkManualPayment ? (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setSelectedAuditTransaction({
                                  id: payment.id,
                                  bookingCode: payment.bookingCode,
                                })
                              }
                            >
                              Detail Audit
                            </Button>
                            {payment.status === "PENDING" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenManualPaymentDialog(payment)}
                              >
                                Tandai Bayar Manual
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={canMarkManualPayment ? 10 : 9}
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

      <AdminManualPaymentDialog
        open={!!selectedManualPayment}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedManualPayment(null);
          }
        }}
        submitUrl={selectedManualPayment ? `/api/payments/${selectedManualPayment.id}/manual-paid` : ""}
        tenantName={selectedManualPayment?.tenantName || "-"}
        bookingCode={selectedManualPayment?.bookingCode || "-"}
        propertyId={selectedManualPayment?.propertyId}
        propertyName={selectedManualPayment?.propertyName}
        roomLabel={selectedManualPayment?.roomNumber || "-"}
        periodLabel={selectedManualPayment?.category || "-"}
        amount={selectedManualPayment?.amount || 0}
        onSuccess={() => {
          setSelectedManualPayment(null);
          queryClient.invalidateQueries({ queryKey: ["dashboard-payments"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-payments-stats"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-bookings"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-bookings-stats"] });
          queryClient.invalidateQueries({ queryKey: ["tenants"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
          queryClient.invalidateQueries({ queryKey: ["manual-payment-proofs"] });
        }}
      />

      <TransactionAuditDialog
        transactionId={selectedAuditTransaction?.id ?? null}
        transactionLabel={selectedAuditTransaction?.bookingCode ?? ""}
        open={!!selectedAuditTransaction}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAuditTransaction(null);
          }
        }}
      />
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon }: { title: string; value: string; icon: LucideIcon }) {
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
