import BuilderDevTools from "@builder.io/dev-tools/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = BuilderDevTools()({
  // Enable standalone output for Docker
  output: 'standalone',
  images: {
    domains: ["cdn.builder.io"],
  },
  i18n: {
    locales: ["en-US", "ca-ES", "fr-FR"],
    defaultLocale: "en-US",
    localeDetection: false,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Suppress the isolated-vm warning in Docker/Node environments
      config.externals = [...(config.externals || []), 'isolated-vm'];
      
      // Alternative: ignore the module completely
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        'isolated-vm': false,
      };
    }
    return config;
  },
});

export default nextConfig;
