"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_LOCALE, getUrlLocale, localizePath, type AppLocale } from "@/i18n/config";

/** Locale as visible in the URL (SSR-safe: identical on server and client). */
export function useLocale(): AppLocale {
  return getUrlLocale(usePathname() ?? "/") ?? DEFAULT_LOCALE;
}

/** Returns a function that keeps internal hrefs inside the visitor's URL locale. */
export function useLocalizedHref(): (href: string) => string {
  const locale = getUrlLocale(usePathname() ?? "/");
  return useCallback((href: string) => localizePath(href, locale), [locale]);
}
