"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Car, Loader2, Save, Warehouse } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { api } from "@/lib/api";
import { ImageUpload } from "../../_components/image-upload";

const propertyImageSchema = z.object({
    buildingImages: z.array(z.string().url()).min(1, "Minimal 1 foto bangunan wajib diunggah"),
    facilityImages: z.array(z.string().url()).min(1, "Minimal 1 foto fasilitas bersama wajib diunggah"),
    parkingImages: z.array(z.string().url()).min(1, "Minimal 1 foto parkiran wajib diunggah"),
});

type PropertyImageFormValues = z.infer<typeof propertyImageSchema>;

type PropertyImage = {
    url: string;
    category: "BUILDING" | "SHARED_FACILITY" | "PARKING";
};

export default function PropertyImagesEditPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const propertyId = String(params.id);

    const form = useForm<PropertyImageFormValues>({
        resolver: zodResolver(propertyImageSchema),
        defaultValues: {
            buildingImages: [],
            facilityImages: [],
            parkingImages: [],
        },
    });

    const { data: propertyData, isLoading, error } = useQuery({
        queryKey: ["property", propertyId],
        queryFn: async () => {
            const response = await api.get(`/api/properties/${propertyId}`);
            return response.data.data;
        },
    });

    useEffect(() => {
        if (!propertyData) return;

        const images = (propertyData.images || []) as PropertyImage[];
        form.reset({
            buildingImages: images.filter((image) => image.category === "BUILDING").map((image) => image.url),
            facilityImages: images.filter((image) => image.category === "SHARED_FACILITY").map((image) => image.url),
            parkingImages: images.filter((image) => image.category === "PARKING").map((image) => image.url),
        });
    }, [form, propertyData]);

    const updateMutation = useMutation({
        mutationFn: async (values: PropertyImageFormValues) => {
            const images = [
                ...values.buildingImages.map((url) => ({ url, category: "BUILDING" as const })),
                ...values.facilityImages.map((url) => ({ url, category: "SHARED_FACILITY" as const })),
                ...values.parkingImages.map((url) => ({ url, category: "PARKING" as const })),
            ];

            const response = await api.put(`/api/properties/${propertyId}`, { images });
            return response.data.data;
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["properties"] }),
                queryClient.invalidateQueries({ queryKey: ["property", propertyId] }),
            ]);
            toast.success("Foto properti berhasil diperbarui");
            router.push(`/dashboard/properties/${propertyId}`);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Gagal memperbarui foto properti");
        },
    });

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !propertyData) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-destructive">Properti tidak ditemukan</h2>
                <Button variant="link" onClick={() => router.back()}>
                    Kembali
                </Button>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center gap-3">
                <Link href={`/dashboard/properties/${propertyId}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Edit Foto Properti</h1>
                    <p className="text-sm text-muted-foreground">{propertyData.name}</p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))} className="space-y-6 max-w-4xl">
                    <Card className="border-none shadow-md">
                        <CardHeader className="py-4">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">Foto Bangunan</CardTitle>
                            </div>
                            <CardDescription className="text-xs">
                                Ubah foto tampak depan atau keseluruhan bangunan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-6 pt-0">
                            <FormField
                                control={form.control}
                                name="buildingImages"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <ImageUpload
                                                value={field.value}
                                                onUpload={(urls) => field.onChange([...field.value, ...urls])}
                                                onRemove={(url) => field.onChange(field.value.filter((imageUrl) => imageUrl !== url))}
                                                maxImages={5}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md">
                        <CardHeader className="py-4">
                            <div className="flex items-center gap-2">
                                <Warehouse className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">Fasilitas Bersama</CardTitle>
                            </div>
                            <CardDescription className="text-xs">
                                Ubah foto dapur, ruang tamu, atau area bersama lainnya.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-6 pt-0">
                            <FormField
                                control={form.control}
                                name="facilityImages"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <ImageUpload
                                                value={field.value}
                                                onUpload={(urls) => field.onChange([...field.value, ...urls])}
                                                onRemove={(url) => field.onChange(field.value.filter((imageUrl) => imageUrl !== url))}
                                                maxImages={5}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-md">
                        <CardHeader className="py-4">
                            <div className="flex items-center gap-2">
                                <Car className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">Area Parkir</CardTitle>
                            </div>
                            <CardDescription className="text-xs">
                                Ubah foto area parkir kendaraan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-6 pt-0">
                            <FormField
                                control={form.control}
                                name="parkingImages"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <ImageUpload
                                                value={field.value}
                                                onUpload={(urls) => field.onChange([...field.value, ...urls])}
                                                onRemove={(url) => field.onChange(field.value.filter((imageUrl) => imageUrl !== url))}
                                                maxImages={3}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => router.back()}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={updateMutation.isPending || !form.formState.isDirty}>
                            {updateMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Simpan Foto
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
