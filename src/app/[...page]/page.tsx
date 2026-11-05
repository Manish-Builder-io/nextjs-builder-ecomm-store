import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RenderBuilderContent } from "../../components/builder";
import { resolveBuilderBindings } from "../../lib/resolve-builder-bindings";
import { getBuilderPage } from "@/lib/builder-page";
import { getRequestLocale } from "@/lib/targeting";
import { metadataFromBuilder } from "@/lib/builder-metadata";

interface PageProps {
  params: Promise<{
    page: string[];
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Page models, in priority order. "seo-pages" is the fallback when no "page" entry matches.
const PAGE_MODELS = ["page", "seo-pages"] as const;

async function resolvePage(props: PageProps) {
  const urlPath = "/" + ((await props.params).page?.join("/") || "");
  const locale = await getRequestLocale();
  for (const model of PAGE_MODELS) {
    const content = await getBuilderPage(urlPath, model, { locale });
    if (content) return { content, model, urlPath, locale };
  }
  return { content: null, model: PAGE_MODELS[0], urlPath, locale };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { content, urlPath, locale } = await resolvePage(props);
  return metadataFromBuilder(content, urlPath, locale);
}

export default async function Page(props: PageProps) {
  const { content, model, locale } = await resolvePage(props);

  // Return a real 404 status when nothing matches. Inside the Builder editor/preview the entry may not
  // exist yet (new or unsaved), so the page must still render there.
  if (!content) {
    const query = await props.searchParams;
    const inBuilderEditor = Object.keys(query).some((k) => k.startsWith("builder."));
    if (!inBuilderEditor) notFound();
  }

  const resolvedContent = resolveBuilderBindings(content, {
    title: "Welcome to Our Store",
    description:
      "Discover amazing products and great deals. Shop the latest collection with free shipping on orders over $50.",
    ctaText: "Shop Now",
    featured: true,
    imageSrc:
      "https://cdn.builder.io/api/v1/image/assets%2Fdb60bf3db7fa4db7be81ef05b72bd720%2Fd44403a7f0204687882590d9b9cb2a17",
  });

  // With no content, RenderBuilderContent renders the 404 page (unless previewing in Builder).
  return <RenderBuilderContent content={resolvedContent ?? undefined} model={model} locale={locale} />;
}
