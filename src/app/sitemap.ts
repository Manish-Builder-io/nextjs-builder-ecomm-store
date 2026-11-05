import type { MetadataRoute } from "next";
import { builder } from "@builder.io/sdk";
import { LOCALE_META, URL_LOCALES, localizePath } from "@/i18n/config";
import { getProducts } from "@/lib/products";

builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Revalidate hourly; the Builder webhook (/api/revalidate) also refreshes content on publish.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = new Set<string>(["/", "/collections/all", "/collections/new", "/collections/sale"]);

  for (const model of ["page", "seo-pages"]) {
    try {
      const entries = await builder.getAll(model, {
        fields: "data.url,lastUpdated",
        options: { noTargeting: true },
        limit: 200,
      });
      for (const e of entries ?? []) {
        const url = (e.data as { url?: string } | undefined)?.url;
        if (typeof url === "string" && url.startsWith("/")) paths.add(url);
      }
    } catch (error) {
      console.error(`sitemap: failed to list ${model}`, error);
    }
  }

  const products = await getProducts();
  for (const p of products) paths.add(`/products/${p.id}`);

  return [...paths].map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    alternates: {
      languages: Object.fromEntries(URL_LOCALES.map((l) => [LOCALE_META[l].tag, `${SITE_URL}${localizePath(path, l)}`])),
    },
  }));
}
