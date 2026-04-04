"use client";

import { TrendingUp, Home, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface PropertyStats {
    total: number;
    pending: number;
    suspended: number;
}

export function SectionCards() {
    const { data, isLoading } = useQuery<{ data: PropertyStats }>({
        queryKey: ["property-stats"],
        queryFn: async () => {
            const res = await fetch("/api/properties/stats");
            if (!res.ok) throw new Error("Failed to fetch property stats");
            return res.json();
        },
    });

    const stats = data?.data;

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4 lg:px-6">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[160px] w-full rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription className="flex items-center gap-2">
                        <Home className="size-4" />
                        Total Properti
                    </CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {stats?.total.toLocaleString() || 0}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                            Semua Terdaftar
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Aset properti terdaftar <TrendingUp className="size-4 text-primary" />
                    </div>
                    <div className="text-muted-foreground">
                        Total hunian dalam ekosistem
                    </div>
                </CardFooter>
            </Card>

            <Card className="@container/card">
                <CardHeader>
                    <CardDescription className="flex items-center gap-2">
                        <Clock className="size-4 text-amber-500" />
                        Menunggu Persetujuan
                    </CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {stats?.pending.toLocaleString() || 0}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5">
                            Menunggu Persetujuan
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Perlu verifikasi admin <Clock className="size-4 text-amber-500" />
                    </div>
                    <div className="text-muted-foreground">
                        Menunggu antrean review
                    </div>
                </CardFooter>
            </Card>

            <Card className="@container/card">
                <CardHeader>
                    <CardDescription className="flex items-center gap-2">
                        <AlertCircle className="size-4 text-rose-500" />
                        Properti Ditolak
                    </CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {stats?.suspended.toLocaleString() || 0}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline" className="text-rose-500 border-rose-500/20 bg-rose-500/5">
                            Ditolak
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Properti ditolak <AlertCircle className="size-4 text-rose-500" />
                    </div>
                    <div className="text-muted-foreground">
                        Properti ditolak  
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
