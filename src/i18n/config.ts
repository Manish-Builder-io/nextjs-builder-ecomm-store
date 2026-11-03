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
