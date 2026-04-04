"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { PlusCircle, Search, Building, RefreshCcw, LayoutGrid, Bed, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityCard } from "@/components/entity-card";
import { PageHero } from "../../_components/page-hero";
import { api } from "@/lib/api";

export default function RoomListClient() {
    const router = useRouter();
    const { data: session } = useSession();
    const [activePropertyId, setActivePropertyId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const limit = 15;

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to page 1 on search
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const isAdmin = session?.user?.role === "ADMIN";
    const isSuperAdmin = session?.user?.role === "SUPERADMIN";

    // Fetch properties for selection
    const { data: propertiesData, isLoading: isLoadingProperties } = useQuery({
        queryKey: ["all-properties"],
        queryFn: async () => {
            const res = await api.get("/api/properties");
            return res.data;
        },
    });

    const properties = propertiesData?.data || [];

    // Set first property as active by default if not set
    useEffect(() => {
        if (!activePropertyId && properties.length > 0) {
            setActivePropertyId(properties[0].id);
        }
    }, [activePropertyId, properties]);

    // Fetch room types for active property
    const { data: roomTypesData, isLoading: isLoadingRoomTypes, refetch, isRefetching } = useQuery({
        queryKey: ["all-room-types", activePropertyId, currentPage, debouncedSearch],
        queryFn: async () => {
            if (!activePropertyId) return null;
            const res = await api.get(`/api/room-types/property/${activePropertyId}`, {
                params: {
                    page: currentPage,
                    limit: limit,
                    search: debouncedSearch
                },
            });
            return res.data;
        },
        enabled: !!activePropertyId,
        placeholderData: keepPreviousData,
    });

    const roomTypes = roomTypesData?.data || [];
    const meta = roomTypesData?.meta || { totalItems: 0, totalPages: 0, currentPage: 1 };


    const formatRupiah = (number: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(number);
    };

    return (
        <>
            <PageHero
                title="Kamar & Harga"
                description="Kelola tipe kamar, ketersediaan, dan harga sewa properti Anda."
                action={
                    <div className="flex items-center space-x-2">
                        <Button onClick={() => refetch()} variant="outline" size="icon" title="Refresh data">
                            <RefreshCcw className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                            <Button
                                disabled={!activePropertyId || properties.find((p: any) => p.id === activePropertyId)?.status !== "APPROVED"}
                                onClick={() => router.push("/dashboard/rooms/add")}
                                title={properties.find((p: any) => p.id === activePropertyId)?.status !== "APPROVED" ? "Properti harus disetujui terlebih dahulu" : "Tambah Ruangan"}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Tambah Kamar
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 mt-6">
                <div className="w-full md:w-72">
                    <Select
                        value={activePropertyId}
                        onValueChange={(val) => {
                            setActivePropertyId(val);
                            setCurrentPage(1); // Reset to page 1 on filter change
                        }}
                        disabled={isLoadingProperties}
                    >
                        <SelectTrigger className="h-10 rounded-xl bg-card/50 backdrop-blur-sm border-border/50 transition-all hover:border-primary/30">
                            <SelectValue placeholder={isLoadingProperties ? "Memuat properti..." : "Pilih properti..."} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-2xl border-border/50">
                            {isSuperAdmin && (
                                <SelectItem value="all" className="rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <LayoutGrid className="w-4 h-4 text-primary" />
                                        <span>Semua Properti</span>
                                    </div>
                                </SelectItem>
                            )}
                            {properties.map((p: any) => (
                                <SelectItem key={p.id} value={p.id} className="rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Building className="w-4 h-4 text-muted-foreground" />
                                        <span>{p.name}</span>
                                    </div>
                                </SelectItem>
                            ))}
                            {properties.length === 0 && !isLoadingProperties && (
                                <SelectItem value="all" disabled>Tidak ada properti</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="relative w-full md:w-80 group">
                    {isRefetching ? (
                        <RefreshCcw className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                    ) : (
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 transition-colors group-focus-within:text-primary" />
                    )}
                    <Input
                        type="search"
                        placeholder="Cari tipe kamar..."
                        className="pl-10 h-10 rounded-xl bg-card/50 backdrop-blur-sm border-border/50 transition-all focus:ring-primary/20 hover:border-primary/30"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {activePropertyId && properties.find((p: any) => p.id === activePropertyId)?.status !== "APPROVED" }

            {/* Empty States & Loaders */}
            {isLoadingRoomTypes ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="rounded-3xl border bg-card p-4 space-y-4 shadow-sm h-[200px] flex gap-4">
                            <Skeleton className="w-[180px] h-full rounded-2xl shrink-0" />
                            <div className="flex-1 space-y-3 py-2">
                                <Skeleton className="h-4 w-[100px]" />
                                <Skeleton className="h-6 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                                <div className="pt-4 flex gap-2">
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-8 w-16" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : !activePropertyId ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed">
                    <Building className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-xl font-medium mb-1">Pilih Properti</h3>
                    <p className="text-muted-foreground mb-4 max-w-sm">Silakan pilih properti terlebih dahulu untuk melihat daftar tipe kamar.</p>
                </div>
            ) : roomTypes.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl bg-muted/30">
                    <LayoutGrid className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    <h3 className="text-xl font-semibold text-muted-foreground">Tidak Ada Kamar</h3>
                    <p className="text-muted-foreground/70 max-w-xs text-center mt-2">
                        {searchQuery ? "Tidak ada kamar yang cocok dengan pencarian Anda." : (activePropertyId === "all" ? "Belum ada tipe kamar yang terdaftar di sistem." : "Belum ada tipe kamar untuk properti ini.")}
                    </p>
                    {!searchQuery && isAdmin && (
                        <Button
                            className="mt-6 rounded-xl shadow-lg shadow-primary/20"
                            onClick={() => router.push("/dashboard/rooms/add")}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kamar Sekarang
                        </Button>
                    )}
                </div>
            ) : (
                <div className={`space-y-3 transition-opacity duration-300 ${isRefetching ? 'opacity-50' : 'opacity-100'}`}>
                    {roomTypes.map((room: any) => {
                        const thumbnail = room.images?.find((img: any) => img.category === "BEDROOM")?.url
                            || room.images?.[0]?.url;

                        return (
                            <EntityCard
                                key={room.id}
                                id={room.id}
                                name={room.name}
                                label="Nama Kamar"
                                imageUrl={thumbnail}
                                href={`/dashboard/rooms/${room.id}`}
                                fallbackIcon={<Bed className="size-6" />}
                            />
                        );
                    })}
                </div>
            )}

            {/* Pagination UI */}
            {!isLoadingRoomTypes && meta.totalPages > 1 && (
                <div className="mt-10 flex items-center justify-between border-t border-muted pt-6 pb-10">
                    <p className="text-sm text-muted-foreground">
                        Menampilkan <span className="font-medium">{(currentPage - 1) * limit + 1}</span> sampai{" "}
                        <span className="font-medium">
                            {Math.min(currentPage * limit, meta.totalItems)}
                        </span>{" "}
                        dari <span className="font-medium">{meta.totalItems}</span> hasil
                    </p>
                    <Pagination className="mx-0 w-auto">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (currentPage > 1) setCurrentPage(p => p - 1);
                                    }}
                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                                />
                            </PaginationItem>

                            {[...Array(meta.totalPages)].map((_, i) => {
                                const page = i + 1;
                                if (
                                    page === 1 ||
                                    page === meta.totalPages ||
                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                ) {
                                    return (
                                        <PaginationItem key={page}>
                                            <PaginationLink
                                                href="#"
                                                isActive={currentPage === page}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setCurrentPage(page);
                                                }}
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                } else if (
                                    (page === 2 && currentPage > 3) ||
                                    (page === meta.totalPages - 1 && currentPage < meta.totalPages - 2)
                                ) {
                                    return <PaginationItem key={page}><span className="px-2">...</span></PaginationItem>;
                                }
                                return null;
                            })}

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (currentPage < meta.totalPages) setCurrentPage(p => p + 1);
                                    }}
                                    className={currentPage === meta.totalPages ? "pointer-events-none opacity-50" : ""}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </>
    );
}
