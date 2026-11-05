"use client";
import React from "react";
import Link from "next/link";
import type { Product } from "@/types/product";
import { productFromReference } from "@/lib/products";
import { useLocale, useLocalizedHref } from "@/i18n/useLocale";
import ProductCard from "@/components/ProductCard";

export interface ProductRailProps {
  heading?: string;
  viewAllText?: string;
  viewAllHref?: string;
  /** Builder list of `{ product: reference }` */
  items?: { product?: unknown }[];
  /** Direct products when rendered by a route */
  products?: Product[];
}

export default function ProductRail({
  heading = "You may also like",
  viewAllText,
  viewAllHref = "/collections/all",
  items,
  products,
}: ProductRailProps) {
  const locale = useLocale();
  const localize = useLocalizedHref();
  const list =
    products ?? (items ?? []).map((i) => productFromReference(i.product, locale)).filter((p): p is Product => !!p);
  if (!list.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">{heading}</h2>
        {viewAllText && (
          <Link href={localize(viewAllHref)} className="text-sm font-medium text-brand hover:underline">
            {viewAllText}
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
