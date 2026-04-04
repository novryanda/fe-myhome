"use client";

import Link from "next/link";

import { Edit, MapPin, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import type { City } from "./city-types";

interface CityCardProps {
  city: City;
  onEdit: (city: City) => void;
  onDelete: (city: City) => void;
}

export function CityCard({ city, onEdit, onDelete }: CityCardProps) {
  return (
    <Card className="group overflow-hidden border transition-all duration-300 hover:shadow-lg">
      <div className="relative h-36 w-full overflow-hidden bg-muted">
        {city.photoUrl ? (
          <img
            src={city.photoUrl}
            alt={city.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MapPin className="h-10 w-10 text-muted-foreground opacity-20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-3 left-3">
          <h3 className="font-bold text-lg text-white drop-shadow-sm">{city.name}</h3>
          {city._count && <p className="text-[11px] text-white/80">{city._count.properties} properti</p>}
        </div>
      </div>
      <CardContent className="flex items-center justify-between p-3">
        <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
          {new Date(city.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <div className="flex items-center gap-1">
          <Link href={`/dashboard/city/${city.id}`}>
            <Button variant="outline" size="sm">
              Kelola
            </Button>
          </Link>
          <Button variant="ghost" size="icon-xs" onClick={() => onEdit(city)} title="Edit">
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onDelete(city)}
            title="Hapus"
            className="text-destructive hover:text-destructive"
          >
            <Trash className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
