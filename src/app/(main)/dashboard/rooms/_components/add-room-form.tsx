"use client";

import { useState, useRef } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { ImageUpload } from "../../properties/_components/image-upload";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Loader2,
    Save,
    Plus,
    X,
    ChevronRight,
    Type,
    AlignLeft,
    Users,
    Banknote,
    Maximize,
    Upload,
    ImageIcon,
    Trash2,
    ClipboardList,
    FileImage,
} from "lucide-react";

// --- Schema ---

const facilitySchema = z.object({
    name: z.string().min(1, "Nama fasilitas wajib diisi"),
    iconUrl: z.string().optional().or(z.literal("")),
    tagline: z.string().optional().or(z.literal("")),
});

const ruleSchema = z.object({
    name: z.string().min(1, "Nama aturan wajib diisi"),
    description: z.string().optional().or(z.literal("")),
});

const roomTypeFormSchema = z.object({
    propertyId: z.string().min(1, "Harap pilih properti"),
    name: z.string().min(2, "Nama kamar minimal 2 karakter"),
    description: z.string().optional(),
    genderCategory: z.enum(["MAN", "WOMAN", "MIX"]),
    totalRooms: z.coerce.number().int().min(1, "Minimal 1 kamar"),
    sizeDetail: z.string().min(1, "Misal: 3x4 meter"),
    facilities: z.array(facilitySchema).optional().default([]),
    rules: z.array(ruleSchema).optional().default([]),
    isWeekly: z.boolean().default(false),
    weeklyPrice: z.coerce.number().optional().nullable(),
    isMonthly: z.boolean().default(false),
    monthlyPrice: z.coerce.number().optional().nullable(),
    is3Monthly: z.boolean().default(false),
    price3Monthly: z.coerce.number().optional().nullable(),
    isYearly: z.boolean().default(false),
    yearlyPrice: z.coerce.number().optional().nullable(),
    isDepositRequired: z.boolean().default(false),
    depositAmount: z.coerce.number().optional().nullable(),
    images: z
        .array(z.object({ url: z.string().url(), category: z.enum(["BEDROOM", "BATHROOM"]) }))
        .optional()
        .default([]),
});

type RoomTypeFormValues = z.infer<typeof roomTypeFormSchema>;

// --- Props ---

interface AddRoomFormProps {
    initialData?: RoomTypeFormValues & { id: string };
}

export default function AddRoomForm({ initialData }: AddRoomFormProps) {
    const isEditMode = !!initialData;
    const router = useRouter();
    const queryClient = useQueryClient();

    const normalizeOptionalText = (value?: string | null) => {
        const trimmed = value?.trim();
        return trimmed ? trimmed : null;
    };

    const normalizeOptionalUrl = (value?: string | null) => {
        const trimmed = value?.trim();
        return trimmed ? trimmed : null;
    };

    const normalizeOptionalPrice = (enabled: boolean, value?: number | null) => {
        if (!enabled) return null;
        return value == null || Number.isNaN(Number(value)) ? null : Number(value);
    };

    const normalizedInitialData = initialData
        ? {
              ...initialData,
              description: initialData.description ?? "",
              sizeDetail: initialData.sizeDetail ?? "",
              facilities: (initialData.facilities || []).map((facility) => ({
                  name: facility.name ?? "",
                  tagline: facility.tagline ?? "",
                  iconUrl: facility.iconUrl ?? "",
              })),
              rules: (initialData.rules || []).map((rule) => ({
                  name: rule.name ?? "",
                  description: rule.description ?? "",
              })),
              images: (initialData.images || []).map((image) => ({
                  url: image.url,
                  category: image.category,
              })),
              weeklyPrice: initialData.weeklyPrice ?? null,
              monthlyPrice: initialData.monthlyPrice ?? null,
              price3Monthly: initialData.price3Monthly ?? null,
              yearlyPrice: initialData.yearlyPrice ?? null,
              depositAmount: initialData.depositAmount ?? null,
          }
        : null;

    const form = useForm<RoomTypeFormValues>({
        resolver: zodResolver(roomTypeFormSchema),
        defaultValues: normalizedInitialData
            ? normalizedInitialData
            : {
                  propertyId: "",
                  name: "",
                  description: "",
                  genderCategory: "MIX",
                  totalRooms: 1,
                  sizeDetail: "",
                  facilities: [],
                  rules: [],
                  isWeekly: false,
                  weeklyPrice: null,
                  isMonthly: true,
                  monthlyPrice: null,
                  is3Monthly: false,
                  price3Monthly: null,
                  isYearly: false,
                  yearlyPrice: null,
                  isDepositRequired: false,
                  depositAmount: null,
                  images: [],
              },
    });

    const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({
        control: form.control,
        name: "images",
    });

    const bedroomImages = imageFields.map((f, i) => ({ ...f, index: i })).filter((f) => f.category === "BEDROOM");
    const bathroomImages = imageFields.map((f, i) => ({ ...f, index: i })).filter((f) => f.category === "BATHROOM");

    const { data: propertiesData, isLoading: isLoadingProperties } = useQuery({
        queryKey: ["properties", "approved"],
        queryFn: async () => {
            const res = await api.get("/api/properties?status=APPROVED");
            return res.data;
        },
    });
    const properties = propertiesData?.data || [];

    const mutation = useMutation({
        mutationFn: async (values: RoomTypeFormValues) => {
            const payload = {
                ...values,
                description: values.description?.trim() || undefined,
                totalRooms: Number(values.totalRooms),
                weeklyPrice: normalizeOptionalPrice(values.isWeekly, values.weeklyPrice),
                monthlyPrice: normalizeOptionalPrice(values.isMonthly, values.monthlyPrice),
                price3Monthly: normalizeOptionalPrice(values.is3Monthly, values.price3Monthly),
                yearlyPrice: normalizeOptionalPrice(values.isYearly, values.yearlyPrice),
                depositAmount: normalizeOptionalPrice(values.isDepositRequired, values.depositAmount),
                images: (values.images || []).map((image) => ({
                    url: image.url,
                    category: image.category,
                })),
                facilities: (values.facilities || []).map((facility) => ({
                    name: facility.name.trim(),
                    tagline: normalizeOptionalText(facility.tagline),
                    iconUrl: normalizeOptionalUrl(facility.iconUrl),
                })),
                rules: (values.rules || []).map((rule) => ({
                    name: rule.name.trim(),
                    description: normalizeOptionalText(rule.description),
                })),
            };

            if (isEditMode) {
                return (await api.patch(`/api/room-types/${initialData.id}`, payload)).data;
            }
            return (await api.post("/api/room-types", payload)).data;
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["all-room-types"] }),
                queryClient.invalidateQueries({ queryKey: ["room-type", initialData?.id] }),
            ]);
            toast.success(isEditMode ? "Tipe Kamar berhasil diperbarui!" : "Tipe Kamar berhasil ditambahkan!");
            router.push(isEditMode ? `/dashboard/rooms/${initialData.id}/manage` : "/dashboard/rooms");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || `Gagal ${isEditMode ? "memperbarui" : "menambahkan"} tipe kamar`);
        },
    });

    const addRule = (name: string, description: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const current = form.getValues("rules") || [];
        if (current.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())) {
            toast.error("Aturan sudah ada");
            return;
        }
        form.setValue("rules", [...current, { name: trimmed, description: description.trim() }]);
    };

    const removeRule = (index: number) => {
        const current = form.getValues("rules") || [];
        form.setValue("rules", current.filter((_, i) => i !== index));
    };

    const addFacility = (name: string, tagline: string, iconUrl: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const current = form.getValues("facilities") || [];
        if (current.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
            toast.error("Fasilitas sudah ada");
            return;
        }
        form.setValue("facilities", [...current, { name: trimmed, tagline: tagline.trim(), iconUrl }]);
    };

    const removeFacility = (index: number) => {
        const current = form.getValues("facilities") || [];
        form.setValue("facilities", current.filter((_, i) => i !== index));
    };

    const handleInvalidSubmit = () => {
        toast.error("Form belum valid. Cek kembali field yang wajib diisi.");
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => mutation.mutate(v), handleInvalidSubmit)} className="space-y-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Link href="/dashboard/rooms" className="hover:text-foreground transition-colors">
                        Tipe Kamar
                    </Link>
                    <ChevronRight className="size-3.5" />
                    <span className="font-medium text-foreground">
                        {isEditMode ? "Edit Tipe Kamar" : "Tambah Tipe Kamar"}
                    </span>
                </nav>

                {/* Header */}
                <h1 className="text-2xl font-bold tracking-tight">
                    {isEditMode ? "Edit Tipe Kamar" : "Tambah Tipe Kamar"}
                </h1>

                {/* Main Card with Tabs */}
                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <Tabs defaultValue="info" className="w-full">
                        <div className="border-b px-6 pt-2">
                            <TabsList variant="line" className="h-auto gap-6">
                                <TabsTrigger value="info" className="pb-3 pt-2 text-sm data-[state=active]:text-emerald-700 data-[state=active]:shadow-none">
                                    Informasi Kamar
                                </TabsTrigger>
                                <TabsTrigger value="rules" className="pb-3 pt-2 text-sm data-[state=active]:text-emerald-700 data-[state=active]:shadow-none">
                                    Peraturan
                                </TabsTrigger>
                                <TabsTrigger value="facilities" className="pb-3 pt-2 text-sm data-[state=active]:text-emerald-700 data-[state=active]:shadow-none">
                                    Fasilitas
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-6">
                            {/* TAB 1: Informasi */}
                            <TabsContent value="info" className="mt-0 space-y-8">
                                
                                {/* Property select */}
                                <FormField
                                    control={form.control}
                                    name="propertyId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Pilih Properti</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="rounded-xl">
                                                        <SelectValue placeholder={isLoadingProperties ? "Memuat..." : "Pilih properti..."} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {properties.map((p: any) => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                    {properties.length === 0 && !isLoadingProperties && (
                                                        <div className="p-2 text-sm text-muted-foreground text-center">Tidak ada properti yang di-approve.</div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Input Fields */}
                                <div className="grid gap-5 md:grid-cols-2">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nama Tipe Kamar</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                                    <Input placeholder="Misal: Tipe A, VIP, Reguler" className="pl-10 rounded-xl" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="genderCategory" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Kategori Gender</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="MAN">Putra</SelectItem>
                                                    <SelectItem value="WOMAN">Putri</SelectItem>
                                                    <SelectItem value="MIX">Campur</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="totalRooms" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Kapasitas (Jumlah Kamar)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                                    <Input type="number" min={1} placeholder="Jumlah kamar" className="pl-10 rounded-xl" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="sizeDetail" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ukuran Kamar</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Maximize className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                                    <Input placeholder="Misal: 3x4 meter" className="pl-10 rounded-xl" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Deskripsi</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <AlignLeft className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                                <Textarea placeholder="Jelaskan keunggulan tipe kamar ini..." className="pl-10 min-h-[100px] rounded-xl resize-none" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Image Upload */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <ImageIcon className="size-4 text-muted-foreground" />
                                        <span>Foto Kamar</span>
                                    </div>

                                    <div className="space-y-2 rounded-xl border p-4">
                                        <p className="text-sm font-semibold">Area Kamar Tidur</p>
                                        <p className="text-xs text-muted-foreground mb-3">Maksimal 5 foto.</p>
                                        {bedroomImages.length === 0 && (
                                            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 text-center mb-3">
                                                <Upload className="size-5 text-muted-foreground mb-2" />
                                                <p className="text-sm text-muted-foreground">Belum ada file dipilih</p>
                                            </div>
                                        )}
                                        <ImageUpload
                                            value={bedroomImages.map((f) => f.url)}
                                            maxImages={5}
                                            onUpload={(urls) => urls.forEach((url) => appendImage({ url, category: "BEDROOM" }))}
                                            onRemove={(url) => {
                                                const found = bedroomImages.find((img) => img.url === url);
                                                if (found !== undefined) removeImage(found.index);
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-2 rounded-xl border p-4">
                                        <p className="text-sm font-semibold">Area Kamar Mandi</p>
                                        <p className="text-xs text-muted-foreground mb-3">Maksimal 3 foto.</p>
                                        {bathroomImages.length === 0 && (
                                            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 text-center mb-3">
                                                <Upload className="size-5 text-muted-foreground mb-2" />
                                                <p className="text-sm text-muted-foreground">Belum ada file dipilih</p>
                                            </div>
                                        )}
                                        <ImageUpload
                                            value={bathroomImages.map((f) => f.url)}
                                            maxImages={3}
                                            onUpload={(urls) => urls.forEach((url) => appendImage({ url, category: "BATHROOM" }))}
                                            onRemove={(url) => {
                                                const found = bathroomImages.find((img) => img.url === url);
                                                if (found !== undefined) removeImage(found.index);
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Pricing */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <Banknote className="size-4 text-muted-foreground" /> Harga & Deposit
                                    </h3>

                                    <PriceRow form={form} toggleName="isWeekly" priceName="weeklyPrice" label="Sewa Mingguan" placeholder="Harga per minggu" />
                                    <PriceRow form={form} toggleName="isMonthly" priceName="monthlyPrice" label="Sewa Bulanan" placeholder="Harga per bulan" highlighted />
                                    <PriceRow form={form} toggleName="is3Monthly" priceName="price3Monthly" label="Sewa 3 Bulan" placeholder="Harga per 3 bulan" />
                                    <PriceRow form={form} toggleName="isYearly" priceName="yearlyPrice" label="Sewa Tahunan" placeholder="Harga per tahun" />

                                    <Separator />

                                    <PriceRow form={form} toggleName="isDepositRequired" priceName="depositAmount" label="Wajib Deposit?" placeholder="Nominal deposit" destructive />
                                </div>
                            </TabsContent>

                            {/* TAB 2: Peraturan */}
                            <TabsContent value="rules" className="mt-0">
                                <RulesTab
                                    rules={form.watch("rules") || []}
                                    onAdd={addRule}
                                    onRemove={removeRule}
                                />
                            </TabsContent>

                            {/* TAB 3: Fasilitas */}
                            <TabsContent value="facilities" className="mt-0">
                                <FacilitiesTab
                                    facilities={form.watch("facilities") || []}
                                    onAdd={addFacility}
                                    onRemove={removeFacility}
                                />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* Sticky Submit */}
                <div className="flex justify-end gap-3 sticky bottom-4 bg-background/40 backdrop-blur-md p-4 rounded-xl border shadow-lg z-10">
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.back()} disabled={mutation.isPending}>
                        Batal
                    </Button>
                    <Button type="submit" disabled={mutation.isPending || isLoadingProperties} >
                        {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
                        <Save className="size-4" />
                        {isEditMode ? "Update Tipe Kamar" : "Simpan Tipe Kamar"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

// --- Price Row Reusable ---

function PriceRow({ form, toggleName, priceName, label, placeholder, highlighted, destructive }: {
    form: any; toggleName: string; priceName: string; label: string; placeholder: string; highlighted?: boolean; destructive?: boolean;
}) {
    const isEnabled = useWatch({ control: form.control, name: toggleName });

    return (
        <div className={`flex flex-col md:flex-row md:items-center gap-4 rounded-xl border p-4 ${highlighted ? "bg-muted/20" : ""} ${destructive ? "border-destructive/20" : ""}`}>
            <FormField control={form.control} name={toggleName} render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0 min-w-[150px]">
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-medium">{label}</FormLabel>
                </FormItem>
            )} />
            {isEnabled && (
                <FormField control={form.control} name={priceName} render={({ field }) => (
                    <FormItem className="flex-1">
                        <FormControl>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">Rp</span>
                                <Input type="number" className="pl-9 rounded-xl" placeholder={placeholder} {...field} value={field.value || ""} />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            )}
        </div>
    );
}

// --- Rules Tab ---

function RulesTab({ rules, onAdd, onRemove }: {
    rules: { name: string; description?: string }[];
    onAdd: (name: string, description: string) => void;
    onRemove: (index: number) => void;
}) {
    const [showForm, setShowForm] = useState(false);
    const [ruleName, setRuleName] = useState("");
    const [ruleDesc, setRuleDesc] = useState("");

    const handleSubmit = () => {
        if (!ruleName.trim()) return;
        onAdd(ruleName, ruleDesc);
        setRuleName("");
        setRuleDesc("");
        setShowForm(false);
    };

    return (
        <div className="space-y-6">
            {showForm ? (
                <div className="rounded-xl border bg-muted/30 p-5 space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">Nama Rule</label>
                        <div className="relative">
                            <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Misal: Dilarang Merokok"
                                className="pl-10 rounded-xl"
                                value={ruleName}
                                onChange={(e) => setRuleName(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">Deskripsi</label>
                        <Textarea
                            placeholder="Jelaskan detail aturan ini..."
                            className="rounded-xl resize-none min-h-[100px]"
                            value={ruleDesc}
                            onChange={(e) => setRuleDesc(e.target.value)}
                        />
                    </div>
                    <Separator />
                    <div className="flex justify-center gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground px-6"
                            onClick={() => { setShowForm(false); setRuleName(""); setRuleDesc(""); }}
                        >
                            Batal, Tidak Jadi
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!ruleName.trim()}
                        >
                            Submit
                        </Button>
                    </div>
                </div>
            ) : (
                <Button type="button" onClick={() => setShowForm(true)} >
                    <Plus className="size-4" /> Tambah Aturan
                </Button>
            )}

            <Separator />

            <div>
                <h3 className="text-sm font-semibold mb-4">Daftar Peraturan</h3>
                {rules.length > 0 ? (
                    <div className="space-y-3">
                        {rules.map((rule, index) => (
                            <div key={index} className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                    <ClipboardList className="size-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold">{rule.name}</p>
                                    {rule.description && <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>}
                                </div>
                                <Button type="button" variant="ghost" size="sm" className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => onRemove(index)}>
                                    <Trash2 className="size-4 mr-1.5" /> Hapus
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border-2 border-dashed py-12 text-center">
                        <ClipboardList className="mx-auto size-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">Tidak ada data</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Facilities Tab ---

function FacilitiesTab({ facilities, onAdd, onRemove }: {
    facilities: { name: string; iconUrl?: string; tagline?: string }[];
    onAdd: (name: string, tagline: string, iconUrl: string) => void;
    onRemove: (index: number) => void;
}) {
    const [showForm, setShowForm] = useState(false);
    const [cName, setCName] = useState("");
    const [cTagline, setCTagline] = useState("");
    const [cIconUrl, setCIconUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error("Ukuran file maksimal 2MB"); return; }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await api.post("/api/upload/image", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            if (res.data?.data?.url) {
                setCIconUrl(res.data.data.url);
            }
        } catch {
            toast.error("Gagal upload ikon");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSubmit = () => {
        if (!cName.trim()) return;
        onAdd(cName, cTagline, cIconUrl);
        setCName(""); setCTagline(""); setCIconUrl(""); setShowForm(false);
    };

    return (
        <div className="space-y-6">
            {showForm ? (
                <div className="rounded-xl border bg-muted/30 p-5 space-y-4">
                    <p className="text-sm font-semibold">Tambah Fasilitas</p>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Nama Fasilitas</label>
                            <Input placeholder="Misal: Wifi, AC, Kasur" className="rounded-xl" value={cName} onChange={(e) => setCName(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Tagline <span className="text-muted-foreground font-normal">(opsional)</span></label>
                            <Input placeholder="Keterangan singkat" className="rounded-xl" value={cTagline} onChange={(e) => setCTagline(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">Ikon <span className="text-muted-foreground font-normal">(opsional)</span></label>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
                        <div className="flex items-center gap-3">
                            {cIconUrl ? (
                                <div className="relative size-14 rounded-lg border overflow-hidden">
                                    <img src={cIconUrl} alt="Icon" className="size-full object-contain p-1" />
                                    <button type="button" onClick={() => setCIconUrl("")} className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                                        <X className="size-3" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="flex size-14 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                                >
                                    {uploading ? <Loader2 className="size-5 animate-spin" /> : <FileImage className="size-5" />}
                                </button>
                            )}
                            <p className="text-xs text-muted-foreground">Upload gambar ikon (maks. 2MB)</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setShowForm(false); setCName(""); setCTagline(""); setCIconUrl(""); }}>Batal</Button>
                        <Button type="button" onClick={handleSubmit} disabled={!cName.trim()} className="rounded-xl bg-emerald-950 hover:bg-emerald-900">Simpan</Button>
                    </div>
                </div>
            ) : (
                <Button type="button" onClick={() => setShowForm(true)} >
                    <Plus className="size-4" /> Tambah Fasilitas
                </Button>
            )}

            <Separator />

            <div>
                <h3 className="text-sm font-semibold mb-4">Daftar Fasilitas</h3>
                {facilities.length > 0 ? (
                    <div className="space-y-3">
                        {facilities.map((f, index) => (
                            <div key={index} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                    {f.iconUrl ? <img src={f.iconUrl} alt={f.name} className="size-5 object-contain" /> : <FileImage className="size-5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold">{f.name}</p>
                                    {f.tagline && <p className="text-xs text-muted-foreground truncate">{f.tagline}</p>}
                                </div>
                                <Button type="button" variant="ghost" size="sm" className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => onRemove(index)}>
                                    <Trash2 className="size-4 mr-1.5" /> Hapus
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border-2 border-dashed py-12 text-center">
                        <FileImage className="mx-auto size-10 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">Tidak ada data</p>
                    </div>
                )}
            </div>
        </div>
    );
}
