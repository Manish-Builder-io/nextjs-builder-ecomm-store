import type { ReactNode } from "react";
import { RenderBuilderContent } from "@/components/builder";
import { getBuilderPage } from "@/lib/builder-page";
import { getRequestLocale } from "@/lib/targeting";

/**
 * Renders the Builder "page" entry targeted at `urlPath` if one is published, otherwise the built-in
 * React implementation. This makes every ecommerce route overridable from the visual editor.
 */
export default async function BuilderOrFallback({ urlPath, children }: { urlPath: string; children: ReactNode }) {
  const locale = await getRequestLocale();
  const content = await getBuilderPage(urlPath, "page", { locale });
  if (content) return <RenderBuilderContent content={content} model="page" locale={locale} />;
  return <>{children}</>;
}
