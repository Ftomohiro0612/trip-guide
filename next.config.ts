import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.trip-guide.net" }],
        destination: "https://trip-guide.net/:path*",
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
