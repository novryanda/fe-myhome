import Image from "next/image";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PropertyCardProps {
  id: string;
  name: string;
  address: string;
  description?: string;
  imageUrl?: string;
  onManage?: () => void;
}

export function PropertyCard({ id, name, address, description, imageUrl, onManage }: PropertyCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 overflow-hidden flex flex-col">
      <div className="relative h-40 w-full">
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
            <span>Foto tidak tersedia</span>
          </div>
        )}
      </div>
      <div className="flex-1 p-4 flex flex-col gap-2">
        <h3 className="text-lg font-semibold truncate">{name}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <MapPin className="w-4 h-4" />
          <span className="truncate">{address}</span>
        </div>
        <p className="text-sm text-gray-700 line-clamp-2 min-h-[2.5em]">{description || "-"}</p>
        <div className="flex justify-end mt-2">
          <Button size="sm" onClick={onManage} className="rounded-full">Kelola</Button>
        </div>
      </div>
    </div>
  );
}
