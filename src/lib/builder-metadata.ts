import type { Metadata } from "next";
import { LOCALE_META, URL_LOCALES, localizePath, intlLocale } from "@/i18n/config";

type Loose = Record<string, unknown> | undefined | null;

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

/**
 * Next.js Metadata from a Builder entry: title/description from entry data, robots + OG image from
 * a referenced `meta-data` entry (seo-pages), and hreflang alternates for every URL locale.
 */
export function metadataFromBuilder(content: Loose, path: string, locale?: string): Metadata {
  const data = (content?.data ?? {}) as Record<string, unknown>;
  const meta = ((data.metaData as { value?: { data?: Record<string, unknown> } } | undefined)?.value?.data ??
    {}) as Record<string, unknown>;

  const title = str(meta.title) ?? str(data.title) ?? str(content?.name);
  const description = str(meta.description) ?? str(data.description);
  const ogImage = str(meta.openGraphImage);

  const languages: Record<string, string> = {};
  for (const l of URL_LOCALES) languages[LOCALE_META[l].tag] = localizePath(path, l);

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
    alternates: { canonical: localizePath(path, locale), languages },
    openGraph: {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      locale: intlLocale(locale).replace("-", "_"),
      ...(ogImage ? { images: [{ url: ogImage, alt: str(meta.openGraphImageAlt) }] } : {}),
    },
    robots: {
      index: !(meta.addNoIndex === true),
      follow: !(meta.addNoFollow === true),
    },
  };
}
