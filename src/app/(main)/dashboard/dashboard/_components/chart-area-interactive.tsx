"use client";

import * as React from "react";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";

const chartConfig = {
  users: {
    label: "Pengguna",
    color: "var(--chart-1)",
  },
  transactions: {
    label: "Transaksi Berhasil",
    color: "var(--chart-2)",
  },
  failedTransactions: {
    label: "Transaksi Gagal",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export function ChartAreaInteractive({
  role,
  data,
  range,
  onRangeChange,
  isLoading,
}: {
  role: "ADMIN" | "SUPERADMIN";
  data: Array<{ date: string; users: number; transactions: number; failedTransactions: number }>;
  range: "7d" | "30d" | "90d";
  onRangeChange: (range: "7d" | "30d" | "90d") => void;
  isLoading: boolean;
}) {
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (isMobile && range === "90d") {
      onRangeChange("7d");
    }
  }, [isMobile, onRangeChange, range]);

  const totalUsers = data.reduce((total, item) => total + item.users, 0);
  const totalTransactions = data.reduce((total, item) => total + item.transactions, 0);
  const totalFailedTransactions = data.reduce((total, item) => total + item.failedTransactions, 0);

  if (isLoading) {
    return <Skeleton className="h-[420px] rounded-2xl" />;
  }

  return (
    <Card className="@container/card rounded-2xl">
      <CardHeader>
        <CardTitle>{role === "SUPERADMIN" ? "Aktivitas Pengguna & Transaksi" : "Aktivitas Tenant & Transaksi"}</CardTitle>
        <CardDescription>
          {totalUsers} pengguna, {totalTransactions} transaksi terbayar, dan {totalFailedTransactions} transaksi gagal pada rentang yang dipilih.
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(value) => {
              if (value === "7d" || value === "30d" || value === "90d") {
                onRangeChange(value);
              }
            }}
            variant="outline"
            className="@[767px]/card:flex hidden *:data-[slot=toggle-group-item]:px-4!"
          >
            <ToggleGroupItem value="90d">90 hari terakhir</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 hari terakhir</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 hari terakhir</ToggleGroupItem>
          </ToggleGroup>
          <Select value={range} onValueChange={onRangeChange}>
            <SelectTrigger
              className="flex @[767px]/card:hidden w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              aria-label="Pilih rentang waktu"
            >
              <SelectValue placeholder="30 hari terakhir" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                90 hari terakhir
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                30 hari terakhir
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                7 hari terakhir
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-users)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="var(--color-users)" stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="fillTransactions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-transactions)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="var(--color-transactions)" stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="fillFailedTransactions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-failedTransactions)" stopOpacity={0.65} />
                <stop offset="95%" stopColor="var(--color-failedTransactions)" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("id-ID", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("id-ID", {
                      dateStyle: "medium",
                    })
                  }
                  indicator="dot"
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              dataKey="failedTransactions"
              type="monotone"
              fill="url(#fillFailedTransactions)"
              stroke="var(--color-failedTransactions)"
              strokeWidth={2}
            />
            <Area dataKey="transactions" type="monotone" fill="url(#fillTransactions)" stroke="var(--color-transactions)" strokeWidth={2} />
            <Area dataKey="users" type="monotone" fill="url(#fillUsers)" stroke="var(--color-users)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
