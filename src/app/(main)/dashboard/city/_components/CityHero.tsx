import Image from "next/image";
import { Badge } from "@/components/ui/badge";

interface CityHeroProps {
  name: string;
  photoUrl?: string;
  propertyCount: number;
}

export function CityHero({ name, photoUrl, propertyCount }: CityHeroProps) {
  return (
    <div className="relative w-full h-80 rounded-2xl overflow-hidden shadow-lg mb-8">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={name}
          fill
          className="object-cover"
          priority
        />
      ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-2xl text-gray-500">
          Tidak ada foto kota
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent" />
      <div className="absolute left-0 bottom-0 p-8">
        <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">{name}</h1>
        <Badge className="bg-white/80 text-black text-sm font-semibold px-4 py-2 rounded-full">
          {propertyCount} Properti tersedia
        </Badge>
      </div>
    </div>
  );
}
