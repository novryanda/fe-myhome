"use client";

import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bed, Building, History, LogIn, LogOut, RefreshCcw, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";

type RoomStatus = "AVAILABLE" | "RESERVED" | "BOOKED" | "OCCUPIED" | "MAINTENANCE";

type OccupancyHistoryRow = {
  id: string;
  bookingCode: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone?: string | null;
  checkInAt?: string | Date | null;
  checkOutAt?: string | Date | null;
  status: string;
  isActive: boolean;
};

type RoomHistoryResponse = {
  room: {
    id: string;
    roomNumber: string;
    status: RoomStatus;
    roomTypeName: string;
    propertyName: string;
  };
  history: OccupancyHistoryRow[];
};

const statusLabelMap: Record<RoomStatus, string> = {
  AVAILABLE: "Tersedia",
  RESERVED: "Dipesan",
  BOOKED: "Booking Aktif",
  OCCUPIED: "Terisi",
  MAINTENANCE: "Perbaikan",
};

const statusVariantMap: Record<RoomStatus, "success" | "warning" | "destructive" | "secondary"> = {
  AVAILABLE: "success",
  RESERVED: "warning",
  BOOKED: "warning",
  OCCUPIED: "destructive",
  MAINTENANCE: "secondary",
};

const dateTimeLabel = (value?: string | Date | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "-";

export default function RoomHistoryDetailClient({ roomId }: { roomId: string }) {
  const router = useRouter();

  const query = useQuery({
    queryKey: ["room-history-detail", roomId],
    queryFn: async () => {
      const response = await api.get(`/api/room-types/rooms/${roomId}/history`);
      return response.data?.data as RoomHistoryResponse;
    },
  });

  const data = query.data;

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-8 w-60" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
        <Building className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
        <h3 className="mb-1 font-bold text-xl">Kamar tidak ditemukan</h3>
        <p className="mb-6 text-muted-foreground text-sm">
          Kamar yang Anda cari tidak terdaftar atau Anda tidak memiliki akses untuk melihatnya.
        </p>
        <Button onClick={() => router.push("/dashboard/room-history")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Riwayat Kamar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3.5">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => router.push("/dashboard/room-history")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="flex items-center gap-2 font-extrabold text-2xl tracking-tight">
              <Bed className="h-6 w-6 text-primary" />
              Riwayat Kamar {data.room.roomNumber}
            </h2>
            <p className="mt-0.5 text-muted-foreground text-sm">
              {data.room.propertyName} · {data.room.roomTypeName}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => query.refetch()}>
          <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/5 px-4 py-2.5">
              <div className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Nomor Kamar</div>
              <div className="mt-0.5 font-bold">{data.room.roomNumber}</div>
            </div>
            <div className="rounded-xl border bg-muted/5 px-4 py-2.5">
              <div className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Status</div>
              <div className="mt-1">
                <Badge variant={statusVariantMap[data.room.status]}>{statusLabelMap[data.room.status]}</Badge>
              </div>
            </div>
            <div className="col-span-2 rounded-xl border bg-muted/5 px-4 py-2.5 sm:col-span-1">
              <div className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                Riwayat Penghuni
              </div>
              <div className="mt-0.5 font-bold">{data.history.length} orang</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center gap-2 font-bold">
            <History className="h-5 w-5 text-primary" />
            Riwayat Penghuni (Check-in / Check-out)
          </div>

          {data.history.length ? (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader className="bg-muted/15">
                  <TableRow>
                    <TableHead className="font-bold text-xs">Penghuni</TableHead>
                    <TableHead className="font-bold text-xs">Kode Booking</TableHead>
                    <TableHead className="font-bold text-xs">Masuk (Check-in)</TableHead>
                    <TableHead className="font-bold text-xs">Keluar (Check-out)</TableHead>
                    <TableHead className="font-bold text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.history.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-muted/5">
                      <TableCell className="py-3.5 align-middle">
                        <div className="flex items-center gap-2 font-semibold text-xs">
                          <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                          {entry.tenantName}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{entry.tenantEmail}</div>
                      </TableCell>
                      <TableCell className="py-3.5 align-middle">
                        <div className="font-mono font-semibold text-[11px] tracking-wider">{entry.bookingCode}</div>
                      </TableCell>
                      <TableCell className="py-3.5 align-middle">
                        <div className="flex items-center gap-1.5 font-medium text-xs">
                          <LogIn className="h-3.5 w-3.5 text-emerald-500" />
                          {entry.checkInAt ? dateTimeLabel(entry.checkInAt) : "-"}
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 align-middle">
                        {entry.checkOutAt ? (
                          <div className="flex items-center gap-1.5 font-medium text-xs">
                            <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
                            {dateTimeLabel(entry.checkOutAt)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 align-middle">
                        {entry.isActive ? (
                          <Badge className="border-none bg-emerald-500 font-bold text-white">Aktif</Badge>
                        ) : (
                          <Badge variant="outline">Selesai</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
              Belum ada riwayat penghuni untuk kamar ini.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
