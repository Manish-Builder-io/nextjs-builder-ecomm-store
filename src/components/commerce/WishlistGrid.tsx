"use client";
import React from "react";
import Link from "next/link";
import { useCustomer } from "@/context/CustomerContext";
import { useLocalizedHref } from "@/i18n/useLocale";
import ProductGrid from "@/components/ProductGrid";

export default function WishlistGrid({ heading = "Your wishlist", emptyMessage = "Nothing saved yet. Tap the heart on any product to save it." }: { heading?: string; emptyMessage?: string }) {
  const { wishlist, ready } = useCustomer();
  const localize = useLocalizedHref();
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-ink">{heading}</h1>
      {!ready ? null : wishlist.length ? (
        <ProductGrid products={wishlist} />
      ) : (
        <div className="py-16 text-center">
          <p className="text-muted">{emptyMessage}</p>
          <Link href={localize("/collections/all")} className="mt-4 inline-block text-brand hover:underline">Browse products</Link>
        </div>
      )}
    </section>
  );
}
