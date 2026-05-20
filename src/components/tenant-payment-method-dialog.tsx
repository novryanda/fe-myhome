"use client";

import { useEffect, useMemo, useState } from "react";

import { Copy, CreditCard, Landmark } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export type TenantPaymentMethod = "MIDTRANS" | "MANUAL";

type TenantPaymentMethodDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  amount: number;
  propertyName?: string | null;
  roomLabel?: string | null;
  bookingCode: string;
  manualPaymentAccounts: Array<{
    id: string;
    label: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  }>;
  defaultMethod?: TenantPaymentMethod;
  isSubmitting?: boolean;
  onContinue: (method: TenantPaymentMethod) => void;
};

export function TenantPaymentMethodDialog({
  open,
  onOpenChange,
  title = "Pilih Metode Pembayaran",
  description = "Tentukan apakah Anda ingin melanjutkan dengan Midtrans atau transfer manual.",
  amount,
  propertyName,
  roomLabel,
  bookingCode,
  manualPaymentAccounts,
  defaultMethod = "MIDTRANS",
  isSubmitting = false,
  onContinue,
}: TenantPaymentMethodDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<TenantPaymentMethod>(defaultMethod);

  useEffect(() => {
    if (open) {
      setSelectedMethod(defaultMethod);
    }
  }, [defaultMethod, open]);

  const hasManualAccounts = manualPaymentAccounts.length > 0;
  const continueLabel = useMemo(() => {
    if (selectedMethod === "MANUAL") {
      return "Lanjut ke Upload Bukti";
    }

    return "Lanjut ke Midtrans";
  }, [selectedMethod]);

  const handleCopyAccountNumber = async (accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      toast.success("Nomor rekening berhasil disalin.");
    } catch {
      toast.error("Gagal menyalin nomor rekening.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground">Booking</div>
              <div className="font-medium">{bookingCode}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Nominal</div>
              <div className="font-medium">{currency(amount)}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-muted-foreground">Properti / Kamar</div>
              <div className="font-medium">
                {propertyName || "-"}
                {roomLabel ? ` / ${roomLabel}` : ""}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Pilih Metode</Label>
            <RadioGroup
              value={selectedMethod}
              onValueChange={(value) => setSelectedMethod(value as TenantPaymentMethod)}
              className="gap-3"
            >
              <label
                htmlFor="payment-method-midtrans"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition hover:border-primary/50"
              >
                <RadioGroupItem id="payment-method-midtrans" value="MIDTRANS" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Bayar Online via Midtrans
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Cocok jika Anda ingin langsung menuju checkout online dan menyelesaikan pembayaran secara instan.
                  </div>
                </div>
              </label>

              <label
                htmlFor="payment-method-manual"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition hover:border-primary/50"
              >
                <RadioGroupItem id="payment-method-manual" value="MANUAL" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Landmark className="h-4 w-4 text-primary" />
                    Transfer Manual
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Pilih jika Anda ingin transfer ke rekening admin, lalu upload bukti pembayaran untuk diverifikasi.
                  </div>
                </div>
              </label>
            </RadioGroup>
          </div>

          {selectedMethod === "MANUAL" ? (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div>
                <div className="font-medium">Rekening Tujuan Tersedia</div>
                <div className="text-sm text-muted-foreground">
                  Rekening berikut sudah didaftarkan admin dan juga akan ditampilkan lagi di form upload bukti pembayaran.
                </div>
              </div>

              {hasManualAccounts ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {manualPaymentAccounts.map((account) => (
                    <div key={account.id} className="rounded-lg border bg-background p-4 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{account.label}</div>
                          <div className="text-muted-foreground">{account.bankName}</div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyAccountNumber(account.accountNumber)}
                          disabled={isSubmitting}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Salin
                        </Button>
                      </div>
                      <div className="mt-3 text-base font-semibold">{account.accountNumber}</div>
                      <div className="text-muted-foreground">a.n. {account.accountHolder}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Admin belum menambahkan rekening tujuan untuk pembayaran manual pada properti ini.
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            onClick={() => onContinue(selectedMethod)}
            disabled={isSubmitting || (selectedMethod === "MANUAL" && !hasManualAccounts)}
          >
            {isSubmitting ? "Memproses..." : continueLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
