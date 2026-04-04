"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AddRoomForm from "../../../_components/add-room-form";
import { api } from "@/lib/api";

interface RoomEditClientProps {
    roomId: string;
}

export function RoomEditClient({ roomId }: RoomEditClientProps) {
    const { data: roomData, isLoading, error } = useQuery({
        queryKey: ["room-type", roomId],
        queryFn: async () => {
            const res = await api.get(`/api/room-types/${roomId}`);
            return res.data;
        },
    });

    const room = roomData?.data;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Memuat data tipe kamar...</p>
            </div>
        );
    }

    if (error || !room) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-1">Gagal memuat data</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                    Terjadi kesalahan saat mengambil data tipe kamar. Silakan coba lagi nanti.
                </p>
                <Link href="/dashboard/rooms">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar
                    </Button>
                </Link>
            </div>
        );
    }

    // Mapping API response to form structure if necessary
    const initialData = {
        ...room,
        images: room.images?.map((img: any) => ({
            url: img.url,
            category: img.category
        })) || []
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Link href={`/dashboard/rooms/${roomId}`}>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h2 className="text-3xl font-bold tracking-tight">Edit Tipe Kamar</h2>
            </div>

            <AddRoomForm initialData={initialData} />
        </div>
    );
}
