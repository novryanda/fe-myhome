"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TenantManualPaymentDialog } from "@/components/tenant-manual-payment-dialog";
import { TenantPaymentMethod, TenantPaymentMethodDialog } from "@/components/tenant-payment-method-dialog";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const dateLabel = (value?: string | Date | null) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "-";

const addPricingPeriod = (start: string | Date, pricingType?: string | null) => {
  const nextDate = new Date(start);

  if (pricingType === "WEEKLY") nextDate.setDate(nextDate.getDate() + 7);
  if (pricingType === "MONTHLY") nextDate.setMonth(nextDate.getMonth() + 1);
  if (pricingType === "THREE_MONTHLY") nextDate.setMonth(nextDate.getMonth() + 3);
  if (pricingType === "YEARLY") nextDate.setFullYear(nextDate.getFullYear() + 1);

  return nextDate;
};

type BookingPayment = {
  id?: string;
  status?: string;
  category?: string;
  paymentUrl?: string | null;
  expiredAt?: string | Date | null;
  amountMatchesCurrentPricing?: boolean;
  latestManualProof?: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUIRED";
    transferAmount: number;
    senderName?: string | null;
    senderBank?: string | null;
    adminNote?: string | null;
    createdAt: string;
    verifiedAt?: string | null;
  } | null;
};

type BookingCard = {
  id: string;
  bookingCode: string;
  amount: number;
  pricingType?: string;
  currentRentAmount?: number | null;
  status: string;
  isSubscription?: boolean;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  currentPeriodStart?: string | Date | null;
  currentPeriodEnd?: string | Date | null;
  nextDueDate?: string | Date | null;
  currentInitialPaymentAmount?: number | null;
  currentRenewalAmount?: number | null;
  property?: {
    id?: string | null;
    name?: string | null;
    manualPaymentAccounts?: Array<{
      id: string;
      label: string;
      bankName: string;
      accountNumber: string;
      accountHolder: string;
    }>;
  } | null;
  roomType?: { name?: string | null } | null;
  room?: { roomNumber?: string | null } | null;
  latestPayment?: BookingPayment | null;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;

    if (Array.isArray(message) && message.length > 0) {
      return message[0] || fallback;
    }

    if (typeof message === "string") {
      return message;
    }
  }

  return fallback;
};

const isPaymentLinkActive = (payment?: BookingPayment | null) => {
  if (!payment?.paymentUrl || payment.status !== "PENDING" || payment.amountMatchesCurrentPricing === false) {
    return false;
  }

  if (!payment.expiredAt) {
    return true;
  }

  return new Date(payment.expiredAt) > new Date();
};

export default function MyBookingsPage() {
  const { data: session, isPending } = useSession();
  const queryClient = useQueryClient();
  const [selectedManualBooking, setSelectedManualBooking] = useState<BookingCard | null>(null);
  const [selectedRenewalBooking, setSelectedRenewalBooking] = useState<BookingCard | null>(null);
  const [renewalMethodDefault, setRenewalMethodDefault] = useState<TenantPaymentMethod>("MIDTRANS");

  const bookingsQuery = useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const response = await api.get("/api/bookings", {
        params: { page: 1, size: 50 },
      });
      return response.data;
    },
    enabled: !!session?.user,
  });

  const cancelBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      await api.patch(`/api/bookings/${bookingId}/cancel`);
    },
    onSuccess: () => {
      toast.success("Booking dibatalkan");
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Gagal membatalkan booking"));
    },
  });

  const payBooking = useMutation({
    mutationFn: async ({ bookingId, renewal }: { bookingId: string; renewal?: boolean }) => {
      const endpoint = renewal
        ? `/api/payments/renewals/${bookingId}/snap`
        : `/api/payments/bookings/${bookingId}/snap`;
      const response = await api.post(endpoint);
      return response.data;
    },
    onSuccess: (response) => {
      const paymentUrl = response.data?.paymentUrl;
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }
      toast.error("Link pembayaran tidak tersedia");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Gagal membuat pembayaran"));
    },
  });

  if (isPending) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.24))] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const bookings = (bookingsQuery.data?.data || []) as BookingCard[];

  const handleRenewalPaymentChoice = (booking: BookingCard, preferredMethod: TenantPaymentMethod = "MIDTRANS") => {
    setRenewalMethodDefault(preferredMethod);
    setSelectedRenewalBooking(booking);
  };

  return (
    <div className="space-y-6 p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pesanan Saya</h1>
        <p className="text-muted-foreground">Lacak status booking, pembayaran, dan perpanjangan sewa Anda.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {bookings.map((booking) => {
          const rentAmount = booking.currentRentAmount ?? booking.amount;
          const hasActivePaymentLink = isPaymentLinkActive(booking.latestPayment);
          const latestManualProof = booking.latestPayment?.latestManualProof;
          const latestPaymentNeedsRefresh = booking.latestPayment?.amountMatchesCurrentPricing === false;
          const latestPaymentExpired = Boolean(
            booking.latestPayment?.status === "PENDING" &&
              booking.latestPayment?.expiredAt &&
              new Date(booking.latestPayment.expiredAt) <= new Date(),
          );
          const displayPaymentStatus = latestPaymentNeedsRefresh
            ? "UPDATE_HARGA"
            : latestPaymentExpired
              ? "EXPIRED"
              : booking.latestPayment?.status || "-";
          const canRetryInitialPayment =
            booking.status === "PENDING_PAYMENT" ||
            (booking.status === "EXPIRED" &&
              (!booking.latestPayment || booking.latestPayment?.category === "BOOKING") &&
              booking.latestPayment?.status !== "PAID");
          const canUploadManualProof =
            (canRetryInitialPayment || (booking.status === "ACTIVE" && booking.isSubscription)) &&
            latestManualProof?.status !== "PENDING" &&
            latestManualProof?.status !== "APPROVED";
          const visibleManualAccounts = booking.property?.manualPaymentAccounts || [];
          const hasVisibleManualAccounts = visibleManualAccounts.length > 0;
          const manualProofButtonLabel =
            latestManualProof?.status === "REJECTED" || latestManualProof?.status === "REVISION_REQUIRED"
              ? "Upload Ulang Bukti"
              : "Upload Bukti Pembayaran";

          return (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{booking.property?.name}</CardTitle>
                    <CardDescription>
                      {booking.roomType?.name} / {booking.room?.roomNumber}
                    </CardDescription>
                  </div>
                  <Badge variant={booking.status === "ACTIVE" ? "default" : "secondary"}>{booking.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Kode Booking</div>
                    <div className="font-medium">{booking.bookingCode}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Nominal Sewa</div>
                    <div className="font-medium">{currency(rentAmount)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Mulai</div>
                    <div>{dateLabel(booking.startDate)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Akhir Periode</div>
                    <div>{dateLabel(booking.currentPeriodEnd || booking.endDate)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Pembayaran Terakhir</div>
                    <div>{displayPaymentStatus}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Next Due</div>
                    <div>{dateLabel(booking.nextDueDate)}</div>
                  </div>
                </div>

                {latestManualProof ? (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">Status Bukti Pembayaran Manual</div>
                      <Badge
                        variant={
                          latestManualProof.status === "APPROVED"
                            ? "default"
                            : latestManualProof.status === "REJECTED"
                              ? "destructive"
                              : latestManualProof.status === "REVISION_REQUIRED"
                                ? "warning"
                                : "outline"
                        }
                      >
                        {latestManualProof.status}
                      </Badge>
                    </div>
                    <div className="mt-2 text-muted-foreground">
                      Upload terakhir {dateLabel(latestManualProof.createdAt)} untuk nominal {currency(latestManualProof.transferAmount)}.
                    </div>
                    {latestManualProof.adminNote ? (
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">Catatan admin:</span> {latestManualProof.adminNote}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {canRetryInitialPayment && (
                    <>
                      <Button onClick={() => payBooking.mutate({ bookingId: booking.id })}>
                        {booking.status === "EXPIRED" ? "Buat Ulang Pembayaran" : "Bayar Sekarang"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => cancelBooking.mutate(booking.id)}
                        disabled={booking.status !== "PENDING_PAYMENT"}
                      >
                        Batalkan
                      </Button>
                    </>
                  )}
                  {booking.status === "ACTIVE" && booking.isSubscription && (
                    <Button variant="outline" onClick={() => handleRenewalPaymentChoice(booking)}>
                      Pilih Pembayaran Perpanjangan
                    </Button>
                  )}
                  {canUploadManualProof && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (booking.status === "ACTIVE" && booking.isSubscription) {
                          handleRenewalPaymentChoice(booking, "MANUAL");
                          return;
                        }

                        setSelectedManualBooking(booking);
                      }}
                      disabled={!hasVisibleManualAccounts}
                    >
                      {manualProofButtonLabel}
                    </Button>
                  )}
                  {hasActivePaymentLink && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (booking.latestPayment?.paymentUrl) {
                          window.location.href = booking.latestPayment.paymentUrl;
                        }
                      }}
                    >
                      Lanjutkan Pembayaran
                    </Button>
                  )}
                </div>
                {canUploadManualProof && !hasVisibleManualAccounts ? (
                  <div className="text-sm text-amber-700">
                    Pembayaran manual belum tersedia karena admin belum menambahkan rekening tujuan untuk properti ini.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <TenantManualPaymentDialog
        open={!!selectedManualBooking}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedManualBooking(null);
          }
        }}
        submitUrl={
          selectedManualBooking
            ? selectedManualBooking.status === "ACTIVE" && selectedManualBooking.isSubscription
              ? `/api/payments/renewals/${selectedManualBooking.id}/manual-proof`
              : `/api/payments/bookings/${selectedManualBooking.id}/manual-proof`
            : ""
        }
        propertyName={selectedManualBooking?.property?.name}
        roomLabel={
          selectedManualBooking
            ? `${selectedManualBooking.roomType?.name || "-"} / ${selectedManualBooking.room?.roomNumber || "-"}`
            : null
        }
        bookingCode={selectedManualBooking?.bookingCode || "-"}
        periodLabel={
          selectedManualBooking
            ? selectedManualBooking.status === "ACTIVE" && selectedManualBooking.isSubscription
              ? (() => {
                  const renewalStart = selectedManualBooking.currentPeriodEnd || selectedManualBooking.endDate;
                  if (!renewalStart) {
                    return null;
                  }

                  const renewalEnd = addPricingPeriod(renewalStart, selectedManualBooking.pricingType);
                  return `${dateLabel(renewalStart)} - ${dateLabel(renewalEnd)}`;
                })()
              : `${dateLabel(selectedManualBooking.currentPeriodStart || selectedManualBooking.startDate)} - ${dateLabel(
                  selectedManualBooking.currentPeriodEnd || selectedManualBooking.endDate,
                )}`
            : null
        }
        amount={selectedManualBooking?.currentRenewalAmount || selectedManualBooking?.currentInitialPaymentAmount || 0}
        manualPaymentAccounts={selectedManualBooking?.property?.manualPaymentAccounts || []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
          setSelectedManualBooking(null);
        }}
      />

      <TenantPaymentMethodDialog
        open={!!selectedRenewalBooking}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRenewalBooking(null);
          }
        }}
        title="Pilih Pembayaran Perpanjangan"
        description="Tentukan apakah Anda ingin membuat pembayaran perpanjangan lewat Midtrans atau transfer manual."
        amount={selectedRenewalBooking?.currentRenewalAmount || selectedRenewalBooking?.currentInitialPaymentAmount || 0}
        propertyName={selectedRenewalBooking?.property?.name}
        roomLabel={
          selectedRenewalBooking
            ? `${selectedRenewalBooking.roomType?.name || "-"} / ${selectedRenewalBooking.room?.roomNumber || "-"}`
            : null
        }
        bookingCode={selectedRenewalBooking?.bookingCode || "-"}
        manualPaymentAccounts={selectedRenewalBooking?.property?.manualPaymentAccounts || []}
        defaultMethod={renewalMethodDefault}
        isSubmitting={payBooking.isPending}
        onContinue={(method) => {
          if (!selectedRenewalBooking) {
            return;
          }

          if (method === "MIDTRANS") {
            payBooking.mutate({ bookingId: selectedRenewalBooking.id, renewal: true });
            setSelectedRenewalBooking(null);
            return;
          }

          setSelectedManualBooking(selectedRenewalBooking);
          setSelectedRenewalBooking(null);
        }}
      />
    </div>
  );
}
