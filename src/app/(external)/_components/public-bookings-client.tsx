"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, CreditCard, MapPin } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const dateLabel = (value?: string | Date | null) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "-";

export function PublicBookingsClient() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const bookingsQuery = useQuery({
    queryKey: ["public-my-bookings"],
    queryFn: async () => {
      const response = await api.get("/api/bookings", {
        params: { page: 1, size: 50 },
      });
      return response.data;
    },
  });

  const cancelBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      await api.patch(`/api/bookings/${bookingId}/cancel`);
    },
    onSuccess: () => {
      toast.success("Booking dibatalkan");
      queryClient.invalidateQueries({ queryKey: ["public-my-bookings"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal membatalkan booking");
    },
  });

  const bookings = bookingsQuery.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-[28px] border border-blue-100 bg-white shadow-[0_20px_60px_-30px_rgba(29,78,216,0.28)]">
          <CardContent className="p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Total pesanan</div>
            <div className="mt-2 text-4xl font-black tracking-tight text-zinc-950">{bookings.length}</div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border border-blue-100 bg-white shadow-[0_20px_60px_-30px_rgba(29,78,216,0.28)]">
          <CardContent className="p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Sedang aktif</div>
            <div className="mt-2 text-4xl font-black tracking-tight text-blue-700">
              {bookings.filter((booking: any) => booking.status === "ACTIVE").length}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border border-blue-100 bg-white shadow-[0_20px_60px_-30px_rgba(29,78,216,0.28)]">
          <CardContent className="p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Menunggu bayar</div>
            <div className="mt-2 text-4xl font-black tracking-tight text-amber-600">
              {bookings.filter((booking: any) => booking.status === "PENDING_PAYMENT").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {bookings.map((booking: any) => (
          <Card
            key={booking.id}
            className="rounded-[28px] border border-blue-100 bg-white py-0 shadow-[0_20px_60px_-30px_rgba(29,78,216,0.28)]"
          >
            <CardHeader className="border-b border-blue-100 bg-blue-50/60">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">{booking.property?.name}</CardTitle>
                  <CardDescription>
                    {booking.roomType?.name} / {booking.room?.roomNumber}
                  </CardDescription>
                </div>
                <Badge className="rounded-full bg-white px-3 text-blue-700 hover:bg-white">{booking.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl bg-zinc-50 p-3">
                  <div className="text-zinc-500">Kode Booking</div>
                  <div className="mt-1 font-semibold text-zinc-900">{booking.bookingCode}</div>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-3">
                  <div className="text-zinc-500">Nominal</div>
                  <div className="mt-1 font-semibold text-zinc-900">{currency(booking.amount)}</div>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-3">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <CalendarDays className="h-4 w-4" />
                    Mulai Sewa
                  </div>
                  <div className="mt-1 font-semibold text-zinc-900">{dateLabel(booking.startDate)}</div>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-3">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <CreditCard className="h-4 w-4" />
                    Pembayaran
                  </div>
                  <div className="mt-1 font-semibold text-zinc-900">{booking.latestPayment?.status || "-"}</div>
                </div>
              </div>

              <div className="rounded-3xl bg-blue-50/70 p-4 text-sm">
                <div className="flex items-start gap-2 text-zinc-600">
                  <MapPin className="mt-0.5 h-4 w-4 text-blue-700" />
                  <div>
                    <div className="font-semibold text-zinc-900">{booking.property?.name}</div>
                    <div className="mt-1">
                      Periode aktif sampai {dateLabel(booking.currentPeriodEnd || booking.endDate)}. Next due{" "}
                      {dateLabel(booking.nextDueDate)}.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {booking.status === "PENDING_PAYMENT" ? (
                  <>
                    <Button
                      className="rounded-full bg-blue-700 hover:bg-blue-700"
                      onClick={() => router.push(`/my-bookings/${booking.id}/payment`)}
                    >
                      Bayar Sekarang
                    </Button>
                    <Button variant="outline" className="rounded-full" onClick={() => cancelBooking.mutate(booking.id)}>
                      Batalkan
                    </Button>
                  </>
                ) : null}
                {booking.status === "ACTIVE" && booking.isSubscription ? (
                  <Button variant="outline" className="rounded-full" onClick={() => router.push(`/my-bookings/${booking.id}/payment`)}>
                    Bayar Perpanjangan
                  </Button>
                ) : null}
                {booking.latestPayment?.paymentUrl && booking.latestPayment?.status === "PENDING" ? (
                  <Button
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => router.push(`/my-bookings/${booking.id}/payment`)}
                  >
                    Lanjutkan Pembayaran
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bookings.length === 0 ? (
        <Card className="rounded-[28px] border border-dashed border-blue-200 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <div className="text-2xl font-black tracking-tight text-zinc-950">Belum ada pesanan</div>
            <p className="max-w-md text-sm leading-6 text-zinc-500">
              Mulai jelajahi properti publik, pilih kamar yang cocok, lalu buat Pemesanan
            </p>
            <Link href="/">
              <Button className="rounded-full bg-blue-700 hover:bg-blue-700">
                Cari Kamar Sekarang
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
