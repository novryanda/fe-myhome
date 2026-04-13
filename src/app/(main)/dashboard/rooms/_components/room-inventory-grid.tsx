"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Room {
  id: string;
  roomNumber: string;
  status: "AVAILABLE" | "RESERVED" | "BOOKED" | "OCCUPIED" | "MAINTENANCE";
  currentBooking?: {
    tenantName: string;
    tenantEmail: string;
  } | null;
}

interface RoomInventoryGridProps {
  rooms: Room[];
}

export function RoomInventoryGrid({ rooms }: RoomInventoryGridProps) {
  if (!rooms || rooms.length === 0) return null;

  const stats = {
    available: rooms.filter((r) => r.status === "AVAILABLE").length,
    reserved: rooms.filter((r) => r.status === "RESERVED" || r.status === "BOOKED").length,
    occupied: rooms.filter((r) => r.status === "OCCUPIED").length,
    maintenance: rooms.filter((r) => r.status === "MAINTENANCE").length,
  };

  return (
    <Card className="border-none bg-slate-50/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <CardTitle className="text-lg">Denah Status Kamar</CardTitle>
            <CardDescription>Visualisasi ketersediaan unit secara real-time</CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="font-medium text-slate-600 text-xs">Tersedia ({stats.available})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-rose-500" />
              <span className="font-medium text-slate-600 text-xs">Terisi ({stats.occupied})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="font-medium text-slate-600 text-xs">Booked ({stats.reserved})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-slate-400" />
              <span className="font-medium text-slate-600 text-xs">Perbaikan ({stats.maintenance})</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          <TooltipProvider>
            {rooms.map((room) => (
              <Tooltip key={room.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex aspect-square cursor-default items-center justify-center rounded-md border font-bold text-[10px] shadow-sm transition-all hover:scale-110",
                      room.status === "AVAILABLE" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                      (room.status === "RESERVED" || room.status === "BOOKED") &&
                        "border-amber-200 bg-amber-50 text-amber-700",
                      room.status === "OCCUPIED" && "border-rose-200 bg-rose-50 text-rose-700",
                      room.status === "MAINTENANCE" && "border-slate-300 bg-slate-100 text-slate-600",
                    )}
                  >
                    {room.roomNumber.split(" ").pop() || "?"}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">{room.roomNumber}</p>
                  <p className="text-xs capitalize">{room.status.toLowerCase()}</p>
                  {room.currentBooking?.tenantName && (
                    <p className="text-muted-foreground text-xs">{room.currentBooking.tenantName}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
