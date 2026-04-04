"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Landmark, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { useSession } from "@/lib/auth-client";
import {
  useBankAccount,
  useCreateWithdrawal,
  useFinanceSummary,
  useUpdateBankAccount,
  useWithdrawals,
} from "@/hooks/use-finance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHero } from "../_components/page-hero";

const currency = (value?: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

const dateLabel = (value?: string | Date | null) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "-";

export default function WithdrawPage() {
  const { data: session, isPending } = useSession();
  const summaryQuery = useFinanceSummary();
  const bankAccountQuery = useBankAccount();
  const withdrawalsQuery = useWithdrawals({ page: 1, size: 20 });
  const updateBankAccount = useUpdateBankAccount();
  const createWithdrawal = useCreateWithdrawal();

  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [amount, setAmount] = useState("");
  const summary = summaryQuery.data;

  const numericAmount = Number((amount || "0").replace(/\D/g, ""));
  const availableBalance = summary?.availableBalance || 0;
  const hasBankAccount = Boolean(bankName && accountNumber && accountHolder);
  const canSubmitWithdrawal =
    hasBankAccount &&
    numericAmount >= 10000 &&
    numericAmount <= availableBalance &&
    !createWithdrawal.isPending;

  useEffect(() => {
    if (bankAccountQuery.data) {
      setBankName(bankAccountQuery.data.bankName || "");
      setAccountNumber(bankAccountQuery.data.accountNumber || "");
      setAccountHolder(bankAccountQuery.data.accountHolder || "");
    }
  }, [bankAccountQuery.data]);

  if (isPending) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.24))] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Akses Dibatasi</CardTitle>
            <CardDescription>Halaman penarikan dana hanya tersedia untuk admin properti.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const withdrawals = withdrawalsQuery.data?.data || [];

  return (
    <div className="space-y-6 p-8 pt-6">
      <PageHero
        title="Penarikan Dana"
        description="Saldo hasil transaksi booking masuk ke wallet admin, lalu diajukan ke superadmin untuk pencairan."
        badge={
          <Badge variant="secondary" className="w-fit">
            Approval oleh Superadmin
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Saldo Tersedia" value={currency(summary?.availableBalance)} icon={Wallet} />
        <SummaryCard title="Request Pending" value={String(summary?.pendingWithdrawals || 0)} icon={Wallet} />
        <SummaryCard title="Pencairan Sukses" value={String(summary?.successfulWithdrawals || 0)} icon={Wallet} />
        <SummaryCard title="Nominal Pending" value={currency(summary?.pendingAmount)} icon={Wallet} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/40">
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Rekening Pencairan
            </CardTitle>
            <CardDescription>Simpan rekening tujuan terlebih dahulu sebelum membuat pengajuan withdraw.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Field label="Nama Bank">
              <Input value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="Contoh: BCA" />
            </Field>
            <Field label="Nomor Rekening">
              <Input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="1234567890" />
            </Field>
            <Field label="Nama Pemilik Rekening">
              <Input value={accountHolder} onChange={(event) => setAccountHolder(event.target.value)} placeholder="Nama pemilik rekening" />
            </Field>
            <Button
              className="w-full"
              disabled={updateBankAccount.isPending}
              onClick={() =>
                updateBankAccount.mutate(
                  { bankName, accountNumber, accountHolder },
                  {
                    onSuccess: () => toast.success("Rekening berhasil disimpan"),
                    onError: (error: any) => toast.error(error.response?.data?.message || "Gagal menyimpan rekening"),
                  },
                )
              }
            >
              {updateBankAccount.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simpan Rekening
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/40">
            <CardTitle>Ajukan Penarikan</CardTitle>
            <CardDescription>Minimal Rp10.000. Nominal akan dipotong dari saldo tersedia saat request dibuat.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="rounded-xl border border-dashed bg-muted/30 p-4">
              <div className="text-sm text-muted-foreground">Saldo yang bisa dicairkan</div>
              <div className="mt-1 text-3xl font-bold">{currency(summary?.availableBalance)}</div>
            </div>
            <Field label="Nominal Penarikan">
              <Input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(event) => {
                  const digitsOnly = event.target.value.replace(/\D/g, "");
                  setAmount(digitsOnly);
                }}
                placeholder="Contoh: 250000"
              />
            </Field>
            <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
              {numericAmount > 0 ? (
                <span>
                  Nominal diajukan: <span className="font-semibold text-foreground">{currency(numericAmount)}</span>
                </span>
              ) : (
                <span>Masukkan nominal penarikan  </span>
              )}
              {numericAmount > availableBalance ? (
                <div className="mt-1 text-destructive">Nominal melebihi saldo tersedia.</div>
              ) : null}
              {!hasBankAccount ? (
                <div className="mt-1 text-amber-600">Simpan rekening pencairan terlebih dahulu.</div>
              ) : null}
            </div>
            <Button
              className="w-full"
              disabled={!canSubmitWithdrawal}
              onClick={() =>
                createWithdrawal.mutate(
                  { amount: numericAmount },
                  {
                    onSuccess: () => {
                      toast.success("Pengajuan penarikan berhasil dibuat");
                      setAmount("");
                    },
                    onError: (error: any) => toast.error(error.response?.data?.message || "Gagal mengajukan penarikan"),
                  },
                )
              }
            >
              {createWithdrawal.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Ajukan Penarikan
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pengajuan</CardTitle>
          <CardDescription>Lacak status pencairan, catatan approval, dan bukti transfer dari superadmin.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Rekening</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead>Bukti</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{dateLabel(item.createdAt)}</TableCell>
                  <TableCell className="font-medium">{currency(item.amount)}</TableCell>
                  <TableCell>
                    <div>{item.bankName}</div>
                    <div className="text-xs text-muted-foreground">{item.accountNumber}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === "SUCCESS" ? "default" : item.status === "REJECTED" ? "destructive" : "secondary"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px] whitespace-normal text-sm text-muted-foreground">
                    {item.adminNote || "-"}
                  </TableCell>
                  <TableCell>
                    {item.receiptUrl ? (
                      <a href={item.receiptUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                        Lihat Bukti
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: typeof Wallet;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      {children}
    </div>
  );
}
