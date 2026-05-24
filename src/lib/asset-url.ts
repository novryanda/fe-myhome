const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");
const stripLeadingSlashes = (value: string) => value.replace(/^\/+/, "");

const resolvePublicAssetBaseUrl = () => {
  const explicitBaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return stripTrailingSlashes(explicitBaseUrl);
  }

  const storageHostname = process.env.NEXT_PUBLIC_STORAGE_HOSTNAME?.trim();
  if (!storageHostname) {
    return "";
  }

  if (/^https?:\/\//i.test(storageHostname)) {
    return stripTrailingSlashes(storageHostname);
  }

  return `https://${stripTrailingSlashes(storageHostname)}`;
};

const publicAssetBaseUrl = resolvePublicAssetBaseUrl();

export function normalizeAssetUrl(value?: string | null) {
  if (!value) {
    return value ?? "";
  }

  const trimmedValue = value.trim();
  if (!trimmedValue || !publicAssetBaseUrl) {
    return trimmedValue;
  }

  if (trimmedValue.startsWith(publicAssetBaseUrl)) {
    return trimmedValue;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    try {
      const assetUrl = new URL(trimmedValue);
      const publicUrl = new URL(publicAssetBaseUrl);
      if (
        assetUrl.hostname === publicUrl.hostname ||
        assetUrl.hostname.endsWith(".r2.dev") ||
        assetUrl.hostname.endsWith(".r2.cloudflarestorage.com")
      ) {
        const key = stripLeadingSlashes(assetUrl.pathname);
        return key ? `${publicAssetBaseUrl}/${key}` : publicAssetBaseUrl;
      }
    } catch {
      return trimmedValue;
    }

    return trimmedValue;
  }

  return `${publicAssetBaseUrl}/${stripLeadingSlashes(trimmedValue)}`;
}
