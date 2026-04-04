"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, ChevronRight, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { RoomTypeInfoTab } from "./room-type-info-tab";
import { RulesManager } from "./rules-manager";
import { FacilitiesManager } from "./facilities-manager";

interface ManageRoomTypeClientProps {
    roomTypeId: string;
}

export function ManageRoomTypeClient({ roomTypeId }: ManageRoomTypeClientProps) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data: roomData, isLoading } = useQuery({
        queryKey: ["room-type", roomTypeId],
        queryFn: async () => {
            const res = await api.get(`/api/room-types/${roomTypeId}`);
            return res.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => api.delete(`/api/room-types/${roomTypeId}`),
        onSuccess: () => {
            toast.success("Tipe kamar berhasil dihapus");
            queryClient.invalidateQueries({ queryKey: ["all-room-types"] });
            router.push("/dashboard/rooms");
        },
        onError: (err: any) =>
            toast.error(err.response?.data?.message || "Gagal menghapus tipe kamar"),
    });

    const room = roomData?.data;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-5 w-48" />
                <div className="flex justify-between items-center">
                    <Skeleton className="h-9 w-56" />
                    <Skeleton className="h-10 w-24" />
                </div>
                <Skeleton className="h-[500px] w-full rounded-2xl" />
            </div>
        );
    }

    if (!room) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-2xl border-dashed">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-1">Tipe kamar tidak ditemukan</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                    Data tidak ditemukan atau Anda tidak memiliki akses.
                </p>
                <Link href="/dashboard/rooms">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link
                    href="/dashboard/rooms"
                    className="hover:text-foreground transition-colors"
                >
                    Tipe Kamar
                </Link>
                <ChevronRight className="size-3.5" />
                <span className="font-medium text-foreground">Kelola Tipe Kamar</span>
            </nav>

            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Kelola Tipe Kamar</h1>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-xl gap-2"
                        >
                            <Trash2 className="size-4" /> Hapus
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Tipe Kamar?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Semua data termasuk kamar, fasilitas, dan peraturan akan dihapus
                                permanen. Tindakan ini tidak dapat dibatalkan.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => deleteMutation.mutate()}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {/* Main Card with Tabs */}
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                <Tabs defaultValue="info" className="w-full">
                    <div className="border-b px-6 pt-2">
                        <TabsList variant="line" className="h-auto gap-6">
                            <TabsTrigger
                                value="info"
                                className="pb-3 pt-2 text-sm data-[state=active]:text-emerald-700 data-[state=active]:shadow-none"
                            >
                                Informasi Room Type
                            </TabsTrigger>
                            <TabsTrigger
                                value="rules"
                                className="pb-3 pt-2 text-sm data-[state=active]:text-emerald-700 data-[state=active]:shadow-none"
                            >
                                Peraturan
                            </TabsTrigger>
                            <TabsTrigger
                                value="facilities"
                                className="pb-3 pt-2 text-sm data-[state=active]:text-emerald-700 data-[state=active]:shadow-none"
                            >
                                Fasilitas
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-6">
                        <TabsContent value="info" className="mt-0">
                            <RoomTypeInfoTab roomType={room} />
                        </TabsContent>
                        <TabsContent value="rules" className="mt-0">
                            <RulesManager roomTypeId={room.id} initialRules={room.rules || []} />
                        </TabsContent>
                        <TabsContent value="facilities" className="mt-0">
                            <FacilitiesManager
                                roomTypeId={room.id}
                                initialFacilities={room.facilities || []}
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
