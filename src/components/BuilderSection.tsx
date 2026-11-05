import type { ReactNode } from "react";
import { RenderBuilderContent } from "./builder";
import { getBuilderPage } from "@/lib/builder-page";
import { getRequestLocale, getRequestPath } from "@/lib/targeting";

interface BuilderSectionProps {
  /** Builder section model name, e.g. "header", "footer", "promobar". */
  model: string;
  /** Rendered when Builder has no matching published entry (or the fetch fails). */
  fallback?: ReactNode;
}

/**
 * Fetches a Builder "section" model entry targeted to the current request (urlPath, locale,
 * country, device) and renders it. Falls back to the hardcoded React component when nothing
 * is published, so the site never ships without a header/footer.
 */
export default async function BuilderSection({ model, fallback = null }: BuilderSectionProps) {
  const [locale, urlPath] = await Promise.all([getRequestLocale(), getRequestPath()]);
  const content = await getBuilderPage(urlPath, model, { locale });
  if (content) return <RenderBuilderContent content={content} model={model} locale={locale} />;
  return <>{fallback}</>;
}
