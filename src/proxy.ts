import { type NextRequest, NextResponse } from "next/server";

/**
 * Runs before requests complete.
 * Use for rewrites, redirects, or header changes.
 * Refer to Next.js Proxy docs for more examples.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // 1. Rewrite API calls to backend
  if (pathname.startsWith("/api/")) {
    return NextResponse.rewrite(new URL(`${pathname}${search}`, apiUrl));
  }
  let session = null;
  try {
    const sessionRes = await fetch(`${apiUrl}/api/auth/get-session`, {
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
      // Short timeout to avoid hanging the proxy if BE is slow/down
      signal: AbortSignal.timeout(5000),
    });

    if (sessionRes.ok) {
      session = await sessionRes.json();
    }
  } catch (error) {
    console.warn("[Proxy] Failed to fetch session from backend:", error instanceof Error ? error.message : error);
    // Continue as null session (will redirect to login if accessing protected route)
  }

  // 3. Redirect to login if no session and trying to access protected pages
  if (!session && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  if (!session && pathname.startsWith("/my-bookings")) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!session && pathname.startsWith("/profile")) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Role-based protection
  const userRole = session?.user?.role;

  // Superadmin only routes
  const superadminOnly = ["/dashboard/user", "/dashboard/city", "/dashboard/approval-withdraw"];

  // Admin/Owner only routes
  const adminOnly = [
    "/dashboard/properties",
    "/dashboard/rooms",
    "/dashboard/withdraw",
    "/dashboard/tenants",
    "/dashboard/order",
  ];

  if (superadminOnly.some((path) => pathname.startsWith(path)) && userRole !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (adminOnly.some((path) => pathname.startsWith(path)) && userRole !== "ADMIN" && userRole !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
}

/**
 * Matcher runs for all routes.
 * To skip assets or APIs, use a negative matcher from docs.
 */
export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
