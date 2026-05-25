"use client";

import { useEffect, useMemo, useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { Copy } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

type TenantManualPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitUrl: string;
  propertyName?: string | null;
  roomLabel?: string | null;
  bookingCode: string;
  periodLabel?: string | null;
  amount: number;
  manualPaymentAccounts: Array<{
    id: string;
    label: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  }>;
  onSuccess?: () => void;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof message === "string" && message) {
    return message;
  }

  return error instanceof Error ? error.message : fallback;
};

export function TenantManualPaymentDialog({
  open,
  onOpenChange,
  submitUrl,
  propertyName,
  roomLabel,
  bookingCode,
  periodLabel,
  amount,
  manualPaymentAccounts,
  onSuccess,
}: TenantManualPaymentDialogProps) {
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderBank, setSenderBank] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [transferAmount, setTransferAmount] = useState(String(amount));
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) {
      setProofFile(null);
      setDestinationAccountId("");
      setSenderName("");
      setSenderBank("");
      setTransferDate("");
      setTransferAmount(String(amount));
      setNote("");
    }
  }, [open, amount]);

  useEffect(() => {
    if (open && manualPaymentAccounts.length > 0 && !destinationAccountId) {
      setDestinationAccountId(manualPaymentAccounts[0]?.id || "");
    }
  }, [open, manualPaymentAccounts, destinationAccountId]);

  const amountWarning = useMemo(() => {
    const numericAmount = Number(transferAmount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return null;
    }

    if (numericAmount < amount) {
      return `Nominal transfer lebih kecil dari tagihan sebesar ${currency(amount - numericAmount)}.`;
    }

    if (numericAmount > amount) {
      return `Nominal transfer lebih besar dari tagihan sebesar ${currency(numericAmount - amount)}.`;
    }

    return null;
  }, [amount, transferAmount]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!proofFile) {
        throw new Error("File bukti pembayaran wajib diupload");
      }

      const formData = new FormData();
      formData.append("proof_file", proofFile);
      formData.append("destination_account_id", destinationAccountId);
      formData.append("transfer_amount", transferAmount);
      if (senderName.trim()) formData.append("sender_name", senderName.trim());
      if (senderBank.trim()) formData.append("sender_bank", senderBank.trim());
      if (transferDate) formData.append("transfer_date", transferDate);
      if (note.trim()) formData.append("note", note.trim());

      const response = await api.post(submitUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return response.data;
    },
    onSuccess: () => {
      toast.success("Bukti pembayaran berhasil diupload dan menunggu verifikasi admin.");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Gagal mengupload bukti pembayaran"));
    },
  });

  const isUploading = uploadMutation.isPending;
  const hasAvailableAccounts = manualPaymentAccounts.length > 0;

  const handleCopyAccountNumber = async (accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      toast.success("Nomor rekening berhasil disalin.");
    } catch {
      toast.error("Gagal menyalin nomor rekening.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isUploading && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Bukti Pembayaran</DialogTitle>
          <DialogDescription>
            Upload bukti transfer manual agar admin bisa memverifikasi pembayaran Anda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground">Booking</div>
              <div className="font-medium">{bookingCode}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Nominal Tagihan</div>
              <div className="font-medium">{currency(amount)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Properti / Kamar</div>
              <div className="font-medium">
                {propertyName || "-"}
                {roomLabel ? ` / ${roomLabel}` : ""}
              </div>
            </div>
            {periodLabel ? (
              <div>
                <div className="text-muted-foreground">Periode</div>
                <div className="font-medium">{periodLabel}</div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label>Pilih Rekening Tujuan</Label>
              {hasAvailableAccounts ? (
                <RadioGroup value={destinationAccountId} onValueChange={setDestinationAccountId} className="gap-3">
                  {manualPaymentAccounts.map((account) => (
                    <label
                      key={account.id}
                      htmlFor={`tenant-destination-account-${account.id}`}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition hover:border-primary/50"
                    >
                      <RadioGroupItem id={`tenant-destination-account-${account.id}`} value={account.id} />
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">{account.label}</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.preventDefault();
                              handleCopyAccountNumber(account.accountNumber);
                            }}
                            disabled={isUploading}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Salin Nomor
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {account.bankName} - {account.accountNumber}
                        </div>
                        <div className="text-sm text-muted-foreground">a.n. {account.accountHolder}</div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Admin belum menambahkan rekening tujuan untuk pembayaran manual pada properti ini.
                </div>
              )}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="tenant-proof-file">Bukti Pembayaran</Label>
              <Input
                id="tenant-proof-file"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => setProofFile(event.target.files?.[0] || null)}
                disabled={isUploading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-sender-name">Nama Pengirim</Label>
              <Input
                id="tenant-sender-name"
                value={senderName}
                onChange={(event) => setSenderName(event.target.value)}
                placeholder="Opsional"
                disabled={isUploading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-sender-bank">Bank Pengirim</Label>
              <Input
                id="tenant-sender-bank"
                value={senderBank}
                onChange={(event) => setSenderBank(event.target.value)}
                placeholder="Opsional"
                disabled={isUploading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-transfer-date">Tanggal Transfer</Label>
              <Input
                id="tenant-transfer-date"
                type="date"
                value={transferDate}
                onChange={(event) => setTransferDate(event.target.value)}
                disabled={isUploading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenant-transfer-amount">Nominal Transfer</Label>
              <Input
                id="tenant-transfer-amount"
                type="number"
                min={1}
                value={transferAmount}
                onChange={(event) => setTransferAmount(event.target.value)}
                disabled={isUploading}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="tenant-note">Catatan</Label>
              <Textarea
                id="tenant-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Opsional"
                disabled={isUploading}
              />
            </div>
          </div>

          {amountWarning ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {amountWarning}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Batal
          </Button>
          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={isUploading || !proofFile || !transferAmount || !destinationAccountId || !hasAvailableAccounts}
          >
            {isUploading ? "Mengupload..." : "Upload Bukti"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
