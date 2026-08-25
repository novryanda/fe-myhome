"use client";

import { useDeferredValue, useState } from "react";

import Link from "next/link";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building, Eye, History, RefreshCcw, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";

import { PageHero } from "../_components/page-hero";

type RoomStatus = "AVAILABLE" | "RESERVED" | "BOOKED" | "OCCUPIED" | "MAINTENANCE";

type RoomRow = {
  id: string;
  roomNumber: string;
  status: RoomStatus;
  roomTypeName: string;
  propertyName: string;
  currentBooking?: {
    tenantName: string;
    tenantEmail: string;
  } | null;
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

export default function RoomHistoryPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<RoomStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const query = useQuery({
    queryKey: ["room-history-list", deferredSearch, status, page],
    queryFn: async () => {
      const response = await api.get("/api/room-types/rooms", {
        params: {
          search: deferredSearch || undefined,
          status: status === "ALL" ? undefined : status,
          sortOrder: "asc",
          page,
          limit: pageSize,
        },
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const rooms = (query.data?.data || []) as RoomRow[];
  const meta = query.data?.meta || { totalItems: 0, totalPages: 1, currentPage: 1 };

  return (
    <div className="space-y-6 p-8 pt-6">
      <PageHero
        title="Riwayat Kamar"
        description="Lihat seluruh unit kamar beserta riwayat penghuni (check-in dan check-out) di setiap kamar."
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Muat Ulang
          </Button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:w-80">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            type="search"
            placeholder="Cari nomor kamar, tipe, properti, atau penghuni..."
            className="pl-10"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as RoomStatus | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full md:w-52">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Status</SelectItem>
            <SelectItem value="AVAILABLE">Tersedia</SelectItem>
            <SelectItem value="RESERVED">Dipesan</SelectItem>
            <SelectItem value="OCCUPIED">Terisi</SelectItem>
            <SelectItem value="MAINTENANCE">Perbaikan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seluruh Kamar</CardTitle>
          <CardDescription>
            Klik &quot;Lihat Riwayat&quot; untuk melihat siapa saja yang pernah check-in dan check-out di kamar
            tersebut.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor Kamar</TableHead>
                  <TableHead>Tipe Kamar</TableHead>
                  <TableHead>Properti</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Penghuni Aktif</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  [1, 2, 3, 4, 5].map((item) => (
                    <TableRow key={item}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rooms.length ? (
                  rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.roomNumber}</TableCell>
                      <TableCell>{room.roomTypeName}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Building className="h-3.5 w-3.5" />
                          {room.propertyName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariantMap[room.status]}>{statusLabelMap[room.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        {room.currentBooking ? (
                          <div className="space-y-0.5">
                            <div className="font-medium">{room.currentBooking.tenantName}</div>
                            <div className="text-muted-foreground text-xs">{room.currentBooking.tenantEmail}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Belum ada penghuni</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/room-history/${room.id}`}>
                            <History className="mr-2 h-4 w-4" />
                            Lihat Riwayat
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      Tidak ada kamar yang cocok dengan filter Anda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted-foreground text-sm">
              Menampilkan {meta.totalItems} kamar, halaman {meta.currentPage} dari {meta.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= meta.totalPages}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
