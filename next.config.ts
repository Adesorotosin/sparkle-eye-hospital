import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Allows production builds to successfully complete even if your project has type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignores ESLint checks during production builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;