"use client";

import { useEffect, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { normalizeAssetUrl } from "@/lib/asset-url";
import { authClient } from "@/lib/auth-client";
import { getInitials } from "@/lib/utils";

type ProfileInformationUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
};

type ProfileResponse = {
  phone?: string | null;
  adminNotifyPhones?: string[];
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof message === "string" && message) {
    return message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export function ProfileInformation({ user }: { user: ProfileInformationUser }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [adminNotifyPhones, setAdminNotifyPhones] = useState<string[]>([""]);
  const [avatarUrl, setAvatarUrl] = useState(normalizeAssetUrl(user?.image || ""));
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  const profileQuery = useQuery<ProfileResponse>({
    queryKey: ["my-profile-me"],
    queryFn: async () => {
      const response = await api.get("/api/profile/me");
      return response.data.data as ProfileResponse;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setPhone(profileQuery.data.phone || "");
    setAdminNotifyPhones(
      profileQuery.data.adminNotifyPhones?.length
        ? profileQuery.data.adminNotifyPhones
        : [profileQuery.data.phone || ""].filter(Boolean).length
          ? [profileQuery.data.phone || ""]
          : [""],
    );
  }, [profileQuery.data]);

  const updateAdminPhone = (index: number, value: string) => {
    setAdminNotifyPhones((currentPhones) =>
      currentPhones.map((phoneValue, phoneIndex) => (phoneIndex === index ? value : phoneValue)),
    );
  };

  const addAdminPhone = () => {
    setAdminNotifyPhones((currentPhones) => [...currentPhones, ""]);
  };

  const removeAdminPhone = (index: number) => {
    setAdminNotifyPhones((currentPhones) =>
      currentPhones.length === 1 ? [""] : currentPhones.filter((_, phoneIndex) => phoneIndex !== index),
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran berkas melebihi batas 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message || "Gagal mengunggah");
      }

      const result = (await res.json()) as { data: { url: string } };
      setAvatarUrl(result.data.url);
      toast.success("Gambar berhasil diunggah");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Gagal mengunggah gambar"));
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

    const normalizedAdminPhones = adminNotifyPhones
      .map((phoneValue) => phoneValue.trim())
      .filter(Boolean)
      .filter((phoneValue, index, values) => values.indexOf(phoneValue) === index);

    if (normalizedAdminPhones.some((phoneValue) => phoneValue.length < 8)) {
      toast.error("Semua nomor notifikasi admin minimal 8 karakter");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authClient.updateUser({
        name,
        image: normalizeAssetUrl(avatarUrl),
      });

      if (error) {
        toast.error(error.message || "Gagal memperbarui profil");
        return;
      }

      await api.patch("/api/profile/me", {
        fullName: name,
        phone: normalizedPhone || null,
        adminNotifyPhones: isAdmin ? normalizedAdminPhones : undefined,
      });
      setPreviewUrl("");
      profileQuery.refetch();
      toast.success("Profil berhasil diperbarui");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Terjadi kesalahan saat memperbarui profil"));
    } finally {
      setIsLoading(false);
    }
  };

  const displayUrl = previewUrl || avatarUrl;

  return (
    <Card className="border-none bg-transparent shadow-none sm:border sm:bg-card sm:shadow-sm">
      <CardHeader className="px-0 sm:px-6">
        <CardTitle className="text-xl">Informasi Profil</CardTitle>
        <CardDescription>Perbarui rincian pribadi Anda termasuk nomor HP aktif.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-0 sm:px-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-20 w-20 p-1 ring-1 ring-border">
              <AvatarImage src={displayUrl} alt={name} className="rounded-full object-cover" />
              <AvatarFallback className="rounded-full text-2xl">{getInitials(name)}</AvatarFallback>
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
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading || isUploading}>
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
            <p className="text-[0.8rem] text-muted-foreground">JPG, GIF, PNG atau WebP. Ukuran maks 2MB.</p>
          </div>
        </div>

        <div className="max-w-xl space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
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

          {isAdmin ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Label>Nomor Notifikasi Admin</Label>
                  <p className="text-muted-foreground text-sm">
                    Semua nomor di bawah ini akan menerima notifikasi WhatsApp untuk booking dan pembayaran.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 self-start"
                  onClick={addAdminPhone}
                  disabled={isLoading || isUploading || adminNotifyPhones.length >= 10}
                >
                  <Plus className="h-4 w-4" />
                  Tambah Nomor
                </Button>
              </div>

              <div className="space-y-3">
                {adminNotifyPhones.map((phoneValue, index) => (
                  <div key={`admin-notify-phone-${index + 1}`} className="flex items-center gap-2">
                    <Input
                      value={phoneValue}
                      onChange={(e) => updateAdminPhone(index, e.target.value)}
                      placeholder={`Nomor notifikasi admin ${index + 1}`}
                      disabled={isLoading || isUploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeAdminPhone(index)}
                      disabled={isLoading || isUploading || adminNotifyPhones.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <Button
          onClick={handleSave}
          disabled={isLoading || isUploading}
          className="bg-[#e45a33] text-white hover:bg-[#cf4d28]"
        >
          {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </CardContent>
    </Card>
  );
}
