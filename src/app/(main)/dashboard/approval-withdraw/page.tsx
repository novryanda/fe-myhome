"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Search, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

import { useSession } from "@/lib/auth-client";
import { useFinanceSummary, useUpdateWithdrawalStatus, useWithdrawals } from "@/hooks/use-finance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PageHero } from "../_components/page-hero";

const currency = (value?: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

const dateLabel = (value?: string | Date | null) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "-";

export default function ApprovalWithdrawPage() {
  const { data: session, isPending } = useSession();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [modalMode, setModalMode] = useState<"SUCCESS" | "REJECTED" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const summaryQuery = useFinanceSummary();
  const withdrawalsQuery = useWithdrawals({ status, search, page: 1, size: 50 });
  const updateStatus = useUpdateWithdrawalStatus();

  const pendingItems = useMemo(
    () => (withdrawalsQuery.data?.data || []).filter((item: any) => item.status === "PENDING"),
    [withdrawalsQuery.data],
  );

  if (isPending) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.24))] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (session?.user?.role !== "SUPERADMIN") {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Akses Dibatasi</CardTitle>
            <CardDescription>Approval pencairan dana hanya tersedia untuk superadmin.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const withdrawals = withdrawalsQuery.data?.data || [];
  const summary = summaryQuery.data;

  const openAction = (item: any, mode: "SUCCESS" | "REJECTED") => {
    setSelected(item);
    setModalMode(mode);
    setAdminNote(mode === "SUCCESS" ? "Transfer berhasil diproses." : "");
    setReceiptUrl("");
  };

  const uploadReceipt = async (file?: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload/image", { method: "POST", body: formData });
      if (!response.ok) {
        throw new Error("Gagal mengunggah bukti");
      }
      const result = await response.json();
      setReceiptUrl(result.data.url);
      toast.success("Bukti transfer berhasil diunggah");
    } catch (error: any) {
      toast.error(error.message || "Upload bukti gagal");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-8 pt-6">
      <PageHero
        title="Pencairan Dana"
        description="Review pengajuan withdraw admin, validasi rekening tujuan, lalu lampirkan bukti transfer saat approval."
        badge={
          <Badge variant="secondary" className="w-fit">
            Superadmin Approval Desk
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Request Pending" value={String(summary?.pendingWithdrawals || 0)} icon={ShieldCheck} />
        <SummaryCard title="Pending Amount" value={currency(summary?.pendingAmount)} icon={ShieldCheck} />
        <SummaryCard title="Disetujui" value={String(summary?.successfulWithdrawals || 0)} icon={CheckCircle2} />
        <SummaryCard title="Ditolak" value={String(summary?.rejectedWithdrawals || 0)} icon={XCircle} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/40">
          <CardTitle>Approval Queue</CardTitle>
          <CardDescription>Pola referensi yang dipakai: queue approval dengan status, rekening snapshot, dan bukti transfer setelah sukses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Cari admin, rekening, email..." />
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-9 rounded-md border bg-transparent px-3 text-sm lg:w-[200px]"
            >
              <option value="">Semua status</option>
              <option value="PENDING">Pending</option>
              <option value="SUCCESS">Success</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            {pendingItems.length} request masih menunggu approval. Saat `SUCCESS`, bukti transfer wajib diunggah. Saat `REJECTED`, saldo admin otomatis dikembalikan.
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Rekening</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{dateLabel(item.createdAt)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{item.adminName || "-"}</div>
                    <div className="text-xs text-muted-foreground">{item.adminId}</div>
                  </TableCell>
                  <TableCell className="font-medium">{currency(item.amount)}</TableCell>
                  <TableCell>
                    <div>{item.bankName}</div>
                    <div className="text-xs text-muted-foreground">{item.accountNumber} • {item.accountHolder}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === "SUCCESS" ? "default" : item.status === "REJECTED" ? "destructive" : "secondary"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px] whitespace-normal text-sm text-muted-foreground">
                    {item.adminNote || "-"}
                    {item.receiptUrl ? (
                      <div>
                        <a href={item.receiptUrl} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">
                          Buka bukti transfer
                        </a>
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.status === "PENDING" ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => openAction(item, "SUCCESS")}>
                          Setujui
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openAction(item, "REJECTED")}>
                          Tolak
                        </Button>
                      </div>
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

      <Dialog
        open={!!selected && !!modalMode}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setModalMode(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{modalMode === "SUCCESS" ? "Setujui Pencairan" : "Tolak Pencairan"}</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.adminName || "Admin"} mengajukan ${currency(selected.amount)} ke ${selected.bankName} ${selected.accountNumber}.` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {modalMode === "SUCCESS" ? (
              <>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Unggah Bukti Transfer</div>
                  <Input type="file" accept="image/*" onChange={(event) => uploadReceipt(event.target.files?.[0])} />
                  <Input value={receiptUrl} onChange={(event) => setReceiptUrl(event.target.value)} placeholder="Atau tempel URL bukti transfer" />
                  {isUploading ? <div className="text-sm text-muted-foreground">Mengunggah bukti...</div> : null}
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Catatan Approval</div>
                  <Textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="Contoh: Transfer berhasil ke rekening tujuan." />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium">Alasan Penolakan</div>
                <Textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="Contoh: Data rekening tidak valid." />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelected(null);
                setModalMode(null);
              }}
            >
              Batal
            </Button>
            <Button
              disabled={updateStatus.isPending || isUploading}
              onClick={() =>
                updateStatus.mutate(
                  {
                    id: selected.id,
                    status: modalMode,
                    adminNote,
                    receiptUrl: modalMode === "SUCCESS" ? receiptUrl : undefined,
                  },
                  {
                    onSuccess: () => {
                      toast.success(modalMode === "SUCCESS" ? "Pencairan disetujui" : "Pencairan ditolak");
                      setSelected(null);
                      setModalMode(null);
                    },
                    onError: (error: any) => toast.error(error.response?.data?.message || "Gagal memproses approval"),
                  },
                )
              }
            >
              {updateStatus.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {modalMode === "SUCCESS" ? "Konfirmasi Approval" : "Konfirmasi Penolakan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  icon: typeof ShieldCheck;
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
