"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bath, Bed, CalendarDays, CheckCircle2, Home, MapPin, Maximize, ShieldCheck, Users, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { RoomInventoryGrid } from "@/app/(main)/dashboard/rooms/_components/room-inventory-grid";
import { ExpandableText } from "@/app/(external)/_components/expandable-text";

interface RoomImage {
  url: string;
  category: "BEDROOM" | "BATHROOM";
}

interface Facility {
  id: string;
  name: string;
  iconUrl?: string | null;
  tagline?: string | null;
}

interface Rule {
  id: string;
  name: string;
  description?: string | null;
}

export default function PublicRoomDetailClient({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { data: session } = useSession();

  const { data: roomData, isLoading } = useQuery({
    queryKey: ["public-room-type-detail", roomId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/public/room-types/${roomId}`);
      return res.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const room = roomData?.data;

  const formatRupiah = (number: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid h-[300px] grid-cols-4 gap-2 md:h-[420px]">
          <Skeleton className="col-span-2 row-span-2 rounded-l-xl" />
          <Skeleton className="col-span-1 row-span-1" />
          <Skeleton className="col-span-1 row-span-1 rounded-tr-xl" />
          <Skeleton className="col-span-1 row-span-1" />
          <Skeleton className="col-span-1 row-span-1 rounded-br-xl" />
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-[320px] w-full rounded-xl lg:w-[360px]" />
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
        <h3 className="mb-1 text-xl font-medium">Kamar tidak ditemukan</h3>
        <p className="mb-4 max-w-sm text-muted-foreground">Tipe kamar yang Anda cari tidak ada atau sudah tidak tersedia untuk publik.</p>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Beranda
          </Button>
        </Link>
      </div>
    );
  }

  const { bedroomImages, bathroomImages, allImages, mosaicImages } = useMemo(() => {
    const images = (room.images ?? []) as RoomImage[];
    const bedroom = images.filter((img) => img.category === "BEDROOM");
    const bathroom = images.filter((img) => img.category === "BATHROOM");
    const all = [...bedroom, ...bathroom];
    const mosaic: Array<{ url: string | null }> = [
      ...all.slice(0, 5),
      ...Array.from({ length: Math.max(0, 5 - all.length) }, () => ({ url: null })),
    ];
    return { bedroomImages: bedroom, bathroomImages: bathroom, allImages: all, mosaicImages: mosaic };
  }, [room.images]);

  const availableCount = room.availableRooms ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/properties/${room.property?.id}`}>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{room.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{room.property?.name}</span>
              <span>•</span>
              <span>{room.property?.city?.name || "Tanpa kota"}</span>
            </div>
          </div>
        </div>
        <Badge className="w-fit rounded-full bg-blue-700 px-4 py-1 text-sm text-white hover:bg-blue-700">
          {room.genderCategory === "MAN" ? "Kos Putra" : room.genderCategory === "WOMAN" ? "Kos Putri" : "Kos Campur"}
        </Badge>
      </div>

      <div className="grid h-[300px] grid-cols-4 gap-2 overflow-hidden rounded-2xl md:h-[460px]">
        <div className="relative col-span-2 row-span-2 bg-muted">
          {mosaicImages[0].url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mosaicImages[0].url} alt="Kamar Utama" className="h-full w-full object-cover" />
          ) : null}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="relative col-span-1 row-span-1 overflow-hidden bg-muted">
            {mosaicImages[i].url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mosaicImages[i].url} alt={`Gallery ${i}`} className="h-full w-full object-cover" />
            ) : null}
            {i === 4 && allImages.length > 5 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                <span className="text-lg font-medium text-white">+{allImages.length - 5} Foto</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-8 pb-10 lg:flex-row">
        <div className="flex-1 space-y-8">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="px-3 py-1 text-sm">
                <Home className="mr-1 h-4 w-4" /> {availableCount} Kamar Tersedia
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-sm">
                <CalendarDays className="mr-1 h-4 w-4" /> Booking Online
              </Badge>
            </div>
            <h3 className="mb-2 text-xl font-semibold">Deskripsi Kamar</h3>
            <ExpandableText
              text={room.description || "Tidak ada deskripsi."}
              previewClassName="whitespace-pre-wrap leading-relaxed text-muted-foreground"
            />
          </div>

          <RoomInventoryGrid rooms={room.rooms || []} />

          <Tabs defaultValue="specification" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:w-[600px]">
              <TabsTrigger value="specification">Spesifikasi & Fasilitas</TabsTrigger>
              <TabsTrigger value="gallery">Galeri Foto</TabsTrigger>
            </TabsList>

            <TabsContent value="specification" className="space-y-8 pt-6">
              <div>
                <h3 className="mb-4 text-xl font-semibold">Spesifikasi Tipe Kamar</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                    <Maximize className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Ukuran Kamar</p>
                      <p className="text-sm text-muted-foreground">{room.sizeDetail || "Tidak diketahui"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Jumlah Kamar</p>
                      <p className="text-sm text-muted-foreground">{room.totalRooms ?? 0} Kamar</p>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center gap-3 rounded-lg border bg-card p-3 md:col-span-1">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Tipe Penghuni</p>
                      <p className="text-sm text-muted-foreground">
                        {room.genderCategory === "MAN" ? "Pria" : room.genderCategory === "WOMAN" ? "Wanita" : "Pria & Wanita"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {room.facilities?.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Fasilitas Kamar</h3>
                  <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                    {room.facilities.map((f: Facility, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                        {f.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.iconUrl} alt={f.name} className="h-5 w-5 object-contain" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{f.name}</p>
                          {f.tagline ? <p className="text-xs text-muted-foreground">{f.tagline}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="mb-4 text-xl font-semibold">Fasilitas Kamar</h3>
                  <p className="text-sm text-muted-foreground">Belum ada fasilitas dikonfigurasi.</p>
                </div>
              )}

              <Separator />

              <div>
                <h3 className="mb-4 text-xl font-semibold">Peraturan Kamar</h3>
                <div className="space-y-3">
                  {room.rules?.length > 0 ? (
                    room.rules.map((rule: Rule, idx: number) => (
                      <div key={idx} className="flex gap-2 rounded-md border-l-4 border-l-orange-500 bg-muted/50 p-3 text-sm">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                        <div>
                          <span className="font-medium">{rule.name}</span>
                          {rule.description ? <p className="mt-0.5 text-xs text-muted-foreground">{rule.description}</p> : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Tidak ada aturan khusus.</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gallery" className="space-y-8 pt-6">
              {bedroomImages.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-primary" />
                    <h3 className="text-xl font-semibold">Foto Kamar Tidur</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {bedroomImages.map((img, i) => (
                      <div key={i} className="aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={`Kamar Tidur ${i + 1}`} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {bathroomImages.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-primary" />
                    <h3 className="text-xl font-semibold">Foto Kamar Mandi</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {bathroomImages.map((img, i) => (
                      <div key={i} className="aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={`Kamar Mandi ${i + 1}`} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {allImages.length === 0 ? (
                <div className="rounded-xl border border-dashed py-20 text-center">
                  <p className="text-muted-foreground">Belum ada foto yang diunggah untuk tipe kamar ini.</p>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:w-[360px]">
          <div className="sticky top-6">
            <Card className="border-blue-100 shadow-lg">
              <CardHeader className="border-b border-blue-100 bg-blue-50/70 pb-4">
                <CardTitle className="text-lg">Harga Sewa Kamar</CardTitle>
                <CardDescription>Pilih paket sewa dan lanjutkan ke booking online.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {room.isWeekly && room.weeklyPrice ? (
                  <div className="flex items-center justify-between border-b border-dashed pb-3">
                    <span className="text-muted-foreground">Mingguan</span>
                    <span className="text-right font-semibold">{formatRupiah(room.weeklyPrice)} <span className="text-xs font-normal text-muted-foreground">/minggu</span></span>
                  </div>
                ) : null}
                {room.isMonthly && room.monthlyPrice ? (
                  <div className="flex items-center justify-between border-b border-dashed pb-3">
                    <span className="font-medium text-primary">Bulanan</span>
                    <span className="text-right font-bold text-primary">{formatRupiah(room.monthlyPrice)} <span className="text-xs font-normal text-primary/70">/bulan</span></span>
                  </div>
                ) : null}
                {room.is3Monthly && room.price3Monthly ? (
                  <div className="flex items-center justify-between border-b border-dashed pb-3">
                    <span className="text-muted-foreground">3 Bulanan</span>
                    <span className="text-right font-semibold">{formatRupiah(room.price3Monthly)} <span className="text-xs font-normal text-muted-foreground">/3 bln</span></span>
                  </div>
                ) : null}
                {room.isYearly && room.yearlyPrice ? (
                  <div className="flex items-center justify-between border-b border-dashed pb-3">
                    <span className="text-muted-foreground">Tahunan</span>
                    <span className="text-right font-semibold">{formatRupiah(room.yearlyPrice)} <span className="text-xs font-normal text-muted-foreground">/tahun</span></span>
                  </div>
                ) : null}

                {room.isDepositRequired && room.depositAmount ? (
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="text-sm">
                      <p className="mb-1 font-medium">Berlaku Deposit</p>
                      <p className="font-semibold text-destructive/80">{formatRupiah(room.depositAmount)}</p>
                    </div>
                  </div>
                ) : null}

                <div className="pt-4">
                  <Button
                    className="w-full rounded-full bg-blue-700 hover:bg-blue-700"
                    size="lg"
                    onClick={() =>
                      router.push(
                        session?.user
                          ? `/room-types/${room.id}/book`
                          : `/auth/login?redirect=${encodeURIComponent(`/room-types/${room.id}/book`)}`,
                      )
                    }
                  >
                    {session?.user ? "Ajukan Sewa" : "Login untuk Booking"}
                  </Button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Checkout online tersedia. Pilih paket, isi tanggal mulai, lalu lanjut ke pembayaran.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
