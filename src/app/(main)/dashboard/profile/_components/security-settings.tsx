"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, ShieldCheck } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function SecuritySettings({ user }: { user: any }) {
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handlePasswordChange = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast.error("Kata sandi minimal 6 karakter");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Kata sandi tidak cocok");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`/api/user/${user.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: user.id,
                    password: newPassword,
                }),
            });

            if (response.ok) {
                toast.success("Kata sandi berhasil diubah");
                setIsPasswordModalOpen(false);
                setNewPassword("");
                setConfirmPassword("");
            } else {
                toast.error("Gagal mengubah kata sandi");
            }
        } catch (error) {
            toast.error("Terjadi kesalahan saat mengubah kata sandi");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Keamanan & Privasi</CardTitle>
                <CardDescription>
                    Kelola kata sandi dan pengaturan keamanan akun Anda.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                            <KeyRound size={24} />
                        </div>
                        <div>
                            <p className="font-medium">Kata Sandi</p>
                            <p className="text-sm text-muted-foreground">Jaga keamanan akun Anda dengan kata sandi yang kuat</p>
                        </div>
                    </div>
                    <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">Ubah Kata Sandi</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Ubah Kata Sandi</DialogTitle>
                                <DialogDescription>
                                    Masukkan kata sandi baru untuk akun Anda.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">Kata Sandi Baru</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="******"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Konfirmasi Kata Sandi</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="******"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button disabled={isLoading} onClick={handlePasswordChange}>
                                    {isLoading ? "Menyimpan..." : "Simpan perubahan"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="flex items-center justify-between py-4">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <p className="font-medium">Akses Akun</p>
                            <p className="text-sm text-muted-foreground">Lihat perangkat mana yang saat ini memiliki akses ke akun Anda.</p>
                        </div>
                    </div>
                    <Button variant="ghost" disabled>Tinjau Aktivitas</Button>
                </div>
            </CardContent>
        </Card>
    );
}
