"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Building2, Filter } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/lib/auth-client";
import { PropertyMap } from "./_components/property-map";
import { EmptyState, EmptyStateLarge } from "@/components/empty-state";
import { SectionCards } from "./_components/section-cards";
import { EntityCard } from "@/components/entity-card";
import { api } from "@/lib/api";
import { PageHero } from "../_components/page-hero";

export default function PropertiesPage() {
    const { data: session } = useSession();
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    const { data, isLoading, error } = useQuery({
        queryKey: ["properties"],
        queryFn: async () => {
            const response = await api.get("/api/properties");
            return response.data;
        },
    });

    const allProperties = data?.data || [];
    const filteredProperties = statusFilter === "ALL"
        ? allProperties
        : allProperties.filter((p: any) => p.status === statusFilter);
    const isSuperAdmin = session?.user?.role === "SUPERADMIN";

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <PageHero
                title="Properti"
                description="Kelola properti dan ketersediaan kamar Anda."
                action={
                    <Link href="/dashboard/properties/add">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Tambah Properti
                        </Button>
                    </Link>
                }
            />

            <SectionCards />

            {/* Map View for Superadmin */}
            {isSuperAdmin && !isLoading && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-1 bg-primary rounded-full" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground italic">Peta Properti Interaktif</h3>
                    </div>
                    <PropertyMap properties={allProperties} />
                </div>
            )}

            <div className="flex items-center space-x-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="mr-2 h-4 w-4 opacity-50" />
                        <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Semua Status</SelectItem>
                        <SelectItem value="PENDING">Menunggu Persetujuan</SelectItem>
                        <SelectItem value="APPROVED">Disetujui</SelectItem>
                        <SelectItem value="REJECTED">Ditolak</SelectItem>
                        <SelectItem value="DEACTIVATED">Dinonaktifkan</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-[72px] rounded-xl" />
                    ))}
                </div>
            ) : error ? (
                <div className="flex h-[400px] flex-col items-center justify-center rounded-lg border border-dashed text-center">
                    <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center">
                        <h3 className="mt-4 text-lg font-semibold text-destructive">Gagal memuat properti</h3>
                        <p className="mb-4 mt-2 text-sm text-muted-foreground uppercase tracking-wider">
                            Error: {(error as any).message || "Terjadi kesalahan"}
                        </p>
                    </div>
                </div>
            ) : allProperties.length === 0 ? (
                <EmptyStateLarge
                    title="Properti tidak ditemukan"
                    description="Anda belum mendaftarkan properti apa pun. Mulailah dengan menambahkan satu untuk mengelola ketersediaan kamar Anda."
                    icon={Building2}
                    action={{
                        children: "Tambah Properti Pertama Anda",
                        href: "/dashboard/properties/add",
                        actionType: "link",
                        icon: "plus"
                    }}
                    link={{
                        href: "#",
                        label: "Pelajari cara mengelola properti"
                    }}
                />
            ) : filteredProperties.length === 0 ? (
                <EmptyState
                    title="Tidak ada properti"
                    description={`Tidak ada properti dengan status "${statusFilter}" yang ditemukan.`}
                    icon={Filter}
                />
            ) : (
                <div className="space-y-3">
                    {filteredProperties.map((property: any) => (
                        <EntityCard
                            key={property.id}
                            id={property.id}
                            name={property.name}
                            label="Nama Properti"
                            imageUrl={property.images?.[0]?.url}
                            href={`/dashboard/properties/${property.id}`}
                            fallbackIcon={<Building2 className="size-6" />}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
