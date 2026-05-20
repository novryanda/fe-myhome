"use client";

import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
    Building2, MapPin, Loader2, CheckCircle2, XCircle,
    Clock, Plus, LayoutGrid, Bed,
    ArrowLeft, Trash, PowerOff, ImagePlus, Pencil
} from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { Separator } from "@/components/ui/separator";
import { PropertyGallery } from "../_components/property-gallery";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";

type ManualPaymentAccount = {
    id: string;
    propertyId: string;
    label: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    isVisible: boolean;
    displayPriority: number;
};

export default function PropertyDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data: session } = useSession();
    const user = session?.user;
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<ManualPaymentAccount | null>(null);
    const [accountForm, setAccountForm] = useState({
        label: "",
        bankName: "",
        accountNumber: "",
        accountHolder: "",
        isVisible: true,
        displayPriority: 1,
    });

    const { data: propertyData, isLoading, error } = useQuery({
        queryKey: ["property", id],
        queryFn: async () => {
            const response = await api.get(`/api/properties/${id}`);
            return response.data.data;
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    const { data: roomTypesData, isLoading: isLoadingRoomTypes } = useQuery({
        queryKey: ["room-types", id],
        queryFn: async () => {
            const response = await api.get(`/api/room-types/property/${id}`);
            return response.data.data;
        },
        enabled: !!propertyData && propertyData.status === "APPROVED",
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    const { data: manualPaymentAccounts = [], isLoading: isLoadingManualPaymentAccounts } = useQuery({
        queryKey: ["property-manual-payment-accounts", id],
        queryFn: async () => {
            const response = await api.get(`/api/properties/${id}/manual-payment-accounts`);
            return (response.data?.data || []) as ManualPaymentAccount[];
        },
        enabled: !!id,
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    const manualPaymentAccountMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                label: accountForm.label,
                bank_name: accountForm.bankName,
                account_number: accountForm.accountNumber,
                account_holder: accountForm.accountHolder,
                is_visible: accountForm.isVisible,
                display_priority: Number(accountForm.displayPriority),
            };

            if (editingAccount) {
                const response = await api.patch(`/api/properties/${id}/manual-payment-accounts/${editingAccount.id}`, payload);
                return response.data.data;
            }

            const response = await api.post(`/api/properties/${id}/manual-payment-accounts`, payload);
            return response.data.data;
        },
        onSuccess: () => {
            toast.success(editingAccount ? "Rekening pembayaran manual berhasil diperbarui." : "Rekening pembayaran manual berhasil ditambahkan.");
            queryClient.invalidateQueries({ queryKey: ["property-manual-payment-accounts", id] });
            setIsAccountDialogOpen(false);
            setEditingAccount(null);
            setAccountForm({
                label: "",
                bankName: "",
                accountNumber: "",
                accountHolder: "",
                isVisible: true,
                displayPriority: 1,
            });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Gagal menyimpan rekening pembayaran manual");
        },
    });

    const deleteManualPaymentAccountMutation = useMutation({
        mutationFn: async (accountId: string) => {
            await api.delete(`/api/properties/${id}/manual-payment-accounts/${accountId}`);
        },
        onSuccess: () => {
            toast.success("Rekening pembayaran manual berhasil dihapus.");
            queryClient.invalidateQueries({ queryKey: ["property-manual-payment-accounts", id] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Gagal menghapus rekening pembayaran manual");
        },
    });

    const toggleManualPaymentAccountMutation = useMutation({
        mutationFn: async (account: ManualPaymentAccount) => {
            const response = await api.patch(`/api/properties/${id}/manual-payment-accounts/${account.id}`, {
                label: account.label,
                bank_name: account.bankName,
                account_number: account.accountNumber,
                account_holder: account.accountHolder,
                is_visible: !account.isVisible,
                display_priority: account.displayPriority,
            });
            return response.data.data;
        },
        onSuccess: () => {
            toast.success("Status tampil rekening berhasil diperbarui.");
            queryClient.invalidateQueries({ queryKey: ["property-manual-payment-accounts", id] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Gagal memperbarui status rekening");
        },
    });

    const approveMutation = useMutation({
        mutationFn: async (status: "APPROVED" | "REJECTED" | "DEACTIVATED") => {
            await api.patch(`/api/properties/${id}/status`, { status });
        },
        onSuccess: (_, status) => {
            let statusIndo = "";
            if (status === "APPROVED") statusIndo = "disetujui";
            else if (status === "REJECTED") statusIndo = "ditolak";
            else if (status === "DEACTIVATED") statusIndo = "dinonaktifkan";

            toast.success(`Properti berhasil ${statusIndo}`);
            queryClient.invalidateQueries({ queryKey: ["property-stats"] });
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            queryClient.invalidateQueries({ queryKey: ["property", id] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await api.delete(`/api/properties/${id}`);
        },
        onSuccess: () => {
            toast.success("Properti berhasil dihapus");
            queryClient.invalidateQueries({ queryKey: ["property-stats"] });
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            router.push("/dashboard/properties");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Gagal menghapus properti");
        }
    });

    if (isLoading) return (
        <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );

    if (error || !propertyData) return (
        <div className="p-8 text-center">
            <h2 className="text-xl font-bold text-destructive">Properti tidak ditemukan</h2>
            <Button variant="link" onClick={() => router.back()}>Kembali</Button>
        </div>
    );

    const isApproved = propertyData.status === "APPROVED";
    const isSuperadmin = user?.role === "SUPERADMIN";
    const canManageProperty = isSuperadmin || propertyData.adminId === user?.id;

    const openCreateAccountDialog = () => {
        setEditingAccount(null);
        setAccountForm({
            label: "",
            bankName: "",
            accountNumber: "",
            accountHolder: "",
            isVisible: true,
            displayPriority: 1,
        });
        setIsAccountDialogOpen(true);
    };

    const openEditAccountDialog = (account: ManualPaymentAccount) => {
        setEditingAccount(account);
        setAccountForm({
            label: account.label,
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountHolder: account.accountHolder,
            isVisible: account.isVisible,
            displayPriority: account.displayPriority,
        });
        setIsAccountDialogOpen(true);
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{propertyData.name}</h2>
                        <div className="flex items-center text-muted-foreground mt-1">
                            <MapPin className="mr-1 h-3 w-3" />
                            {propertyData.address}
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Badge className={
                        propertyData.status === 'APPROVED' ? 'bg-emerald-500 text-white' :
                            propertyData.status === 'PENDING' ? 'bg-amber-500 text-white' :
                                propertyData.status === 'DEACTIVATED' ? 'bg-gray-500 text-white' :
                                    'bg-red-500 text-white'
                    }>
                        {propertyData.status}
                    </Badge>

                    {/* Superadmin Actions: Approval & Deactivation */}
                    {isSuperadmin && (
                        <div className="flex space-x-2 ml-4">
                            {propertyData.status === "PENDING" && (
                                <>
                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => approveMutation.mutate("APPROVED")}>
                                        <CheckCircle2 className="mr-2 h-4 w-4" /> Setujui
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => approveMutation.mutate("REJECTED")}>
                                        <XCircle className="mr-2 h-4 w-4" /> Tolak
                                    </Button>
                                </>
                            )}
                            {propertyData.status === "APPROVED" && (
                                <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => approveMutation.mutate("DEACTIVATED")}>
                                    <PowerOff className="mr-2 h-4 w-4" /> Nonaktifkan
                                </Button>
                            )}
                            {propertyData.status === "DEACTIVATED" && (
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => approveMutation.mutate("APPROVED")}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Aktifkan Kembali
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Common Delete Action: Admin Owner or Superadmin */}
                    {(isSuperadmin || propertyData.adminId === user?.id) && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="ml-2"
                            onClick={() => router.push(`/dashboard/properties/${id}/images`)}
                        >
                            <ImagePlus className="mr-2 h-4 w-4" /> Edit Foto
                        </Button>
                    )}

                    {/* Common Delete Action: Admin Owner or Superadmin */}
                    {(isSuperadmin || propertyData.adminId === user?.id) && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="ml-2">
                                    <Trash className="mr-2 h-4 w-4" /> Hapus
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Hapus Properti?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tindakan ini tidak dapat dibatalkan. Semua data terkait properti ini, termasuk tipe kamar dan unit, akan dihapus secara permanen.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Ya, Hapus
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <PropertyGallery
                        images={propertyData.images}
                        propertyName={propertyData.name}
                    />

                    <Card className="border-none shadow-md">
                        <CardContent className="p-6">
                            <h3 className="text-xl font-bold mb-4 flex items-center">
                                <Building2 className="mr-2 h-5 w-5 text-primary" />
                                Deskripsi Umum
                            </h3>
                            <p className="text-muted-foreground leading-relaxed text-base">
                                {propertyData.description || "Tidak ada deskripsi untuk properti ini."}
                            </p>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="inventory" className="w-full">
                        <TabsList className="grid h-auto w-full grid-cols-[1.15fr_1fr_1.7fr] lg:w-[760px]">
                            <TabsTrigger value="inventory" className="px-4">
                                Inventaris Kamar
                            </TabsTrigger>
                            <TabsTrigger value="details" className="px-4">
                                Detail Properti
                            </TabsTrigger>
                            <TabsTrigger value="manual-payment-accounts" className="px-4">
                                Rekening Pembayaran Manual
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="inventory" className="space-y-4 pt-4">
                            {!isApproved ? (
                                <Card className="border-dashed border-2 bg-muted/30">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                        <Clock className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                                        <h4 className="text-lg font-semibold">Inventaris Terkunci</h4>
                                        <p className="max-w-[300px] text-sm text-muted-foreground mt-1">
                                            Anda dapat mulai mengelola tipe kamar dan unit setelah properti ini disetujui oleh Superadmin.
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-6">
                                    <h3 className="text-xl font-semibold tracking-tight">Tipe Kamar</h3>

                                    <div className="grid gap-5 md:grid-cols-2">
                                        {isLoadingRoomTypes ? (
                                            [...Array(2)].map((_, i) => (
                                                <div key={i} className="rounded-xl overflow-hidden border bg-card shadow-sm">
                                                    <div className="h-44 w-full bg-muted animate-pulse" />
                                                    <div className="p-4 space-y-3">
                                                        <div className="h-5 w-2/3 bg-muted animate-pulse rounded" />
                                                        <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
                                                        <div className="flex gap-2 pt-2">
                                                            <div className="h-5 w-14 bg-muted animate-pulse rounded-full" />
                                                            <div className="h-5 w-14 bg-muted animate-pulse rounded-full" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (Array.isArray(roomTypesData) ? roomTypesData : []).map((type: any) => {
                                            const thumbnail = type.images?.find((img: any) => img.category === "BEDROOM")?.url
                                                || type.images?.[0]?.url
                                                || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop";

                                            const totalCount = type._count?.rooms || type.rooms?.length || 0;

                                            return (
                                                <div
                                                    key={type.id}
                                                    className="rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer"
                                                    onClick={() => router.push(`/dashboard/rooms/${type.id}`)}
                                                >
                                                    <div className="relative h-44 w-full overflow-hidden">
                                                        <img
                                                            src={thumbnail}
                                                            alt={type.name}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                                                        <Badge className={`absolute top-3 left-3 ${type.genderCategory === 'WOMAN' ? 'bg-pink-500/90 hover:bg-pink-500' :
                                                            type.genderCategory === 'MAN' ? 'bg-blue-500/90 hover:bg-blue-500' :
                                                                'bg-emerald-500/90 hover:bg-emerald-500'
                                                            } text-white border-none text-[10px] font-semibold backdrop-blur-md px-2 py-0.5`}>
                                                            {type.genderCategory === 'WOMAN' ? 'PUTRI' :
                                                                type.genderCategory === 'MAN' ? 'PUTRA' : 'CAMPUR'}
                                                        </Badge>
                                                    </div>

                                                    <div className="p-4 space-y-1">
                                                        <div className="flex justify-between items-start">
                                                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                                                {type.meta}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                <Bed className="h-3 w-3" />
                                                                {totalCount} Units
                                                            </div>
                                                        </div>
                                                        <h3 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                                                            {type.heading}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed pt-1">
                                                            {type.displayDescription}
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5 pt-3 mt-2 border-t">
                                                            {(type.roomFacilities?.slice(0, 3) || []).map((fac: string, i: number) => (
                                                                <span key={i} className="text-[9px] font-bold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded uppercase">
                                                                    {fac}
                                                                </span>
                                                            ))}
                                                            {type.roomFacilities?.length > 3 && (
                                                                <span className="text-[9px] font-bold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded uppercase">
                                                                    +{type.roomFacilities.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {!isLoadingRoomTypes && (!Array.isArray(roomTypesData) || roomTypesData.length === 0) && (
                                        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed">
                                            <Bed className="h-10 w-10 text-muted-foreground/40 mb-3" />
                                            <p className="text-sm font-medium text-muted-foreground">Belum ada tipe kamar</p>
                                            <p className="text-xs text-muted-foreground/70 mt-1">Tambahkan tipe kamar melalui menu Rooms.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="details" className="pt-4">
                            <Card className="border-none shadow-md">
                                <CardContent className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Tanggal Terdaftar</Label>
                                            <p className="text-sm font-medium">{new Date(propertyData.createdAt).toLocaleDateString("id-ID")}</p>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Foto Properti</Label>
                                        <div className="grid grid-cols-4 gap-2 mt-2">
                                            {propertyData.images?.map((img: any, i: number) => (
                                                <div key={i} className="aspect-square rounded border overflow-hidden">
                                                    <img src={img.url} className="w-full h-full object-cover" alt={`Property image ${i + 1}`} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="manual-payment-accounts" className="pt-4">
                            <Card className="border-none shadow-md">
                                <CardHeader className="flex flex-row items-center justify-between gap-4">
                                    <div>
                                        <CardTitle>Rekening Pembayaran Manual</CardTitle>
                                        <CardDescription>
                                            Tambahkan satu atau lebih rekening tujuan transfer yang bisa dipilih tenant saat membayar manual.
                                        </CardDescription>
                                    </div>
                                    {canManageProperty ? (
                                        <Button onClick={openCreateAccountDialog}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Tambah Rekening
                                        </Button>
                                    ) : null}
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {isLoadingManualPaymentAccounts ? (
                                        <div className="py-8 text-center text-muted-foreground">Memuat rekening pembayaran manual...</div>
                                    ) : manualPaymentAccounts.length ? (
                                        <div className="space-y-3">
                                            {manualPaymentAccounts.map((account) => (
                                                <div key={account.id} className="rounded-xl border p-4">
                                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                        <div className="space-y-2">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <div className="text-lg font-semibold">{account.label}</div>
                                                                <Badge variant={account.isVisible ? "default" : "secondary"}>
                                                                    {account.isVisible ? "Ditampilkan" : "Disembunyikan"}
                                                                </Badge>
                                                                <Badge variant="outline">Prioritas {account.displayPriority}</Badge>
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {account.bankName} - {account.accountNumber}
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">a.n. {account.accountHolder}</div>
                                                        </div>
                                                        {canManageProperty ? (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                                                                    <Switch
                                                                        checked={account.isVisible}
                                                                        onCheckedChange={() => toggleManualPaymentAccountMutation.mutate(account)}
                                                                        disabled={toggleManualPaymentAccountMutation.isPending}
                                                                    />
                                                                    <span className="text-sm text-muted-foreground">
                                                                        {account.isVisible ? "Sedang tampil" : "Tidak tampil"}
                                                                    </span>
                                                                </div>
                                                                <Button variant="outline" size="sm" onClick={() => openEditAccountDialog(account)}>
                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                    Edit
                                                                </Button>
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => deleteManualPaymentAccountMutation.mutate(account.id)}
                                                                    disabled={deleteManualPaymentAccountMutation.isPending}
                                                                >
                                                                    <Trash className="mr-2 h-4 w-4" />
                                                                    Hapus
                                                                </Button>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                                            Belum ada rekening pembayaran manual untuk properti ini.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="space-y-6">
                    <Card className="border-none shadow-md">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Ringkasan Statistik</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center">
                                <LayoutGrid className="mr-2 h-4 w-4 text-primary" />
                                <div className="flex-1 text-sm">Tipe Kamar</div>
                                <div className="font-bold">{Array.isArray(roomTypesData) ? roomTypesData.length : 0}</div>
                            </div>
                            <div className="flex items-center">
                                <Bed className="mr-2 h-4 w-4 text-primary" />
                                <div className="flex-1 text-sm">Total Unit</div>
                                <div className="font-bold">
                                    {Array.isArray(roomTypesData)
                                        ? roomTypesData.reduce((acc: number, t: any) => acc + (t.rooms?.length || 0), 0)
                                        : 0}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog
                open={isAccountDialogOpen}
                onOpenChange={(open) => {
                    if (!manualPaymentAccountMutation.isPending) {
                        setIsAccountDialogOpen(open);
                        if (!open) {
                            setEditingAccount(null);
                        }
                    }
                }}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editingAccount ? "Edit Rekening Pembayaran Manual" : "Tambah Rekening Pembayaran Manual"}</DialogTitle>
                        <DialogDescription>
                            Rekening yang ditandai tampil akan muncul sebagai pilihan tenant saat mereka membayar secara manual.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="manual-account-label">Label Rekening</Label>
                            <Input
                                id="manual-account-label"
                                value={accountForm.label}
                                onChange={(event) => setAccountForm((prev) => ({ ...prev, label: event.target.value }))}
                                placeholder="Contoh: Rekening Operasional Utama"
                            />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="manual-account-bank-name">Nama Bank</Label>
                                <Input
                                    id="manual-account-bank-name"
                                    value={accountForm.bankName}
                                    onChange={(event) => setAccountForm((prev) => ({ ...prev, bankName: event.target.value }))}
                                    placeholder="Contoh: BCA"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="manual-account-number">Nomor Rekening</Label>
                                <Input
                                    id="manual-account-number"
                                    value={accountForm.accountNumber}
                                    onChange={(event) => setAccountForm((prev) => ({ ...prev, accountNumber: event.target.value }))}
                                    placeholder="1234567890"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="manual-account-holder">Nama Pemilik Rekening</Label>
                                <Input
                                    id="manual-account-holder"
                                    value={accountForm.accountHolder}
                                    onChange={(event) => setAccountForm((prev) => ({ ...prev, accountHolder: event.target.value }))}
                                    placeholder="Nama pemilik rekening"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="manual-account-priority">Prioritas Tampil</Label>
                                <Input
                                    id="manual-account-priority"
                                    type="number"
                                    min={1}
                                    value={accountForm.displayPriority}
                                    onChange={(event) => setAccountForm((prev) => ({ ...prev, displayPriority: Number(event.target.value) || 1 }))}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                            <div>
                                <div className="font-medium">Tampilkan ke Tenant</div>
                                <div className="text-sm text-muted-foreground">Jika aktif, rekening ini akan muncul sebagai pilihan pembayaran manual.</div>
                            </div>
                            <Switch
                                checked={accountForm.isVisible}
                                onCheckedChange={(checked) => setAccountForm((prev) => ({ ...prev, isVisible: checked }))}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAccountDialogOpen(false)} disabled={manualPaymentAccountMutation.isPending}>
                            Batal
                        </Button>
                        <Button
                            onClick={() => manualPaymentAccountMutation.mutate()}
                            disabled={
                                manualPaymentAccountMutation.isPending ||
                                !accountForm.label.trim() ||
                                !accountForm.bankName.trim() ||
                                !accountForm.accountNumber.trim() ||
                                !accountForm.accountHolder.trim()
                            }
                        >
                            {manualPaymentAccountMutation.isPending ? "Menyimpan..." : editingAccount ? "Simpan Perubahan" : "Tambah Rekening"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
