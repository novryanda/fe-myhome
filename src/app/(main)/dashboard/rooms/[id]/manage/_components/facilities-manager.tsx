"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, Wifi, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

const facilitySchema = z.object({
    name: z.string().min(1, "Nama fasilitas wajib diisi"),
    tagline: z.string().optional(),
    iconUrl: z.string().optional(),
});

type FacilityFormValues = z.infer<typeof facilitySchema>;

interface Facility {
    id: string;
    name: string;
    tagline?: string | null;
    iconUrl?: string | null;
}

interface FacilitiesManagerProps {
    roomTypeId: string;
    initialFacilities: Facility[];
}

export function FacilitiesManager({
    roomTypeId,
    initialFacilities,
}: FacilitiesManagerProps) {
    const queryClient = useQueryClient();
    const [facilities, setFacilities] = useState<Facility[]>(initialFacilities);
    const [showForm, setShowForm] = useState(false);

    const form = useForm<FacilityFormValues>({
        resolver: zodResolver(facilitySchema),
        defaultValues: { name: "", tagline: "", iconUrl: "" },
    });

    const normalizeOptionalText = (value?: string | null) => {
        const trimmed = value?.trim();
        return trimmed ? trimmed : null;
    };

    const addMutation = useMutation({
        mutationFn: async (values: FacilityFormValues) => {
            const payload = {
                name: values.name.trim(),
                tagline: normalizeOptionalText(values.tagline),
                iconUrl: normalizeOptionalText(values.iconUrl),
            };
            const res = await api.post(`/api/room-types/${roomTypeId}/facilities`, payload);
            return res.data;
        },
        onSuccess: (data) => {
            const created = data.data;
            setFacilities((prev) => [...prev, created]);
            form.reset();
            setShowForm(false);
            toast.success("Fasilitas berhasil ditambahkan");
            queryClient.invalidateQueries({ queryKey: ["room-type", roomTypeId] });
        },
        onError: (err: any) =>
            toast.error(err.response?.data?.message || "Gagal menambahkan fasilitas"),
    });

    const deleteMutation = useMutation({
        mutationFn: async (facilityId: string) => {
            await api.delete(`/api/room-types/facilities/${facilityId}`);
            return facilityId;
        },
        onSuccess: (facilityId) => {
            setFacilities((prev) => prev.filter((f) => f.id !== facilityId));
            toast.success("Fasilitas berhasil dihapus");
            queryClient.invalidateQueries({ queryKey: ["room-type", roomTypeId] });
        },
        onError: (err: any) =>
            toast.error(err.response?.data?.message || "Gagal menghapus fasilitas"),
    });

    return (
        <div className="space-y-6">
            {/* Add Facility Form */}
            {showForm ? (
                <div className="rounded-xl border bg-muted/30 p-5 space-y-4">
                    <p className="text-sm font-semibold">Tambah Fasilitas Baru</p>
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit((v) => addMutation.mutate(v))}
                            className="space-y-4"
                        >
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nama Fasilitas</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Misal: Wifi, AC, Kasur"
                                                    className="rounded-xl"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="tagline"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Tagline{" "}
                                                <span className="text-muted-foreground font-normal">
                                                    (opsional)
                                                </span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Keterangan singkat"
                                                    className="rounded-xl"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="iconUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            URL Ikon{" "}
                                            <span className="text-muted-foreground font-normal">
                                                (opsional)
                                            </span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://example.com/icon.svg"
                                                className="rounded-xl"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={() => {
                                        form.reset();
                                        setShowForm(false);
                                    }}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={addMutation.isPending}
                                    className="rounded-xl bg-emerald-950 hover:bg-emerald-900"
                                >
                                    {addMutation.isPending && (
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                    )}
                                    Simpan
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            ) : (
                <Button
                    onClick={() => setShowForm(true)}
                    className="rounded-xl bg-emerald-950 hover:bg-emerald-900"
                >
                    Tambah Fasilitas
                </Button>
            )}

            {/* Facility List */}
            {facilities.length > 0 ? (
                <div className="space-y-3">
                    {facilities.map((facility) => (
                        <div
                            key={facility.id}
                            className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md"
                        >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                {facility.iconUrl ? (
                                    <img
                                        src={facility.iconUrl}
                                        alt={facility.name}
                                        className="size-5 object-contain"
                                    />
                                ) : (
                                    <Wifi className="size-5" />
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">{facility.name}</p>
                                {facility.tagline && (
                                    <p className="text-xs text-muted-foreground truncate">
                                        {facility.tagline}
                                    </p>
                                )}
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                onClick={() => deleteMutation.mutate(facility.id)}
                                disabled={deleteMutation.isPending}
                            >
                                <Trash2 className="size-4 mr-1.5" />
                                Hapus
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border-2 border-dashed py-12 text-center">
                    <CheckCircle2 className="mx-auto size-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                        Belum ada fasilitas. Tambahkan fasilitas untuk tipe kamar ini.
                    </p>
                </div>
            )}
        </div>
    );
}
