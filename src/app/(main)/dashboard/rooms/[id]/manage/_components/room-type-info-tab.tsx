"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    Type,
    AlignLeft,
    Users,
    Banknote,
    Maximize,
    Upload,
    Loader2,
    ImageIcon,
} from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { ImageUpload } from "../../../../properties/_components/image-upload";
import { useFieldArray } from "react-hook-form";

const infoSchema = z.object({
    name: z.string().min(1, "Nama wajib diisi"),
    description: z.string().optional(),
    totalRooms: z.coerce.number().int().min(1, "Minimal 1 kamar"),
    monthlyPrice: z.coerce.number().min(0, "Harga tidak boleh negatif").optional().nullable(),
    sizeDetail: z.string().optional(),
    images: z
        .array(
            z.object({
                url: z.string().url(),
                category: z.enum(["BEDROOM", "BATHROOM"]),
            })
        )
        .optional()
        .default([]),
});

type InfoFormValues = z.infer<typeof infoSchema>;

interface RoomType {
    id: string;
    name: string;
    description?: string | null;
    totalRooms: number;
    monthlyPrice?: number | null;
    sizeDetail?: string | null;
    images?: { id: string; url: string; category: string }[];
}

interface RoomTypeInfoTabProps {
    roomType: RoomType;
}

export function RoomTypeInfoTab({ roomType }: RoomTypeInfoTabProps) {
    const queryClient = useQueryClient();

    const form = useForm<InfoFormValues>({
        resolver: zodResolver(infoSchema),
        defaultValues: {
            name: roomType.name,
            description: roomType.description || "",
            totalRooms: roomType.totalRooms,
            monthlyPrice: roomType.monthlyPrice ?? null,
            sizeDetail: roomType.sizeDetail || "",
            images: (roomType.images || []).map((img) => ({
                url: img.url,
                category: img.category as "BEDROOM" | "BATHROOM",
            })),
        },
    });

    const { fields: imageFields } = useFieldArray({
        control: form.control,
        name: "images",
    });

    const imageUrls = imageFields.map((f) => f.url);

    const updateMutation = useMutation({
        mutationFn: async (values: InfoFormValues) => {
            const res = await api.patch(`/api/room-types/${roomType.id}`, values);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Informasi tipe kamar berhasil diperbarui");
            queryClient.invalidateQueries({ queryKey: ["room-type", roomType.id] });
        },
        onError: (err: any) =>
            toast.error(err.response?.data?.message || "Gagal memperbarui data"),
    });

    const handleImageUpload = (urls: string[]) => {
        const current = form.getValues("images") || [];
        const newImages = urls.map((url) => ({ url, category: "BEDROOM" as const }));
        form.setValue("images", [...current, ...newImages], { shouldDirty: true });
    };

    const handleImageRemove = (url: string) => {
        const current = form.getValues("images") || [];
        form.setValue(
            "images",
            current.filter((img) => img.url !== url),
            { shouldDirty: true }
        );
    };

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit((v) => updateMutation.mutate(v))}
                className="space-y-8"
            >
                {/* Image Upload */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <ImageIcon className="size-4 text-muted-foreground" />
                        <span>Foto Kamar</span>
                    </div>
                    {imageUrls.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 text-center">
                            <div className="rounded-full bg-muted p-3 mb-3">
                                <Upload className="size-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">Belum ada file dipilih</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                                Upload gambar kamar untuk ditampilkan
                            </p>
                        </div>
                    ) : null}
                    <ImageUpload
                        value={imageUrls}
                        onUpload={handleImageUpload}
                        onRemove={handleImageRemove}
                        maxImages={8}
                    />
                </div>

                {/* Form Fields */}
                <div className="grid gap-5 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nama Tipe Kamar</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Type className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Misal: Tipe A, VIP, Reguler"
                                            className="pl-10 rounded-xl"
                                            {...field}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="totalRooms"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Kapasitas (Jumlah Kamar)</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <Input
                                            type="number"
                                            min={1}
                                            placeholder="Jumlah kamar tersedia"
                                            className="pl-10 rounded-xl"
                                            {...field}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="monthlyPrice"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Harga Dasar (Bulanan)</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <Input
                                            type="number"
                                            min={0}
                                            placeholder="Harga per bulan"
                                            className="pl-10 rounded-xl"
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="sizeDetail"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Ukuran Kamar{" "}
                                    <span className="text-muted-foreground font-normal">
                                        (opsional)
                                    </span>
                                </FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Maximize className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Misal: 3x4 meter"
                                            className="pl-10 rounded-xl"
                                            {...field}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Deskripsi</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <AlignLeft className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                    <Textarea
                                        placeholder="Jelaskan keunggulan tipe kamar ini..."
                                        className="pl-10 min-h-[100px] rounded-xl resize-none"
                                        {...field}
                                    />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end">
                    <Button 
                        type="submit"
                        disabled={updateMutation.isPending || !form.formState.isDirty}
                        variant="preset"
                    >
                        {updateMutation.isPending && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        Simpan Perubahan
                    </Button>
                </div>
            </form>
        </Form>
    );
}
