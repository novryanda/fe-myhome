const publicAssetBaseUrl =
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_STORAGE_HOSTNAME;

let storageHostname = "";

if (publicAssetBaseUrl) {
  try {
    storageHostname = new URL(
      /^https?:\/\//i.test(publicAssetBaseUrl)
        ? publicAssetBaseUrl
        : `https://${publicAssetBaseUrl}`
    ).hostname;
  } catch {
    storageHostname = "";
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      ...(storageHostname
        ? [
            {
              protocol: "https",
              hostname: storageHostname,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
