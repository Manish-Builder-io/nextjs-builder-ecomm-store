"use client";

import Link from "next/link";

export interface PromoBarProps {
  message?: string;
  linkText?: string;
  linkHref?: string;
}

export default function PromoBar({
  message = "✨ Free shipping on orders over $50 · New Arrivals Just Dropped",
  linkText = "Shop Now →",
  linkHref = "/collections/all",
}: PromoBarProps) {
  return (
    <div className="bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white">
      {message}{" "}
      <Link
        href={linkHref}
        className="ml-1 underline underline-offset-2 font-semibold hover:text-blue-100 transition-colors"
      >
        {linkText}
      </Link>
    </div>
  );
}
