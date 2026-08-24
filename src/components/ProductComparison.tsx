"use client";

import React from "react";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { formatPrice, resolveLocalized } from "@/utils/format";
import type { Product } from "@/types/product";

/* ── Types ──────────────────────────────────────────────────────────────── */

export type ButtonType = "addToCart" | "link";

export type IconSource = "circuit" | "check" | "star" | "bolt" | "none";

/** A Builder value that may still be wrapped in `@builder.io/core:LocalizedValue`. */
type Localized<T> = T | Record<string, unknown>;

/** A Builder reference that may be un-enriched, or enriched into a content entry. */
type BuilderReference = {
  "@type"?: string;
  id?: string;
  model?: string;
  value?: { id?: string; data?: Record<string, unknown> };
  data?: Record<string, unknown>;
};

export interface ComparisonFeature {
  iconSource?: IconSource;
  content?: Localized<string>;
}

export interface ComparisonItem {
  title?: Localized<string>;
  usp?: Localized<string>;
  billingCycleLabel?: Localized<string>;

  ctaButtonType?: ButtonType;
  ctaButtonText?: Localized<string>;
  ctaButtonUrl?: Localized<string>;

  secondaryButtonType?: ButtonType;
  secondaryButtonText?: Localized<string>;
  secondaryButtonUrl?: Localized<string>;
  secondaryButtonForceNewTab?: boolean;
  secondaryButtonTrackingId?: string;

  showCardSchemes?: boolean;
  features?: ComparisonFeature[];
  product?: BuilderReference | Record<string, unknown>;
}

export interface ProductComparisonProps {
  /** Stack cards vertically instead of side by side. */
  verticalLayout?: boolean;
  /** Localized list of comparison cards. */
  items?: Localized<ComparisonItem[]>;
  /** Locale used to resolve localized values; falls back to Builder state. */
  locale?: string;
  builderState?: { context?: { locale?: string }; state?: { locale?: string } };
  attributes?: Record<string, unknown>;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

const CARD_SCHEMES = ["Visa", "Mastercard", "Amex", "Maestro"];

function FeatureIcon({ source }: { source?: IconSource }) {
  if (source === "none") return null;

  const path =
    source === "star"
      ? "M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.6 1-5.8L1.5 7.7l5.9-.9L10 1.5z"
      : source === "bolt"
        ? "M11 1L3 11h5l-1 8 8-10h-5l1-8z"
        : // "circuit" and "check" both read as a confirmation tick
          "M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
      fill="currentColor"
    >
      <path d={path} />
    </svg>
  );
}

/** Pull the underlying content entry out of a Builder reference, enriched or not. */
function resolveProduct(ref: unknown): Partial<Product> | undefined {
  if (!ref || typeof ref !== "object") return undefined;

  const reference = ref as BuilderReference;
  const data = reference.data ?? reference.value?.data;
  if (!data) return undefined;

  const price = Number(data.price);
  const compareAtPrice = Number(data.compareAtPrice);

  return {
    id: String(reference.value?.id ?? reference.id ?? data.id ?? ""),
    title: typeof data.title === "string" ? data.title : undefined,
    description: typeof data.description === "string" ? data.description : undefined,
    price: Number.isFinite(price) ? price : undefined,
    compareAtPrice: Number.isFinite(compareAtPrice) ? compareAtPrice : undefined,
    currency: typeof data.currency === "string" ? data.currency : "USD",
    imageSrc:
      typeof data.imageSrc === "string"
        ? data.imageSrc
        : typeof data.image === "string"
          ? data.image
          : undefined,
  } as Partial<Product>;
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function ProductComparison({
  verticalLayout = false,
  items,
  locale,
  builderState,
  attributes,
}: ProductComparisonProps) {
  const { addItem, openCart } = useCart();

  const activeLocale =
    locale ?? builderState?.context?.locale ?? builderState?.state?.locale ?? "Default";

  const text = React.useCallback(
    (value: unknown) => resolveLocalized<string>(value, activeLocale) ?? "",
    [activeLocale]
  );

  const cards = React.useMemo(
    () => resolveLocalized<ComparisonItem[]>(items, activeLocale) ?? [],
    [items, activeLocale]
  );

  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Add comparison items to get started.
      </div>
    );
  }

  const handleAddToCart = (item: ComparisonItem, product?: Partial<Product>) => {
    addItem({
      id: product?.id || text(item.title) || "product-comparison-item",
      title: product?.title || text(item.title) || "Product",
      description: product?.description ?? text(item.usp) ?? "",
      price: product?.price ?? 0,
      compareAtPrice: product?.compareAtPrice,
      currency: product?.currency ?? "USD",
      rating: 0,
      ratingCount: 0,
      imageSrc: product?.imageSrc,
    });
    openCart();
  };

  return (
    <section
      {...attributes}
      className={`w-full ${(attributes?.className as string) ?? ""}`}
      data-vertical-layout={verticalLayout ? "true" : "false"}
    >
      <div
        className={
          verticalLayout
            ? "flex flex-col gap-6"
            : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        }
      >
        {cards.map((item, index) => {
          const product = resolveProduct(item.product);
          const title = text(item.title);
          const usp = text(item.usp);
          const billingCycleLabel = text(item.billingCycleLabel);
          const ctaText = text(item.ctaButtonText);
          const ctaUrl = text(item.ctaButtonUrl);
          const secondaryText = text(item.secondaryButtonText);
          const secondaryUrl = text(item.secondaryButtonUrl);

          return (
            <article
              key={`${title || "item"}-${index}`}
              className={`flex rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-950 ${
                verticalLayout ? "flex-col gap-6 sm:flex-row sm:items-start" : "flex-col"
              }`}
            >
              {product?.imageSrc && (
                <div
                  className={`relative overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-900 ${
                    verticalLayout ? "h-40 w-full sm:w-48 shrink-0" : "mb-4 h-40 w-full"
                  }`}
                >
                  <Image
                    src={product.imageSrc}
                    alt={product.title ?? title}
                    fill
                    sizes="(max-width: 640px) 100vw, 320px"
                    className="object-contain p-2"
                  />
                </div>
              )}

              <div className="flex flex-1 flex-col">
                {usp && (
                  <span className="mb-2 self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {usp}
                  </span>
                )}

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </h3>

                {typeof product?.price === "number" && (
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatPrice(product.price, product.currency ?? "USD")}
                    </span>
                    {billingCycleLabel && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {billingCycleLabel}
                      </span>
                    )}
                  </div>
                )}

                {item.features && item.features.length > 0 && (
                  <ul className="mt-4 flex flex-1 flex-col gap-3">
                    {item.features.map((feature, featureIndex) => {
                      const content = text(feature.content);
                      if (!content) return null;
                      return (
                        <li
                          key={`${content.slice(0, 24)}-${featureIndex}`}
                          className="flex gap-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                          <FeatureIcon source={feature.iconSource} />
                          <span>{content}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {item.showCardSchemes && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {CARD_SCHEMES.map((scheme) => (
                      <span
                        key={scheme}
                        className="rounded border border-gray-200 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400"
                      >
                        {scheme}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-2">
                  {ctaText &&
                    (item.ctaButtonType === "addToCart" ? (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item, product)}
                        className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-black/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 dark:bg-white dark:text-black dark:hover:bg-white/90"
                      >
                        {ctaText}
                      </button>
                    ) : (
                      <a
                        href={ctaUrl || "#"}
                        className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-black/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 dark:bg-white dark:text-black dark:hover:bg-white/90"
                      >
                        {ctaText}
                      </a>
                    ))}

                  {secondaryText &&
                    (item.secondaryButtonType === "addToCart" ? (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item, product)}
                        data-tracking-id={item.secondaryButtonTrackingId}
                        className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-900"
                      >
                        {secondaryText}
                      </button>
                    ) : (
                      <a
                        href={secondaryUrl || "#"}
                        data-tracking-id={item.secondaryButtonTrackingId}
                        target={item.secondaryButtonForceNewTab ? "_blank" : undefined}
                        rel={
                          item.secondaryButtonForceNewTab ? "noopener noreferrer" : undefined
                        }
                        className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-900"
                      >
                        {secondaryText}
                      </a>
                    ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default ProductComparison;
