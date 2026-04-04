"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit2, Trash2, Plus, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";


interface Room {
    id: string;
    roomNumber: string;
    status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
}

interface RoomManagementTabProps {
    roomTypeId: string;
    rooms: Room[];
}

export function RoomManagementTab({ roomTypeId, rooms }: RoomManagementTabProps) {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ roomNumber: string; status: any }>({
        roomNumber: "",
        status: "AVAILABLE",
    });
    const [newRoomNumber, setNewRoomNumber] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);

    // Mutations
    const updateMutation = useMutation({
        mutationFn: async (data: { id: string; roomNumber: string; status: string }) => {
            return api.patch(`/api/room-types/rooms/${data.id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["room-type", roomTypeId] });
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
            queryClient.invalidateQueries({ queryKey: ["room-type", roomTypeId] });
            toast.success("Kamar dihapus");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus kamar"),
    });

    const addMutation = useMutation({
        mutationFn: async (roomNumber: string) => {
            return api.post(`/api/room-types/${roomTypeId}/rooms`, {
                rooms: [{ roomNumber }]
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["room-type", roomTypeId] });
            setNewRoomNumber("");
            setIsAddOpen(false);
            toast.success("Kamar ditambahkan");
        },
        onError: () => toast.error("Gagal menambah kamar"),
    });

    const handleStartEdit = (room: Room) => {
        setEditingId(room.id);
        setEditForm({ roomNumber: room.roomNumber, status: room.status });
    };

    const handleSaveEdit = () => {
        if (!editingId) return;
        updateMutation.mutate({ id: editingId, ...editForm });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Daftar Unit Kamar</h3>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" /> Tambah Unit
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
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                            <Button
                                onClick={() => addMutation.mutate(newRoomNumber)}
                                disabled={addMutation.isPending || !newRoomNumber}
                            >
                                {addMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nomor Unit</TableHead>
                            <TableHead>Status</TableHead>
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
                                            onChange={(e) => setEditForm(prev => ({ ...prev, roomNumber: e.target.value }))}
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
                                            onValueChange={(val) => setEditForm(prev => ({ ...prev, status: val }))}
                                        >
                                            <SelectTrigger className="h-8 w-[150px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="AVAILABLE">Tersedia</SelectItem>
                                                <SelectItem value="OCCUPIED">Terisi</SelectItem>
                                                <SelectItem value="MAINTENANCE">Perbaikan</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge
                                            variant={
                                                room.status === "AVAILABLE" ? "success" :
                                                    room.status === "OCCUPIED" ? "destructive" : "secondary"
                                            }
                                            className="capitalize"
                                        >
                                            {room.status.toLowerCase()}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        {editingId === room.id ? (
                                            <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSaveEdit}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => setEditingId(null)}>
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
                                                {/* Alert Dialog for delete confirmation */}
                                                <Dialog open={deleteDialogId === room.id} onOpenChange={(open) => !open && setDeleteDialogId(null)}>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Hapus Unit Kamar</DialogTitle>
                                                            <DialogDescription>Anda yakin ingin menghapus unit <span className="font-bold">{room.roomNumber}</span>? Tindakan ini tidak dapat dibatalkan.</DialogDescription>
                                                        </DialogHeader>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => setDeleteDialogId(null)}>Batal</Button>
                                                            <Button
                                                                variant="destructive"
                                                                onClick={() => {
                                                                    deleteMutation.mutate(room.id);
                                                                    setDeleteDialogId(null);
                                                                }}
                                                                disabled={deleteMutation.isPending}
                                                            >
                                                                {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
