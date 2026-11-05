"use client";
import React from "react";
import type { Product } from "@/types/product";
import ProductGrid from "@/components/ProductGrid";
import SearchBox from "./SearchBox";

export default function SearchResults({ query, products }: { query: string; products: Product[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto mb-8 max-w-xl"><SearchBox defaultValue={query} /></div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        {query ? `${products.length} result${products.length === 1 ? "" : "s"} for “${query}”` : "Search our catalog"}
      </h1>
      <div className="mt-6">{query ? <ProductGrid products={products} /> : null}</div>
    </section>
  );
}
