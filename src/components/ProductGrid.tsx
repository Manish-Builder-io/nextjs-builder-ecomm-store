"use client";
import React from "react";
import { Product } from "@/types/product";
import ProductCard from "@/components/ProductCard";

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-gray-900">No products found</p>
        <p className="mt-1 text-sm text-gray-500">Check back soon for new arrivals.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={`${p.id}-${i}`} product={p} />
      ))}
    </div>
  );
}

export default ProductGrid;
