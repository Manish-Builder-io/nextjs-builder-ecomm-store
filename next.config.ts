import BuilderDevTools from "@builder.io/dev-tools/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = BuilderDevTools()({
  images: {
    domains: ["cdn.builder.io"],
  },
  i18n: {
    locales: ["en-US", "ca-ES", "fr-FR"],
    defaultLocale: "en-US",
    localeDetection: false,
  },
});

export default nextConfig;
