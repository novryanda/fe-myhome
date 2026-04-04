"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, MapPin } from "lucide-react";

import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { PublicFooter } from "../../_components/public-footer";
import { PublicHeader } from "../../_components/public-header";
import { PublicPropertyCard } from "../../_components/public-property-card";

export default function CityDetailPage() {
  const params = useParams<{ id: string }>();

  const query = useQuery({
    queryKey: ["public-city-detail", params.id],
    queryFn: async () => {
      const response = await api.get(`/api/v1/public/cities/${params.id}`);
      return response.data;
    },
  });

  const city = query.data?.data;

  if (!city) {
    return <div className="p-8">Memuat kota...</div>;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_26%,_#f8fafc_100%)]">
      <PublicHeader />
      <section className="border-b border-blue-100 bg-white/90">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <Link href="/">
            <Button variant="outline" className="mb-5 rounded-full border-blue-200 text-blue-700 hover:bg-blue-50">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-4">
              <Badge className="rounded-full bg-blue-700 px-4 text-white hover:bg-blue-700">Kota</Badge>
              <h1 className="text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">{city.name}</h1>
              <p className="max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
                Menampilkan Seluruh Kos di yang terdaftar di kota {city.name}.
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm text-zinc-600">
                <MapPin className="h-4 w-4 text-blue-700" />
                {city.properties?.length || 0} properti tersedia
              </div>
            </div>

            {city.photoUrl ? (
              <div className="aspect-[21/10] overflow-hidden rounded-[32px] border border-blue-100 bg-blue-50 shadow-[0_20px_60px_-28px_rgba(29,78,216,0.28)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={city.photoUrl} alt={city.name} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-[21/10] items-center justify-center rounded-[32px] border border-blue-100 bg-blue-50 text-blue-300 shadow-[0_20px_60px_-28px_rgba(29,78,216,0.28)]">
                <Building2 className="h-12 w-12" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Daftar properti</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">Properti di {city.name}</h2>
          </div>
          <div className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm text-zinc-600 shadow-sm">
            {city.properties?.length || 0} hasil
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {city.properties?.map((property: any) => (
            <PublicPropertyCard
              key={property.id}
              property={{
                ...property,
                city: { name: city.name, id: city.id },
              }}
            />
          ))}
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
