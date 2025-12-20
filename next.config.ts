import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force turbopack root to this project to silence multi-lockfile warning
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
