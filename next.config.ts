import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy all /api/* requests to our SQLite test server during development.
  // In production, remove these rewrites — Next.js will use its own /api routes.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3099/api/:path*",
      },
    ];
  },
};

export default nextConfig;
