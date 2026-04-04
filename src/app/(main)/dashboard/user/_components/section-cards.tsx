"use client";

import { TrendingUp, Users, UserCheck, UserX } from "lucide-react";
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

interface UserStats {
    total: number;
    active: number;
    suspended: number;
}

export function SectionCards() {
    const { data, isLoading } = useQuery<{ data: UserStats }>({
        queryKey: ["user-stats"],
        queryFn: async () => {
            const res = await fetch("/api/user/stats");
            if (!res.ok) throw new Error("Failed to fetch stats");
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
                        <Users className="size-4" />
                        Total Pengguna
                    </CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {stats?.total.toLocaleString() || 0}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                            Semua Role
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Entitas pengguna terdaftar <TrendingUp className="size-4 text-primary" />
                    </div>
                    <div className="text-muted-foreground">
                        Total seluruh akun dalam sistem
                    </div>
                </CardFooter>
            </Card>

            <Card className="@container/card">
                <CardHeader>
                    <CardDescription className="flex items-center gap-2">
                        <UserCheck className="size-4 text-emerald-500" />
                        Pengguna Aktif
                    </CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {stats?.active.toLocaleString() || 0}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/5">
                            Normal
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Akses diberikan penuh <TrendingUp className="size-4 text-emerald-500" />
                    </div>
                    <div className="text-muted-foreground">
                        Akun yang dapat menggunakan sistem
                    </div>
                </CardFooter>
            </Card>

            <Card className="@container/card">
                <CardHeader>
                    <CardDescription className="flex items-center gap-2">
                        <UserX className="size-4 text-rose-500" />
                        Pengguna Suspend
                    </CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {stats?.suspended.toLocaleString() || 0}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline" className="text-rose-500 border-rose-500/20 bg-rose-500/5">
                            Banned
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        Akses sementara ditutup <TrendingUp className="size-4 text-rose-500 rotate-180" />
                    </div>
                    <div className="text-muted-foreground">
                        Akun yang sedang ditangguhkan
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
