import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect as nextRedirect } from "next/navigation";
import { Building2, ShieldCheck, UserRound } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { getPostAuthPath } from "@/lib/auth-landing";

import { RegisterForm } from "../_components/register-form";
import { GoogleButton } from "../_components/social-auth/google-button";

export default async function RegisterV1({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; type?: string }>;
}) {
  const { redirect, type } = await searchParams;
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  if (session?.user) {
    nextRedirect(getPostAuthPath(session.user.role, redirect));
  }

  const loginHref = redirect ? `/auth/login?redirect=${encodeURIComponent(redirect)}` : "/auth/login";
  const defaultTab = type === "admin" ? "ADMIN" : "USER";

  return (
    <div className="flex min-h-dvh bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_100%)]">
      <div className="flex w-full items-center justify-center p-6 lg:w-[58%] lg:p-10">
        <div className="w-full max-w-xl space-y-8 py-8">
          <Link href="/" className="inline-flex">
            <Image src="/logo.png" alt="MyHome" width={220} height={64} className="h-12 w-auto" />
          </Link>

          <div className="space-y-3">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Buat akun</div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-950">Pilih jenis akun yang ingin Anda gunakan</h1>
            <p className="max-w-xl text-sm leading-7 text-zinc-600 sm:text-base">
              Form registrasi untuk pencari kos dan mitra properti saya pisahkan agar alur penggunaan setelah login
              langsung sesuai dengan kebutuhan masing-masing.
            </p>
          </div>

          <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-blue-50 p-1">
              <TabsTrigger value="USER" className="rounded-xl py-3 data-[state=active]:bg-white">
                <UserRound className="mr-2 h-4 w-4" />
                Pencari Kos
              </TabsTrigger>
              <TabsTrigger value="ADMIN" className="rounded-xl py-3 data-[state=active]:bg-white">
                <Building2 className="mr-2 h-4 w-4" />
                Mitra / Owner
              </TabsTrigger>
            </TabsList>

            <TabsContent value="USER" className="space-y-4">
              <RegisterForm accountType="USER" />
            </TabsContent>

            <TabsContent value="ADMIN" className="space-y-4">
              <RegisterForm accountType="ADMIN" />
            </TabsContent>
          </Tabs>

          <GoogleButton className="w-full" variant="outline" />
          <p className="text-center text-muted-foreground text-xs">
            Sudah punya akun?{" "}
            <Link prefetch={false} href={loginHref} className="text-blue-700">
              Login
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden w-[42%] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.30),_transparent_18%),linear-gradient(135deg,_#0f172a_0%,_#1e3a8a_48%,_#2563eb_100%)] p-10 text-white lg:flex">
        <div className="flex h-full flex-col justify-between rounded-[36px] border border-white/10 bg-white/6 p-8 backdrop-blur-sm">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
              Registrasi Multi-Akun
            </div>
            <div className="space-y-3">
              <h2 className="text-4xl font-black tracking-tight">Satu platform untuk pencari kos dan pengelola properti.</h2>
              <p className="text-sm leading-7 text-white/80">
                User dapat mencari dan booking kamar. Mitra dapat mengelola properti, penghuni, transaksi, dan pencairan
                dana dari dashboard operasional.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-3xl bg-white/10 p-4">
              <UserRound className="mt-0.5 h-5 w-5" />
              <div>
                <div className="font-semibold">Akun User</div>
                <div className="mt-1 text-sm leading-6 text-white/75">
                  Untuk pencarian properti, booking kamar, pembayaran, dan monitoring pesanan.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-3xl bg-white/10 p-4">
              <Building2 className="mt-0.5 h-5 w-5" />
              <div>
                <div className="font-semibold">Akun Mitra / Admin</div>
                <div className="mt-1 text-sm leading-6 text-white/75">
                  Untuk listing properti, pengaturan kamar, tenant aktif, transaksi, dan withdrawal.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-3xl bg-white/10 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5" />
              <div>
                <div className="font-semibold">Role Lebih Jelas</div>
                <div className="mt-1 text-sm leading-6 text-white/75">
                  Form dibedakan sejak awal agar onboarding dan tujuan login tidak tercampur.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
