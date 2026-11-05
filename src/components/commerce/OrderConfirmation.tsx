"use client";
import React from "react";
import Link from "next/link";
import { useCustomer } from "@/context/CustomerContext";
import { useLocale, useLocalizedHref } from "@/i18n/useLocale";
import { formatPrice } from "@/utils/format";

export default function OrderConfirmation({ heading = "Thank you for your order!" }: { heading?: string }) {
  const { lastOrder, ready } = useCustomer();
  const locale = useLocale();
  const localize = useLocalizedHref();

  if (!ready) return null;
  if (!lastOrder) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-ink">No recent order</h1>
        <Link href={localize("/collections/all")} className="mt-6 inline-block text-brand hover:underline">Continue shopping</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-success">Order confirmed</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{heading}</h1>
      <p className="mt-2 text-muted">Order <strong className="text-ink">{lastOrder.id}</strong> · a confirmation was sent to {lastOrder.email}.</p>
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {lastOrder.lines.map(({ product, quantity }) => (
          <li key={product.id} className="flex justify-between py-3 text-ink">
            <span>{product.title} × {quantity}</span>
            <span>{formatPrice(product.price * quantity, lastOrder.currency, locale)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-right text-lg font-semibold text-ink">Total {formatPrice(lastOrder.total, lastOrder.currency, locale)}</p>
      <div className="mt-8 flex gap-4">
        <Link href={localize("/account")} className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-contrast hover:bg-brand-hover">View orders</Link>
        <Link href={localize("/collections/all")} className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink hover:bg-surface-alt">Keep shopping</Link>
      </div>
    </section>
  );
}
