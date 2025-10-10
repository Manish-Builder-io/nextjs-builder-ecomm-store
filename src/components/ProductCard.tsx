"use client";
import React from "react";
import Image from "next/image";
import { Product } from "@/types/product";
import Price from "@/components/ui/Price";
import RatingStars from "@/components/ui/RatingStars";
import Badge from "@/components/ui/Badge";
import AddToCartButton from "@/components/ui/AddToCartButton";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div className="group relative rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black overflow-hidden">
      <div className="relative aspect-[4/3] bg-gray-50 dark:bg-gray-900">
        {product.imageSrc ? (
          <Image
            src={product.imageSrc}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800" />
        )}
        {product.badge && (
          <div className="absolute left-2 top-2">
            <Badge variant={product.badge === "sale" ? "danger" : product.badge === "new" ? "success" : "info"}>
              {product.badge.toUpperCase()}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4 text-gray-900 dark:text-gray-100">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-medium line-clamp-2 text-gray-900 dark:text-gray-100">{product.title}</h3>
        </div>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{product.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <Price amount={product.price} compareAt={product.compareAtPrice} currency={product.currency} />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <RatingStars rating={product.rating} />
          <span className="text-xs text-gray-500 dark:text-gray-400">({product.ratingCount})</span>
        </div>
        <div className="mt-4">
          <AddToCartButton onAdd={() => onAddToCart?.(product)} className="w-full" />
        </div>
      </div>
    </div>
  );
}

export default ProductCard;



