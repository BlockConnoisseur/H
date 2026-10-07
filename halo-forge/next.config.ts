import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  poweredByHeader: false,
  serverExternalPackages: ["node:sqlite"],
  outputFileTracingIncludes: { "/*": ["./certs/supabase-ca.crt"] },
  async redirects() {
    // Keep local wallet sessions and the server origin check on one hostname.
    if (process.env.HALO_APP_ORIGIN !== "http://localhost:3210") return [];
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "127\\.0\\.0\\.1" }],
        destination: "http://localhost:3210/:path*",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
