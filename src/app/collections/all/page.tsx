import React from "react";
import ProductGrid from "@/components/ProductGrid";
import type { Product } from "@/types/product";
import { builder } from "@builder.io/sdk";
import type { BuilderContent } from "@builder.io/sdk";
import { cookies } from "next/headers";
import { isSupportedLocale, DEFAULT_LOCALE } from "@/i18n/config";
import { resolveLocalized } from "@/utils/format";

// Builder Public API Key set in .env file
builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

export const metadata = {
  title: "All Products",
  description: "Browse all products in our collection",
};


export default async function AllCollectionsPage() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = isSupportedLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  const docs = await builder.getAll("products", { fields: "id,data", prerender: false, locale });


  const normalized: Product[] = (docs ?? []).map((doc: BuilderContent): Product => {
    const d = doc?.data ?? {};
    const badgeRaw = typeof d.badge === "string" ? d.badge.toLowerCase() : undefined;
    const badge: Product["badge"] | undefined =
      badgeRaw === "sale" || badgeRaw === "new" || badgeRaw === "featured" ? badgeRaw : undefined;

    const priceRaw = resolveLocalized<string | number>(d.price, locale, ["en-US", "Default"]);
    const compareAtRaw = resolveLocalized<string | number>(d.compareAtPrice, locale, ["en-US", "Default"]);
    const priceNum = typeof priceRaw === "number" ? priceRaw : priceRaw ? Number(priceRaw) : 0;
    const compareAtNum =
      typeof compareAtRaw === "number" ? compareAtRaw : compareAtRaw ? Number(compareAtRaw) : undefined;

    return {
      id: String(doc?.id ?? crypto.randomUUID()),
      title: d.title ?? "Untitled",
      description: d.description ?? "",
      price: priceNum,
      compareAtPrice: compareAtNum,
      currency: (resolveLocalized<string>(d.currency, locale, ["en-US", "Default"]) ?? "USD"),
      rating: typeof d.rating === "number" ? d.rating : 0,
      ratingCount: typeof d.ratingCount === "number" ? d.ratingCount : 0,
      imageSrc: typeof d.imageSrc === "string" ? d.imageSrc : undefined,
      badge,
      tags: Array.isArray(d.tags) ? d.tags : undefined,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">All products</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Browse our complete catalog.</p>
      </div>

      <ProductGrid products={normalized} />
    </div>
  );
}


