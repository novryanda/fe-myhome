"use client";

import { useSession } from "@/lib/auth-client";
import { ProfileInformation } from "./_components/profile-information";
import { SecuritySettings } from "./_components/security-settings";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
    const { data: session, isPending } = useSession();

    if (isPending) {
        return (
            <div className="flex h-[calc(100vh-theme(spacing.24))] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!session?.user) {
        return (
            <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col items-center justify-center space-y-4">
                <div className="rounded-full bg-destructive/10 p-4">
                    <ShieldAlert className="h-12 w-12 text-destructive" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold">Akses Ditolak</h2>
                    <p className="text-muted-foreground">
                        Silakan login untuk mengakses halaman profil.
                    </p>
                </div>
                <Button variant="outline" onClick={() => window.history.back()}>
                    Kembali
                </Button>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-8 p-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Pengaturan Akun</h1>
                <p className="text-muted-foreground">
                    Kelola profil pribadi, keamanan, dan preferensi antarmuka Anda.
                </p>
            </div>

            <ProfileInformation user={session.user} />
            <SecuritySettings user={session.user} />
        </div>
    );
}
