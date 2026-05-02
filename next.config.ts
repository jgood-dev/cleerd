import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack(config) {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: /apps\//,
    }
    return config
  },
};

export default nextConfig;
