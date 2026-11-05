"use client";
import React, { useState } from "react";
import Image from "next/image";
import type { Product } from "@/types/product";
import { productFromReference } from "@/lib/products";
import { useCart } from "@/context/CartContext";
import { useLocale } from "@/i18n/useLocale";
import { formatPrice, calculateDiscountPercentage } from "@/utils/format";
import RatingStars from "@/components/ui/RatingStars";
import Badge from "@/components/ui/Badge";
import WishlistButton from "./WishlistButton";

export interface ProductDetailProps {
  /** Product when rendered by a route */
  product?: Product | null;
  /** Builder `products` reference when placed in the visual editor */
  productRef?: unknown;
  addToCartLabel?: string;
  outOfStockLabel?: string;
  shippingNote?: string;
  showWishlist?: boolean;
}

export default function ProductDetail({
  product: productProp,
  productRef,
  addToCartLabel = "Add to cart",
  outOfStockLabel = "Out of stock",
  shippingNote = "Free shipping on orders over $50 · Free 30-day returns",
  showWishlist = true,
}: ProductDetailProps) {
  const locale = useLocale();
  const product = productProp ?? productFromReference(productRef, locale);
  const { addItem, openCart } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) {
    return <div className="mx-auto max-w-5xl p-8 text-center text-muted">Select a product to preview this section.</div>;
  }

  const gallery = product.images?.length ? product.images : product.imageSrc ? [product.imageSrc] : [];
  const inStock = product.inStock !== false;
  const discount = calculateDiscountPercentage(product.price, product.compareAtPrice);

  const add = () => {
    for (let i = 0; i < qty; i++) addItem(product);
    openCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-8">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-card bg-surface-alt">
          {gallery[0] ? (
            <Image src={gallery[0]} alt={product.title} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
          ) : null}
          {showWishlist && <WishlistButton product={product} className="absolute right-3 top-3" />}
        </div>
        {gallery.length > 1 && (
          <ul className="mt-3 grid grid-cols-5 gap-2">
            {gallery.slice(1, 6).map((src) => (
              <li key={src} className="relative aspect-square overflow-hidden rounded-control bg-surface-alt">
                <Image src={src} alt="" fill sizes="10vw" className="object-cover" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          {product.badge && <Badge variant={product.badge === "sale" ? "danger" : product.badge === "new" ? "success" : "info"}>{product.badge.toUpperCase()}</Badge>}
          {discount && <span className="text-sm font-medium text-danger">-{discount}%</span>}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">{product.title}</h1>
        <div className="flex items-center gap-2 text-sm text-muted">
          <RatingStars rating={product.rating} />
          <span>({product.ratingCount})</span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-semibold text-ink">{formatPrice(product.price, product.currency, locale)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-lg text-muted line-through">{formatPrice(product.compareAtPrice, product.currency, locale)}</span>
          )}
        </div>
        <p className="leading-relaxed text-muted">{product.description}</p>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-line">
            <button type="button" aria-label="Decrease quantity" className="h-10 w-10 text-lg" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span aria-live="polite" className="w-8 text-center text-sm font-medium">{qty}</span>
            <button type="button" aria-label="Increase quantity" className="h-10 w-10 text-lg" onClick={() => setQty((q) => Math.min(20, q + 1))}>+</button>
          </div>
          <button
            type="button"
            disabled={!inStock}
            onClick={add}
            className="h-12 flex-1 rounded-full bg-brand px-6 text-sm font-semibold text-brand-contrast transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          >
            {!inStock ? outOfStockLabel : added ? "✓ Added to cart" : addToCartLabel}
          </button>
        </div>
        {shippingNote && <p className="text-sm text-muted">{shippingNote}</p>}
        {product.tags && product.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {product.tags.map((t) => (
              <li key={t} className="rounded-full bg-surface-alt px-3 py-1 text-xs text-muted">{t}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
