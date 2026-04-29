"use client";

import Link from "next/link";

import { ArrowRight, Building2, MapPin, Navigation } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { ExpandableText } from "./expandable-text";

const currency = (value?: number | null) =>
  typeof value === "number"
    ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value)
    : "Hubungi admin";

interface PublicPropertyCardData {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  minPrice?: number | null;
  displayPrice?: number | null;
  availableRoomTypes?: number;
  distanceKm?: number | null;
  city?: { id?: string; name?: string } | null;
  images?: Array<{ url?: string | null }> | null;
}

export function PublicPropertyCard({
  property,
  className = "",
}: {
  property: PublicPropertyCardData;
  className?: string;
}) {
  const displayPrice =
    typeof property.displayPrice === "number"
      ? property.displayPrice
      : typeof property.minPrice === "number"
        ? property.minPrice
        : null;

  return (
    <Card
      className={`hover:-translate-y-1 overflow-hidden rounded-[28px] border border-blue-100 bg-white py-0 shadow-[0_20px_60px_-28px_rgba(29,78,216,0.28)] transition-transform duration-200 ${className}`}
    >
      <div className="flex h-full flex-col sm:flex-row">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-blue-50 sm:aspect-auto sm:min-h-[260px] sm:w-[42%]">
          {property.images?.[0]?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={property.images[0].url} alt={property.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-blue-300">
              <Building2 className="h-12 w-12" />
            </div>
          )}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <Badge className="rounded-full bg-white/94 px-3 text-blue-700 shadow-sm hover:bg-white">
              {property.availableRoomTypes} tipe aktif
            </Badge>
            {typeof property.distanceKm === "number" ? (
              <Badge className="rounded-full bg-blue-700 px-3 text-white hover:bg-blue-700">
                <Navigation className="mr-1 h-3.5 w-3.5" />
                {property.distanceKm.toFixed(1)} km
              </Badge>
            ) : null}
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col justify-between gap-5 p-5 sm:p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-start gap-2">
                <h3 className="flex-1 font-bold text-xl text-zinc-950 leading-tight sm:text-2xl">{property.name}</h3>
                {property.city?.name ? (
                  <Badge variant="outline" className="rounded-full border-blue-200 px-3 text-blue-700">
                    {property.city.name}
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-start gap-2 text-sm text-zinc-500 leading-6">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-blue-700" />
                <span className="line-clamp-2">{property.address}</span>
              </div>
              <ExpandableText
                text={property.description || "Belum ada deskripsi properti."}
                previewClassName="text-sm leading-6 text-zinc-600"
              />
            </div>

            {displayPrice != null ? (
              <div className="grid gap-3 rounded-2xl bg-blue-50/70 p-4 sm:grid-cols-2">
                <div>
                  <div className="font-semibold text-xs text-zinc-500 uppercase tracking-[0.18em]">Mulai dari</div>
                  <div className="mt-1 font-black text-2xl text-blue-700 tracking-tight">{currency(displayPrice)}</div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-zinc-500" />
            <Link href={`/properties/${property.id}`} className="shrink-0">
              <Button className="rounded-full bg-blue-700 px-5 hover:bg-blue-700">
                Lihat Detail
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
