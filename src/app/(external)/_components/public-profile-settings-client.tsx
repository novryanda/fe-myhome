"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, LockKeyhole, Save, Upload, UserRound } from "lucide-react";
import { toast } from "sonner";

import { authClient, useSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PublicProfileSettingsClient() {
  const { data: session, isPending } = useSession();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [name, setName] = useState(session?.user?.name || "");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState((session?.user as any)?.image || "");
  const [previewUrl, setPreviewUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileQuery = useQuery({
    queryKey: ["my-profile-me"],
    queryFn: async () => {
      const response = await api.get("/api/profile/me");
      return response.data.data;
    },
    enabled: !!session?.user,
  });

  useEffect(() => {
    if (!session?.user) return;
    setName(session.user.name || "");
    setAvatarUrl((session.user as any).image || "");
  }, [session?.user]);

  useEffect(() => {
    if (!profileQuery.data) return;
    setPhone(profileQuery.data.phone || "");
  }, [profileQuery.data]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 2MB.");
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
        const err = await res.json();
        throw new Error(err.message || "Gagal mengunggah avatar.");
      }

      const result = await res.json();
      setAvatarUrl(result.data.url);
      toast.success("Avatar berhasil diunggah.");
    } catch (error: any) {
      toast.error(error.message || "Gagal mengunggah avatar.");
      setPreviewUrl("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error("Nama tidak boleh kosong.");
      return;
    }

    const normalizedPhone = phone.trim();
    if (normalizedPhone && normalizedPhone.length < 8) {
      toast.error("Nomor HP minimal 8 karakter.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const { error } = await authClient.updateUser({
        name,
        image: avatarUrl,
      });

      if (error) {
        toast.error(error.message || "Gagal memperbarui profil.");
        return;
      }

      await api.patch("/api/profile/me", {
        fullName: name,
        phone: normalizedPhone || null,
      });

      setPreviewUrl("");
      profileQuery.refetch();
      toast.success("Profil berhasil diperbarui.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Terjadi kesalahan saat memperbarui profil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error("Password saat ini wajib diisi.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await (authClient as any).changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });

      if (result?.error) {
        toast.error(result.error.message || "Gagal mengubah password.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password berhasil diubah.");
    } catch {
      toast.error("Terjadi kesalahan saat mengubah password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const displayAvatar = previewUrl || avatarUrl;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="rounded-[28px] border border-blue-100 shadow-[0_20px_60px_-30px_rgba(29,78,216,0.28)]">
        <CardHeader>
          <CardTitle className="text-2xl">Informasi Profil</CardTitle>
          <CardDescription>Perbarui nama tampilan, nomor HP, dan avatar akun Anda di area publik.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative">
              <Avatar className="h-24 w-24 border border-blue-100 bg-blue-50 p-1">
                <AvatarImage src={displayAvatar} alt={name} className="rounded-full object-cover" />
                <AvatarFallback className="rounded-full text-2xl">{getInitials(name || session.user.name || "U")}</AvatarFallback>
              </Avatar>
              {isUploading ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg, image/png, image/gif, image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                className="rounded-full border-blue-200 text-blue-700 hover:bg-blue-50"
                disabled={isUploading || isSavingProfile}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Ubah Avatar
              </Button>
              <p className="text-sm text-zinc-500">Format JPG, PNG, GIF, atau WebP. Maksimal 2MB.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="public-name">Nama Lengkap</Label>
              <Input id="public-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="public-email">Email</Label>
              <Input id="public-email" value={session.user.email || ""} disabled className="bg-zinc-50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="public-phone">Nomor HP / WhatsApp</Label>
              <Input
                id="public-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="08xxxxxxxxxx"
                disabled={isSavingProfile || isUploading}
              />
            </div>
            <div className="rounded-2xl bg-blue-50/70 p-4 text-sm leading-6 text-zinc-600">
              Setelah Perubahan Simpan Profil Anda
            </div>
          </div>

          <Button
            className="rounded-full bg-blue-700 hover:bg-blue-800"
            disabled={isSavingProfile || isUploading}
            onClick={handleSaveProfile}
          >
            {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Profil
          </Button>
        </CardContent>
      </Card>

      <Card id="security" className="rounded-[28px] border border-blue-100 shadow-[0_20px_60px_-30px_rgba(29,78,216,0.28)]">
        <CardHeader>
          <CardTitle className="text-2xl">Keamanan Akun</CardTitle>
          <CardDescription>Ganti password tanpa perlu masuk ke dashboard sidebar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl bg-blue-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-700 p-2 text-white">
                <LockKeyhole className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-zinc-950">Ubah Password</div>
                <div className="mt-1 text-sm leading-6 text-zinc-600">
                  Masukkan password saat ini, lalu tentukan password baru yang lebih kuat.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Password Saat Ini</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Masukkan password saat ini"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Password Baru</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Ulangi password baru"
              />
            </div>
          </div>

          <Button className="rounded-full bg-blue-700 hover:bg-blue-800" disabled={isChangingPassword} onClick={handleChangePassword}>
            {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserRound className="mr-2 h-4 w-4" />}
            Simpan Password Baru
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
