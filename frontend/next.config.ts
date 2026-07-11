import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker: produces a self-contained .next/standalone build
  output: "standalone",
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
