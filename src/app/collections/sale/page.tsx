import React from "react";
import ProductGrid from "@/components/ProductGrid";
import type { Product } from "@/types/product";
import { builder } from "@builder.io/sdk";
import type { BuilderContent } from "@builder.io/sdk";
import { cookies } from "next/headers";
import { isSupportedLocale, DEFAULT_LOCALE } from "@/i18n/config";
import { resolveLocalized } from "@/utils/format";

builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

export const metadata = {
  title: "Sale",
  description: "Shop our biggest deals — up to 50% off.",
};

export default async function SalePage() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = isSupportedLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  const docs = await builder.getAll("products", { fields: "id,data", prerender: false, locale });

  const all: Product[] = (docs ?? []).map((doc: BuilderContent): Product => {
    const d = doc?.data ?? {};
    const badgeRaw = typeof d.badge === "string" ? d.badge.toLowerCase() : undefined;
    const badge: Product["badge"] | undefined =
      badgeRaw === "sale" || badgeRaw === "new" || badgeRaw === "featured" ? badgeRaw : undefined;
    const priceRaw = resolveLocalized<string | number>(d.price, locale, ["en-US", "Default"]);
    const compareAtRaw = resolveLocalized<string | number>(d.compareAtPrice, locale, ["en-US", "Default"]);
    return {
      id: String(doc?.id ?? crypto.randomUUID()),
      title: d.title ?? "Untitled",
      description: d.description ?? "",
      price: typeof priceRaw === "number" ? priceRaw : priceRaw ? Number(priceRaw) : 0,
      compareAtPrice: typeof compareAtRaw === "number" ? compareAtRaw : compareAtRaw ? Number(compareAtRaw) : undefined,
      currency: resolveLocalized<string>(d.currency, locale, ["en-US", "Default"]) ?? "USD",
      rating: typeof d.rating === "number" ? d.rating : 0,
      ratingCount: typeof d.ratingCount === "number" ? d.ratingCount : 0,
      imageSrc: typeof d.imageSrc === "string" ? d.imageSrc : undefined,
      badge,
      tags: Array.isArray(d.tags) ? d.tags : undefined,
    };
  });

  const products = all.filter(
    (p) =>
      p.badge === "sale" ||
      p.tags?.some((t) => t.toLowerCase() === "sale") ||
      (p.compareAtPrice !== undefined && p.compareAtPrice > p.price)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Banner */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-red-500 via-rose-500 to-pink-600 px-8 py-8 text-white">
        <p className="text-sm font-semibold uppercase tracking-widest text-red-100">Limited time</p>
        <h1 className="mt-1 text-4xl font-extrabold">Sale — Up to 50% Off</h1>
        <p className="mt-2 text-red-100">
          {products.length > 0
            ? `${products.length} items on sale. Grab yours before they're gone.`
            : "Sale items coming soon — check back shortly."}
        </p>
      </div>
      <ProductGrid products={products} />
    </div>
  );
}
