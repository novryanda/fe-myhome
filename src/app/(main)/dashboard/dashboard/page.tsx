import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import { DashboardClient } from "./_components/dashboard-client";

export default async function Page() {
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  const role = session?.user?.role;

  if (!role) {
    redirect("/auth/login");
  }

  if (role === "USER") {
    redirect("/my-bookings");
  }

  return <DashboardClient role={role as "ADMIN" | "SUPERADMIN"} />;
}
