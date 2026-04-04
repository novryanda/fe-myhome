import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export default async function Page() {
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  if (!session?.user) {
    redirect("/auth/login");
  }

  if (session.user.role === "USER") {
    redirect("/my-bookings");
  }

  redirect("/dashboard/dashboard");
}
