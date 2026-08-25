"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleDot, Clock, History, LogOut, Upload, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

import type { TransactionAuditEvent, TransactionAuditResponse } from "./types";

const dateTimeLabel = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "-";

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const EVENT_STYLE: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PAYMENT_CREATED: { label: "Transaksi Dibuat", variant: "secondary", icon: CircleDot },
  PAYMENT_PAID: { label: "Lunas", variant: "default", icon: CheckCircle2 },
  PAYMENT_EXPIRED: { label: "Kedaluwarsa", variant: "destructive", icon: XCircle },
  BOOKING_CREATED: { label: "Booking Dibuat", variant: "secondary", icon: CircleDot },
  BOOKING_CHECKED_IN: { label: "Check-in", variant: "default", icon: CheckCircle2 },
  BOOKING_CHECKED_OUT: { label: "Check-out", variant: "secondary", icon: LogOut },
  BOOKING_STATUS: { label: "Status Booking", variant: "outline", icon: Clock },
  VERIFICATION: { label: "Verifikasi Bukti", variant: "outline", icon: Upload },
};

const formatAction = (event: TransactionAuditEvent) => {
  if (event.type === "VERIFICATION" && event.detail) {
    const detail = event.detail as {
      action?: string;
      previousStatus?: string | null;
      newStatus?: string;
    };
    if (detail.action) {
      return event.label;
    }
  }
  return event.label;
};

const formatNote = (event: TransactionAuditEvent) => {
  if (event.type === "VERIFICATION" && event.detail) {
    const detail = event.detail as { previousStatus?: string | null; newStatus?: string };
    const transition =
      detail.previousStatus || detail.newStatus ? `${detail.previousStatus ?? "-"} → ${detail.newStatus ?? "-"}` : "";
    return [transition, event.note].filter(Boolean).join(" · ");
  }
  return event.note;
};

export function TransactionAuditDialog({
  transactionId,
  transactionLabel,
  open,
  onOpenChange,
}: {
  transactionId: string | null;
  transactionLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useQuery({
    queryKey: ["transaction-audit", transactionId],
    queryFn: async () => {
      const response = await api.get(`/api/dashboard/transactions/${transactionId}/audit`);
      return response.data.data as TransactionAuditResponse;
    },
    enabled: open && !!transactionId,
  });

  const audit = query.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Detail Audit Transaksi
          </DialogTitle>
          <DialogDescription>
            {transactionLabel ? `Riwayat audit untuk ${transactionLabel}` : "Riwayat audit transaksi."}
          </DialogDescription>
        </DialogHeader>

        {query.isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : query.isError ? (
          <div className="py-8 text-center text-muted-foreground">Gagal memuat detail audit transaksi.</div>
        ) : audit ? (
          <div className="space-y-5">
            <div className="grid gap-2 rounded-xl border bg-muted/20 p-4 text-sm sm:grid-cols-2">
              <div>
                <div className="text-muted-foreground text-xs">Kode Booking</div>
                <div className="font-mono font-semibold">{audit.transaction.bookingCode}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Tenant</div>
                <div className="font-semibold">{audit.transaction.tenantName}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Properti / Kamar</div>
                <div className="font-medium">
                  {audit.transaction.propertyName} / {audit.transaction.roomNumber}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Kategori / Nominal</div>
                <div className="font-semibold">
                  {audit.transaction.category} · {currency(audit.transaction.amount)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Status</div>
                <Badge variant={audit.transaction.status === "PAID" ? "default" : "secondary"}>
                  {audit.transaction.status}
                </Badge>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Dibuat</div>
                <div>{dateTimeLabel(audit.transaction.createdAt)}</div>
              </div>
            </div>

            <div>
              <div className="mb-3 font-semibold text-sm">Kronologi Audit</div>
              {audit.events.length ? (
                <ol className="relative space-y-4 border-l border-border pl-6">
                  {audit.events.map((event) => {
                    const style = EVENT_STYLE[event.type] ?? {
                      label: event.type,
                      variant: "outline" as const,
                      icon: CircleDot,
                    };
                    const Icon = style.icon;
                    return (
                      <li key={event.id} className="relative">
                        <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border bg-background">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={style.variant}>{style.label}</Badge>
                          <span className="text-muted-foreground text-xs">{dateTimeLabel(event.timestamp)}</span>
                        </div>
                        <div className="mt-1 text-sm font-medium">{formatAction(event)}</div>
                        {formatNote(event) && (
                          <div className="mt-0.5 text-muted-foreground text-xs">{formatNote(event)}</div>
                        )}
                        {event.actor && (
                          <div className="mt-0.5 text-muted-foreground text-xs">
                            Oleh: {event.actor.name} ({event.actor.role})
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  Belum ada riwayat audit untuk transaksi ini.
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
