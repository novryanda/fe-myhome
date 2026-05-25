"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bed,
  Building,
  Calendar,
  CreditCard,
  ExternalLink,
  History,
  ReceiptText,
  RefreshCcw,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { AdminManualPaymentDialog } from "@/components/admin-manual-payment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

type RoomStatus = "AVAILABLE" | "RESERVED" | "BOOKED" | "OCCUPIED" | "MAINTENANCE";

type RoomDetail = {
  id: string;
  roomNumber: string;
  status: RoomStatus;
  roomTypeId: string;
  roomTypeName: string;
  propertyId: string;
  propertyName: string;
  currentBooking?: {
    id: string;
    bookingCode: string;
    tenantName: string;
    tenantEmail: string;
    tenantPhone?: string | null;
    checkInAt?: string | Date | null;
    nextDueDate?: string | Date | null;
  } | null;
};

type PaymentHistoryRow = {
  id: string;
  bookingId: string;
  bookingCode: string;
  roomId?: string | null;
  roomTypeId?: string | null;
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
  bookingStartDate?: string | Date | null;
  bookingEndDate?: string | Date | null;
  extension?: {
    id: string;
    startDate: string;
    endDate: string;
  } | null;
  latestManualProof?: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUIRED";
    transferAmount: number;
    adminNote?: string | null;
    createdAt: string;
  } | null;
};

type ProofStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUIRED";

type ManualPaymentProofDetail = {
  id: string;
  status: ProofStatus;
  senderName?: string | null;
  senderBank?: string | null;
  transferDate?: string | null;
  transferAmount: number;
  note?: string | null;
  adminNote?: string | null;
  mimeType: string;
  fileSize: number;
  originalFilename: string;
  createdAt: string;
  verifiedAt?: string | null;
  payment: {
    id: string;
    amount: number;
    category: string;
    status: string;
    paymentType?: string | null;
    paidAt?: string | null;
  };
  booking: {
    bookingCode: string;
    pricingType: string;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    nextDueDate?: string | null;
  };
  tenant: {
    name: string;
    email: string;
    phone?: string | null;
  };
  room: {
    roomNumber: string;
  };
  property: {
    name: string;
    address: string;
  };
  destinationAccount?: {
    id?: string | null;
    label: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  } | null;
  fileUrlEndpoint: string;
  logs: Array<{
    id: string;
    action: string;
    previousStatus?: string | null;
    newStatus: string;
    note?: string | null;
    createdAt: string;
    performedBy: {
      name: string;
      email: string;
      role: string;
    };
  }>;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const maybeMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;

  if (typeof maybeMessage === "string" && maybeMessage) {
    return maybeMessage;
  }

  return error instanceof Error ? error.message : fallback;
};

const dateLabel = (value?: string | Date | null) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "-";

const dateTimeLabel = (value?: string | Date | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "-";

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const formatPaymentType = (type?: string | null) => {
  if (!type) return "-";
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const statusLabelMap: Record<RoomStatus, string> = {
  AVAILABLE: "Tersedia",
  RESERVED: "Dipesan",
  BOOKED: "Booking Aktif",
  OCCUPIED: "Terisi",
  MAINTENANCE: "Perbaikan",
};

const statusVariantMap: Record<RoomStatus, "success" | "warning" | "destructive" | "secondary"> = {
  AVAILABLE: "success",
  RESERVED: "warning",
  BOOKED: "warning",
  OCCUPIED: "destructive",
  MAINTENANCE: "secondary",
};

interface RoomUnitDetailClientProps {
  roomId: string;
}

export default function RoomUnitDetailClient({ roomId }: RoomUnitDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedManualPayment, setSelectedManualPayment] = useState<PaymentHistoryRow | null>(null);
  const [selectedProofId, setSelectedProofId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");

  // Fetch manual proof detail
  const proofDetailQuery = useQuery({
    queryKey: ["manual-payment-proof-detail", selectedProofId],
    queryFn: async () => {
      const response = await api.get(`/api/payments/manual-proofs/${selectedProofId}`);
      return response.data.data as ManualPaymentProofDetail;
    },
    enabled: !!selectedProofId,
  });

  // Fetch presigned URL for the uploaded file
  const proofFileQuery = useQuery({
    queryKey: ["manual-payment-proof-file-url", selectedProofId],
    queryFn: async () => {
      const response = await api.get(`/api/payments/manual-proofs/${selectedProofId}/file-url`);
      return response.data.data as { url: string };
    },
    enabled: !!selectedProofId && !!proofDetailQuery.data,
  });

  // Mutation to verify / reject / request revision
  const proofActionMutation = useMutation({
    mutationFn: async ({
      proofId,
      action,
      admin_note,
    }: {
      proofId: string;
      action: "approve" | "reject" | "request-revision";
      admin_note?: string;
    }) => {
      const response = await api.post(`/api/payments/manual-proofs/${proofId}/${action}`, {
        admin_note,
      });
      return response.data.data?.data || response.data.data;
    },
    onSuccess: (data, variables) => {
      if (data?.warning) {
        toast.warning(data.warning);
      } else {
        toast.success(
          variables.action === "approve"
            ? "Pembayaran manual berhasil diverifikasi."
            : variables.action === "reject"
              ? "Bukti pembayaran berhasil ditolak."
              : "Permintaan revisi berhasil dikirim.",
        );
      }

      queryClient.invalidateQueries({ queryKey: ["room-payment-history-page", roomId] });
      queryClient.invalidateQueries({ queryKey: ["room-unit-detail", roomId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-payments-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bookings-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["manual-payment-proofs"] });
      setAdminNote("");
      setSelectedProofId(null);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Gagal memproses verifikasi bukti pembayaran"));
    },
  });

  // 1. Fetch Room Details
  const roomQuery = useQuery({
    queryKey: ["room-unit-detail", roomId],
    queryFn: async () => {
      const response = await api.get(`/api/room-types/rooms/${roomId}`);
      return response.data?.data as RoomDetail;
    },
  });

  const room = roomQuery.data;

  // 2. Fetch Payment History
  const paymentHistoryQuery = useQuery({
    queryKey: ["room-payment-history-page", roomId, "PAID", page, pageSize],
    queryFn: async () => {
      const response = await api.get("/api/payments", {
        params: {
          roomId,
          status: "PAID",
          page,
          size: pageSize,
        },
      });
      return response.data;
    },
    enabled: !!roomId,
  });

  const payments = useMemo(
    () => (paymentHistoryQuery.data?.data || []) as PaymentHistoryRow[],
    [paymentHistoryQuery.data],
  );
  const paging = paymentHistoryQuery.data?.paging;

  // Helper to format billing period
  const getPaymentPeriod = (payment: PaymentHistoryRow) => {
    if (payment.extension?.startDate) {
      return `${dateLabel(payment.extension.startDate)} - ${dateLabel(payment.extension.endDate)}`;
    }
    if (payment.category === "BOOKING" || payment.category === "RENT") {
      if (payment.bookingStartDate) {
        return `${dateLabel(payment.bookingStartDate)} - ${dateLabel(payment.bookingEndDate)}`;
      }
    }
    if (payment.category === "DEPOSIT") {
      return "Uang Jaminan (Deposit)";
    }
    return formatPaymentType(payment.category);
  };

  const handleBack = () => {
    router.push("/dashboard/rooms");
  };

  if (roomQuery.isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-8 w-60" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center max-w-xl mx-auto mt-20">
        <Building className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
        <h3 className="mb-1 text-xl font-bold">Kamar tidak ditemukan</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Kamar yang Anda cari tidak terdaftar atau Anda tidak memiliki akses untuk melihatnya.
        </p>
        <Button onClick={() => router.push("/dashboard/rooms")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Kamar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-6 px-4 md:px-0">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div className="flex items-center space-x-3.5">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full shrink-0 border-border/60 hover:bg-muted"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-extrabold text-2xl md:text-3xl tracking-tight text-foreground flex items-center gap-2">
              <Building className="h-6 w-6 text-primary" />
              Detail Unit {room.roomNumber}
            </h2>
            <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
              Kelola status, data penghuni aktif, dan histori transaksi pembayaran unit kamar.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-9 text-xs rounded-xl border-border/80"
            onClick={() => {
              roomQuery.refetch();
              paymentHistoryQuery.refetch();
            }}
          >
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Grid 2-Column Info */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Card 1: Ringkasan Kamar */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="mb-4 font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
              <Bed className="h-4 w-4 text-primary" />
              Ringkasan Unit Kamar
            </div>
            <div className="grid gap-3.5 grid-cols-2">
              <div className="rounded-xl bg-muted/5 border border-border/40 px-4 py-2.5">
                <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Nomor Kamar</div>
                <div className="mt-0.5 font-bold text-base text-foreground">{room.roomNumber}</div>
              </div>
              <div className="rounded-xl bg-muted/5 border border-border/40 px-4 py-2.5">
                <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Status</div>
                <div className="mt-1">
                  <Badge variant={statusVariantMap[room.status]}>{statusLabelMap[room.status]}</Badge>
                </div>
              </div>
              <div className="rounded-xl bg-muted/5 border border-border/40 px-4 py-2.5 col-span-2">
                <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Tipe Kamar</div>
                <div className="mt-0.5 font-semibold text-sm text-foreground">{room.roomTypeName}</div>
              </div>
              <div className="rounded-xl bg-muted/5 border border-border/40 px-4 py-2.5 col-span-2">
                <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Properti</div>
                <div className="mt-0.5 font-medium text-sm text-muted-foreground">{room.propertyName}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Informasi Penghuni */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="mb-4 font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
              <UserRound className="h-4 w-4 text-primary" />
              Informasi Penghuni Aktif
            </div>
            {room.currentBooking ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 w-fit">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {room.currentBooking.tenantName}
                </div>
                <div className="grid gap-3.5 grid-cols-2">
                  <div className="rounded-xl bg-muted/5 border border-border/40 px-4 py-2 col-span-2">
                    <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Email</div>
                    <div className="mt-0.5 break-all text-xs font-medium text-foreground">
                      {room.currentBooking.tenantEmail}
                    </div>
                  </div>
                  <div className="rounded-xl bg-muted/5 border border-border/40 px-4 py-2">
                    <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                      No. Telepon
                    </div>
                    <div className="mt-0.5 text-xs font-medium text-foreground">
                      {room.currentBooking.tenantPhone || "-"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-muted/5 border border-border/40 px-4 py-2">
                    <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Check-in</div>
                    <div className="mt-0.5 text-xs font-medium text-foreground">
                      {dateLabel(room.currentBooking.checkInAt)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-muted/5 border border-border/40 px-4 py-2">
                    <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                      Kode Booking
                    </div>
                    <div className="mt-0.5 text-xs font-mono break-all font-semibold text-foreground">
                      {room.currentBooking.bookingCode}
                    </div>
                  </div>
                  <div className="rounded-xl bg-muted/5 border border-border/40 px-4 py-2">
                    <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                      Jatuh Tempo
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {dateLabel(room.currentBooking.nextDueDate)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl border border-dashed border-border/60 text-center text-xs text-muted-foreground h-[178px]">
                <UserRound className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <span>Saat ini belum ada penghuni aktif pada kamar ini.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Riwayat Pembayaran Section */}
      <div className="rounded-2xl border border-border/60 shadow-sm bg-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/50 px-6 py-4.5 lg:flex-row lg:items-center lg:justify-between bg-muted/5">
          <div className="min-w-0">
            <div className="font-bold text-base text-foreground flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              Histori Transaksi Pembayaran
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Histori seluruh pembayaran unit kamar ini lintas tenant, termasuk uang jaminan (deposit), booking awal,
              dan perpanjangan sewa.
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="overflow-x-auto rounded-xl border border-border/50 shadow-inner">
            <Table>
              <TableHeader className="bg-muted/15">
                <TableRow>
                  <TableHead className="text-xs font-bold py-3.5">Booking</TableHead>
                  <TableHead className="text-xs font-bold py-3.5">Tenant</TableHead>
                  <TableHead className="text-xs font-bold py-3.5">Nominal</TableHead>
                  <TableHead className="text-xs font-bold py-3.5">Metode</TableHead>
                  <TableHead className="text-xs font-bold py-3.5">Periode Pembayaran</TableHead>
                  <TableHead className="text-xs font-bold py-3.5">Tanggal Bayar</TableHead>
                  <TableHead className="text-xs font-bold py-3.5">Status</TableHead>
                  <TableHead className="text-xs font-bold text-right py-3.5">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistoryQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                      Memuat histori pembayaran...
                    </TableCell>
                  </TableRow>
                ) : payments.length ? (
                  payments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-muted/5 transition-colors">
                      <TableCell className="align-middle py-3.5">
                        <div className="font-mono text-[11px] font-semibold text-foreground tracking-wider">
                          {payment.bookingCode}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{payment.category}</div>
                      </TableCell>
                      <TableCell className="align-middle py-3.5">
                        <div className="font-semibold text-xs text-foreground">{payment.tenantName}</div>
                      </TableCell>
                      <TableCell className="align-middle py-3.5">
                        <div className="font-bold text-xs text-foreground">{currency(payment.amount)}</div>
                      </TableCell>
                      <TableCell className="align-middle py-3.5">
                        <div className="text-xs font-semibold text-muted-foreground">
                          {formatPaymentType(payment.paymentType)}
                        </div>
                      </TableCell>
                      <TableCell className="align-middle py-3.5">
                        <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {getPaymentPeriod(payment)}
                        </div>
                      </TableCell>
                      <TableCell className="align-middle py-3.5 text-xs">
                        {payment.status === "PAID" && payment.paidAt ? (
                          <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {dateTimeLabel(payment.paidAt)}
                          </div>
                        ) : (
                          <div className="text-muted-foreground font-medium">-</div>
                        )}
                      </TableCell>
                      <TableCell className="align-middle py-3.5">
                        <div className="flex flex-col gap-1">
                          {payment.status === "PAID" ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none text-white text-[10px] px-1.5 py-0.5 w-fit font-bold">
                              PAID
                            </Badge>
                          ) : payment.status === "PENDING" ? (
                            <Badge
                              variant="outline"
                              className="text-amber-500 border-amber-500 bg-amber-500/5 text-[10px] px-1.5 py-0.5 w-fit font-bold"
                            >
                              PENDING
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 w-fit font-medium">
                              {payment.status}
                            </Badge>
                          )}
                          {payment.latestManualProof ? (
                            <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                              Proof: {payment.latestManualProof.status}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-middle py-3.5">
                        <div className="flex justify-end gap-1.5">
                          {payment.latestManualProof && (
                            <Button
                              size="xs"
                              variant="outline"
                              className="h-7 px-2.5 text-[10px] font-bold rounded-lg border-border/80 text-foreground hover:bg-muted transition-colors"
                              onClick={() => setSelectedProofId(payment.latestManualProof!.id)}
                            >
                              Detail Bukti
                            </Button>
                          )}
                          {payment.status === "PENDING" ? (
                            <Button
                              size="xs"
                              variant="outline"
                              className="h-7 px-2.5 text-[10px] font-bold rounded-lg border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                              onClick={() => setSelectedManualPayment(payment)}
                            >
                              Bayar Manual
                            </Button>
                          ) : !payment.latestManualProof ? (
                            <span className="text-xs text-muted-foreground font-medium">-</span>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                      Belum ada histori pembayaran untuk unit kamar ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination controls */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pt-2">
            <div className="text-xs text-muted-foreground font-medium">
              Total <span className="text-foreground font-semibold">{paging?.total_items || 0}</span> transaksi, halaman{" "}
              <span className="text-foreground font-semibold">{paging?.current_page || page}</span> dari{" "}
              <span className="text-foreground font-semibold">{paging?.total_page || 1}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[110px] h-8 rounded-lg text-xs bg-background border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-xl text-xs">
                  {[5, 10, 20, 50].map((size) => (
                    <SelectItem key={size} value={String(size)} className="rounded-md">
                      {size} / hal
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs"
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= (paging?.total_page || 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Payment Dialog */}
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
        propertyId={selectedManualPayment?.propertyId || room.propertyId}
        propertyName={selectedManualPayment?.propertyName || room.propertyName}
        roomLabel={
          selectedManualPayment
            ? `${selectedManualPayment.roomTypeName || room.roomTypeName || "-"} / Unit ${selectedManualPayment.roomNumber || room.roomNumber || "-"}`
            : "-"
        }
        periodLabel={selectedManualPayment?.category || "-"}
        amount={selectedManualPayment?.amount || 0}
        onSuccess={() => {
          setSelectedManualPayment(null);
          queryClient.invalidateQueries({ queryKey: ["dashboard-payments"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-payments-stats"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-bookings"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-bookings-stats"] });
          queryClient.invalidateQueries({ queryKey: ["tenants"] });
          queryClient.invalidateQueries({ queryKey: ["manual-payment-proofs"] });
          queryClient.invalidateQueries({ queryKey: ["room-payment-history-page", roomId] });
        }}
      />
      {/* Dialog Preview Bukti Transfer Manual */}
      <Dialog
        open={!!selectedProofId}
        onOpenChange={(open) => {
          if (!open && !proofActionMutation.isPending) {
            setSelectedProofId(null);
            setAdminNote("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detail Bukti Pembayaran</DialogTitle>
            <DialogDescription>
              Review detail transfer, file bukti, dan riwayat verifikasi bukti pembayaran manual ini.
            </DialogDescription>
          </DialogHeader>

          {proofDetailQuery.isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Memuat detail bukti pembayaran...</div>
          ) : proofDetailQuery.data ? (
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardContent className="pt-6 space-y-2 text-sm">
                    <div className="font-bold text-base text-foreground mb-2">Informasi Penghuni</div>
                    <div className="font-medium">{proofDetailQuery.data.tenant.name}</div>
                    <div>{proofDetailQuery.data.tenant.email}</div>
                    <div>{proofDetailQuery.data.tenant.phone || "-"}</div>
                    <div className="pt-2 text-muted-foreground text-xs">
                      {proofDetailQuery.data.property.name} / Unit {proofDetailQuery.data.room.roomNumber}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 space-y-2 text-sm">
                    <div className="font-bold text-base text-foreground mb-2">Informasi Tagihan</div>
                    <div>Kode Booking: {proofDetailQuery.data.booking.bookingCode}</div>
                    <div>Kategori: {proofDetailQuery.data.payment.category}</div>
                    <div>Status Pembayaran: {proofDetailQuery.data.payment.status}</div>
                    <div>Nominal Tagihan: {currency(proofDetailQuery.data.payment.amount)}</div>
                    <div>Nominal Transfer: {currency(proofDetailQuery.data.transferAmount)}</div>
                    {proofDetailQuery.data.booking.currentPeriodStart && (
                      <div>
                        Periode Sewa: {dateLabel(proofDetailQuery.data.booking.currentPeriodStart)} -{" "}
                        {dateLabel(proofDetailQuery.data.booking.currentPeriodEnd)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {proofDetailQuery.data.transferAmount !== proofDetailQuery.data.payment.amount && (
                <div className="rounded-xl border border-amber-200 bg-amber-500/5 px-4 py-3 text-amber-600 text-xs font-semibold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  {proofDetailQuery.data.transferAmount < proofDetailQuery.data.payment.amount
                    ? `Peringatan: Nominal transfer kurang ${currency(proofDetailQuery.data.payment.amount - proofDetailQuery.data.transferAmount)} dari tagihan.`
                    : `Peringatan: Nominal transfer lebih ${currency(proofDetailQuery.data.transferAmount - proofDetailQuery.data.payment.amount)} dari tagihan.`}
                </div>
              )}

              <Card>
                <CardContent className="pt-6 grid gap-4 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2 font-bold text-base text-foreground mb-1">Informasi Transfer</div>
                  <div>
                    <div className="text-muted-foreground text-xs">Nama Pengirim</div>
                    <div className="font-semibold text-foreground">{proofDetailQuery.data.senderName || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Bank Pengirim</div>
                    <div className="font-semibold text-foreground">{proofDetailQuery.data.senderBank || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Tanggal Transfer</div>
                    <div className="font-semibold text-foreground">{dateLabel(proofDetailQuery.data.transferDate)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Rekening Tujuan</div>
                    <div className="font-semibold text-foreground">
                      {proofDetailQuery.data.destinationAccount
                        ? `${proofDetailQuery.data.destinationAccount.label} - ${proofDetailQuery.data.destinationAccount.bankName}`
                        : "-"}
                    </div>
                    {proofDetailQuery.data.destinationAccount && (
                      <div className="text-muted-foreground text-xs mt-0.5">
                        {proofDetailQuery.data.destinationAccount.accountNumber} / a.n.{" "}
                        {proofDetailQuery.data.destinationAccount.accountHolder}
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-muted-foreground text-xs">File Lampiran</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-medium truncate text-xs max-w-[200px] sm:max-w-md">
                        {proofDetailQuery.data.originalFilename}
                      </span>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          if (proofFileQuery.data?.url) {
                            window.open(proofFileQuery.data.url, "_blank", "noopener,noreferrer");
                          }
                        }}
                        disabled={proofFileQuery.isLoading || !proofFileQuery.data?.url}
                      >
                        <ExternalLink className="mr-1.5 h-3 w-3" />
                        Buka Lampiran
                      </Button>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-muted-foreground text-xs mb-2">Preview Lampiran</div>
                    <div className="overflow-hidden rounded-xl border bg-muted/5 flex items-center justify-center p-2 min-h-[200px] max-h-[450px]">
                      {proofFileQuery.isLoading ? (
                        <div className="text-xs text-muted-foreground">Memuat preview bukti pembayaran...</div>
                      ) : proofFileQuery.data?.url && proofDetailQuery.data.mimeType.startsWith("image/") ? (
                        <img
                          src={proofFileQuery.data.url}
                          alt={proofDetailQuery.data.originalFilename}
                          className="max-h-[400px] w-full object-contain rounded-lg bg-white"
                        />
                      ) : proofFileQuery.data?.url && proofDetailQuery.data.mimeType === "application/pdf" ? (
                        <iframe
                          src={proofFileQuery.data.url}
                          title={proofDetailQuery.data.originalFilename}
                          className="h-[350px] w-full bg-white rounded-lg"
                        />
                      ) : proofFileQuery.data?.url ? (
                        <div className="text-center p-4">
                          <p className="text-xs text-muted-foreground mb-3">Preview tidak tersedia untuk berkas ini.</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(proofFileQuery.data?.url, "_blank", "noopener,noreferrer")}
                          >
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Buka di Tab Baru
                          </Button>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Gagal memuat preview bukti transfer.</div>
                      )}
                    </div>
                  </div>
                  {proofDetailQuery.data.note && (
                    <div className="sm:col-span-2">
                      <div className="text-muted-foreground text-xs">Catatan Pengirim</div>
                      <div className="font-medium mt-0.5">{proofDetailQuery.data.note}</div>
                    </div>
                  )}
                  {proofDetailQuery.data.adminNote && (
                    <div className="sm:col-span-2">
                      <div className="text-muted-foreground text-xs">Catatan Admin Terakhir</div>
                      <div className="font-medium mt-0.5 text-amber-600 dark:text-amber-400">
                        {proofDetailQuery.data.adminNote}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {proofDetailQuery.data.logs && proofDetailQuery.data.logs.length > 0 && (
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <div className="font-bold text-base text-foreground mb-1">Riwayat Verifikasi</div>
                    {proofDetailQuery.data.logs.map((log) => (
                      <div key={log.id} className="rounded-xl border bg-muted/10 p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-foreground">
                          <div>Action: {log.action}</div>
                          <div className="text-muted-foreground font-normal">{dateLabel(log.createdAt)}</div>
                        </div>
                        <div className="text-muted-foreground text-[10px]">
                          Diproses oleh: {log.performedBy.name} ({log.performedBy.role})
                        </div>
                        {log.note && <div className="mt-1 text-foreground/80 font-medium">Catatan: {log.note}</div>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {proofDetailQuery.data.status === "PENDING" && (
                <div className="space-y-2">
                  <Label htmlFor="admin-note-input" className="text-xs font-bold">
                    Catatan Verifikasi Admin (Opsional)
                  </Label>
                  <Textarea
                    id="admin-note-input"
                    placeholder="Masukkan catatan keputusan verifikasi..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Detail bukti transfer tidak tersedia.</div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedProofId(null);
                setAdminNote("");
              }}
              disabled={proofActionMutation.isPending}
            >
              Tutup
            </Button>
            {proofDetailQuery.data && proofDetailQuery.data.status === "PENDING" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  disabled={proofActionMutation.isPending}
                  onClick={() => {
                    proofActionMutation.mutate({
                      proofId: proofDetailQuery.data.id,
                      action: "request-revision",
                      admin_note: adminNote,
                    });
                  }}
                >
                  Minta Revisi
                </Button>
                <Button
                  variant="destructive"
                  disabled={proofActionMutation.isPending}
                  onClick={() => {
                    proofActionMutation.mutate({
                      proofId: proofDetailQuery.data.id,
                      action: "reject",
                      admin_note: adminNote,
                    });
                  }}
                >
                  Tolak Bukti
                </Button>
                <Button
                  disabled={proofActionMutation.isPending}
                  onClick={() => {
                    proofActionMutation.mutate({
                      proofId: proofDetailQuery.data.id,
                      action: "approve",
                      admin_note: adminNote || undefined,
                    });
                  }}
                >
                  Setujui & Tandai Lunas
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
