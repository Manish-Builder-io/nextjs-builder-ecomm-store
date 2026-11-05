"use client";
import React from "react";
import type { Product } from "@/types/product";
import { useCustomer } from "@/context/CustomerContext";

export default function WishlistButton({ product, className = "" }: { product: Product; className?: string }) {
  const { isWishlisted, toggleWishlist } = useCustomer();
  const active = isWishlisted(product.id);
  return (
    <button
      type="button"
      onClick={() => toggleWishlist(product)}
      aria-pressed={active}
      aria-label={active ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm transition hover:bg-surface ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={active ? "var(--ds-color-danger)" : "none"} stroke={active ? "var(--ds-color-danger)" : "currentColor"} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.3 6.3a4.5 4.5 0 0 1 6.4 0L12 7.6l1.3-1.3a4.5 4.5 0 1 1 6.4 6.4L12 20.4l-7.7-7.7a4.5 4.5 0 0 1 0-6.4z" />
      </svg>
    </button>
  );
}
