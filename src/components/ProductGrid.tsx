"use client";
import React from "react";
import { Product } from "@/types/product";
import ProductCard from "@/components/ProductCard";

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  const handleAddToCart = (product: Product) => {
    // Demo handler; replace with real cart logic
    console.log("Add to cart", product);
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
      ))}
    </div>
  );
}

export default ProductGrid;



