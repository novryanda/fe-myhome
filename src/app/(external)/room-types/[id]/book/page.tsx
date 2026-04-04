"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PublicFooter } from "@/app/(external)/_components/public-footer";
import { PublicHeader } from "@/app/(external)/_components/public-header";

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function BookRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [pricingType, setPricingType] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [isSubscription, setIsSubscription] = useState(true);

  const profileQuery = useQuery({
    queryKey: ["my-profile-me"],
    queryFn: async () => {
      const response = await api.get("/api/profile/me");
      return response.data.data;
    },
    enabled: !!session?.user,
  });

  useEffect(() => {
    const profilePhone = profileQuery.data?.phone;
    if (!profilePhone) return;
    setTenantPhone((currentValue) => currentValue || profilePhone);
  }, [profileQuery.data?.phone]);

  const query = useQuery({
    queryKey: ["book-room-type", params.id],
    queryFn: async () => {
      const response = await api.get(`/api/v1/public/room-types/${params.id}`);
      return response.data;
    },
  });

  const roomType = query.data?.data;

  const selectedPricing = useMemo(
    () => roomType?.pricingSummary?.find((pricing: any) => pricing.pricingType === pricingType),
    [roomType, pricingType],
  );

  const createBooking = useMutation({
    mutationFn: async () => {
      const bookingResponse = await api.post("/api/bookings", {
        roomTypeId: params.id,
        pricingType,
        startDate,
        isSubscription,
        tenantPhone: (tenantPhone || profileQuery.data?.phone || "").trim() || undefined,
      });
      return bookingResponse.data.data;
    },
    onSuccess: (booking) => {
      toast.success("Booking berhasil dibuat. Lanjutkan ke pembayaran.");
      router.push(`/my-bookings/${booking.id}/payment`);
    },
    onError: (error: any) => {
      if (error.response?.status === 401) {
        router.push(`/auth/login?redirect=${encodeURIComponent(`/room-types/${params.id}/book`)}`);
        return;
      }
      toast.error(error.response?.data?.message || "Gagal membuat booking");
    },
  });

  if (!roomType) {
    return <div className="p-8">Memuat form booking...</div>;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_28%,_#f8fafc_100%)]">
      <PublicHeader />
      <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
        <div className="space-y-3">
          <Badge variant="secondary">Checkout Booking</Badge>
          <h1 className="text-4xl font-bold tracking-tight">{roomType.name}</h1>
          <p className="text-muted-foreground">{roomType.property?.name} • {roomType.property?.address}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Detail Pemesanan</CardTitle>
              <CardDescription>Pilih paket sewa, tanggal mulai, dan kontak aktif Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Paket Harga</label>
                <select
                  value={pricingType}
                  onChange={(event) => setPricingType(event.target.value)}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                >
                  <option value="">Pilih paket</option>
                  {roomType.pricingSummary?.map((pricing: any) => (
                    <option key={pricing.pricingType} value={pricing.pricingType}>
                      {pricing.label} - {currency(pricing.amount)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal Mulai Sewa</label>
                <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nomor WhatsApp Tenant</label>
                <Input value={tenantPhone} onChange={(event) => setTenantPhone(event.target.value)} placeholder="08xxxxxxxxxx" />
                {session?.user && profileQuery.data?.phone ? (
                  <p className="text-xs text-muted-foreground">Nomor dari profil sudah terisi otomatis, Anda tetap bisa mengubahnya.</p>
                ) : null}
              </div>

              <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <input type="checkbox" checked={isSubscription} onChange={(event) => setIsSubscription(event.target.checked)} />
                Aktifkan perpanjangan berlangganan dengan reminder H-7
              </label>

              <Button className="w-full" disabled={!session?.user || !pricingType || createBooking.isPending} onClick={() => createBooking.mutate()}>
                {session?.user ? "Buat Booking & Lanjut ke Pembayaran" : "Login untuk Booking"}
              </Button>
              {!session?.user && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/auth/login?redirect=${encodeURIComponent(`/room-types/${params.id}/book`)}`)}
                >
                  Login
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Properti</span>
                <span>{roomType.property?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ketersediaan</span>
                <span>{roomType.availableRooms} kamar</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paket</span>
                <span>{selectedPricing ? `${selectedPricing.label}` : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Harga Sewa</span>
                <span>{selectedPricing ? currency(selectedPricing.amount) : "-"}</span>
              </div>
              {roomType.isDepositRequired && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit</span>
                  <span>{currency(roomType.depositAmount || 0)}</span>
                </div>
              )}
              <div className="rounded-lg border border-dashed p-3 text-muted-foreground">
                Total pembayaran pertama dihitung dari paket sewa yang dipilih ditambah deposit bila wajib.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
