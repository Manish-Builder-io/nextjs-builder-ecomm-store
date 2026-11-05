"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useLocale, useLocalizedHref } from "@/i18n/useLocale";
import { formatPrice } from "@/utils/format";
import ShippingProgress from "./ShippingProgress";

export interface CartPageProps {
  heading?: string;
  emptyMessage?: string;
  continueHref?: string;
  checkoutHref?: string;
  freeShippingThreshold?: number;
}

export default function CartPage({
  heading = "Your cart",
  emptyMessage = "Your cart is empty.",
  continueHref = "/collections/all",
  checkoutHref = "/checkout",
  freeShippingThreshold = 50,
}: CartPageProps) {
  const { items, subtotal, updateQty, removeItem } = useCart();
  const locale = useLocale();
  const localize = useLocalizedHref();
  const currency = items[0]?.product.currency ?? "USD";

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-ink">{heading}</h1>
        <p className="mt-3 text-muted">{emptyMessage}</p>
        <Link href={localize(continueHref)} className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-contrast hover:bg-brand-hover">
          Continue shopping
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_22rem] lg:px-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">{heading}</h1>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {items.map(({ product, quantity }) => (
            <li key={product.id} className="flex gap-4 py-5">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-control bg-surface-alt">
                {product.imageSrc && <Image src={product.imageSrc} alt={product.title} fill sizes="96px" className="object-cover" />}
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex justify-between gap-4">
                  <Link href={localize(`/products/${product.id}`)} className="font-medium text-ink hover:underline">{product.title}</Link>
                  <span className="font-medium text-ink">{formatPrice(product.price * quantity, product.currency, locale)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-line text-sm">
                    <button type="button" aria-label={`Decrease quantity of ${product.title}`} className="h-8 w-8" onClick={() => updateQty(product.id, quantity - 1)}>−</button>
                    <span className="w-6 text-center">{quantity}</span>
                    <button type="button" aria-label={`Increase quantity of ${product.title}`} className="h-8 w-8" onClick={() => updateQty(product.id, quantity + 1)}>+</button>
                  </div>
                  <button type="button" onClick={() => removeItem(product.id)} className="text-sm text-muted hover:text-danger">Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="h-fit space-y-4 rounded-card border border-line p-6">
        <ShippingProgress threshold={freeShippingThreshold} currency={currency} />
        <div className="flex justify-between text-ink">
          <span>Subtotal</span>
          <span className="font-semibold">{formatPrice(subtotal, currency, locale)}</span>
        </div>
        <p className="text-xs text-muted">Shipping and taxes are calculated at checkout.</p>
        <Link href={localize(checkoutHref)} className="block rounded-full bg-brand py-3 text-center text-sm font-semibold text-brand-contrast hover:bg-brand-hover">
          Checkout
        </Link>
      </aside>
    </section>
  );
}
