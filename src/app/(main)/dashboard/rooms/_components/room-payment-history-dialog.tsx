"use client";

import { useMemo, useState } from "react";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { AdminManualPaymentDialog } from "@/components/admin-manual-payment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";

type RoomStatus = "AVAILABLE" | "RESERVED" | "BOOKED" | "OCCUPIED" | "MAINTENANCE";

type RoomHistoryTarget = {
  id: string;
  roomNumber: string;
  status: RoomStatus;
  currentBooking?: {
    id: string;
    tenantName: string;
    tenantEmail: string;
    tenantPhone?: string | null;
    checkInAt?: string | Date | null;
    nextDueDate?: string | Date | null;
  } | null;
};

type PaymentHistoryRow = {
  id: string;
  bookingId: string;
  bookingCode: string;
  roomId?: string | null;
  roomTypeId?: string | null;
  tenantName: string;
  propertyId?: string | null;
  propertyName?: string | null;
  roomTypeName?: string | null;
  roomNumber?: string | null;
  amount: number;
  status: string;
  category: string;
  paymentType?: string | null;
  paidAt?: string | Date | null;
  expiredAt?: string | Date | null;
  createdAt?: string | Date | null;
  latestManualProof?: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUIRED";
    transferAmount: number;
    adminNote?: string | null;
    createdAt: string;
  } | null;
};

type RoomPaymentHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: RoomHistoryTarget | null;
  roomTypeName: string;
  propertyId?: string | null;
};

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const dateLabel = (value?: string | Date | null) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "-";

const roomStatusLabelMap: Record<RoomStatus, string> = {
  AVAILABLE: "Tersedia",
  RESERVED: "Dipesan",
  BOOKED: "Booking Aktif",
  OCCUPIED: "Terisi",
  MAINTENANCE: "Perbaikan",
};

const roomStatusVariantMap: Record<RoomStatus, "success" | "warning" | "destructive" | "secondary"> = {
  AVAILABLE: "success",
  RESERVED: "warning",
  BOOKED: "warning",
  OCCUPIED: "destructive",
  MAINTENANCE: "secondary",
};

export function RoomPaymentHistoryDialog({
  open,
  onOpenChange,
  room,
  roomTypeName,
  propertyId,
}: RoomPaymentHistoryDialogProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedManualPayment, setSelectedManualPayment] = useState<PaymentHistoryRow | null>(null);

  const paymentHistoryQuery = useQuery({
    queryKey: ["room-payment-history", room?.id, page, pageSize],
    queryFn: async () => {
      const response = await api.get("/api/payments", {
        params: {
          roomId: room?.id,
          page,
          size: pageSize,
        },
      });
      return response.data;
    },
    enabled: open && !!room?.id,
    placeholderData: keepPreviousData,
  });

  const payments = useMemo(() => (paymentHistoryQuery.data?.data || []) as PaymentHistoryRow[], [paymentHistoryQuery.data]);
  const paging = paymentHistoryQuery.data?.paging;

  const closeDialog = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPage(1);
      setPageSize(10);
      setSelectedManualPayment(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="max-h-[90vh] sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Riwayat Pembayaran Kamar {room?.roomNumber || "-"}</DialogTitle>
            <DialogDescription>
              Histori seluruh transaksi unit kamar ini lintas tenant, termasuk booking awal dan perpanjangan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm md:grid-cols-2 xl:grid-cols-4">
              <div>
                <div className="text-muted-foreground">Unit Kamar</div>
                <div className="font-medium">{room?.roomNumber || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Tipe Kamar</div>
                <div className="font-medium">{roomTypeName}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Status Saat Ini</div>
                {room ? <Badge variant={roomStatusVariantMap[room.status]}>{roomStatusLabelMap[room.status]}</Badge> : "-"}
              </div>
              <div>
                <div className="text-muted-foreground">Tenant Aktif</div>
                <div className="font-medium">{room?.currentBooking?.tenantName || "Belum ada penghuni"}</div>
                {room?.currentBooking?.tenantEmail ? (
                  <div className="text-muted-foreground text-xs">{room.currentBooking.tenantEmail}</div>
                ) : null}
              </div>
            </div>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium">Daftar Transaksi</div>
                    <div className="text-muted-foreground text-sm">
                      Menampilkan histori pembayaran berdasarkan unit kamar yang dipilih.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => paymentHistoryQuery.refetch()} disabled={paymentHistoryQuery.isFetching}>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Muat Ulang
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Metode</TableHead>
                        <TableHead>Nominal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Dibuat</TableHead>
                        <TableHead>Paid / Expired</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentHistoryQuery.isLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                            Memuat histori pembayaran...
                          </TableCell>
                        </TableRow>
                      ) : payments.length ? (
                        payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <div className="font-medium">{payment.bookingCode}</div>
                              <div className="text-muted-foreground text-xs">{payment.roomNumber || room?.roomNumber || "-"}</div>
                            </TableCell>
                            <TableCell>{payment.tenantName}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{payment.category}</Badge>
                            </TableCell>
                            <TableCell>{payment.paymentType || "-"}</TableCell>
                            <TableCell>{currency(payment.amount)}</TableCell>
                            <TableCell>
                              <Badge variant={payment.status === "PAID" ? "default" : "outline"}>{payment.status}</Badge>
                              {payment.latestManualProof ? (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Proof: {payment.latestManualProof.status}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>{dateLabel(payment.createdAt)}</TableCell>
                            <TableCell>
                              <div>{dateLabel(payment.paidAt)}</div>
                              <div className="text-muted-foreground text-xs">{dateLabel(payment.expiredAt)}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              {payment.status === "PENDING" ? (
                                <Button size="sm" variant="outline" onClick={() => setSelectedManualPayment(payment)}>
                                  Tandai Bayar Manual
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                            Belum ada histori pembayaran untuk kamar ini.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-muted-foreground text-sm">
                    Total {paging?.total_items || 0} transaksi, halaman {paging?.current_page || page} dari{" "}
                    {paging?.total_page || 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 10, 20, 50].map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size} / halaman
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPage((current) => current + 1)}
                      disabled={page >= (paging?.total_page || 1)}
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <AdminManualPaymentDialog
        open={!!selectedManualPayment}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedManualPayment(null);
          }
        }}
        submitUrl={selectedManualPayment ? `/api/payments/${selectedManualPayment.id}/manual-paid` : ""}
        tenantName={selectedManualPayment?.tenantName || "-"}
        bookingCode={selectedManualPayment?.bookingCode || "-"}
        propertyId={selectedManualPayment?.propertyId || propertyId}
        propertyName={selectedManualPayment?.propertyName}
        roomLabel={
          selectedManualPayment
            ? `${selectedManualPayment.roomTypeName || roomTypeName} / Unit ${selectedManualPayment.roomNumber || room?.roomNumber || "-"}`
            : "-"
        }
        periodLabel={selectedManualPayment?.category || "-"}
        amount={selectedManualPayment?.amount || 0}
        onSuccess={() => {
          setSelectedManualPayment(null);
          queryClient.invalidateQueries({ queryKey: ["dashboard-payments"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-payments-stats"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-bookings"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-bookings-stats"] });
          queryClient.invalidateQueries({ queryKey: ["tenants"] });
          queryClient.invalidateQueries({ queryKey: ["manual-payment-proofs"] });
          queryClient.invalidateQueries({ queryKey: ["room-payment-history", room?.id] });
        }}
      />
    </>
  );
}
