"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import type { DashboardKpi } from "./types";

export function KpiDetailDialog({
  kpi,
  open,
  onOpenChange,
}: {
  kpi: DashboardKpi | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{kpi?.details.title}</DialogTitle>
          <DialogDescription>{kpi?.details.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {kpi?.details.items.map((item) => (
            <div key={item.label} className="rounded-xl border bg-muted/30 p-4">
              <div className="text-sm text-muted-foreground">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
