"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { Loader2, Upload } from "lucide-react";

export function ProfileInformation({ user }: { user: any }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [name, setName] = useState(user?.name || "");
    const [phone, setPhone] = useState("");
    const [avatarUrl, setAvatarUrl] = useState(user?.image || "");
    const [previewUrl, setPreviewUrl] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const profileQuery = useQuery({
        queryKey: ["my-profile-me"],
        queryFn: async () => {
            const response = await api.get("/api/profile/me");
            return response.data.data;
        },
        enabled: !!user?.id,
    });

    useEffect(() => {
        if (!profileQuery.data) return;
        setPhone(profileQuery.data.phone || "");
    }, [profileQuery.data]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error("Ukuran berkas melebihi batas 2MB.");
            return;
        }

        // Show local preview immediately
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);

        // Upload to Cloudinary via backend
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload/image", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Gagal mengunggah");
            }

            const result = await res.json();
            setAvatarUrl(result.data.url);
            toast.success("Gambar berhasil diunggah");
        } catch (error: any) {
            toast.error(error.message || "Gagal mengunggah gambar");
            setPreviewUrl("");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Nama tidak boleh kosong");
            return;
        }

        const normalizedPhone = phone.trim();
        if (normalizedPhone && normalizedPhone.length < 8) {
            toast.error("Nomor HP minimal 8 karakter");
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await authClient.updateUser({
                name,
                image: avatarUrl,
            });

            if (error) {
                toast.error(error.message || "Gagal memperbarui profil");
            } else {
                await api.patch("/api/profile/me", {
                    fullName: name,
                    phone: normalizedPhone || null,
                });
                setPreviewUrl("");
                profileQuery.refetch();
                toast.success("Profil berhasil diperbarui");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Terjadi kesalahan saat memperbarui profil");
        } finally {
            setIsLoading(false);
        }
    };

    const displayUrl = previewUrl || avatarUrl;

    return (
        <Card className="border-none shadow-none bg-transparent sm:bg-card sm:shadow-sm sm:border">
            <CardHeader className="px-0 sm:px-6">
                <CardTitle className="text-xl">Informasi Profil</CardTitle>
                <CardDescription>
                    Perbarui rincian pribadi Anda termasuk nomor HP aktif.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-0 sm:px-6">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <Avatar className="h-20 w-20 ring-1 ring-border p-1">
                            <AvatarImage src={displayUrl} alt={name} className="object-cover rounded-full" />
                            <AvatarFallback className="text-2xl rounded-full">{getInitials(name)}</AvatarFallback>
                        </Avatar>
                        {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <input
                            type="file"
                            accept="image/jpeg, image/png, image/gif, image/webp"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading || isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Mengunggah...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Ubah Avatar
                                </>
                            )}
                        </Button>
                        <p className="text-[0.8rem] text-muted-foreground">
                            JPG, GIF, PNG atau WebP. Ukuran maks 2MB.
                        </p>
                    </div>
                </div>

                <div className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nama Lengkap</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            value={user?.email || ""}
                            disabled
                            className="bg-muted"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Nomor HP / WhatsApp</Label>
                        <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="08xxxxxxxxxx"
                            disabled={isLoading || isUploading}
                        />
                    </div>
                </div>

                <Button onClick={handleSave} disabled={isLoading || isUploading} className="bg-[#e45a33] hover:bg-[#cf4d28] text-white">
                    {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
            </CardContent>
        </Card>
    );
}
