const storageHostname = process.env.NEXT_PUBLIC_STORAGE_HOSTNAME;

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
      {
        protocol: "https",
        hostname: "**.r2.dev",
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
