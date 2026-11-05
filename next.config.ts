import BuilderDevTools from "@builder.io/dev-tools/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = BuilderDevTools()({
  // Enable standalone output for Docker
  output: 'standalone',
  poweredByHeader: false,
  images: {
    // `domains` is deprecated; remotePatterns is the supported, stricter form
    remotePatterns: [
      { protocol: "https", hostname: "cdn.builder.io" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Builder's visual editor loads the site in an iframe, so framing is allowed for Builder only
          // (X-Frame-Options would block the editor).
          { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://builder.io https://*.builder.io" },
        ],
      },
    ];
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
  trailingSlash: true,
});

export default nextConfig;
