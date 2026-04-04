"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ChartColumnBig,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Youtube,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const socialLinks = [
  { label: "Instagram", href: "#", icon: Instagram },
  { label: "Facebook", href: "#", icon: Facebook },
  { label: "YouTube", href: "#", icon: Youtube },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-blue-100 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="overflow-hidden rounded-[36px] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.30),_transparent_22%),linear-gradient(135deg,_#0f172a_0%,_#1e3a8a_48%,_#2563eb_100%)] p-7 text-white shadow-[0_35px_90px_-35px_rgba(29,78,216,0.55)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="space-y-5">
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
                Bergabung Sekarang
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Berminat Menjadi Mitra MyHome?</h2>
                <p className="max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                  Daftarkan kos Anda dan kelola properti dengan alur booking, transaksi, penghuni, dan pencairan dana
                  dalam satu dashboard.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-white/85">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
                  <Building2 className="h-4 w-4" />
                  Kelola Properti
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
                  <ShieldCheck className="h-4 w-4" />
                  Aman & Terpercaya
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <Link href="/auth/register?type=admin">
                <Button className="h-14 rounded-full bg-white px-7 text-base font-semibold text-blue-800 hover:bg-blue-50">
                  Daftar Sebagai Mitra
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
          <div className="space-y-5">
            <Image src="/logo.png" alt="MyHome" width={210} height={64} className="h-12 w-auto" />
            <p className="max-w-sm text-sm leading-7 text-zinc-600">
              Platform terpercaya untuk menemukan hunian kos impian dan membantu pemilik properti mengelolanya dengan
              lebih mudah.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-white text-zinc-500 transition hover:border-blue-200 hover:text-blue-700"
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-950">Layanan</h3>
            <div className="space-y-3 text-sm text-zinc-600">
              <Link href="/" className="block transition hover:text-blue-700">
                Cari Kos
              </Link>
              <Link href="/auth/register?type=admin" className="block transition hover:text-blue-700">
                Daftar Properti
              </Link>
              <Link href="/my-bookings" className="block transition hover:text-blue-700">
                Pesanan Saya
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-950">Bantuan</h3>
            <div className="space-y-3 text-sm text-zinc-600">
              <Link href="#" className="block transition hover:text-blue-700">
                Syarat & Ketentuan
              </Link>
              <Link href="#" className="block transition hover:text-blue-700">
                Kebijakan Privasi
              </Link>
              <Link href="/auth/login" className="block transition hover:text-blue-700">
                Masuk ke Akun
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-950">Kontak Kami</h3>
            <div className="space-y-4 text-sm text-zinc-600">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-blue-700" />
                <span>info@myhome.co.id</span>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-blue-700" />
                <span>08116946828</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-blue-700" />
                <span>Pekanbaru, Indonesia</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-blue-100 pt-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <div>© 2026 MyHome. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="#" className="transition hover:text-blue-700">
              Terms
            </Link>
            <Link href="#" className="transition hover:text-blue-700">
              Privacy
            </Link>
            <Link href="#" className="transition hover:text-blue-700">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
