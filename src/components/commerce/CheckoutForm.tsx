"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useCustomer } from "@/context/CustomerContext";
import { useLocale, useLocalizedHref } from "@/i18n/useLocale";
import { formatPrice } from "@/utils/format";

export interface CheckoutFormProps {
  heading?: string;
  flatShipping?: number;
  freeShippingThreshold?: number;
  /** Tax as a percentage, e.g. 8.5 */
  taxRatePercent?: number;
  confirmationHref?: string;
  placeOrderLabel?: string;
}

const COUNTRIES = [
  ["US", "United States"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["FR", "France"],
  ["ES", "Spain"],
  ["IN", "India"],
] as const;

const field =
  "w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export default function CheckoutForm({
  heading = "Checkout",
  flatShipping = 5,
  freeShippingThreshold = 50,
  taxRatePercent = 0,
  confirmationHref = "/checkout/confirmation",
  placeOrderLabel = "Place order",
}: CheckoutFormProps) {
  const { items, subtotal, clearCart } = useCart();
  const { customer, placeOrder } = useCustomer();
  const router = useRouter();
  const locale = useLocale();
  const localize = useLocalizedHref();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const currency = items[0]?.product.currency ?? "USD";
  const shipping = subtotal === 0 || subtotal >= freeShippingThreshold ? 0 : flatShipping;
  const tax = +(subtotal * (taxRatePercent / 100)).toFixed(2);
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-ink">{heading}</h1>
        <p className="mt-3 text-muted">Your cart is empty.</p>
        <Link href={localize("/collections/all")} className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-contrast hover:bg-brand-hover">
          Continue shopping
        </Link>
      </section>
    );
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const next: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(get("email"))) next.email = "Enter a valid email address.";
    for (const [k, label] of [["name", "full name"], ["line1", "address"], ["city", "city"], ["postal", "postal code"]] as const) {
      if (!get(k)) next[k] = `Enter your ${label}.`;
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    // Payment is intentionally not handled here: wire your payment provider in before going live.
    placeOrder({
      lines: items.map(({ product, quantity }) => ({ product, quantity })),
      subtotal,
      shipping,
      tax,
      total,
      currency,
      email: get("email"),
      shippingAddress: { name: get("name"), line1: get("line1"), city: get("city"), postal: get("postal"), country: get("country") },
    });
    clearCart();
    router.push(localize(confirmationHref));
  };

  const err = (k: string) => errors[k] && <p role="alert" className="mt-1 text-xs text-danger">{errors[k]}</p>;

  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_22rem] lg:px-8">
      <form onSubmit={onSubmit} noValidate className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{heading}</h1>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-lg font-semibold text-ink">Contact</legend>
          <div>
            <label htmlFor="email" className="sr-only">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="Email" defaultValue={customer?.email} className={field} aria-invalid={!!errors.email} />
            {err("email")}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-lg font-semibold text-ink">Shipping address</legend>
          <div>
            <input name="name" aria-label="Full name" autoComplete="name" placeholder="Full name" defaultValue={customer?.name} className={field} aria-invalid={!!errors.name} />
            {err("name")}
          </div>
          <div>
            <input name="line1" aria-label="Address" autoComplete="address-line1" placeholder="Address" className={field} aria-invalid={!!errors.line1} />
            {err("line1")}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <input name="city" aria-label="City" autoComplete="address-level2" placeholder="City" className={field} aria-invalid={!!errors.city} />
              {err("city")}
            </div>
            <div>
              <input name="postal" aria-label="Postal code" autoComplete="postal-code" placeholder="Postal code" className={field} aria-invalid={!!errors.postal} />
              {err("postal")}
            </div>
            <select name="country" aria-label="Country" autoComplete="country" className={field} defaultValue="US">
              {COUNTRIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </div>
        </fieldset>

        <p className="rounded-control bg-surface-alt p-4 text-sm text-muted">
          Payment details are collected by your payment provider. Connect one before launch — this form currently records the order only.
        </p>

        <button type="submit" disabled={submitting} className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-brand-contrast hover:bg-brand-hover disabled:opacity-60">
          {placeOrderLabel} · {formatPrice(total, currency, locale)}
        </button>
      </form>

      <aside className="h-fit space-y-3 rounded-card border border-line p-6 text-sm">
        <h2 className="text-lg font-semibold text-ink">Order summary</h2>
        <ul className="space-y-2">
          {items.map(({ product, quantity }) => (
            <li key={product.id} className="flex justify-between gap-3 text-ink">
              <span>{product.title} × {quantity}</span>
              <span>{formatPrice(product.price * quantity, product.currency, locale)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-line pt-3 text-muted">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(subtotal, currency, locale)}</dd></div>
          <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping === 0 ? "Free" : formatPrice(shipping, currency, locale)}</dd></div>
          {taxRatePercent > 0 && <div className="flex justify-between"><dt>Tax</dt><dd>{formatPrice(tax, currency, locale)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-ink"><dt>Total</dt><dd>{formatPrice(total, currency, locale)}</dd></div>
        </dl>
      </aside>
    </section>
  );
}
