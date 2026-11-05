export const SUPPORTED_LOCALES = ["Default","en-US", "ca-ES", "fr-FR"] as const;
export type AppLocale = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: AppLocale = "Default";

export function isSupportedLocale(input: string | undefined | null): input is AppLocale {
  return SUPPORTED_LOCALES.includes((input ?? "") as AppLocale);
}



// Locales that appear as the first URL segment, e.g. /fr-FR/about/
export const URL_LOCALES = ["en-US", "ca-ES", "fr-FR"] as const;
export type UrlLocale = (typeof URL_LOCALES)[number];

export function getUrlLocale(pathname: string): UrlLocale | null {
  const seg = pathname.split("/").filter(Boolean)[0];
  return (URL_LOCALES as readonly string[]).includes(seg ?? "") ? (seg as UrlLocale) : null;
}

// Per-locale presentation metadata (currency, <html lang>, hreflang, label).
export interface LocaleMeta {
  label: string;
  /** BCP-47 tag for <html lang>, hreflang and Intl formatting */
  tag: string;
  currency: string;
}

export const LOCALE_META: Record<AppLocale, LocaleMeta> = {
  Default: { label: "English", tag: "en-US", currency: "USD" },
  "en-US": { label: "English (US)", tag: "en-US", currency: "USD" },
  "fr-FR": { label: "Français", tag: "fr-FR", currency: "EUR" },
  "ca-ES": { label: "Català", tag: "ca-ES", currency: "EUR" },
};

/** Intl-safe tag: Builder's "Default" locale is not a valid BCP-47 tag. */
export function intlLocale(locale: string | undefined | null): string {
  return isSupportedLocale(locale) ? LOCALE_META[locale].tag : "en-US";
}

/** Prefix an internal path with the URL locale, e.g. ("/cart", "fr-FR") -> "/fr-FR/cart". */
export function localizePath(path: string, locale: string | null | undefined): string {
  if (!locale || !(URL_LOCALES as readonly string[]).includes(locale)) return path;
  if (!path.startsWith("/") || path.startsWith("//") || getUrlLocale(path)) return path;
  return `/${locale}${path === "/" ? "" : path}`;
}

/** Strip a leading URL locale segment: "/fr-FR/cart" -> "/cart". */
export function stripUrlLocale(pathname: string): string {
  const locale = getUrlLocale(pathname);
  if (!locale) return pathname;
  return pathname.slice(locale.length + 1) || "/";
}
