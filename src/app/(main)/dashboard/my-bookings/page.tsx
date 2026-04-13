"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const dateLabel = (value?: string | Date | null) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "-";

type BookingPayment = {
  status?: string;
  category?: string;
  paymentUrl?: string | null;
  expiredAt?: string | Date | null;
  amountMatchesCurrentPricing?: boolean;
};

type BookingCard = {
  id: string;
  bookingCode: string;
  amount: number;
  currentRentAmount?: number | null;
  status: string;
  isSubscription?: boolean;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  currentPeriodEnd?: string | Date | null;
  nextDueDate?: string | Date | null;
  property?: { name?: string | null } | null;
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
                    <Button
                      variant="outline"
                      onClick={() => payBooking.mutate({ bookingId: booking.id, renewal: true })}
                    >
                      Bayar Perpanjangan
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
