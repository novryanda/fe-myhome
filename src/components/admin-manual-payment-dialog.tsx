"use client";

import { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

type AdminManualPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitUrl: string;
  title?: string;
  description?: string;
  tenantName: string;
  bookingCode: string;
  propertyId?: string | null;
  propertyName?: string | null;
  roomLabel?: string | null;
  periodLabel?: string | null;
  amount: number;
  defaultTransferAmount?: number;
  onSuccess?: () => void;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof message === "string" && message) {
    return message;
  }

  return error instanceof Error ? error.message : fallback;
};

export function AdminManualPaymentDialog({
  open,
  onOpenChange,
  submitUrl,
  title = "Konfirmasi Pembayaran Manual",
  description = "Upload bukti pembayaran lalu pilih apakah ingin menunggu verifikasi atau langsung ditandai lunas.",
  tenantName,
  bookingCode,
  propertyId,
  propertyName,
  roomLabel,
  periodLabel,
  amount,
  defaultTransferAmount,
  onSuccess,
}: AdminManualPaymentDialogProps) {
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderBank, setSenderBank] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [transferAmount, setTransferAmount] = useState(String(defaultTransferAmount ?? amount));
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) {
      setProofFile(null);
      setDestinationAccountId("");
      setSenderName("");
      setSenderBank("");
      setTransferDate("");
      setTransferAmount(String(defaultTransferAmount ?? amount));
      setNote("");
    }
  }, [open, amount, defaultTransferAmount]);

  const accountsQuery = useQuery({
    queryKey: ["property-manual-payment-accounts", propertyId],
    queryFn: async () => {
      const response = await api.get(`/api/properties/${propertyId}/manual-payment-accounts`);
      return (response.data?.data || []) as Array<{
        id: string;
        label: string;
        bankName: string;
        accountNumber: string;
        accountHolder: string;
        isVisible: boolean;
      }>;
    },
    enabled: open && !!propertyId,
  });

  useEffect(() => {
    if (open && accountsQuery.data?.length && !destinationAccountId) {
      setDestinationAccountId(accountsQuery.data[0]?.id || "");
    }
  }, [open, accountsQuery.data, destinationAccountId]);

  const amountWarning = useMemo(() => {
    const numericAmount = Number(transferAmount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return null;
    }

    if (numericAmount < amount) {
      return `Nominal transfer kurang ${currency(amount - numericAmount)} dari tagihan.`;
    }

    if (numericAmount > amount) {
      return `Nominal transfer lebih ${currency(numericAmount - amount)} dari tagihan.`;
    }

    return null;
  }, [amount, transferAmount]);

  const submitMutation = useMutation({
    mutationFn: async (actionMode: "SAVE_PENDING" | "APPROVE_NOW") => {
      if (!proofFile) {
        throw new Error("File bukti pembayaran wajib diupload");
      }

      const formData = new FormData();
      formData.append("proof_file", proofFile);
      formData.append("destination_account_id", destinationAccountId);
      formData.append("transfer_amount", transferAmount);
      formData.append("paymentType", "MANUAL_TRANSFER");
      formData.append("actionMode", actionMode);

      if (senderName.trim()) formData.append("sender_name", senderName.trim());
      if (senderBank.trim()) formData.append("sender_bank", senderBank.trim());
      if (transferDate) formData.append("transfer_date", transferDate);
      if (note.trim()) formData.append("note", note.trim());

      const response = await api.post(submitUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return response.data;
    },
    onSuccess: (_, actionMode) => {
      toast.success(
        actionMode === "APPROVE_NOW"
          ? "Pembayaran manual berhasil disimpan dan ditandai lunas."
          : "Bukti pembayaran berhasil disimpan dan menunggu verifikasi.",
      );
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Gagal menyimpan pembayaran manual"));
    },
  });

  const isSubmitting = submitMutation.isPending;
  const hasAvailableAccounts = (accountsQuery.data?.length || 0) > 0;
  const selectedAccount = accountsQuery.data?.find((account) => account.id === destinationAccountId) || null;

  const handleCopyAccountNumber = async () => {
    if (!selectedAccount) return;

    try {
      await navigator.clipboard.writeText(selectedAccount.accountNumber);
      toast.success("Nomor rekening berhasil disalin.");
    } catch {
      toast.error("Gagal menyalin nomor rekening.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-2xl">
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
              <div className="text-muted-foreground">Tenant</div>
              <div className="font-medium">{tenantName}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Properti / Kamar</div>
              <div className="font-medium">
                {propertyName || "-"}
                {roomLabel ? ` / ${roomLabel}` : ""}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Nominal Tagihan</div>
              <div className="font-medium">{currency(amount)}</div>
            </div>
            {periodLabel ? (
              <div className="sm:col-span-2">
                <div className="text-muted-foreground">Periode</div>
                <div className="font-medium">{periodLabel}</div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="admin-destination-account">Rekening Tujuan</Label>
              {hasAvailableAccounts ? (
                <div className="space-y-3">
                  <Select value={destinationAccountId} onValueChange={setDestinationAccountId} disabled={isSubmitting}>
                    <SelectTrigger id="admin-destination-account">
                      <SelectValue placeholder="Pilih rekening tujuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {(accountsQuery.data || []).map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.label} - {account.bankName} ({account.accountNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAccount ? (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">{selectedAccount.label}</div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopyAccountNumber}
                          disabled={isSubmitting}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Salin Nomor
                        </Button>
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {selectedAccount.bankName} - {selectedAccount.accountNumber}
                      </div>
                      <div className="text-muted-foreground">a.n. {selectedAccount.accountHolder}</div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Belum ada rekening pembayaran manual untuk properti ini. Tambahkan dulu di detail properti.
                </div>
              )}
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="admin-proof-file">Bukti Pembayaran</Label>
              <Input
                id="admin-proof-file"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => setProofFile(event.target.files?.[0] || null)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-sender-name">Nama Pengirim</Label>
              <Input
                id="admin-sender-name"
                value={senderName}
                onChange={(event) => setSenderName(event.target.value)}
                placeholder="Opsional"
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-sender-bank">Bank Pengirim</Label>
              <Input
                id="admin-sender-bank"
                value={senderBank}
                onChange={(event) => setSenderBank(event.target.value)}
                placeholder="Opsional"
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-transfer-date">Tanggal Transfer</Label>
              <Input
                id="admin-transfer-date"
                type="date"
                value={transferDate}
                onChange={(event) => setTransferDate(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-transfer-amount">Nominal Transfer</Label>
              <Input
                id="admin-transfer-amount"
                type="number"
                min={1}
                value={transferAmount}
                onChange={(event) => setTransferAmount(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="admin-note">Catatan</Label>
              <Textarea
                id="admin-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Opsional"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {amountWarning ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {amountWarning}
            </div>
          ) : null}

          <div className="text-muted-foreground text-sm">
            Pembayaran manual tidak menambah saldo withdrawable sistem karena uang diterima langsung oleh admin.
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={() => submitMutation.mutate("SAVE_PENDING")}
              disabled={isSubmitting || !proofFile || !transferAmount || !destinationAccountId || !hasAvailableAccounts}
            >
              {isSubmitting && submitMutation.variables === "SAVE_PENDING"
                ? "Menyimpan..."
                : "Simpan sebagai Menunggu Verifikasi"}
            </Button>
            <Button
              onClick={() => submitMutation.mutate("APPROVE_NOW")}
              disabled={isSubmitting || !proofFile || !transferAmount || !destinationAccountId || !hasAvailableAccounts}
            >
              {isSubmitting && submitMutation.variables === "APPROVE_NOW"
                ? "Memproses..."
                : "Simpan & Langsung Tandai Lunas"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
