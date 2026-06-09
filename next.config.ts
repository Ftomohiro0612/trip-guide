import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.trip-guide.net" }],
        destination: "https://trip-guide.net/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
