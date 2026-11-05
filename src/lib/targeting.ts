import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isSupportedLocale, LOCALE_META, type AppLocale } from "@/i18n/config";

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_HEADER = "x-locale";
export const PATHNAME_HEADER = "x-pathname";

export interface TargetingAttributes {
  urlPath: string;
  locale: AppLocale;
  country?: string;
  currency: string;
  device: "mobile" | "tablet" | "desktop";
  [key: string]: string | string[] | boolean | undefined;
}

function deviceFromUserAgent(ua: string): TargetingAttributes["device"] {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

/**
 * Locale for the current request: URL prefix (set by middleware) > cookie > default.
 * Server-only (reads request headers/cookies, so callers render dynamically).
 */
export async function getRequestLocale(): Promise<AppLocale> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  const fromUrl = h.get(LOCALE_HEADER);
  if (isSupportedLocale(fromUrl)) return fromUrl;
  const fromCookie = c.get(LOCALE_COOKIE)?.value;
  return isSupportedLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE;
}

/** Path the visitor requested, without any locale prefix. */
export async function getRequestPath(): Promise<string> {
  return (await headers()).get(PATHNAME_HEADER) ?? "/";
}

/**
 * Builder `userAttributes` for the current request. Drives page/section targeting
 * (urlPath, locale, country, currency, device, plus anything in `extra`).
 */
export async function getTargetingAttributes(
  overrides: Partial<TargetingAttributes> = {}
): Promise<TargetingAttributes> {
  const h = await headers();
  const locale = overrides.locale ?? (await getRequestLocale());
  const country = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? undefined;
  return {
    urlPath: overrides.urlPath ?? (await getRequestPath()),
    locale,
    country,
    currency: LOCALE_META[locale].currency,
    device: deviceFromUserAgent(h.get("user-agent") ?? ""),
    ...overrides,
  };
}
