"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, MapPin, MenuSquare, ReceiptText, Settings, UserRound } from "lucide-react";

import { authClient, useSession } from "@/lib/auth-client";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const publicNavItems = [
  { label: "Beranda", href: "/" },
  { label: "Properti", href: "/#property-list" },
  { label: "Kota", href: "/#city-list" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const currentPath = pathname || "/";
  const loginHref = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
  const registerHref = `/auth/register?redirect=${encodeURIComponent(currentPath)}`;

  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPERADMIN";

  const signedInItems = isAdmin
    ? [
        { label: "Profil", href: "/profile" },
        { label: "Dashboard", href: "/dashboard" },
      ]
    : [
      ];

  return (
    <header className="sticky top-0 z-30 border-b border-blue-100/80 bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="min-w-0 shrink-0">
          <Image
            src="/logo.png"
            alt="MyHome"
            width={220}
            height={66}
            priority
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {[...publicNavItems, ...signedInItems].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-blue-50 hover:text-blue-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              {!isAdmin ? (
                <Link href="/my-bookings" className="hidden sm:block">
                  <Button variant="outline" className="rounded-full border-blue-200 text-blue-700 hover:bg-blue-50">
                    <ReceiptText className="mr-2 h-4 w-4" />
                    Pesanan Saya
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard" className="hidden sm:block">
                  <Button variant="outline" className="rounded-full border-blue-200 text-blue-700 hover:bg-blue-50">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-11 rounded-full px-2 hover:bg-blue-50">
                    <Avatar className="h-8 w-8 border border-blue-100" size="sm">
                      <AvatarImage src={(session.user as any).image || undefined} alt={session.user.name} className="object-cover" />
                      <AvatarFallback>{getInitials(session.user.name || "U")}</AvatarFallback>
                    </Avatar>
                    <div className="hidden text-left sm:block">
                      <div className="max-w-[120px] truncate text-sm font-semibold text-zinc-800">{session.user.name}</div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{role}</div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-60 rounded-2xl border border-blue-100 p-2">
                  <DropdownMenuLabel className="px-3 py-2">
                    <div className="font-semibold text-zinc-900">{session.user.name}</div>
                    <div className="text-xs text-zinc-500">{session.user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem className="rounded-xl">
                      <UserRound />
                      Profil
                    </DropdownMenuItem>
                  </Link>
                  {!isAdmin ? (
                    <>
                      <Link href="/my-bookings">
                        <DropdownMenuItem className="rounded-xl">
                          <ReceiptText />
                          Pesanan Saya
                        </DropdownMenuItem>
                      </Link>
                    </>
                  ) : (
                    <Link href="/dashboard">
                      <DropdownMenuItem className="rounded-xl">
                        <LayoutDashboard />
                        Dashboard
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuItem
                    className="rounded-xl text-destructive focus:text-destructive"
                    onClick={async () => {
                      await authClient.signOut({
                        fetchOptions: {
                          onSuccess: () => {
                            window.location.href = "/";
                          },
                        },
                      });
                    }}
                  >
                    <LogOut />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href={loginHref}>
                <Button className="rounded-full bg-blue-700 hover:bg-blue-800">
                  Masuk
                </Button>
              </Link>
              <Link href={registerHref}>
                <Button className="rounded-full bg-blue-700 hover:bg-blue-800">Daftar</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-blue-100/60 md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          {[...publicNavItems, ...signedInItems].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-blue-100 bg-white px-3 py-2 text-sm font-medium text-zinc-600"
            >
              {item.label}
            </Link>
          ))}
          {session?.user?.role === "USER" ? (
            <Badge className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-blue-700 hover:bg-blue-50">
              <MapPin className="mr-1 h-3.5 w-3.5" />
              User Public Area
            </Badge>
          ) : null}
          {!session?.user ? (
            <Badge className="shrink-0 rounded-full bg-blue-50 px-3 py-2 text-blue-700 hover:bg-blue-50">
              <MenuSquare className="mr-1 h-3.5 w-3.5" />
              Guest Mode
            </Badge>
          ) : null}
        </div>
      </div>
    </header>
  );
}
