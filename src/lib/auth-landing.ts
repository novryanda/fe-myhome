export function getPostAuthPath(role?: string | null, redirectTo?: string | null) {
  const normalizedRedirect = redirectTo && redirectTo.startsWith("/") ? redirectTo : null;

  if (role === "ADMIN" || role === "SUPERADMIN") {
    if (normalizedRedirect?.startsWith("/dashboard")) {
      return normalizedRedirect;
    }
    return "/dashboard";
  }

  if (normalizedRedirect && !normalizedRedirect.startsWith("/dashboard")) {
    return normalizedRedirect;
  }

  return "/";
}
