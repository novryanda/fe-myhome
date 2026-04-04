"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ArrowLeft, Building2, MapPin, Plus, Save, Loader2, Image as ImageIcon, X, LocateFixed, Warehouse, Car, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { ImageUpload } from "../_components/image-upload";


const propertySchema = z.object({
    name: z.string().min(1, "Nama properti wajib diisi"),
    address: z.string().min(1, "Alamat properti wajib diisi"),
    cityId: z.string().optional(),
    description: z.string().optional(),
    latitude: z.union([z.number(), z.string().length(0)]).optional(),
    longitude: z.union([z.number(), z.string().length(0)]).optional(),
    buildingImages: z.array(z.string().url()).min(1, "Minimal 1 foto bangunan wajib diunggah"),
    facilityImages: z.array(z.string().url()).min(1, "Minimal 1 foto fasilitas bersama wajib diunggah"),
    parkingImages: z.array(z.string().url()).min(1, "Minimal 1 foto parkiran wajib diunggah"),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

export default function AddPropertyPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [isLocating, setIsLocating] = useState(false);

    const { data: citiesData } = useQuery({
        queryKey: ["cities-list"],
        queryFn: async () => {
            const res = await api.get("/api/cities/list");
            return res.data;
        },
    });
    const cities = citiesData?.data || [];

    const form = useForm<PropertyFormValues>({
        resolver: zodResolver(propertySchema),
        defaultValues: {
            name: "",
            address: "",
            cityId: "",
            description: "",
            latitude: "" as any,
            longitude: "" as any,
            buildingImages: [],
            facilityImages: [],
            parkingImages: [],
        },
    });

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation tidak didukung oleh browser Anda");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                form.setValue("latitude", position.coords.latitude);
                form.setValue("longitude", position.coords.longitude);
                toast.success("Lokasi berhasil didapatkan!");
                setIsLocating(false);
            },
            (error) => {
                toast.error(error.message || "Gagal mendapatkan lokasi");
                setIsLocating(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const mutation = useMutation({
        mutationFn: async (values: PropertyFormValues) => {
            // Transform images into categorized objects for backend
            const images = [
                ...values.buildingImages.map(url => ({ url, category: 'BUILDING' })),
                ...values.facilityImages.map(url => ({ url, category: 'SHARED_FACILITY' })),
                ...values.parkingImages.map(url => ({ url, category: 'PARKING' })),
            ];

            const dataToSend = {
                name: values.name,
                address: values.address,
                cityId: values.cityId || undefined,
                description: values.description,
                latitude: values.latitude === "" ? undefined : values.latitude,
                longitude: values.longitude === "" ? undefined : values.longitude,
                images: images,
            };

            const response = await api.post("/api/properties", dataToSend);
            return response.data;
        },
        onSuccess: () => {
            toast.success("Properti berhasil didaftarkan! Menunggu persetujuan Admin.");
            queryClient.invalidateQueries({ queryKey: ["property-stats"] });
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            router.push("/dashboard/properties");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Gagal mendaftarkan properti");
        },
    });

    const onSubmit = (data: PropertyFormValues) => {
        mutation.mutate(data);
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center space-x-2">
                <Link href="/dashboard/properties">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h2 className="text-3xl font-bold tracking-tight">Daftar Properti Baru</h2>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto">
                    <div className="space-y-8">
                        {/* Informasi Dasar */}
                        <div className="space-y-6">
                            <Card className="border-none shadow-md">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-xl">Informasi Dasar</CardTitle>
                                    </div>
                                    <CardDescription>Tentukan informasi properti yang akan didaftarkan.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nama Properti</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. MyHome Residence Sudirman" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Alamat</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                        <Input className="pl-9" placeholder="Alamat properti" {...field} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="cityId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Kota</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Pilih kota..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {cities.map((city: any) => (
                                                            <SelectItem key={city.id} value={city.id}>
                                                                {city.name}
                                                            </SelectItem>
                                                        ))}
                                                        {cities.length === 0 && (
                                                            <div className="p-2 text-sm text-muted-foreground text-center">Belum ada kota tersedia.</div>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Deskripsi</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Deskripsikan properti, fasilitas, sekitarnya..."
                                                        className="min-h-[120px]"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex items-end space-x-4">
                                        <div className="grid grid-cols-2 gap-4 flex-1">
                                            <FormField
                                                control={form.control}
                                                name="latitude"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Latitude</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="any"
                                                                placeholder="-6.2000"
                                                                {...field}
                                                                value={field.value ?? ""}
                                                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="longitude"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Longitude</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="any"
                                                                placeholder="106.8166"
                                                                {...field}
                                                                value={field.value ?? ""}
                                                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : "")}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="icon"
                                            className="mb-[2px] shrink-0"
                                            onClick={handleGetLocation}
                                            disabled={isLocating}
                                            title="Gunakan lokasi saya saat ini"
                                        >
                                            {isLocating ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <LocateFixed className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Dropzone Area: Gambar (Vertical List) */}
                        <div className="space-y-6">
                            <Card className="border-none shadow-md">
                                <CardHeader className="py-4">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-base">Foto Bangunan</CardTitle>
                                        <span className="text-[10px] text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded-full">Wajib</span>
                                    </div>
                                    <CardDescription className="text-xs">Foto tampak depan atau keseluruhan bangunan.</CardDescription>
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
                                                        onRemove={(url) => field.onChange(field.value.filter(u => u !== url))}
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
                                        <span className="text-[10px] text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded-full">Wajib</span>
                                    </div>
                                    <CardDescription className="text-xs">Dapur, ruang tamu, atau area outdoor.</CardDescription>
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
                                                        onRemove={(url) => field.onChange(field.value.filter(u => u !== url))}
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
                                        <span className="text-[10px] text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded-full">Wajib</span>
                                    </div>
                                    <CardDescription className="text-xs">Foto ketersediaan area parkir kendaraan.</CardDescription>
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
                                                        onRemove={(url) => field.onChange(field.value.filter(u => u !== url))}
                                                        maxImages={3}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Warning Box */}
                        <Card className="border-none shadow-md bg-amber-50 border-amber-200">
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className="bg-amber-100 p-2 rounded-full">
                                    <Clock className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-amber-900">Validasi Admin</p>
                                    <p className="text-xs text-amber-700">Pastikan semua data dan foto yang diunggah valid. Admin akan melakukan pengecekan sebelum properti ini aktif.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex justify-end space-x-4 pt-4">
                        <Button variant="outline" type="button" onClick={() => router.back()} className="px-8">
                            Batal
                        </Button>
                        <Button type="submit" disabled={mutation.isPending} className="px-10">
                            {mutation.isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mendaftarkan...</>
                            ) : (
                                <><Save className="mr-2 h-4 w-4" /> Daftarkan Properti</>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
