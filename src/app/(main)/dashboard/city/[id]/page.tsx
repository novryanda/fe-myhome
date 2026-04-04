"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { CityHero } from "@/app/(main)/dashboard/city/_components/CityHero";
import { PropertyCard } from "@/app/(main)/dashboard/city/_components/PropertyCard";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateLarge } from "@/components/empty-state";
import { api } from "@/lib/api";

export default function CityDetailPage() {
    const { id: cityId } = useParams();
    const router = useRouter();
    const { data, isLoading } = useQuery({
        queryKey: ["city-detail", cityId],
        queryFn: async () => {
            const res = await api.get(`/api/cities/${cityId}`);
            return res.data;
        },
        enabled: !!cityId,
    });

    const city = data?.data;
    const properties = city?.properties || [];

    return (
        <div className="flex-1 p-8 pt-6 max-w-7xl mx-auto">
            {/* City Hero Section */}
            {isLoading ? (
                <Skeleton className="h-80 w-full rounded-2xl mb-8" />
            ) : city ? (
                <CityHero
                    name={city.name}
                    photoUrl={city.photoUrl}
                    propertyCount={properties.length}
                />
            ) : null}

            {/* Property List Section */}
            <h2 className="text-2xl font-bold mb-4">Daftar Properti di Kota Ini</h2>
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-72 rounded-xl" />
                    ))}
                </div>
            ) : properties.length === 0 ? (
                <EmptyStateLarge
                    title="Belum ada properti di kota ini"
                    description="Tambahkan properti untuk kota ini agar muncul di daftar."
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property: any) => (
                        <PropertyCard
                            key={property.id}
                            id={property.id}
                            name={property.name}
                            address={property.address}
                            description={property.description}
                            imageUrl={property.images?.[0]?.url}
                            onManage={() => router.push(`/dashboard/properties/${property.id}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
