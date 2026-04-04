import { CalendarCheck2, CreditCard, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import type { DashboardKpi } from "./types";

const iconMap = {
  users: Users,
  transactions: CreditCard,
  revenue: Wallet,
  bookings: CalendarCheck2,
} as const;

export function SectionCards({
  kpis,
  isLoading,
  onSelect,
}: {
  kpis?: DashboardKpi[];
  isLoading: boolean;
  onSelect: (kpi: DashboardKpi) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`dashboard-kpi-${index}`} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis?.map((kpi) => {
        const Icon = iconMap[kpi.key as keyof typeof iconMap] || Users;
        const TrendIcon = kpi.trend === "down" ? TrendingDown : TrendingUp;
        const badgeClassName =
          kpi.trend === "down"
            ? "border-rose-500/20 bg-rose-500/5 text-rose-600"
            : kpi.trend === "up"
              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600"
              : "border-border bg-muted/50 text-muted-foreground";

        return (
          <button key={kpi.key} type="button" onClick={() => onSelect(kpi)} className="text-left">
            <Card className="h-full rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
              <CardHeader className="gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <CardDescription>{kpi.label}</CardDescription>
                      <CardTitle className="mt-1 text-2xl font-semibold tracking-tight">{kpi.formattedValue}</CardTitle>
                    </div>
                  </div>
                  <CardAction>
                    <Badge variant="outline" className={badgeClassName}>
                      <TrendIcon className="mr-1 size-3.5" />
                      {Math.abs(kpi.changePercent)}%
                    </Badge>
                  </CardAction>
                </div>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="font-medium">{kpi.changeLabel}</div>
                <div className="text-muted-foreground">{kpi.helper}</div>
              </CardFooter>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
