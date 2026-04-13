"use client";

import { useEffect, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Edit2, Loader2, Plus, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";

type RoomStatus = "AVAILABLE" | "RESERVED" | "BOOKED" | "OCCUPIED" | "MAINTENANCE";

interface Room {
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
}

interface RoomManagementTabProps {
  roomTypeId: string;
  rooms: Room[];
  pricingOptions: Array<{
    value: "WEEKLY" | "MONTHLY" | "THREE_MONTHLY" | "YEARLY";
    label: string;
  }>;
}

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

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const getErrorMessage = (error: unknown, fallback: string) => {
  const maybeMessage = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;

  if (typeof maybeMessage === "string" && maybeMessage) {
    return maybeMessage;
  }

  return error instanceof Error ? error.message : fallback;
};

export function RoomManagementTab({ roomTypeId, rooms, pricingOptions }: RoomManagementTabProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ roomNumber: string; status: RoomStatus }>({
    roomNumber: "",
    status: "AVAILABLE",
  });
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [assignRoom, setAssignRoom] = useState<Room | null>(null);
  const [assignForm, setAssignForm] = useState({
    tenantFullName: "",
    tenantEmail: "",
    tenantPhone: "",
    pricingType: pricingOptions[0]?.value ?? "MONTHLY",
    startDate: todayInputValue(),
    isSubscription: true,
    temporaryPassword: "",
  });

  useEffect(() => {
    if (!pricingOptions.length) {
      return;
    }

    const currentPricingStillValid = pricingOptions.some((option) => option.value === assignForm.pricingType);
    if (!currentPricingStillValid) {
      setAssignForm((prev) => ({
        ...prev,
        pricingType: pricingOptions[0].value,
      }));
    }
  }, [assignForm.pricingType, pricingOptions]);

  const invalidateRoomQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["room-type", roomTypeId] });
    queryClient.invalidateQueries({ queryKey: ["all-room-types"] });
    queryClient.invalidateQueries({ queryKey: ["tenants"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-bookings-stats"] });
  };

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; roomNumber: string; status: RoomStatus }) => {
      return api.patch(`/api/room-types/rooms/${data.id}`, data);
    },
    onSuccess: () => {
      invalidateRoomQueries();
      setEditingId(null);
      toast.success("Kamar diperbarui");
    },
    onError: () => toast.error("Gagal memperbarui kamar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/room-types/rooms/${id}`);
    },
    onSuccess: () => {
      invalidateRoomQueries();
      toast.success("Kamar dihapus");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Gagal menghapus kamar")),
  });

  const addMutation = useMutation({
    mutationFn: async (roomNumber: string) => {
      return api.post(`/api/room-types/${roomTypeId}/rooms`, {
        rooms: [{ roomNumber }],
      });
    },
    onSuccess: () => {
      invalidateRoomQueries();
      setNewRoomNumber("");
      setIsAddOpen(false);
      toast.success("Kamar ditambahkan");
    },
    onError: () => toast.error("Gagal menambah kamar"),
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!assignRoom) {
        throw new Error("Unit kamar belum dipilih");
      }

      const response = await api.post("/api/bookings/admin-assign", {
        roomId: assignRoom.id,
        tenantFullName: assignForm.tenantFullName,
        tenantEmail: assignForm.tenantEmail,
        tenantPhone: assignForm.tenantPhone || undefined,
        pricingType: assignForm.pricingType,
        startDate: assignForm.startDate,
        isSubscription: assignForm.isSubscription,
        temporaryPassword: assignForm.temporaryPassword || undefined,
      });

      return response.data.data;
    },
    onSuccess: (result) => {
      invalidateRoomQueries();
      setAssignRoom(null);
      setAssignForm({
        tenantFullName: "",
        tenantEmail: "",
        tenantPhone: "",
        pricingType: pricingOptions[0]?.value ?? "MONTHLY",
        startDate: todayInputValue(),
        isSubscription: true,
        temporaryPassword: "",
      });
      toast.success("Penghuni berhasil ditempatkan ke kamar");
      if (result?.tenantAccountCreated && result?.tenantTemporaryPassword) {
        toast.info(`Akun tenant baru dibuat. Password sementara: ${result.tenantTemporaryPassword}`);
      }
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Gagal menempatkan penghuni ke kamar"));
    },
  });

  const handleStartEdit = (room: Room) => {
    setEditingId(room.id);
    setEditForm({ roomNumber: room.roomNumber, status: room.status });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({ id: editingId, ...editForm });
  };

  const openAssignDialog = (room: Room) => {
    setAssignRoom(room);
    setAssignForm({
      tenantFullName: "",
      tenantEmail: "",
      tenantPhone: "",
      pricingType: pricingOptions[0]?.value ?? "MONTHLY",
      startDate: todayInputValue(),
      isSubscription: true,
      temporaryPassword: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-bold text-lg">Daftar Unit Kamar</h3>
          <p className="text-muted-foreground text-sm">
            Gunakan aksi isi kamar agar status unit dan data penghuni tetap sinkron.
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Tambah Unit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Unit Kamar Baru</DialogTitle>
              <DialogDescription>Masukkan nomor atau nama identitas untuk unit kamar baru ini.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Misal: A-101"
                value={newRoomNumber}
                onChange={(e) => setNewRoomNumber(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Batal
              </Button>
              <Button
                onClick={() => addMutation.mutate(newRoomNumber)}
                disabled={addMutation.isPending || !newRoomNumber}
              >
                {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!assignRoom} onOpenChange={(open) => !open && setAssignRoom(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Isi Kamar {assignRoom?.roomNumber}</DialogTitle>
            <DialogDescription>
              Admin dapat menempatkan penghuni langsung ke unit ini. Booking akan aktif dan kamar otomatis menjadi
              terisi.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="tenant-name">Nama Penghuni</Label>
              <Input
                id="tenant-name"
                value={assignForm.tenantFullName}
                onChange={(event) => setAssignForm((prev) => ({ ...prev, tenantFullName: event.target.value }))}
                placeholder="Nama lengkap penghuni"
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tenant-email">Email Penghuni</Label>
                <Input
                  id="tenant-email"
                  type="email"
                  value={assignForm.tenantEmail}
                  onChange={(event) => setAssignForm((prev) => ({ ...prev, tenantEmail: event.target.value }))}
                  placeholder="tenant@email.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenant-phone">No. Telepon</Label>
                <Input
                  id="tenant-phone"
                  value={assignForm.tenantPhone}
                  onChange={(event) => setAssignForm((prev) => ({ ...prev, tenantPhone: event.target.value }))}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="pricing-type">Paket Sewa</Label>
                <Select
                  value={assignForm.pricingType}
                  onValueChange={(value) =>
                    setAssignForm((prev) => ({
                      ...prev,
                      pricingType: value as typeof prev.pricingType,
                    }))
                  }
                >
                  <SelectTrigger id="pricing-type">
                    <SelectValue placeholder="Pilih paket sewa" />
                  </SelectTrigger>
                  <SelectContent>
                    {pricingOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="start-date">Tanggal Mulai</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={assignForm.startDate}
                  onChange={(event) => setAssignForm((prev) => ({ ...prev, startDate: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="temporary-password">Password Sementara</Label>
              <Input
                id="temporary-password"
                type="text"
                value={assignForm.temporaryPassword}
                onChange={(event) => setAssignForm((prev) => ({ ...prev, temporaryPassword: event.target.value }))}
                placeholder="Kosongkan untuk generate otomatis"
              />
              <p className="text-muted-foreground text-xs">Hanya dipakai jika email belum punya akun tenant.</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <Label htmlFor="subscription" className="font-medium">
                  Langganan Aktif
                </Label>
                <p className="text-muted-foreground text-xs">
                  Jika aktif, sistem akan menghitung jatuh tempo sewa berikutnya.
                </p>
              </div>
              <Switch
                id="subscription"
                checked={assignForm.isSubscription}
                onCheckedChange={(checked) => setAssignForm((prev) => ({ ...prev, isSubscription: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignRoom(null)}>
              Batal
            </Button>
            <Button
              onClick={() => assignMutation.mutate()}
              disabled={
                assignMutation.isPending ||
                !assignForm.tenantFullName ||
                !assignForm.tenantEmail ||
                !assignForm.startDate ||
                pricingOptions.length === 0
              }
            >
              {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tempatkan Penghuni
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Penghuni</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.id}>
                <TableCell className="font-medium">
                  {editingId === room.id ? (
                    <Input
                      value={editForm.roomNumber}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, roomNumber: e.target.value }))}
                      className="h-8 max-w-[200px]"
                    />
                  ) : (
                    room.roomNumber
                  )}
                </TableCell>
                <TableCell>
                  {editingId === room.id ? (
                    <Select
                      value={editForm.status}
                      onValueChange={(value) =>
                        setEditForm((prev) => ({
                          ...prev,
                          status: value as RoomStatus,
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Tersedia</SelectItem>
                        <SelectItem value="RESERVED">Dipesan</SelectItem>
                        <SelectItem value="BOOKED">Booking Aktif</SelectItem>
                        <SelectItem value="OCCUPIED">Terisi</SelectItem>
                        <SelectItem value="MAINTENANCE">Perbaikan</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={statusVariantMap[room.status]}>{statusLabelMap[room.status]}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {room.currentBooking ? (
                    <div className="space-y-1">
                      <div className="font-medium">{room.currentBooking.tenantName}</div>
                      <div className="text-muted-foreground text-xs">{room.currentBooking.tenantEmail}</div>
                      <div className="text-muted-foreground text-xs">
                        Check-in: {dateLabel(room.currentBooking.checkInAt)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Belum ada penghuni</span>
                  )}
                </TableCell>
                <TableCell>{dateLabel(room.currentBooking?.nextDueDate)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {room.status === "AVAILABLE" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAssignDialog(room)}
                        disabled={pricingOptions.length === 0}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Isi Kamar
                      </Button>
                    )}
                    {editingId === room.id ? (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveEdit}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-rose-600"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(room)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-rose-600"
                          onClick={() => setDeleteDialogId(room.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Dialog
                          open={deleteDialogId === room.id}
                          onOpenChange={(open) => !open && setDeleteDialogId(null)}
                        >
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Hapus Unit Kamar</DialogTitle>
                              <DialogDescription>
                                Anda yakin ingin menghapus unit <span className="font-bold">{room.roomNumber}</span>?
                                Tindakan ini tidak dapat dibatalkan.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setDeleteDialogId(null)}>
                                Batal
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  deleteMutation.mutate(room.id);
                                  setDeleteDialogId(null);
                                }}
                                disabled={deleteMutation.isPending}
                              >
                                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Hapus
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
