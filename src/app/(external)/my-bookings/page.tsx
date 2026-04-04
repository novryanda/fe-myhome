import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import { PublicBookingsClient } from "../_components/public-bookings-client";
import { PublicFooter } from "../_components/public-footer";
import { PublicHeader } from "../_components/public-header";

export default async function PublicMyBookingsPage() {
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  if (!session?.user) {
    redirect("/auth/login?redirect=/my-bookings");
  }

  if (session.user.role !== "USER") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_28%,_#f8fafc_100%)]">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="relative isolate overflow-hidden rounded-[36px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),linear-gradient(180deg,_#eff6ff_0%,_#ffffff_100%)] px-5 py-8 shadow-[0_24px_70px_-40px_rgba(29,78,216,0.35)] sm:px-8 sm:py-10">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
          <div className="-right-20 absolute top-0 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />
          <div className="-bottom-24 absolute left-8 h-40 w-40 rounded-full bg-sky-200/30 blur-3xl" />

          <div className="relative max-w-4xl space-y-6">
            <div className="inline-flex rounded-full border border-blue-100 bg-white px-4 py-2 font-semibold text-blue-700 text-sm shadow-sm">
              Akun Saya
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl font-black text-4xl text-zinc-950 tracking-tight sm:text-5xl lg:text-6xl">
                Pesanan Saya
              </h1>
              <p className="max-w-2xl text-sm text-zinc-600 leading-7 sm:text-base">
                Pantau status booking, cek pembayaran, dan lanjutkan perpanjangan.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-8">
          <PublicBookingsClient />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
