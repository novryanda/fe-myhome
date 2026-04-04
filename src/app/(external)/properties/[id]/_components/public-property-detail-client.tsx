"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  Home,
  MapPin,
  Maximize,
  Phone,
  Users,
  Wallet,
} from "lucide-react";

import { ExpandableText } from "@/app/(external)/_components/expandable-text";
import { getFacilityIcon } from "@/components/facility-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface PropertyImage {
  id: string;
  url: string;
  category: "BUILDING" | "SHARED_FACILITY" | "PARKING";
}

interface Facility {
  id: string;
  name: string;
  iconUrl?: string | null;
  tagline?: string | null;
}

interface PricingSummaryItem {
  pricingType: "WEEKLY" | "MONTHLY" | "THREE_MONTHLY" | "YEARLY";
  label: string;
  amount: number;
}

interface RoomType {
  id: string;
  name: string;
  description?: string | null;
  genderCategory: "MAN" | "WOMAN" | "MIX";
  totalRooms: number;
  availableRooms: number;
  sizeDetail: string;
  images?: Array<{ id: string; url: string; category: "BEDROOM" | "BATHROOM" }>;
  facilities?: Facility[];
  pricingSummary?: PricingSummaryItem[];
}

interface PropertyDetail {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  city?: { id: string; name: string } | null;
  images?: PropertyImage[];
  admin?: {
    id: string;
    name: string;
    profile?: {
      phone?: string | null;
    } | null;
  } | null;
  roomTypes?: RoomType[];
}

const formatRupiah = (amount?: number | null) =>
  typeof amount === "number"
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount)
    : "Hubungi admin";

const getGenderLabel = (value: RoomType["genderCategory"]) => {
  if (value === "MAN") return "Putra";
  if (value === "WOMAN") return "Putri";
  return "Campur";
};

const getLowestPrice = (items?: PricingSummaryItem[]) =>
  (items ?? []).reduce<number | null>(
    (lowest, item) => (lowest == null || item.amount < lowest ? item.amount : lowest),
    null,
  );

const getGoogleMapsUrl = (property: Pick<PropertyDetail, "address" | "latitude" | "longitude">) => {
  if (typeof property.latitude === "number" && typeof property.longitude === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`;
};

const getWhatsAppUrl = (phone?: string | null) => {
  if (!phone) return null;

  const normalized = phone.replace(/\D/g, "");

  if (!normalized) return null;

  if (normalized.startsWith("0")) {
    return `https://wa.me/62${normalized.slice(1)}`;
  }

  if (normalized.startsWith("62")) {
    return `https://wa.me/${normalized}`;
  }

  return `https://wa.me/${normalized}`;
};

export default function PublicPropertyDetailClient({ propertyId }: { propertyId: string }) {
  const query = useQuery({
    queryKey: ["public-property-detail", propertyId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/public/properties/${propertyId}`);
      return response.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const property = query.data?.data as PropertyDetail | undefined;
  const propertyImages = property?.images ?? [];
  const roomTypes = property?.roomTypes ?? [];
  const availableRoomTypes = roomTypes.filter((roomType) => roomType.availableRooms > 0).length;
  const availableRooms = roomTypes.reduce((total, roomType) => total + (roomType.availableRooms ?? 0), 0);
  if (query.isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-[280px] rounded-[36px]" />
        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <Skeleton className="h-[460px] rounded-[32px]" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Skeleton className="h-[220px] rounded-[28px]" />
            <Skeleton className="h-[220px] rounded-[28px]" />
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[220px] rounded-[32px]" />
          <Skeleton className="h-[220px] rounded-[32px]" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-[32px] border border-dashed border-blue-200 bg-white/80 p-12 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-zinc-400" />
        <h1 className="text-2xl font-bold text-zinc-950">Properti tidak ditemukan</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
          Detail properti yang Anda cari tidak tersedia atau sudah tidak dipublikasikan.
        </p>
        <Link href="/" className="mt-6">
          <Button variant="outline" className="rounded-full border-blue-200 text-blue-700 hover:bg-blue-50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    );
  }

  const heroImage = propertyImages[0];
  const galleryImages = propertyImages.slice(0, 5);
  const mapsUrl = getGoogleMapsUrl(property);
  const whatsappUrl = getWhatsAppUrl(property.admin?.profile?.phone);

  return (
    <div className="space-y-10 pb-10">
      <section className="overflow-hidden rounded-[36px] border border-blue-100 bg-[linear-gradient(135deg,_#ffffff_0%,_#eef4ff_50%,_#ffffff_100%)] shadow-[0_24px_70px_-34px_rgba(29,78,216,0.28)]">
        <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
          <div className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
            <Link href="/">
              <Button variant="outline" className="rounded-full border-blue-200 bg-white text-blue-700 hover:bg-blue-50">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali
              </Button>
            </Link>

            <div className="mt-6 flex flex-wrap gap-2">
              {property.city?.name ? (
                <Badge className="rounded-full bg-blue-700 px-4 py-1 text-white hover:bg-blue-700">
                  {property.city.name}
                </Badge>
              ) : null}
              <Badge variant="outline" className="rounded-full border-blue-200 bg-white px-4 py-1 text-blue-700">
                {availableRooms} kamar tersedia
              </Badge>
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              {property.name}
            </h1>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex max-w-3xl items-start gap-3 text-sm leading-7 text-zinc-600 transition hover:text-blue-700 sm:text-base"
            >
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-blue-700" />
              <span className="underline decoration-blue-200 underline-offset-4">{property.address}</span>
            </a>

          </div>

          <div className="border-t border-blue-100 bg-white/80 p-5 sm:p-8 lg:border-l lg:border-t-0">
            <div className="rounded-[28px] border border-blue-100 bg-white p-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-zinc-500">Pilihan tipe kamar</span>
                  <span className="font-semibold text-zinc-950">{roomTypes.length}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-zinc-500">Kamar tersedia</span>
                  <span className="font-semibold text-zinc-950">{availableRooms}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-zinc-500">Admin properti</span>
                  <span className="font-semibold text-zinc-950">{property.admin?.name || "Belum tersedia"}</span>
                </div>
                {property.admin?.profile?.phone ? (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-zinc-500">No. kontak</span>
                      <span className="font-semibold text-zinc-950">{property.admin.profile.phone}</span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Galeri Properti</div>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">Foto properti</h2>
        </div>

        {galleryImages.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="relative overflow-hidden rounded-[32px] border border-blue-100 bg-blue-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage?.url}
                alt={property.name}
                className="aspect-[16/11] h-full w-full object-cover"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {galleryImages.slice(1, 5).map((image, index) => (
                <div key={image.id} className="relative overflow-hidden rounded-[28px] border border-blue-100 bg-blue-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={`${property.name} ${index + 2}`}
                    className="aspect-[4/4.2] h-full w-full object-cover"
                  />
                </div>
              ))}

              {Array.from({ length: Math.max(0, 4 - Math.max(0, galleryImages.length - 1)) }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="flex items-center justify-center rounded-[28px] border border-dashed border-blue-100 bg-white text-blue-200"
                >
                  <Camera className="h-8 w-8" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-[32px] border border-dashed border-blue-200 bg-white text-center">
            <div>
              <Camera className="mx-auto h-10 w-10 text-blue-300" />
              <p className="mt-4 text-sm text-zinc-500">Belum ada foto properti yang tersedia.</p>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[32px] border border-blue-100 bg-white py-0 shadow-[0_20px_60px_-28px_rgba(29,78,216,0.2)]">
          <CardContent className="p-6 sm:p-8">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Deskripsi</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">Tentang properti ini</h2>
            <div className="mt-5">
              <ExpandableText
                text={property.description || "Belum ada deskripsi properti yang ditambahkan."}
                previewClassName="whitespace-pre-wrap text-sm leading-7 text-zinc-600 sm:text-base"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border border-blue-100 bg-white py-0 shadow-[0_20px_60px_-28px_rgba(29,78,216,0.2)]">
          <CardContent className="p-6 sm:p-8">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Ringkasan</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">Info penting</h2>

            <div className="mt-6 space-y-4">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-[24px] bg-blue-50/70 p-4 transition hover:bg-blue-100/80"
              >
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-blue-700" />
                <div>
                  <div className="text-sm font-semibold text-zinc-950">Alamat properti</div>
                  <div className="mt-1 text-sm leading-6 text-zinc-500">{property.address}</div>
                </div>
              </a>

              <div className="flex items-start gap-3 rounded-[24px] bg-blue-50/70 p-4">
                <Home className="mt-1 h-4 w-4 shrink-0 text-blue-700" />
                <div>
                  <div className="text-sm font-semibold text-zinc-950">Ketersediaan kamar</div>
                  <div className="mt-1 text-sm leading-6 text-zinc-500">
                    {availableRooms} kamar masih tersedia dari {roomTypes.length} tipe kamar yang ditampilkan.
                  </div>
                </div>
              </div>

              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 rounded-[24px] bg-blue-50/70 p-4 transition hover:bg-blue-100/80"
                >
                  <Phone className="mt-1 h-4 w-4 shrink-0 text-blue-700" />
                  <div>
                    <div className="text-sm font-semibold text-zinc-950">Kontak admin</div>
                    <div className="mt-1 text-sm leading-6 text-zinc-500">
                      {property.admin?.name || "Admin properti"} • {property.admin?.profile?.phone}
                    </div>
                    <div className="mt-1 text-xs font-medium text-blue-700">Buka chat WhatsApp</div>
                  </div>
                </a>
              ) : (
                <div className="flex items-start gap-3 rounded-[24px] bg-blue-50/70 p-4">
                  <Phone className="mt-1 h-4 w-4 shrink-0 text-blue-700" />
                  <div>
                    <div className="text-sm font-semibold text-zinc-950">Kontak admin</div>
                    <div className="mt-1 text-sm leading-6 text-zinc-500">
                      {property.admin?.name || "Admin properti"} • Nomor belum tersedia
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Tipe Kamar</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">Pilihan tipe tersedia</h2>
          </div>
          <div className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm text-zinc-600 shadow-sm">
            {roomTypes.length} tipe kamar
          </div>
        </div>

        {roomTypes.length > 0 ? (
          <div className="space-y-6">
            {roomTypes.map((roomType) => {
              const cover = roomType.images?.[0]?.url;
              const priceItems = roomType.pricingSummary ?? [];
              const lowestPrice = getLowestPrice(priceItems);
              const visibleFacilities = roomType.facilities?.slice(0, 6) ?? [];

              return (
                <Card
                  key={roomType.id}
                  className="overflow-hidden rounded-[32px] border border-blue-100 bg-white py-0 shadow-[0_24px_70px_-34px_rgba(29,78,216,0.24)]"
                >
                  <div className="grid lg:grid-cols-[320px_1fr]">
                    <div className="relative overflow-hidden bg-blue-50">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt={roomType.name} className="aspect-[4/4.2] h-full w-full object-cover lg:aspect-auto" />
                      ) : (
                        <div className="flex h-full min-h-[280px] items-center justify-center text-blue-300">
                          <Building2 className="h-12 w-12" />
                        </div>
                      )}

                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        <Badge className="rounded-full bg-white/95 px-3 text-blue-700 hover:bg-white">
                          {getGenderLabel(roomType.genderCategory)}
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-white/80 bg-black/35 px-3 text-white">
                          {roomType.availableRooms}/{roomType.totalRooms} tersedia
                        </Badge>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6 lg:p-7">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                          <h3 className="text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">{roomType.name}</h3>
                          <p className="mt-3 text-sm leading-7 text-zinc-500 sm:text-base">
                            {roomType.description || "Tipe kamar ini siap disewa dengan fasilitas yang sudah tersedia."}
                          </p>
                        </div>

                        <div className="min-w-[220px] rounded-[28px] bg-blue-50/80 p-5 lg:text-right">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Mulai dari</div>
                          <div className="mt-2 text-2xl font-black tracking-tight text-blue-700">{formatRupiah(lowestPrice)}</div>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[24px] border border-blue-100 bg-white p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                            <Users className="h-3.5 w-3.5 text-blue-700" />
                            Penghuni
                          </div>
                          <div className="mt-2 text-lg font-black text-zinc-950">{getGenderLabel(roomType.genderCategory)}</div>
                        </div>

                        <div className="rounded-[24px] border border-blue-100 bg-white p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                            <Maximize className="h-3.5 w-3.5 text-blue-700" />
                            Ukuran
                          </div>
                          <div className="mt-2 text-lg font-black text-zinc-950">{roomType.sizeDetail}</div>
                        </div>

                        <div className="rounded-[24px] border border-blue-100 bg-white p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                            <Wallet className="h-3.5 w-3.5 text-blue-700" />
                            Kamar Aktif
                          </div>
                          <div className="mt-2 text-lg font-black text-zinc-950">{roomType.availableRooms}</div>
                        </div>
                      </div>

                      {priceItems.length > 0 ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {priceItems.map((item) => (
                            <Badge
                              key={`${roomType.id}-${item.pricingType}`}
                              variant="outline"
                              className="rounded-full border-blue-200 bg-white px-3 py-1 text-zinc-700"
                            >
                              {item.label}: {formatRupiah(item.amount)}
                            </Badge>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-6">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-950">
                          <CheckCircle2 className="h-4 w-4 text-blue-700" />
                          Fasilitas tipe kamar
                        </div>

                        {visibleFacilities.length > 0 ? (
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {visibleFacilities.map((facility) => {
                              const Icon = getFacilityIcon(facility.name);

                              return (
                                <div
                                  key={facility.id}
                                  className="flex items-start gap-3 rounded-[22px] border border-blue-100 bg-slate-50/70 p-3"
                                >
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-700">
                                    {facility.iconUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={facility.iconUrl} alt={facility.name} className="h-5 w-5 object-contain" />
                                    ) : (
                                      <Icon className="h-4 w-4" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-zinc-950">{facility.name}</div>
                                    {facility.tagline ? (
                                      <div className="mt-0.5 text-xs leading-5 text-zinc-500">{facility.tagline}</div>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-[22px] border border-dashed border-blue-100 bg-slate-50/70 p-4 text-sm text-zinc-500">
                            Fasilitas untuk tipe kamar ini belum ditambahkan.
                          </div>
                        )}
                      </div>

                      <div className="mt-6">
                        <Link href={`/room-types/${roomType.id}`}>
                          <Button className="rounded-full bg-blue-700 px-6 hover:bg-blue-700">
                            Lihat Detail Tipe
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[32px] border border-dashed border-blue-200 bg-white/80 p-10 text-center">
            <Home className="mx-auto h-10 w-10 text-blue-300" />
            <h3 className="mt-4 text-xl font-bold text-zinc-950">Belum ada tipe kamar</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Properti ini belum memiliki tipe kamar yang dapat ditampilkan ke publik.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
