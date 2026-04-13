"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CalendarDays, CreditCard, ExternalLink, Home, MapPin, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { PublicFooter } from "@/app/(external)/_components/public-footer";
import { PublicHeader } from "@/app/(external)/_components/public-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

const currency = (value?: number | null) =>
  typeof value === "number"
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(value)
    : "-";

const dateLabel = (value?: string | Date | null) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "-";

const isPaymentLinkActive = (
  payment?: {
    status?: string;
    paymentUrl?: string | null;
    expiredAt?: string | Date | null;
    amountMatchesCurrentPricing?: boolean;
  } | null,
) => {
  if (!payment?.paymentUrl || payment.status !== "PENDING" || payment.amountMatchesCurrentPricing === false) {
    return false;
  }

  if (!payment.expiredAt) {
    return true;
  }

  return new Date(payment.expiredAt) > new Date();
};

export default function PublicBookingPaymentClient() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const bookingQuery = useQuery({
    queryKey: ["public-booking-payment", params.id],
    queryFn: async () => {
      const response = await api.get(`/api/bookings/${params.id}`);
      return response.data;
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
      queryClient.invalidateQueries({ queryKey: ["public-booking-payment", params.id] });

      const paymentUrl = response.data?.paymentUrl;
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }

      toast.error("Link pembayaran Midtrans tidak tersedia");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal membuat pembayaran");
    },
  });

  const booking = bookingQuery.data?.data;
  const latestPayment = booking?.latestPayment;
  const rentAmount = booking?.currentRentAmount ?? booking?.amount ?? 0;
  const depositAmount = booking?.currentDepositAmount ?? booking?.depositAmount ?? 0;
  const totalFirstPayment = rentAmount + (!booking?.depositPaid ? depositAmount : 0);
  const renewalAmount = booking?.currentRenewalAmount ?? rentAmount;
  const hasActivePaymentLink = isPaymentLinkActive(latestPayment);
  const latestPaymentNeedsRefresh = latestPayment?.amountMatchesCurrentPricing === false;
  const latestPaymentExpired = Boolean(
    latestPayment?.status === "PENDING" && latestPayment?.expiredAt && new Date(latestPayment.expiredAt) <= new Date(),
  );
  const displayPaymentStatus = latestPaymentNeedsRefresh
    ? "UPDATE_HARGA"
    : latestPaymentExpired
      ? "EXPIRED"
      : latestPayment?.status || "Belum ada pembayaran dibuat.";
  const hasPendingInitialPayment = hasActivePaymentLink && latestPayment?.category === "BOOKING";
  const hasPendingRenewalPayment = hasActivePaymentLink && latestPayment?.category === "RENT";
  const canPayInitial =
    booking?.status === "PENDING_PAYMENT" ||
    (booking?.status === "EXPIRED" &&
      (!latestPayment || latestPayment?.category === "BOOKING") &&
      latestPayment?.status !== "PAID");
  const canPayRenewal = booking?.status === "ACTIVE" && booking?.isSubscription;

  if (bookingQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_28%,_#f8fafc_100%)]">
        <PublicHeader />
        <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
          <Skeleton className="h-14 w-40 rounded-full" />
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <Skeleton className="h-[420px] rounded-[32px]" />
            <Skeleton className="h-[420px] rounded-[32px]" />
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_28%,_#f8fafc_100%)]">
        <PublicHeader />
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <Card className="rounded-[32px] border border-dashed border-blue-200 bg-white py-0 text-center shadow-sm">
            <CardContent className="py-16">
              <div className="text-2xl font-black tracking-tight text-zinc-950">Booking tidak ditemukan</div>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Data booking yang ingin dibayar tidak tersedia atau Anda tidak memiliki akses.
              </p>
              <Link href="/my-bookings" className="mt-6 inline-flex">
                <Button variant="outline" className="rounded-full border-blue-200 text-blue-700 hover:bg-blue-50">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Kembali ke Pesanan Saya
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_28%,_#f8fafc_100%)]">
      <PublicHeader />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <Link href="/my-bookings" className="inline-flex">
          <Button variant="outline" className="rounded-full border-blue-200 text-blue-700 hover:bg-blue-50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Pesanan Saya
          </Button>
        </Link>

        <section className="overflow-hidden rounded-[36px] border border-blue-100 bg-[linear-gradient(135deg,_#ffffff_0%,_#eef4ff_55%,_#ffffff_100%)] shadow-[0_24px_70px_-34px_rgba(29,78,216,0.28)]">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <Badge className="rounded-full bg-blue-700 px-4 py-1 text-white hover:bg-blue-700">
                Pembayaran Booking
              </Badge>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                  {booking.property?.name}
                </h1>
                <p className="mt-2 text-sm text-zinc-500">
                  {booking.roomType?.name} / Kamar {booking.room?.roomNumber}
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-[24px] bg-white/90 p-4 text-sm text-zinc-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                <span>{booking.property?.address}</span>
              </div>
            </div>

            <div className="rounded-[30px] bg-blue-700 p-6 text-white shadow-[0_18px_45px_-28px_rgba(29,78,216,0.7)]">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
                Total pembayaran awal
              </div>
              <div className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{currency(totalFirstPayment)}</div>
              <p className="mt-3 text-sm leading-6 text-white/75">
                Termasuk biaya sewa {currency(rentAmount)}
                {depositAmount ? ` dan deposit ${currency(depositAmount)}` : ""}.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[32px] border border-blue-100 bg-white py-0 shadow-[0_20px_60px_-28px_rgba(29,78,216,0.22)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-black tracking-tight text-zinc-950">Ringkasan Pemesanan</CardTitle>
              <CardDescription>Pastikan data booking sudah benar sebelum lanjut ke Midtrans.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] bg-slate-50/80 p-4">
                  <div className="text-zinc-500">Kode Booking</div>
                  <div className="mt-1 font-semibold text-zinc-950">{booking.bookingCode}</div>
                </div>
                <div className="rounded-[24px] bg-slate-50/80 p-4">
                  <div className="text-zinc-500">Status Booking</div>
                  <div className="mt-1 font-semibold text-zinc-950">{booking.status}</div>
                </div>
                <div className="rounded-[24px] bg-slate-50/80 p-4">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <CalendarDays className="h-4 w-4" />
                    Mulai Sewa
                  </div>
                  <div className="mt-1 font-semibold text-zinc-950">{dateLabel(booking.startDate)}</div>
                </div>
                <div className="rounded-[24px] bg-slate-50/80 p-4">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Home className="h-4 w-4" />
                    Berakhir
                  </div>
                  <div className="mt-1 font-semibold text-zinc-950">{dateLabel(booking.endDate)}</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-500">Biaya sewa</span>
                  <span className="font-semibold text-zinc-950">{currency(rentAmount)}</span>
                </div>
                {depositAmount ? (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-zinc-500">Deposit</span>
                    <span className="font-semibold text-zinc-950">{currency(depositAmount)}</span>
                  </div>
                ) : null}
                <Separator />
                <div className="flex items-center justify-between gap-4 text-base">
                  <span className="font-semibold text-zinc-950">Total Bayar</span>
                  <span className="text-xl font-black tracking-tight text-blue-700">{currency(totalFirstPayment)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border border-blue-100 bg-white py-0 shadow-[0_20px_60px_-28px_rgba(29,78,216,0.22)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-black tracking-tight text-zinc-950">Pembayaran Midtrans</CardTitle>
              <CardDescription>Gunakan Midtrans untuk melanjutkan pembayaran booking ini.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-[24px] bg-blue-50/70 p-4 text-sm">
                <div className="flex items-start gap-3">
                  <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                  <div>
                    <div className="font-semibold text-zinc-950">Status pembayaran terakhir</div>
                    <div className="mt-1 text-zinc-500">{displayPaymentStatus}</div>
                  </div>
                </div>
              </div>

              {canPayInitial ? (
                <>
                  {latestPaymentNeedsRefresh && latestPayment?.category === "BOOKING" ? (
                    <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      Harga kamar sudah diperbarui admin. Sistem akan membuat link pembayaran baru dengan nominal terbaru.
                    </div>
                  ) : null}
                  {latestPaymentExpired && latestPayment?.category === "BOOKING" ? (
                    <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      Link pembayaran sebelumnya sudah expired. Klik tombol di bawah untuk membuat link Midtrans baru.
                    </div>
                  ) : null}
                  {hasPendingInitialPayment && latestPayment?.paymentUrl ? (
                    <Button
                      className="w-full rounded-full bg-blue-700 hover:bg-blue-700"
                      size="lg"
                      onClick={() => {
                        window.location.href = latestPayment.paymentUrl;
                      }}
                    >
                      Lanjut ke Midtrans
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      className="w-full rounded-full bg-blue-700 hover:bg-blue-700"
                      size="lg"
                      disabled={payBooking.isPending}
                      onClick={() => payBooking.mutate({ bookingId: booking.id })}
                    >
                      {latestPaymentExpired || booking.status === "EXPIRED"
                        ? "Buat Ulang Pembayaran"
                        : "Buat Pembayaran Midtrans"}
                      <CreditCard className="ml-2 h-4 w-4" />
                    </Button>
                  )}

                  <p className="text-center text-sm leading-6 text-zinc-500">
                    Setelah tombol ditekan, Anda akan diarahkan ke halaman checkout Midtrans untuk menyelesaikan
                    pembayaran.
                  </p>
                </>
              ) : canPayRenewal ? (
                <>
                  {latestPaymentNeedsRefresh && latestPayment?.category === "RENT" ? (
                    <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      Harga kamar sudah diperbarui admin. Buat link perpanjangan baru untuk nominal terbaru.
                    </div>
                  ) : null}
                  {latestPaymentExpired && latestPayment?.category === "RENT" ? (
                    <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      Link perpanjangan sebelumnya sudah expired. Buat link baru untuk melanjutkan pembayaran.
                    </div>
                  ) : null}
                  <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    Booking ini sudah aktif. Nominal perpanjangan saat ini adalah {currency(renewalAmount)}.
                  </div>
                  {hasPendingRenewalPayment && latestPayment?.paymentUrl ? (
                    <Button
                      className="w-full rounded-full bg-blue-700 hover:bg-blue-700"
                      size="lg"
                      onClick={() => {
                        window.location.href = latestPayment.paymentUrl;
                      }}
                    >
                      Lanjut ke Midtrans
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      className="w-full rounded-full bg-blue-700 hover:bg-blue-700"
                      size="lg"
                      disabled={payBooking.isPending}
                      onClick={() => payBooking.mutate({ bookingId: booking.id, renewal: true })}
                    >
                      {latestPaymentExpired ? "Buat Link Perpanjangan Baru" : "Buat Pembayaran Perpanjangan"}
                      <CreditCard className="ml-2 h-4 w-4" />
                    </Button>
                  )}

                  <Link href="/my-bookings" className="block">
                    <Button
                      variant="outline"
                      className="w-full rounded-full border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      Lihat Pesanan Saya
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  Booking ini tidak dapat dibayar lagi karena statusnya adalah {booking.status}.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
