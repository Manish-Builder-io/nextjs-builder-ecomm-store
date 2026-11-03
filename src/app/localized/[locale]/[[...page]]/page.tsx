import { notFound } from "next/navigation";
import { builder } from "@builder.io/sdk";
import { RenderBuilderContent } from "@/components/builder";
import { resolveBuilderBindings } from "@/lib/resolve-builder-bindings";
import { URL_LOCALES, type UrlLocale } from "@/i18n/config";

builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

interface PageProps {
  params: Promise<{ locale: string; page?: string[] }>;
}

export function generateStaticParams() {
  return URL_LOCALES.map((locale) => ({ locale, page: [] }));
}

// /fr-FR/promo/ -> Builder "page" model, urlPath "/promo", locale fr-FR.
// Pages targeted with `locale is fr-FR` in Builder only resolve under that locale's URL.
export default async function LocalizedPage({ params }: PageProps) {
  const { locale, page } = await params;
  if (!(URL_LOCALES as readonly string[]).includes(locale)) notFound();

  const urlPath = "/" + (page?.join("/") ?? "");
  const builderModelName = "page";

  const content = await builder
    .get(builderModelName, {
      locale,
      userAttributes: { urlPath, locale },
      options: { includeRefs: true, enrich: true },
    })
    .toPromise()
    .catch(() => null);

  if (!content) notFound();

  const resolved = resolveBuilderBindings(content, {});
  return (
    <RenderBuilderContent
      content={resolved}
      model={builderModelName}
      locale={locale as UrlLocale}
    />
  );
}
