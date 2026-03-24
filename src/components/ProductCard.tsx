"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Product } from "@/types/product";
import Price from "@/components/ui/Price";
import RatingStars from "@/components/ui/RatingStars";
import Badge from "@/components/ui/Badge";
import { useCart } from "@/context/CartContext";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, openCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    addItem(product);
    openCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="group relative rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-[4/3] bg-gray-50">
        {product.imageSrc ? (
          <Image
            src={product.imageSrc}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-50" />
        )}
        {product.badge && (
          <div className="absolute left-3 top-3">
            <Badge
              variant={
                product.badge === "sale"
                  ? "danger"
                  : product.badge === "new"
                  ? "success"
                  : "info"
              }
            >
              {product.badge.toUpperCase()}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
          {product.title}
        </h3>
        <p className="mt-1 text-xs text-gray-500 line-clamp-2">{product.description}</p>

        <div className="mt-3 flex items-center justify-between">
          <Price amount={product.price} compareAt={product.compareAtPrice} currency={product.currency} />
          <div className="flex items-center gap-1">
            <RatingStars rating={product.rating} />
            <span className="text-xs text-gray-400">({product.ratingCount})</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          className={`mt-4 w-full rounded-full py-2.5 text-sm font-semibold transition-all duration-200 ${
            added
              ? "bg-green-500 text-white"
              : "bg-gray-900 text-white hover:bg-blue-600 active:scale-[0.98]"
          }`}
        >
          {added ? "✓ Added to cart" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}

export default ProductCard;
