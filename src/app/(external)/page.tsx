"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ChevronRight,
  Compass,
  MapPin,
  Navigation,
  Search,
  Sparkles,
} from "lucide-react";

import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";

import { PublicHeader } from "./_components/public-header";
import { PublicFooter } from "./_components/public-footer";
import { PublicPropertyCard } from "./_components/public-property-card";

function getDistanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [cityId, setCityId] = useState("");
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "granted" | "denied">("idle");
  const [carouselApi, setCarouselApi] = useState<any>(null);

  const propertyQuery = useQuery({
    queryKey: ["public-properties", search, cityId],
    queryFn: async () => {
      const response = await api.get("/api/v1/public/properties", {
        params: { search: search || undefined, cityId: cityId || undefined, page: 1, size: 18 },
      });
      return response.data;
    },
  });

  const cityQuery = useQuery({
    queryKey: ["public-cities"],
    queryFn: async () => {
      const response = await api.get("/api/v1/public/cities");
      return response.data;
    },
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationState("denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationState("granted");
      },
      () => setLocationState("denied"),
      {
        enableHighAccuracy: true,
        timeout: 8000,
      },
    );
  }, []);

  useEffect(() => {
    setDraftSearch(search);
  }, [search]);

  useEffect(() => {
    if (!carouselApi) return;

    const interval = setInterval(() => {
      if (carouselApi.canScrollNext()) {
        carouselApi.scrollNext();
      } else {
        carouselApi.scrollTo(0);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [carouselApi]);

  const properties = useMemo(() => {
    const items = propertyQuery.data?.data || [];
    if (!userCoords) return items;

    return [...items]
      .map((property: any) => {
        const hasCoords = typeof property.latitude === "number" && typeof property.longitude === "number";
        return {
          ...property,
          distanceKm: hasCoords
            ? getDistanceKm(userCoords, {
                latitude: property.latitude,
                longitude: property.longitude,
              })
            : null,
        };
      })
      .sort((a: any, b: any) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [propertyQuery.data, userCoords]);

  const cities = cityQuery.data?.data || [];
  const featuredCities = cities.slice(0, 6);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_22%,_#f8fafc_100%)]">
      <PublicHeader />

      <section className="border-b border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(96,165,250,0.12),_transparent_24%),linear-gradient(180deg,_#eff6ff_0%,_#ffffff_100%)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-14">
          <div className="space-y-5">
            <Badge className="rounded-full bg-blue-700 px-4 py-1 text-white hover:bg-blue-700">
              Temukan kos idamanmu
            </Badge>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              Cari kos dekat kampus, kantor, atau area favorit Anda.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-zinc-500 sm:text-base">
              Jelajahi ratusan properti kos dengan foto lengkap, harga transparan, dan lokasi jelas. Aktifkan lokasi
              untuk hasil yang lebih relevan.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-blue-100 bg-white/90 p-4 shadow-sm">
                <div className="text-3xl font-black text-blue-700">{properties.length}+</div>
                <div className="mt-1 text-sm text-zinc-500">Properti siap dijelajahi</div>
              </div>
              <div className="rounded-3xl border border-blue-100 bg-white/90 p-4 shadow-sm">
                <div className="text-3xl font-black text-blue-700">{cities.length}+</div>
                <div className="mt-1 text-sm text-zinc-500">Kota tersedia</div>
              </div>
              <div className="rounded-3xl border border-blue-100 bg-white/90 p-4 shadow-sm">
                <div className="text-3xl font-black text-blue-700">24/7</div>
                <div className="mt-1 text-sm text-zinc-500">Akses dari manapun</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-zinc-600">
            </div>
          </div>

          <Card className="overflow-hidden rounded-[32px] border border-blue-100 bg-white/95 py-0 shadow-[0_30px_80px_-30px_rgba(29,78,216,0.28)]">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div>
                <div className="text-2xl font-black tracking-tight text-zinc-950">Temukan Kos Idamanmu</div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Lokasi / Area</div>
                  <div className="flex items-center gap-3">
                    <Search className="h-4 w-4 text-blue-700" />
                    <Input
                      value={draftSearch}
                      onChange={(event) => setDraftSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") setSearch(draftSearch.trim());
                      }}
                      placeholder="Contoh: Pekanbaru, dekat kampus, pusat kota"
                      className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <select
                    value={cityId}
                    onChange={(event) => setCityId(event.target.value)}
                    className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
                  >
                    <option value="">Semua kota</option>
                    {cities.map((city: any) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    className="h-12 rounded-2xl bg-blue-700 px-5 hover:bg-blue-700"
                    onClick={() => setSearch(draftSearch.trim())}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Cari Sekarang
                  </Button>
                </div>
              </div>

  

              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Kota populer</div>
                <div className="flex flex-wrap gap-2">
                  {featuredCities.map((city: any) => (
                    <button
                      key={city.id}
                      type="button"
                      className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-blue-300 hover:text-blue-700"
                      onClick={() => setCityId(city.id)}
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="property-list" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Daftar Kos</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">Kos yang sedang tersedia</h2>
          </div>
          <div className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm text-zinc-600 shadow-sm">
            {properties.length} properti ditemukan
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {properties.map((property: any) => (
            <PublicPropertyCard key={property.id} property={property} />
          ))}
        </div>
      </section>

      <section id="city-list" className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Jelajah kota</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">Cari kos berdasarkan kota</h2>
          </div>
        </div>

        <Carousel setApi={setCarouselApi} opts={{ align: "start", loop: false }} className="w-full">
          <CarouselContent>
            {cities.map((city: any) => (
              <CarouselItem key={city.id} className="basis-[84%] sm:basis-[56%] lg:basis-[36%] xl:basis-[30%]">
                <Link href={`/cities/${city.id}`} className="block w-full">
                  <Card className="overflow-hidden rounded-[28px] border border-blue-100 py-0 shadow-[0_20px_60px_-28px_rgba(29,78,216,0.28)]">
                    <div className="relative aspect-[5/4] bg-blue-50">
                      {city.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={city.photoUrl} alt={city.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-blue-300">
                          <Building2 className="h-10 w-10" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/10 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                        <div className="text-2xl font-black">{city.name}</div>
                        <div className="mt-2 inline-flex items-center gap-1 text-sm text-white/85">
                          Lihat daftar properti
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </section>

      <PublicFooter />
    </main>
  );
}
