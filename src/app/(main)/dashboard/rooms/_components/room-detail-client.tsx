"use client";

import { useMemo } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Bath, Bed, CheckCircle2, Edit, Home, Maximize, Trash, Users } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

import { RoomInventoryGrid } from "./room-inventory-grid";
import { RoomManagementTab } from "./room-management-tab";

interface RoomImage {
  url: string;
  category: "BEDROOM" | "BATHROOM" | "OTHER";
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

interface RoomDetailClientProps {
  roomId: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  const maybeMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;

  if (typeof maybeMessage === "string" && maybeMessage) {
    return maybeMessage;
  }

  return error instanceof Error ? error.message : fallback;
};

export default function RoomDetailClient({ roomId }: RoomDetailClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const isAdmin = session?.user?.role === "ADMIN";

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/api/room-types/${roomId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Tipe Kamar berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["room-types"] });
      router.push("/dashboard/rooms");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Gagal menghapus tipe kamar"));
    },
  });

  const { data: roomData, isLoading } = useQuery({
    queryKey: ["room-type", roomId],
    queryFn: async () => {
      const res = await api.get(`/api/room-types/${roomId}`);
      return res.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const room = roomData?.data;
  const { bedroomImages, bathroomImages, otherImages, allImages, mosaicImages } = useMemo(() => {
    const images = (room?.images ?? []) as RoomImage[];
    const bedroom = images.filter((img) => img.category === "BEDROOM");
    const bathroom = images.filter((img) => img.category === "BATHROOM");
    const other = images.filter((img) => img.category === "OTHER");
    const all = [...bedroom, ...bathroom];
    const mosaic: Array<{ url: string | null }> = [
      ...all.slice(0, 5),
      ...Array.from({ length: Math.max(0, 5 - all.length) }, () => ({ url: null })),
    ];
    return {
      bedroomImages: bedroom,
      bathroomImages: bathroom,
      otherImages: other,
      allImages: all,
      mosaicImages: mosaic,
    };
  }, [room?.images]);

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid h-[400px] grid-cols-4 gap-2">
          <Skeleton className="col-span-2 row-span-2 rounded-l-xl" />
          <Skeleton className="col-span-1 row-span-1" />
          <Skeleton className="col-span-1 row-span-1 rounded-tr-xl" />
          <Skeleton className="col-span-1 row-span-1" />
          <Skeleton className="col-span-1 row-span-1 rounded-br-xl" />
        </div>
        <div className="flex gap-8">
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Separator />
            <Skeleton className="h-6 w-1/4" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
          <div className="w-[350px]">
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
        <h3 className="mb-1 font-medium text-xl">Kamar tidak ditemukan</h3>
        <p className="mb-4 max-w-sm text-muted-foreground">
          Tipe kamar yang Anda cari tidak ada atau Anda tidak memiliki akses.
        </p>
        <Link href="/dashboard/rooms">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar
          </Button>
        </Link>
      </div>
    );
  }

  const availableCount = room.availableRooms ?? 0;
  const pricingOptions = [
    room.isWeekly && room.weeklyPrice
      ? { value: "WEEKLY", label: `Mingguan (${formatRupiah(room.weeklyPrice)})` }
      : null,
    room.isMonthly && room.monthlyPrice
      ? { value: "MONTHLY", label: `Bulanan (${formatRupiah(room.monthlyPrice)})` }
      : null,
    room.is3Monthly && room.price3Monthly
      ? { value: "THREE_MONTHLY", label: `3 Bulanan (${formatRupiah(room.price3Monthly)})` }
      : null,
    room.isYearly && room.yearlyPrice
      ? { value: "YEARLY", label: `Tahunan (${formatRupiah(room.yearlyPrice)})` }
      : null,
  ].filter(Boolean) as Array<{ value: "WEEKLY" | "MONTHLY" | "THREE_MONTHLY" | "YEARLY"; label: string }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/rooms">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h2 className="font-bold text-3xl tracking-tight">{room.name}</h2>
        </div>
        <div className="flex space-x-2">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => router.push(`/dashboard/rooms/${room.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleteMutation.isPending}>
                    <Trash className="mr-2 h-4 w-4" /> Hapus
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tindakan ini tidak dapat dibatalkan. Semua data unit kamar dalam tipe ini juga akan dihapus.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Tipe Kamar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Mosaic Gallery */}
      <div className="grid h-[300px] grid-cols-4 gap-2 overflow-hidden rounded-xl md:h-[450px]">
        {/* Main Large Image */}
        <div className="group relative col-span-2 row-span-2 cursor-pointer bg-muted">
          {mosaicImages[0].url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mosaicImages[0].url}
              alt="Kamar Utama"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
        </div>
        {/* Side Small Images */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="group relative col-span-1 row-span-1 cursor-pointer overflow-hidden bg-muted">
            {mosaicImages[i].url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mosaicImages[i].url}
                alt={`Gallery ${i}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            )}
            {i === 4 && allImages.length > 5 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="font-medium text-lg text-white">+{allImages.length - 5} Foto</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Content & Sidebar */}
      <div className="flex flex-col gap-8 pb-10 lg:flex-row">
        {/* Main Content */}
        <div className="flex-1 space-y-8">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Badge variant="secondary" className="bg-primary/10 px-3 py-1 text-primary text-sm hover:bg-primary/20">
                {room.genderCategory === "MAN"
                  ? "Kos Putra"
                  : room.genderCategory === "WOMAN"
                    ? "Kos Putri"
                    : "Kos Campur"}
              </Badge>
              <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Home className="h-4 w-4" /> {availableCount} Kamar Tersedia
              </span>
            </div>
            <h3 className="mb-2 font-semibold text-xl">Deskripsi Kamar</h3>
            <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
              {room.description || "Tidak ada deskripsi."}
            </p>
          </div>

          <RoomInventoryGrid rooms={room.rooms || []} />

          <Tabs defaultValue="specification" className="w-full">
            <TabsList className={`grid w-full ${isAdmin ? "grid-cols-3" : "grid-cols-2"} lg:w-[600px]`}>
              <TabsTrigger value="specification">Spesifikasi & Fasilitas</TabsTrigger>
              <TabsTrigger value="gallery">Galeri Foto</TabsTrigger>
              {isAdmin && <TabsTrigger value="management">Manajemen Unit</TabsTrigger>}
            </TabsList>

            <TabsContent value="specification" className="space-y-8 pt-6">
              <div>
                <h3 className="mb-4 font-semibold text-xl">Spesifikasi Tipe Kamar</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                    <Maximize className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Ukuran Kamar</p>
                      <p className="text-muted-foreground text-sm">{room.sizeDetail || "Tidak diketahui"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Jumlah Kamar</p>
                      <p className="text-muted-foreground text-sm">{room.totalRooms ?? 0} Kamar</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Tipe Penghuni</p>
                      <p className="text-muted-foreground text-sm">
                        {room.genderCategory === "MAN"
                          ? "Pria"
                          : room.genderCategory === "WOMAN"
                            ? "Wanita"
                            : "Pria & Wanita"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {room.facilities?.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-xl">Fasilitas Kamar</h3>
                  <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                    {room.facilities.map((f: Facility, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 rounded-lg border bg-card p-2">
                        {f.iconUrl ? (
                          <img src={f.iconUrl} alt={f.name} className="h-5 w-5 object-contain" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{f.name}</p>
                          {f.tagline && <p className="text-muted-foreground text-xs">{f.tagline}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="mb-4 font-semibold text-xl">Fasilitas Kamar</h3>
                  <p className="text-muted-foreground text-sm">Belum ada fasilitas dikonfigurasi.</p>
                </div>
              )}

              <Separator />

              <div>
                <h3 className="mb-4 font-semibold text-xl">Peraturan Kamar</h3>
                <div className="space-y-3">
                  {room.rules?.length > 0 ? (
                    room.rules.map((rule: Rule, idx: number) => (
                      <div
                        key={idx}
                        className="flex gap-2 rounded-md border-l-4 border-l-orange-500 bg-muted/50 p-3 text-sm"
                      >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                        <div>
                          <span className="font-medium">{rule.name}</span>
                          {rule.description && (
                            <p className="mt-0.5 text-muted-foreground text-xs">{rule.description}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">Tidak ada aturan khusus.</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gallery" className="space-y-8 pt-6">
              {bedroomImages.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-xl">Foto Kamar Tidur</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {bedroomImages.map((img, i) => (
                      <div
                        key={i}
                        className="group aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border bg-muted"
                      >
                        <img
                          src={img.url}
                          alt={`Kamar Tidur ${i + 1}`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bathroomImages.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-xl">Foto Kamar Mandi</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {bathroomImages.map((img, i) => (
                      <div
                        key={i}
                        className="group aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border bg-muted"
                      >
                        <img
                          src={img.url}
                          alt={`Kamar Mandi ${i + 1}`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {otherImages.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Maximize className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-xl">Foto Lainnya</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {otherImages.map((img, i) => (
                      <div
                        key={i}
                        className="group aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border bg-muted"
                      >
                        <img
                          src={img.url}
                          alt={`Foto Lainnya ${i + 1}`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {allImages.length === 0 && (
                <div className="rounded-xl border border-dashed py-20 text-center">
                  <p className="text-muted-foreground">Belum ada foto yang diunggah untuk tipe kamar ini.</p>
                </div>
              )}
            </TabsContent>

            {isAdmin && (
              <TabsContent value="management" className="pt-6">
                <RoomManagementTab roomTypeId={room.id} rooms={room.rooms || []} pricingOptions={pricingOptions} />
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Sticky Pricing Sidebar */}
        <div className="lg:w-[350px]">
          <div className="sticky top-6">
            <Card className="border-primary/10 shadow-lg">
              <CardHeader className="border-b bg-muted/50 pb-4">
                <CardTitle className="text-lg">Harga Sewa Kamar</CardTitle>
                <CardDescription>Daftar penawaran sewa bulan ini</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {room.isWeekly && room.weeklyPrice && (
                  <div className="flex items-center justify-between border-b border-dashed pb-3">
                    <span className="text-muted-foreground">Mingguan</span>
                    <span className="text-right font-semibold">
                      {formatRupiah(room.weeklyPrice)}{" "}
                      <span className="font-normal text-muted-foreground text-xs">/minggu</span>
                    </span>
                  </div>
                )}
                {room.isMonthly && room.monthlyPrice && (
                  <div className="flex items-center justify-between border-b border-dashed pb-3">
                    <span className="font-medium text-muted-foreground text-primary">Bulanan</span>
                    <span className="text-right font-bold text-primary">
                      {formatRupiah(room.monthlyPrice)}{" "}
                      <span className="font-normal text-primary/70 text-xs">/bulan</span>
                    </span>
                  </div>
                )}
                {room.is3Monthly && room.price3Monthly && (
                  <div className="flex items-center justify-between border-b border-dashed pb-3">
                    <span className="text-muted-foreground">3 Bulanan</span>
                    <span className="text-right font-semibold">
                      {formatRupiah(room.price3Monthly)}{" "}
                      <span className="font-normal text-muted-foreground text-xs">/3 bln</span>
                    </span>
                  </div>
                )}
                {room.isYearly && room.yearlyPrice && (
                  <div className="flex items-center justify-between border-b border-dashed pb-3">
                    <span className="text-muted-foreground">Tahunan</span>
                    <span className="text-right font-semibold">
                      {formatRupiah(room.yearlyPrice)}{" "}
                      <span className="font-normal text-muted-foreground text-xs">/tahun</span>
                    </span>
                  </div>
                )}

                {room.isDepositRequired && room.depositAmount && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="text-sm">
                      <p className="mb-1 font-medium">Berlaku Deposit</p>
                      <p className="font-semibold text-destructive/80">{formatRupiah(room.depositAmount)}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button className="w-full" size="lg">
                    Ajukan Sewa
                  </Button>
                  <p className="mt-3 text-center text-muted-foreground text-xs">
                    Sistem belum mendukung booking langsung, hubungi Admin atau via WhatsApp.
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
