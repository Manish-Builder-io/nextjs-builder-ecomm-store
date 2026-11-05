import type { Metadata } from "next";
import SearchResults from "@/components/commerce/SearchResults";
import { getProducts } from "@/lib/products";
import { getRequestLocale } from "@/lib/targeting";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim().slice(0, 100) ?? "";
  const locale = await getRequestLocale();

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const products = terms.length
    ? (await getProducts(locale)).filter((p) => {
        const haystack = `${p.title} ${p.description} ${(p.tags ?? []).join(" ")}`.toLowerCase();
        return terms.every((t) => haystack.includes(t));
      })
    : [];

  return <SearchResults query={query} products={products} />;
}
