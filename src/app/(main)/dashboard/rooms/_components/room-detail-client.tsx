"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit, Trash, Users, Home, Maximize, Bath, CheckCircle2, AlertCircle, Bed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RoomInventoryGrid } from "./room-inventory-grid";
import { RoomManagementTab } from "./room-management-tab";
import { api } from "@/lib/api";

interface RoomImage {
    url: string;
    category: "BEDROOM" | "BATHROOM" | "OTHER";
}

interface RoomUnit {
    id: string;
    roomNumber: string;
    status: string;
}

interface Facility {
    id: string;
    name: string;
    iconUrl?: string | null;
    tagline?: string | null;
}

interface Rule {
    id: string;
    name: string;
    description?: string | null;
}

interface RoomDetailClientProps {
    roomId: string;
}

export default function RoomDetailClient({ roomId }: RoomDetailClientProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const queryClient = useQueryClient();

    const isAdmin = session?.user?.role === "ADMIN";

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await api.delete(`/api/room-types/${roomId}`);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Tipe Kamar berhasil dihapus");
            queryClient.invalidateQueries({ queryKey: ["room-types"] });
            router.push("/dashboard/rooms");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Gagal menghapus tipe kamar");
        },
    });

    const { data: roomData, isLoading } = useQuery({
        queryKey: ["room-type", roomId],
        queryFn: async () => {
            const res = await api.get(`/api/room-types/${roomId}`);
            return res.data;
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    const room = roomData?.data;

    const formatRupiah = (number: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(number);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-4 gap-2 h-[400px]">
                    <Skeleton className="col-span-2 row-span-2 rounded-l-xl" />
                    <Skeleton className="col-span-1 row-span-1" />
                    <Skeleton className="col-span-1 row-span-1 rounded-tr-xl" />
                    <Skeleton className="col-span-1 row-span-1" />
                    <Skeleton className="col-span-1 row-span-1 rounded-br-xl" />
                </div>
                <div className="flex gap-8">
                    <div className="flex-1 space-y-4">
                        <Skeleton className="h-8 w-2/3" />
                        <Skeleton className="h-4 w-1/3" />
                        <Separator />
                        <Skeleton className="h-6 w-1/4" />
                        <div className="grid grid-cols-2 gap-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </div>
                    <div className="w-[350px]">
                        <Skeleton className="h-[300px] w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!room) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-1">Kamar tidak ditemukan</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">Tipe kamar yang Anda cari tidak ada atau Anda tidak memiliki akses.</p>
                <Link href="/dashboard/rooms">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar
                    </Button>
                </Link>
            </div>
        );
    }

    const { bedroomImages, bathroomImages, otherImages, allImages, mosaicImages } = useMemo(() => {
        const images = (room.images ?? []) as RoomImage[];
        const bedroom = images.filter((img) => img.category === "BEDROOM");
        const bathroom = images.filter((img) => img.category === "BATHROOM");
        const other = images.filter((img) => img.category === "OTHER");
        const all = [...bedroom, ...bathroom];
        const mosaic: Array<{ url: string | null }> = [
            ...all.slice(0, 5),
            ...Array.from({ length: Math.max(0, 5 - all.length) }, () => ({ url: null })),
        ];
        return { bedroomImages: bedroom, bathroomImages: bathroom, otherImages: other, allImages: all, mosaicImages: mosaic };
    }, [room.images]);

    
    const availableCount = room.availableRooms ?? 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/dashboard/rooms">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h2 className="text-3xl font-bold tracking-tight">{room.name}</h2>
                </div>
                <div className="flex space-x-2">
                    {isAdmin && (
                        <>
                            <Button variant="outline" onClick={() => router.push(`/dashboard/rooms/${room.id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={deleteMutation.isPending}>
                                        <Trash className="mr-2 h-4 w-4" /> Hapus
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Tindakan ini tidak dapat dibatalkan. Semua data unit kamar dalam tipe ini juga akan dihapus.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => deleteMutation.mutate()}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Tipe Kamar"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    )}
                </div>
            </div>

            {/* Mosaic Gallery */}
            <div className="grid grid-cols-4 gap-2 h-[300px] md:h-[450px] rounded-xl overflow-hidden">
                {/* Main Large Image */}
                <div className="col-span-2 row-span-2 relative bg-muted group cursor-pointer">
                    {mosaicImages[0].url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={mosaicImages[0].url}
                            alt="Kamar Utama"
                            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                        />
                    )}
                </div>
                {/* Side Small Images */}
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="col-span-1 row-span-1 relative bg-muted overflow-hidden group cursor-pointer">
                        {mosaicImages[i].url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={mosaicImages[i].url} alt={`Gallery ${i}`} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110" />
                        )}
                        {i === 4 && allImages.length > 5 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="text-white font-medium text-lg">+{allImages.length - 5} Foto</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Content & Sidebar */}
            <div className="flex flex-col lg:flex-row gap-8 pb-10">
                {/* Main Content */}
                <div className="flex-1 space-y-8">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <Badge variant="secondary" className="px-3 py-1 text-sm bg-primary/10 text-primary hover:bg-primary/20">
                                {room.genderCategory === "MAN" ? "Kos Putra" : room.genderCategory === "WOMAN" ? "Kos Putri" : "Kos Campur"}
                            </Badge>
                            <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                                <Home className="w-4 h-4" /> {availableCount} Kamar Tersedia
                            </span>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Deskripsi Kamar</h3>
                        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {room.description || "Tidak ada deskripsi."}
                        </p>
                    </div>

                    <RoomInventoryGrid rooms={room.rooms || []} />

                    <Tabs defaultValue="specification" className="w-full">
                        <TabsList className={`grid w-full ${isAdmin ? "grid-cols-3" : "grid-cols-2"} lg:w-[600px]`}>
                            <TabsTrigger value="specification">Spesifikasi & Fasilitas</TabsTrigger>
                            <TabsTrigger value="gallery">Galeri Foto</TabsTrigger>
                            {isAdmin && <TabsTrigger value="management">Manajemen Unit</TabsTrigger>}
                        </TabsList>

                        <TabsContent value="specification" className="space-y-8 pt-6">
                            <div>
                                <h3 className="text-xl font-semibold mb-4">Spesifikasi Tipe Kamar</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="flex gap-3 items-center p-3 rounded-lg border bg-card">
                                        <Maximize className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Ukuran Kamar</p>
                                            <p className="text-sm text-muted-foreground">{room.sizeDetail || "Tidak diketahui"}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-center p-3 rounded-lg border bg-card">
                                        <Home className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Jumlah Kamar</p>
                                            <p className="text-sm text-muted-foreground">{room.totalRooms ?? 0} Kamar</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-center p-3 rounded-lg border bg-card">
                                        <Users className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Tipe Penghuni</p>
                                            <p className="text-sm text-muted-foreground">
                                                {room.genderCategory === "MAN" ? "Pria" : room.genderCategory === "WOMAN" ? "Wanita" : "Pria & Wanita"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {room.facilities?.length > 0 ? (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-semibold">Fasilitas Kamar</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                                        {room.facilities.map((f: Facility, idx: number) => (
                                            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                                                {f.iconUrl ? (
                                                    <img src={f.iconUrl} alt={f.name} className="w-5 h-5 object-contain" />
                                                ) : (
                                                    <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium">{f.name}</p>
                                                    {f.tagline && <p className="text-xs text-muted-foreground">{f.tagline}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-xl font-semibold mb-4">Fasilitas Kamar</h3>
                                    <p className="text-sm text-muted-foreground">Belum ada fasilitas dikonfigurasi.</p>
                                </div>
                            )}

                            <Separator />

                            <div>
                                <h3 className="text-xl font-semibold mb-4">Peraturan Kamar</h3>
                                <div className="space-y-3">
                                    {room.rules?.length > 0 ? (
                                        room.rules.map((rule: Rule, idx: number) => (
                                            <div key={idx} className="flex gap-2 text-sm bg-muted/50 p-3 rounded-md border-l-4 border-l-orange-500">
                                                <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="font-medium">{rule.name}</span>
                                                    {rule.description && <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Tidak ada aturan khusus.</p>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="gallery" className="pt-6 space-y-8">
                            {bedroomImages.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Bed className="w-5 h-5 text-primary" />
                                        <h3 className="text-xl font-semibold">Foto Kamar Tidur</h3>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {bedroomImages.map((img, i) => (
                                            <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden border bg-muted group cursor-pointer">
                                                <img
                                                    src={img.url}
                                                    alt={`Kamar Tidur ${i + 1}`}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {bathroomImages.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Bath className="w-5 h-5 text-primary" />
                                        <h3 className="text-xl font-semibold">Foto Kamar Mandi</h3>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {bathroomImages.map((img, i) => (
                                            <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden border bg-muted group cursor-pointer">
                                                <img
                                                    src={img.url}
                                                    alt={`Kamar Mandi ${i + 1}`}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {otherImages.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Maximize className="w-5 h-5 text-primary" />
                                        <h3 className="text-xl font-semibold">Foto Lainnya</h3>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {otherImages.map((img, i) => (
                                            <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden border bg-muted group cursor-pointer">
                                                <img
                                                    src={img.url}
                                                    alt={`Foto Lainnya ${i + 1}`}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {allImages.length === 0 && (
                                <div className="py-20 text-center border rounded-xl border-dashed">
                                    <p className="text-muted-foreground">Belum ada foto yang diunggah untuk tipe kamar ini.</p>
                                </div>
                            )}
                        </TabsContent>

                        {isAdmin && (
                            <TabsContent value="management" className="pt-6">
                                <RoomManagementTab roomTypeId={room.id} rooms={room.rooms || []} />
                            </TabsContent>
                        )}
                    </Tabs>
                </div>


                {/* Sticky Pricing Sidebar */}
                <div className="lg:w-[350px]">
                    <div className="sticky top-6">
                        <Card className="shadow-lg border-primary/10">
                            <CardHeader className="bg-muted/50 pb-4 border-b">
                                <CardTitle className="text-lg">Harga Sewa Kamar</CardTitle>
                                <CardDescription>Daftar penawaran sewa bulan ini</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                {room.isWeekly && room.weeklyPrice && (
                                    <div className="flex justify-between items-center pb-3 border-b border-dashed">
                                        <span className="text-muted-foreground">Mingguan</span>
                                        <span className="font-semibold text-right">{formatRupiah(room.weeklyPrice)} <span className="text-xs font-normal text-muted-foreground">/minggu</span></span>
                                    </div>
                                )}
                                {room.isMonthly && room.monthlyPrice && (
                                    <div className="flex justify-between items-center pb-3 border-b border-dashed">
                                        <span className="text-muted-foreground font-medium text-primary">Bulanan</span>
                                        <span className="font-bold text-primary text-right">{formatRupiah(room.monthlyPrice)} <span className="text-xs font-normal text-primary/70">/bulan</span></span>
                                    </div>
                                )}
                                {room.is3Monthly && room.price3Monthly && (
                                    <div className="flex justify-between items-center pb-3 border-b border-dashed">
                                        <span className="text-muted-foreground">3 Bulanan</span>
                                        <span className="font-semibold text-right">{formatRupiah(room.price3Monthly)} <span className="text-xs font-normal text-muted-foreground">/3 bln</span></span>
                                    </div>
                                )}
                                {room.isYearly && room.yearlyPrice && (
                                    <div className="flex justify-between items-center pb-3 border-b border-dashed">
                                        <span className="text-muted-foreground">Tahunan</span>
                                        <span className="font-semibold text-right">{formatRupiah(room.yearlyPrice)} <span className="text-xs font-normal text-muted-foreground">/tahun</span></span>
                                    </div>
                                )}

                                {room.isDepositRequired && room.depositAmount && (
                                    <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-medium mb-1">Berlaku Deposit</p>
                                            <p className="text-destructive/80 font-semibold">{formatRupiah(room.depositAmount)}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4">
                                    <Button className="w-full" size="lg">Ajukan Sewa</Button>
                                    <p className="text-center text-xs text-muted-foreground mt-3">
                                        Sistem belum mendukung booking langsung, hubungi Admin atau via WhatsApp.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
