import Link from "next/link";
import { headers } from "next/headers";
import { CheckCircle2, Clock3, CreditCard, Home, ReceiptText, XCircle } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { PublicFooter } from "../../_components/public-footer";
import { PublicHeader } from "../../_components/public-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function getPaymentState(transactionStatus?: string) {
  const status = (transactionStatus || "").toLowerCase();

  if (status === "settlement" || status === "capture") {
    return {
      title: "Pembayaran Berhasil",
      description: "Pembayaran Anda sudah diterima. Status booking akan diperbarui otomatis setelah callback Midtrans diproses.",
      icon: CheckCircle2,
      tone: "success" as const,
      badge: "Berhasil",
    };
  }

  if (status === "pending") {
    return {
      title: "Pembayaran Sedang Diproses",
      description: "Transaksi Anda sudah dibuat, tetapi pembayaran belum selesai. Anda bisa mengecek statusnya kembali di halaman pesanan.",
      icon: Clock3,
      tone: "pending" as const,
      badge: "Pending",
    };
  }

  return {
    title: "Status Pembayaran Diterima",
    description: "Redirect dari Midtrans berhasil diterima. Silakan cek detail status pembayaran Anda di halaman pesanan.",
    icon: ReceiptText,
    tone: "neutral" as const,
    badge: "Informasi",
  };
}

function getToneClassName(tone: "success" | "pending" | "neutral") {
  if (tone === "success") {
    return {
      icon: "bg-emerald-100 text-emerald-600",
      badge: "bg-emerald-600 text-white hover:bg-emerald-600",
      card: "border-emerald-200 bg-emerald-50/70",
    };
  }

  if (tone === "pending") {
    return {
      icon: "bg-amber-100 text-amber-600",
      badge: "bg-amber-500 text-white hover:bg-amber-500",
      card: "border-amber-200 bg-amber-50/70",
    };
  }

  return {
    icon: "bg-blue-100 text-blue-600",
    badge: "bg-blue-700 text-white hover:bg-blue-700",
    card: "border-blue-200 bg-blue-50/70",
  };
}

export default async function PaymentFinishPage({
  searchParams,
}: {
  searchParams: Promise<{
    order_id?: string;
    status_code?: string;
    transaction_status?: string;
  }>;
}) {
  const { order_id, status_code, transaction_status } = await searchParams;
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  const paymentState = getPaymentState(transaction_status);
  const toneClass = getToneClassName(paymentState.tone);
  const StatusIcon = paymentState.icon;
  const isUser = session?.user?.role === "USER";
  const primaryHref = isUser ? "/my-bookings" : session?.user ? "/dashboard" : "/";
  const primaryLabel = isUser ? "Lihat Pesanan Saya" : session?.user ? "Buka Dashboard" : "Kembali ke Beranda";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_28%,_#f8fafc_100%)]">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="overflow-hidden rounded-[36px] border border-blue-100 bg-[linear-gradient(135deg,_#ffffff_0%,_#eef4ff_50%,_#ffffff_100%)] shadow-[0_24px_70px_-34px_rgba(29,78,216,0.25)]">
          <div className="space-y-8 px-6 py-10 sm:px-10 sm:py-12">
            <div className="flex justify-center">
              <div className={`flex h-20 w-20 items-center justify-center rounded-full ${toneClass.icon}`}>
                <StatusIcon className="h-10 w-10" />
              </div>
            </div>

            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <Badge className={`rounded-full px-4 py-1 ${toneClass.badge}`}>{paymentState.badge}</Badge>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">{paymentState.title}</h1>
              <p className="mx-auto max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">{paymentState.description}</p>
            </div>

            <Card className={`rounded-[28px] border py-0 shadow-none ${toneClass.card}`}>
              <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="rounded-[22px] bg-white/90 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                    <CreditCard className="h-4 w-4 text-blue-700" />
                    Order ID
                  </div>
                  <div className="mt-2 break-all text-sm text-zinc-600">{order_id || "-"}</div>
                </div>

                <div className="rounded-[22px] bg-white/90 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                    <ReceiptText className="h-4 w-4 text-blue-700" />
                    Transaction Status
                  </div>
                  <div className="mt-2 text-sm text-zinc-600">{transaction_status || "-"}</div>
                </div>

                <div className="rounded-[22px] bg-white/90 p-4 sm:col-span-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                    <XCircle className="h-4 w-4 text-blue-700" />
                    Status Code
                  </div>
                  <div className="mt-2 text-sm text-zinc-600">{status_code || "-"}</div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={primaryHref}>
                <Button className="w-full rounded-full bg-blue-700 px-6 hover:bg-blue-700 sm:w-auto">
                  {primaryLabel}
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full rounded-full border-blue-200 text-blue-700 hover:bg-blue-50 sm:w-auto">
                  <Home className="mr-2 h-4 w-4" />
                  Beranda
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
