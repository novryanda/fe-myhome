"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Bed,
  Building,
  Eye,
  LayoutGrid,
  PlusCircle,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminManualPaymentDialog } from "@/components/admin-manual-payment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EntityCard } from "@/components/entity-card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PageHero } from "../../_components/page-hero";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/api";

type RoomStatus = "AVAILABLE" | "RESERVED" | "BOOKED" | "OCCUPIED" | "MAINTENANCE";

type RoomDetail = {
  id: string;
  roomNumber: string;
  status: RoomStatus;
  roomTypeId: string;
  roomTypeName: string;
  propertyId: string;
  propertyName: string;
  currentBooking?: {
    id: string;
    bookingCode: string;
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

const dateLabel = (value?: string | Date | null) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "-";

const currency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const renderPagination = (
  currentPage: number,
  totalPages: number,
  onPageChange: (page: number) => void,
) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <Pagination className="mx-0 w-auto">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(event) => {
              event.preventDefault();
              if (currentPage > 1) {
                onPageChange(currentPage - 1);
              }
            }}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>

        {[...Array(totalPages)].map((_, index) => {
          const page = index + 1;
          if (
            page === 1 ||
            page === totalPages ||
            (page >= currentPage - 1 && page <= currentPage + 1)
          ) {
            return (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  isActive={currentPage === page}
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(page);
                  }}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            );
          }

          if (
            (page === 2 && currentPage > 3) ||
            (page === totalPages - 1 && currentPage < totalPages - 2)
          ) {
            return (
              <PaginationItem key={page}>
                <span className="px-2">...</span>
              </PaginationItem>
            );
          }

          return null;
        })}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(event) => {
              event.preventDefault();
              if (currentPage < totalPages) {
                onPageChange(currentPage + 1);
              }
            }}
            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default function RoomListClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [activePropertyId, setActivePropertyId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"room-types" | "all-rooms">("room-types");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roomTypePage, setRoomTypePage] = useState(1);
  const [roomPage, setRoomPage] = useState(1);
  const [roomStatusFilter, setRoomStatusFilter] = useState<RoomStatus | "ALL">("ALL");
  const [roomSortOrder, setRoomSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedRoom, setSelectedRoom] = useState<RoomDetail | null>(null);
  const [selectedManualPayment, setSelectedManualPayment] = useState<PaymentHistoryRow | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const limit = 15;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      if (activeTab === "room-types") {
        setRoomTypePage(1);
      } else {
        setRoomPage(1);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [activeTab, searchQuery]);

  const isAdmin = session?.user?.role === "ADMIN";
  const isSuperAdmin = session?.user?.role === "SUPERADMIN";

  const { data: propertiesData, isLoading: isLoadingProperties } = useQuery({
    queryKey: ["all-properties"],
    queryFn: async () => {
      const response = await api.get("/api/properties");
      return response.data;
    },
  });

  const properties = propertiesData?.data || [];

  useEffect(() => {
    if (!activePropertyId && properties.length > 0) {
      setActivePropertyId(isSuperAdmin ? "all" : properties[0].id);
    }
  }, [activePropertyId, isSuperAdmin, properties]);

  const activeProperty = properties.find((property: any) => property.id === activePropertyId);

  const roomTypesQuery = useQuery({
    queryKey: ["all-room-types", activePropertyId, roomTypePage, debouncedSearch],
    queryFn: async () => {
      if (!activePropertyId) return null;
      const response = await api.get(`/api/room-types/property/${activePropertyId}`, {
        params: {
          page: roomTypePage,
          limit,
          search: debouncedSearch || undefined,
        },
      });
      return response.data;
    },
    enabled: !!activePropertyId,
    placeholderData: keepPreviousData,
  });

  const allRoomsQuery = useQuery({
    queryKey: [
      "all-rooms-table",
      activePropertyId,
      roomPage,
      debouncedSearch,
      roomStatusFilter,
      roomSortOrder,
    ],
    queryFn: async () => {
      if (!activePropertyId) return null;
      const response = await api.get(`/api/room-types/property/${activePropertyId}/rooms`, {
        params: {
          page: roomPage,
          limit,
          search: debouncedSearch || undefined,
          status: roomStatusFilter === "ALL" ? undefined : roomStatusFilter,
          sortOrder: roomSortOrder,
        },
      });
      return response.data;
    },
    enabled: !!activePropertyId,
    placeholderData: keepPreviousData,
  });

  const roomTypes = roomTypesQuery.data?.data || [];
  const roomTypesMeta = roomTypesQuery.data?.meta || { totalItems: 0, totalPages: 0, currentPage: 1 };
  const allRooms = (allRoomsQuery.data?.data || []) as RoomDetail[];
  const allRoomsMeta = allRoomsQuery.data?.meta || { totalItems: 0, totalPages: 0, currentPage: 1 };

  const roomPaymentHistoryQuery = useQuery({
    queryKey: ["room-payment-history-inline", selectedRoom?.id, historyPage, historyPageSize],
    queryFn: async () => {
      const response = await api.get("/api/payments", {
        params: {
          roomId: selectedRoom?.id,
          page: historyPage,
          size: historyPageSize,
        },
      });
      return response.data;
    },
    enabled: !!selectedRoom?.id,
    placeholderData: keepPreviousData,
  });

  const roomPaymentHistory = (roomPaymentHistoryQuery.data?.data || []) as PaymentHistoryRow[];
  const roomPaymentHistoryPaging = roomPaymentHistoryQuery.data?.paging;

  useEffect(() => {
    if (selectedRoom) {
      setHistoryPage(1);
      setHistoryPageSize(10);
    }
  }, [selectedRoom]);

  return (
    <>
      <PageHero
        title="Kamar & Harga"
        description="Kelola tipe kamar, daftar unit kamar, ketersediaan, dan harga sewa properti Anda."
        action={
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => {
                if (activeTab === "room-types") {
                  roomTypesQuery.refetch();
                } else {
                  allRoomsQuery.refetch();
                }
              }}
              variant="outline"
              size="icon"
              title="Refresh data"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button
                disabled={!activePropertyId || (activePropertyId !== "all" && activeProperty?.status !== "APPROVED")}
                onClick={() => router.push("/dashboard/rooms/add")}
                title={activePropertyId !== "all" && activeProperty?.status !== "APPROVED" ? "Properti harus disetujui terlebih dahulu" : "Tambah Ruangan"}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Tambah Kamar
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="w-full xl:w-72">
          <Select
            value={activePropertyId}
            onValueChange={(value) => {
              setActivePropertyId(value);
              setRoomTypePage(1);
              setRoomPage(1);
            }}
            disabled={isLoadingProperties}
          >
            <SelectTrigger className="h-10 rounded-xl bg-card/50 backdrop-blur-sm border-border/50 transition-all hover:border-primary/30">
              <SelectValue placeholder={isLoadingProperties ? "Memuat properti..." : "Pilih properti..."} />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-2xl border-border/50">
              {isSuperAdmin && (
                <SelectItem value="all" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                    <span>Semua Properti</span>
                  </div>
                </SelectItem>
              )}
              {properties.map((property: any) => (
                <SelectItem key={property.id} value={property.id} className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{property.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
          <div className="relative w-full xl:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              type="search"
              placeholder={activeTab === "room-types" ? "Cari tipe kamar..." : "Cari nomor kamar, tipe, atau penghuni..."}
              className="h-10 rounded-xl border-border/50 bg-card/50 pl-10 backdrop-blur-sm transition-all hover:border-primary/30"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          {activeTab === "all-rooms" ? (
            <Select
              value={roomStatusFilter}
              onValueChange={(value) => {
                setRoomStatusFilter(value as RoomStatus | "ALL");
                setRoomPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl xl:w-52">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="AVAILABLE">Tersedia</SelectItem>
                <SelectItem value="OCCUPIED">Terisi</SelectItem>
                <SelectItem value="MAINTENANCE">Perbaikan</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "room-types" | "all-rooms")} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all-rooms">Semua Kamar</TabsTrigger>
          <TabsTrigger value="room-types">Jenis Kamar</TabsTrigger>
        </TabsList>

        <TabsContent value="room-types" className="space-y-6">
          {roomTypesQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="flex h-[200px] gap-4 rounded-3xl border bg-card p-4 shadow-sm">
                  <Skeleton className="h-full w-[180px] shrink-0 rounded-2xl" />
                  <div className="flex-1 space-y-3 py-2">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex gap-2 pt-4">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !activePropertyId ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Building className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mb-1 text-xl font-medium">Pilih Properti</h3>
              <p className="mb-4 max-w-sm text-muted-foreground">
                Silakan pilih properti terlebih dahulu untuk melihat daftar tipe kamar.
              </p>
            </div>
          ) : roomTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-muted/30 py-20">
              <LayoutGrid className="mb-4 h-16 w-16 text-muted-foreground/30" />
              <h3 className="text-xl font-semibold text-muted-foreground">Tidak Ada Tipe Kamar</h3>
              <p className="mt-2 max-w-xs text-center text-muted-foreground/70">
                {searchQuery
                  ? "Tidak ada tipe kamar yang cocok dengan pencarian Anda."
                  : activePropertyId === "all"
                    ? "Belum ada tipe kamar yang terdaftar di sistem."
                    : "Belum ada tipe kamar untuk properti ini."}
              </p>
            </div>
          ) : (
            <div className={`space-y-3 transition-opacity duration-300 ${roomTypesQuery.isRefetching ? "opacity-50" : "opacity-100"}`}>
              {roomTypes.map((roomType: any) => {
                const thumbnail =
                  roomType.images?.find((image: any) => image.category === "BEDROOM")?.url ||
                  roomType.images?.[0]?.url;

                return (
                  <EntityCard
                    key={roomType.id}
                    id={roomType.id}
                    name={roomType.name}
                    label="Nama Kamar"
                    imageUrl={thumbnail}
                    href={`/dashboard/rooms/${roomType.id}`}
                    fallbackIcon={<Bed className="size-6" />}
                  />
                );
              })}
            </div>
          )}

          {!roomTypesQuery.isLoading && roomTypesMeta.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-muted pb-10 pt-6">
              <p className="text-sm text-muted-foreground">
                Menampilkan <span className="font-medium">{(roomTypePage - 1) * limit + 1}</span> sampai{" "}
                <span className="font-medium">{Math.min(roomTypePage * limit, roomTypesMeta.totalItems)}</span> dari{" "}
                <span className="font-medium">{roomTypesMeta.totalItems}</span> hasil
              </p>
              {renderPagination(roomTypePage, roomTypesMeta.totalPages, setRoomTypePage)}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="all-rooms" className="space-y-6">
          {allRoomsQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((item) => (
                <Skeleton key={item} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : !activePropertyId ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Building className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mb-1 text-xl font-medium">Pilih Properti</h3>
              <p className="mb-4 max-w-sm text-muted-foreground">
                Silakan pilih properti terlebih dahulu untuk melihat daftar seluruh kamar.
              </p>
            </div>
          ) : allRooms.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <SlidersHorizontal className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <div className="text-lg font-semibold">Tidak ada kamar ditemukan</div>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Coba ubah filter status, urutan nomor kamar, atau kata kunci pencarian Anda.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Daftar Keseluruhan Kamar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            type="button"
                            variant="ghost"
                            className="-ml-3 h-auto px-3 py-1 text-left font-semibold"
                            onClick={() => {
                              setRoomSortOrder((previous) => (previous === "asc" ? "desc" : "asc"));
                              setRoomPage(1);
                            }}
                          >
                            Nomor Kamar
                            {roomSortOrder === "asc" ? (
                              <ArrowDownAZ className="ml-2 h-4 w-4" />
                            ) : (
                              <ArrowUpAZ className="ml-2 h-4 w-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tipe Kamar</TableHead>
                        <TableHead>Properti</TableHead>
                        <TableHead>Penghuni</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRooms.map((room) => (
                        <TableRow key={room.id}>
                          <TableCell className="font-medium">{room.roomNumber}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariantMap[room.status]}>{statusLabelMap[room.status]}</Badge>
                          </TableCell>
                          <TableCell>{room.roomTypeName}</TableCell>
                          <TableCell>{room.propertyName}</TableCell>
                          <TableCell>
                            {room.currentBooking ? (
                              <div className="space-y-1">
                                <div className="font-medium">{room.currentBooking.tenantName}</div>
                                <div className="text-xs text-muted-foreground">{room.currentBooking.tenantEmail}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Belum ada penghuni</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => setSelectedRoom(room)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Detail
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Menampilkan <span className="font-medium">{(roomPage - 1) * limit + 1}</span> sampai{" "}
                    <span className="font-medium">{Math.min(roomPage * limit, allRoomsMeta.totalItems)}</span> dari{" "}
                    <span className="font-medium">{allRoomsMeta.totalItems}</span> kamar
                  </p>
                  {renderPagination(roomPage, allRoomsMeta.totalPages, setRoomPage)}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!selectedRoom}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRoom(null);
            setSelectedManualPayment(null);
          }
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-hidden p-0 sm:max-w-[960px]">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>Detail Kamar {selectedRoom?.roomNumber}</DialogTitle>
            <DialogDescription>
              Lihat status kamar, informasi penghuni aktif, dan histori pembayaran langsung di modal ini.
            </DialogDescription>
          </DialogHeader>

          {selectedRoom ? (
            <ScrollArea className="max-h-[calc(88vh-88px)]">
              <div className="space-y-5 px-6 py-5">
                <div className="rounded-xl border bg-muted/20 p-5">
                  <div className="mb-4 font-semibold text-sm">Ringkasan Kamar</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-background px-4 py-3">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Nomor Kamar</div>
                      <div className="mt-1 font-semibold text-base">{selectedRoom.roomNumber}</div>
                    </div>
                    <div className="rounded-lg bg-background px-4 py-3">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Status</div>
                      <div className="mt-2">
                        <Badge variant={statusVariantMap[selectedRoom.status]}>{statusLabelMap[selectedRoom.status]}</Badge>
                      </div>
                    </div>
                    <div className="rounded-lg bg-background px-4 py-3">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Tipe Kamar</div>
                      <div className="mt-1 font-medium">{selectedRoom.roomTypeName}</div>
                    </div>
                    <div className="rounded-lg bg-background px-4 py-3">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Properti</div>
                      <div className="mt-1 font-medium">{selectedRoom.propertyName}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-5">
                  <div className="mb-4 font-semibold text-sm">Informasi Penghuni</div>
                  {selectedRoom.currentBooking ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 font-semibold text-base">
                        <UserRound className="h-4 w-4 text-primary" />
                        {selectedRoom.currentBooking.tenantName}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg bg-muted/20 px-4 py-3 md:col-span-2">
                          <div className="text-muted-foreground text-xs uppercase tracking-wide">Email</div>
                          <div className="mt-1 break-all font-medium">{selectedRoom.currentBooking.tenantEmail}</div>
                        </div>
                        <div className="rounded-lg bg-muted/20 px-4 py-3">
                          <div className="text-muted-foreground text-xs uppercase tracking-wide">No. Telepon</div>
                          <div className="mt-1 font-medium">{selectedRoom.currentBooking.tenantPhone || "-"}</div>
                        </div>
                        <div className="rounded-lg bg-muted/20 px-4 py-3">
                          <div className="text-muted-foreground text-xs uppercase tracking-wide">Check-in</div>
                          <div className="mt-1 font-medium">{dateLabel(selectedRoom.currentBooking.checkInAt)}</div>
                        </div>
                        <div className="rounded-lg bg-muted/20 px-4 py-3">
                          <div className="text-muted-foreground text-xs uppercase tracking-wide">Kode Booking</div>
                          <div className="mt-1 font-medium break-all">{selectedRoom.currentBooking.bookingCode}</div>
                        </div>
                        <div className="rounded-lg bg-muted/20 px-4 py-3">
                          <div className="text-muted-foreground text-xs uppercase tracking-wide">
                            Jatuh Tempo Berikutnya
                          </div>
                          <div className="mt-1 font-medium">{dateLabel(selectedRoom.currentBooking.nextDueDate)}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                      Saat ini belum ada penghuni aktif pada kamar ini.
                    </div>
                  )}
                </div>

                <div className="rounded-xl border">
                  <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold">Riwayat Pembayaran</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Histori pembayaran unit kamar ini lintas tenant, termasuk booking awal dan perpanjangan.
                      </div>
                    </div>
                    <Button
                      className="w-full sm:w-auto lg:shrink-0"
                      variant="outline"
                      onClick={() => roomPaymentHistoryQuery.refetch()}
                      disabled={roomPaymentHistoryQuery.isFetching}
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Muat Ulang
                    </Button>
                  </div>

                  <div className="space-y-4 px-5 py-4">
                    <div className="overflow-x-auto rounded-lg border">
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
                          {roomPaymentHistoryQuery.isLoading ? (
                            <TableRow>
                              <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                                Memuat histori pembayaran...
                              </TableCell>
                            </TableRow>
                          ) : roomPaymentHistory.length ? (
                            roomPaymentHistory.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell className="min-w-[190px] align-top">
                                  <div className="font-medium">{payment.bookingCode}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {payment.roomNumber || selectedRoom.roomNumber}
                                  </div>
                                </TableCell>
                                <TableCell className="min-w-[120px] align-top">{payment.tenantName}</TableCell>
                                <TableCell className="align-top">
                                  <Badge variant="secondary">{payment.category}</Badge>
                                </TableCell>
                                <TableCell className="min-w-[170px] align-top">{payment.paymentType || "-"}</TableCell>
                                <TableCell className="min-w-[130px] align-top">{currency(payment.amount)}</TableCell>
                                <TableCell className="min-w-[150px] align-top">
                                  <Badge variant={payment.status === "PAID" ? "default" : "outline"}>{payment.status}</Badge>
                                  {payment.latestManualProof ? (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      Proof: {payment.latestManualProof.status}
                                    </div>
                                  ) : null}
                                </TableCell>
                                <TableCell className="min-w-[120px] align-top">{dateLabel(payment.createdAt)}</TableCell>
                                <TableCell className="min-w-[140px] align-top">
                                  <div>{dateLabel(payment.paidAt)}</div>
                                  <div className="text-xs text-muted-foreground">{dateLabel(payment.expiredAt)}</div>
                                </TableCell>
                                <TableCell className="min-w-[160px] text-right align-top">
                                  {payment.status === "PENDING" ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setSelectedManualPayment(payment)}
                                    >
                                      Tandai Bayar Manual
                                    </Button>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">-</span>
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

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="text-sm text-muted-foreground">
                        Total {roomPaymentHistoryPaging?.total_items || 0} transaksi, halaman{" "}
                        {roomPaymentHistoryPaging?.current_page || historyPage} dari{" "}
                        {roomPaymentHistoryPaging?.total_page || 1}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <Select
                          value={String(historyPageSize)}
                          onValueChange={(value) => {
                            setHistoryPageSize(Number(value));
                            setHistoryPage(1);
                          }}
                        >
                          <SelectTrigger className="w-[120px]">
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
                        <Button
                          variant="outline"
                          onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}
                          disabled={historyPage <= 1}
                        >
                          Sebelumnya
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setHistoryPage((current) => current + 1)}
                          disabled={historyPage >= (roomPaymentHistoryPaging?.total_page || 1)}
                        >
                          Berikutnya
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>

      <AdminManualPaymentDialog
        open={!!selectedManualPayment}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedManualPayment(null);
          }
        }}
        submitUrl={selectedManualPayment ? `/api/payments/${selectedManualPayment.id}/manual-paid` : ""}
        tenantName={selectedManualPayment?.tenantName || "-"}
        bookingCode={selectedManualPayment?.bookingCode || "-"}
        propertyId={selectedManualPayment?.propertyId || selectedRoom?.propertyId}
        propertyName={selectedManualPayment?.propertyName || selectedRoom?.propertyName}
        roomLabel={
          selectedManualPayment
            ? `${selectedManualPayment.roomTypeName || selectedRoom?.roomTypeName || "-"} / Unit ${selectedManualPayment.roomNumber || selectedRoom?.roomNumber || "-"}`
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
          queryClient.invalidateQueries({ queryKey: ["room-payment-history-inline", selectedRoom?.id] });
        }}
      />
    </>
  );
}
