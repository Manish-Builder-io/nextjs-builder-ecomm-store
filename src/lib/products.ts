import { builder } from "@builder.io/sdk";
import type { BuilderContent } from "@builder.io/sdk";
import type { Product } from "@/types/product";
import { resolveLocalized } from "@/utils/format";

const FALLBACKS = ["en-US", "Default"];

const num = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
};

/** Normalize a Builder `products` entry (or a reference's `value`) into the storefront Product shape. */
export function normalizeProduct(
  doc: { id?: string; data?: Record<string, unknown> } | null | undefined,
  locale = "Default"
): Product | null {
  const d = doc?.data;
  if (!doc?.id || !d) return null;
  const l = <T,>(v: unknown) => resolveLocalized<T>(v, locale, FALLBACKS);

  const badgeRaw = typeof d.badge === "string" ? d.badge.toLowerCase() : undefined;
  const badge: Product["badge"] =
    badgeRaw === "sale" || badgeRaw === "new" || badgeRaw === "featured" ? badgeRaw : undefined;
  const imageSrc = typeof d.imageSrc === "string" ? d.imageSrc : undefined;

  return {
    id: String(doc.id),
    title: l<string>(d.title) ?? "Untitled",
    description: l<string>(d.description) ?? "",
    price: num(l(d.price)) ?? 0,
    compareAtPrice: num(l(d.compareAtPrice)),
    currency: l<string>(d.currency) ?? "USD",
    rating: num(d.rating) ?? 0,
    ratingCount: num(d.ratingCount) ?? 0,
    imageSrc,
    images: imageSrc ? [imageSrc] : undefined,
    badge,
    tags: Array.isArray(d.tags) ? d.tags.filter((t): t is string => typeof t === "string") : undefined,
    inStock: typeof d.inStock === "boolean" ? d.inStock : true,
  };
}

/** Normalize a Builder `reference` input value ({ id, model, value }) pointing at a `products` entry. */
export function productFromReference(ref: unknown, locale = "Default"): Product | null {
  const r = ref as { id?: string; value?: { id?: string; data?: Record<string, unknown> } } | undefined;
  const value = r?.value;
  return normalizeProduct(value ? { id: value.id ?? r?.id, data: value.data } : null, locale);
}

export async function getProducts(locale = "Default"): Promise<Product[]> {
  try {
    const docs = await builder.getAll("products", {
      fields: "id,data",
      prerender: false,
      locale,
      options: { noTargeting: true },
    });
    return (docs ?? []).map((doc: BuilderContent) => normalizeProduct(doc, locale)).filter((p): p is Product => !!p);
  } catch (error) {
    console.error("Failed to load products from Builder:", error);
    return [];
  }
}

export async function getProduct(id: string, locale = "Default"): Promise<Product | null> {
  try {
    const doc = await builder
      .get("products", { query: { id }, locale, fields: "id,data", options: { noTargeting: true } })
      .toPromise();
    return normalizeProduct(doc, locale);
  } catch (error) {
    console.error(`Failed to load product ${id} from Builder:`, error);
    return null;
  }
}

export const isOnSale = (p: Product) =>
  p.badge === "sale" ||
  !!p.tags?.some((t) => t.toLowerCase() === "sale") ||
  (p.compareAtPrice !== undefined && p.compareAtPrice > p.price);
