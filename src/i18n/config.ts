export const SUPPORTED_LOCALES = ["Default","en-US", "ca-ES", "fr-FR"] as const;
export type AppLocale = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: AppLocale = "Default";

export function isSupportedLocale(input: string | undefined | null): input is AppLocale {
  return SUPPORTED_LOCALES.includes((input ?? "") as AppLocale);
}


