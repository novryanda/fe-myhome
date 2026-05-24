"use client";

import { useMemo, useState } from "react";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, RefreshCcw } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

import { PageHero } from "../_components/page-hero";

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const dateLabel = (value?: string | Date | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "-";

type ProofStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUIRED";
type ProofStatusFilter = ProofStatus | "ALL";

const proofStatusTabs: Array<{ value: ProofStatusFilter; label: string }> = [
  { value: "ALL", label: "Semua" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "REVISION_REQUIRED", label: "Perlu Revisi" },
];

type ManualPaymentProofSummary = {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  revisionRequired: number;
};

type ManualPaymentProofRow = {
  id: string;
  paymentId: string;
  bookingCode: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  roomNumber: string;
  billingPeriod: string;
  invoiceAmount: number;
  transferAmount: number;
  senderName?: string | null;
  senderBank?: string | null;
  status: ProofStatus;
  createdAt: string;
  adminNote?: string | null;
};

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

type ManualPaymentProofListResponse = {
  data?: ManualPaymentProofRow[];
  summary?: ManualPaymentProofSummary;
  paging?: {
    current_page: number;
    size: number;
    total_page: number;
    total_items: number;
  };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof message === "string" && message) {
    return message;
  }

  return error instanceof Error ? error.message : fallback;
};

export default function ManualPaymentProofsPage() {
  const { data: session, isPending } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProofStatusFilter>("PENDING");
  const [propertyId, setPropertyId] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedProofId, setSelectedProofId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const proofsQuery = useQuery({
    queryKey: ["manual-payment-proofs", search, status, propertyId, page, pageSize],
    queryFn: async () => {
      const response = await api.get("/api/payments/manual-proofs", {
        params: {
          search: search || undefined,
          status: status === "ALL" ? undefined : status,
          propertyId: propertyId === "ALL" ? undefined : propertyId,
          page,
          size: pageSize,
        },
      });
      return response.data as ManualPaymentProofListResponse;
    },
    enabled: !!session?.user && session.user.role !== "USER",
    placeholderData: keepPreviousData,
  });

  const propertiesQuery = useQuery({
    queryKey: ["manual-payment-proof-properties"],
    queryFn: async () => {
      const response = await api.get("/api/properties", {
        params: { page: 1, size: 100 },
      });
      return (response.data?.data || []) as Array<{ id: string; name: string }>;
    },
    enabled: !!session?.user && session.user.role !== "USER",
  });

  const detailQuery = useQuery({
    queryKey: ["manual-payment-proof-detail", selectedProofId],
    queryFn: async () => {
      const response = await api.get(`/api/payments/manual-proofs/${selectedProofId}`);
      return response.data.data as ManualPaymentProofDetail;
    },
    enabled: !!selectedProofId,
  });

  const filePreviewQuery = useQuery({
    queryKey: ["manual-payment-proof-file-url", selectedProofId],
    queryFn: async () => {
      const response = await api.get(`/api/payments/manual-proofs/${selectedProofId}/file-url`);
      return response.data.data as { url: string };
    },
    enabled: !!selectedProofId && !!detailQuery.data,
  });

  const fileUrlMutation = useMutation({
    mutationFn: async (proofId: string) => {
      const response = await api.get(`/api/payments/manual-proofs/${proofId}/file-url`);
      return response.data.data as { url: string };
    },
    onSuccess: (data) => {
      window.open(data.url, "_blank", "noopener,noreferrer");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Gagal membuka file bukti pembayaran"));
    },
  });

  const actionMutation = useMutation({
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

      queryClient.invalidateQueries({ queryKey: ["manual-payment-proofs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-payments-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({
        queryKey: ["manual-payment-proof-detail", selectedProofId],
      });
      setAdminNote("");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Gagal memproses verifikasi bukti pembayaran"));
    },
  });

  const amountWarning = useMemo(() => {
    const detail = detailQuery.data;
    if (!detail) return null;

    const delta = detail.transferAmount - detail.payment.amount;
    if (delta === 0) return null;
    if (delta < 0) return `Nominal transfer kurang ${currency(Math.abs(delta))} dari tagihan.`;
    return `Nominal transfer lebih ${currency(delta)} dari tagihan.`;
  }, [detailQuery.data]);

  const previewUrl = filePreviewQuery.data?.url;
  const previewMimeType = detailQuery.data?.mimeType || "";
  const isImagePreview = previewMimeType.startsWith("image/");
  const isPdfPreview = previewMimeType === "application/pdf";

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
            <CardDescription>Verifikasi pembayaran manual hanya tersedia untuk admin dan superadmin.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const proofs = (proofsQuery.data?.data || []) as ManualPaymentProofRow[];
  const paging = proofsQuery.data?.paging;
  const summary = proofsQuery.data?.summary || {
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    revisionRequired: 0,
  };
  const tabCountMap: Record<ProofStatusFilter, number> = {
    ALL: summary.all,
    PENDING: summary.pending,
    APPROVED: summary.approved,
    REJECTED: summary.rejected,
    REVISION_REQUIRED: summary.revisionRequired,
  };
  const kpiCards = [
    {
      title: "Total Bukti",
      value: summary.all,
      description: "Semua bukti yang cocok dengan filter aktif.",
      tone: "text-slate-900",
      accent: "bg-slate-900/5 text-slate-700",
    },
    {
      title: "Pending Review",
      value: summary.pending,
      description: "Menunggu verifikasi dari admin.",
      tone: "text-amber-600",
      accent: "bg-amber-100 text-amber-700",
    },
    {
      title: "Approved",
      value: summary.approved,
      description: "Sudah diverifikasi dan ditandai lunas.",
      tone: "text-emerald-600",
      accent: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Rejected",
      value: summary.rejected,
      description: "Ditolak dan perlu tindak lanjut.",
      tone: "text-rose-600",
      accent: "bg-rose-100 text-rose-700",
    },
    {
      title: "Perlu Revisi",
      value: summary.revisionRequired,
      description: "Masih menunggu unggahan perbaikan.",
      tone: "text-sky-600",
      accent: "bg-sky-100 text-sky-700",
    },
  ];

  return (
    <div className="space-y-6 p-8 pt-6">
      <PageHero
        title="Verifikasi Pembayaran Manual"
        description="Review bukti transfer manual dari tenant maupun admin, lalu approve, reject, atau minta revisi."
        action={
          <div className="flex flex-wrap gap-2">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Cari tenant, booking, kamar, pengirim..."
              className="w-[320px]"
            />
            <Select
              value={propertyId}
              onValueChange={(value) => {
                setPropertyId(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Properti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Properti</SelectItem>
                {(propertiesQuery.data || []).map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpiCards.map((card) => (
          <Card key={card.title} className="border-slate-200/80 shadow-sm">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium text-muted-foreground text-sm">{card.title}</div>
                  <div className={`font-semibold text-3xl leading-none ${card.tone}`}>{card.value}</div>
                </div>
                <span
                  className={`inline-flex min-w-10 items-center justify-center rounded-full px-3 py-1 font-semibold text-xs ${card.accent}`}
                >
                  {card.value}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Bukti Pembayaran</CardTitle>
          <CardDescription>
            Proof terbaru tetap tersimpan sebagai history, termasuk bukti yang ditolak atau diminta revisi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={status}
            onValueChange={(value) => {
              setStatus(value as ProofStatusFilter);
              setPage(1);
            }}
            className="w-full"
          >
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 shadow-sm group-data-[orientation=horizontal]/tabs:h-auto">
              {proofStatusTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-10 flex-none gap-2 rounded-xl px-5 font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                >
                  <span>{tab.label}</span>
                  <span
                    className={
                      tab.value === "PENDING"
                        ? "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 font-semibold text-[11px] text-red-600 leading-none"
                        : "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-200 px-1.5 font-semibold text-[11px] text-slate-600 leading-none"
                    }
                  >
                    {tabCountMap[tab.value]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal Upload</TableHead>
                  <TableHead>Penghuni</TableHead>
                  <TableHead>Properti</TableHead>
                  <TableHead>Kamar</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Tagihan</TableHead>
                  <TableHead>Transfer</TableHead>
                  <TableHead>Pengirim</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proofs.length ? (
                  proofs.map((proof) => (
                    <TableRow key={proof.id}>
                      <TableCell>{dateLabel(proof.createdAt)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{proof.tenantName}</div>
                        <div className="text-muted-foreground text-xs">{proof.bookingCode}</div>
                      </TableCell>
                      <TableCell>{proof.propertyName}</TableCell>
                      <TableCell>{proof.roomNumber}</TableCell>
                      <TableCell>{proof.billingPeriod}</TableCell>
                      <TableCell>{currency(proof.invoiceAmount)}</TableCell>
                      <TableCell>{currency(proof.transferAmount)}</TableCell>
                      <TableCell>
                        <div>{proof.senderName || "-"}</div>
                        <div className="text-muted-foreground text-xs">{proof.senderBank || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            proof.status === "APPROVED"
                              ? "default"
                              : proof.status === "REJECTED"
                                ? "destructive"
                                : proof.status === "REVISION_REQUIRED"
                                  ? "warning"
                                  : "outline"
                          }
                        >
                          {proof.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedProofId(proof.id)}>
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                      Tidak ada bukti pembayaran yang cocok.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted-foreground text-sm">Total {paging?.total_items || 0} data</div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
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
                Halaman {page} dari {paging?.total_page || 1}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= (paging?.total_page || 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedProofId}
        onOpenChange={(open) => {
          if (!open && !actionMutation.isPending) {
            setSelectedProofId(null);
            setAdminNote("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detail Bukti Pembayaran</DialogTitle>
            <DialogDescription>
              Review detail transfer, file bukti, dan history verifikasi sebelum mengambil keputusan.
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Memuat detail bukti pembayaran...</div>
          ) : detailQuery.data ? (
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Informasi Penghuni</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="font-medium">{detailQuery.data.tenant.name}</div>
                    <div>{detailQuery.data.tenant.email}</div>
                    <div>{detailQuery.data.tenant.phone || "-"}</div>
                    <div className="pt-2 text-muted-foreground">
                      {detailQuery.data.property.name} / Unit {detailQuery.data.room.roomNumber}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Informasi Tagihan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>Booking: {detailQuery.data.booking.bookingCode}</div>
                    <div>Kategori: {detailQuery.data.payment.category}</div>
                    <div>Status Payment: {detailQuery.data.payment.status}</div>
                    <div>Nominal Tagihan: {currency(detailQuery.data.payment.amount)}</div>
                    <div>Nominal Transfer: {currency(detailQuery.data.transferAmount)}</div>
                    <div>
                      Periode Aktif: {dateLabel(detailQuery.data.booking.currentPeriodStart)} -{" "}
                      {dateLabel(detailQuery.data.booking.currentPeriodEnd)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {amountWarning ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 text-sm">
                  {amountWarning}
                </div>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informasi Transfer</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-muted-foreground">Pengirim</div>
                    <div className="font-medium">{detailQuery.data.senderName || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Bank</div>
                    <div className="font-medium">{detailQuery.data.senderBank || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Tanggal Transfer</div>
                    <div className="font-medium">{dateLabel(detailQuery.data.transferDate)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Rekening Tujuan</div>
                    <div className="font-medium">
                      {detailQuery.data.destinationAccount
                        ? `${detailQuery.data.destinationAccount.label} - ${detailQuery.data.destinationAccount.bankName}`
                        : "-"}
                    </div>
                    {detailQuery.data.destinationAccount ? (
                      <div className="text-muted-foreground text-xs">
                        {detailQuery.data.destinationAccount.accountNumber} / a.n.{" "}
                        {detailQuery.data.destinationAccount.accountHolder}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <div className="text-muted-foreground">File</div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{detailQuery.data.originalFilename}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (previewUrl) {
                            window.open(previewUrl, "_blank", "noopener,noreferrer");
                            return;
                          }

                          if (detailQuery.data?.id) {
                            fileUrlMutation.mutate(detailQuery.data.id);
                          }
                        }}
                        disabled={fileUrlMutation.isPending || filePreviewQuery.isLoading}
                      >
                        {fileUrlMutation.isPending || filePreviewQuery.isLoading ? (
                          <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="mr-2 h-4 w-4" />
                        )}
                        Buka Bukti
                      </Button>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-muted-foreground">Preview Bukti</div>
                    <div className="mt-2 overflow-hidden rounded-lg border bg-muted/20">
                      {filePreviewQuery.isLoading ? (
                        <div className="flex h-[320px] items-center justify-center text-muted-foreground text-sm">
                          Memuat preview bukti pembayaran...
                        </div>
                      ) : previewUrl && isImagePreview ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewUrl}
                            alt={detailQuery.data.originalFilename}
                            className="max-h-[420px] w-full bg-white object-contain"
                          />
                        </>
                      ) : previewUrl && isPdfPreview ? (
                        <iframe
                          src={previewUrl}
                          title={detailQuery.data.originalFilename}
                          className="h-[420px] w-full bg-white"
                        />
                      ) : previewUrl ? (
                        <div className="flex h-[220px] flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground text-sm">
                          <div>Preview inline belum tersedia untuk tipe file ini.</div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Buka di Tab Baru
                          </Button>
                        </div>
                      ) : (
                        <div className="flex h-[220px] items-center justify-center px-4 text-center text-muted-foreground text-sm">
                          Preview bukti belum tersedia. Gunakan tombol "Buka Bukti" untuk mencoba memuat ulang file.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-muted-foreground">Catatan Tenant/Admin Pengunggah</div>
                    <div className="font-medium">{detailQuery.data.note || "-"}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-muted-foreground">Catatan Admin Terakhir</div>
                    <div className="font-medium">{detailQuery.data.adminNote || "-"}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Riwayat Verifikasi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {detailQuery.data.logs.length ? (
                    detailQuery.data.logs.map((log) => (
                      <div key={log.id} className="rounded-lg border bg-muted/30 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">{log.action}</div>
                          <div className="text-muted-foreground">{dateLabel(log.createdAt)}</div>
                        </div>
                        <div className="text-muted-foreground">
                          {log.performedBy.name} ({log.performedBy.role})
                        </div>
                        <div>{log.note || "-"}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground text-sm">Belum ada history verifikasi.</div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-2">
                <Label htmlFor="manual-proof-admin-note">Catatan Admin</Label>
                <Textarea
                  id="manual-proof-admin-note"
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  placeholder="Isi alasan reject/revisi atau catatan approval"
                  disabled={actionMutation.isPending}
                />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Detail bukti pembayaran tidak tersedia.</div>
          )}

          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedProofId(null);
                setAdminNote("");
              }}
              disabled={actionMutation.isPending}
            >
              Tutup
            </Button>
            {detailQuery.data && detailQuery.data.status !== "APPROVED" ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  disabled={actionMutation.isPending}
                  onClick={() => {
                    if (!detailQuery.data?.id) return;

                    actionMutation.mutate({
                      proofId: detailQuery.data.id,
                      action: "request-revision",
                      admin_note: adminNote,
                    });
                  }}
                >
                  Minta Revisi
                </Button>
                <Button
                  variant="destructive"
                  disabled={actionMutation.isPending}
                  onClick={() => {
                    if (!detailQuery.data?.id) return;

                    actionMutation.mutate({
                      proofId: detailQuery.data.id,
                      action: "reject",
                      admin_note: adminNote,
                    });
                  }}
                >
                  Tolak
                </Button>
                <Button
                  disabled={actionMutation.isPending}
                  onClick={() => {
                    if (!detailQuery.data?.id) return;

                    actionMutation.mutate({
                      proofId: detailQuery.data.id,
                      action: "approve",
                      admin_note: adminNote || undefined,
                    });
                  }}
                >
                  Approve & Tandai Lunas
                </Button>
              </div>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
