"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Room {
    id: string;
    roomNumber: string;
    status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
}

interface RoomInventoryGridProps {
    rooms: Room[];
}

export function RoomInventoryGrid({ rooms }: RoomInventoryGridProps) {
    if (!rooms || rooms.length === 0) return null;

    const stats = {
        available: rooms.filter(r => r.status === "AVAILABLE").length,
        occupied: rooms.filter(r => r.status === "OCCUPIED").length,
        maintenance: rooms.filter(r => r.status === "MAINTENANCE").length,
    };

    return (
        <Card className="border-none shadow-sm bg-slate-50/50">
            <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg">Denah Status Kamar</CardTitle>
                        <CardDescription>Visualisasi ketersediaan unit secara real-time</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-xs font-medium text-slate-600">Tersedia ({stats.available})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-rose-500" />
                            <span className="text-xs font-medium text-slate-600">Terisi ({stats.occupied})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-slate-400" />
                            <span className="text-xs font-medium text-slate-600">Perbaikan ({stats.maintenance})</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                    <TooltipProvider>
                        {rooms.map((room) => (
                            <Tooltip key={room.id}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={cn(
                                            "aspect-square rounded-md flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110 cursor-default shadow-sm border",
                                            room.status === "AVAILABLE" && "bg-emerald-50 border-emerald-200 text-emerald-700",
                                            room.status === "OCCUPIED" && "bg-rose-50 border-rose-200 text-rose-700",
                                            room.status === "MAINTENANCE" && "bg-slate-100 border-slate-300 text-slate-600"
                                        )}
                                    >
                                        {room.roomNumber.split(' ').pop() || "?"}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-semibold">{room.roomNumber}</p>
                                    <p className="text-xs capitalize">{room.status.toLowerCase()}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </TooltipProvider>
                </div>
            </CardContent>
        </Card>
    );
}
