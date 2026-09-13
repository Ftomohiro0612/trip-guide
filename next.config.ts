import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The large versioned canon files are shared by all server route bundles.
  // Keeping this tiny generated package external prevents webpack from
  // embedding the same JSON independently in every route chunk.
  serverExternalPackages: ["@memorip/runtime-canon"],
  images: {
    // Facility images are pre-generated static assets. Remote Supabase images
    // are served directly as well, so neither path consumes a request-time
    // image transformation quota.
    unoptimized: true,
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
        source: "/tag/indoor-rainy",
        destination: "/tag/rainy-day",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.trip-guide.net" }],
        destination: "https://memorips.com/:path*",
        statusCode: 301,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "trip-guide.net" }],
        destination: "https://memorips.com/:path*",
        statusCode: 301,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.memorips.com" }],
        destination: "https://memorips.com/:path*",
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
