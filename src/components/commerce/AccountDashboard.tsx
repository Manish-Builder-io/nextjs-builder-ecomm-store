"use client";
import React from "react";
import Link from "next/link";
import { useCustomer } from "@/context/CustomerContext";
import { useLocale, useLocalizedHref } from "@/i18n/useLocale";
import { formatPrice } from "@/utils/format";
import LoginForm from "./LoginForm";

export default function AccountDashboard({ heading = "My account" }: { heading?: string }) {
  const { ready, customer, signOut, orders, wishlist } = useCustomer();
  const locale = useLocale();
  const localize = useLocalizedHref();

  if (!ready) return null;
  if (!customer) return <LoginForm />;

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">{heading}</h1>
          <p className="mt-1 text-muted">Signed in as {customer.name} ({customer.email})</p>
        </div>
        <button type="button" onClick={signOut} className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink hover:bg-surface-alt">Sign out</button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href={localize("/wishlist")} className="rounded-card border border-line p-5 hover:bg-surface-alt">
          <p className="text-sm text-muted">Wishlist</p>
          <p className="text-2xl font-semibold text-ink">{wishlist.length} saved</p>
        </Link>
        <div className="rounded-card border border-line p-5">
          <p className="text-sm text-muted">Orders</p>
          <p className="text-2xl font-semibold text-ink">{orders.length}</p>
        </div>
      </div>

      <h2 className="mt-10 text-xl font-semibold text-ink">Order history</h2>
      {orders.length === 0 ? (
        <p className="mt-3 text-muted">You haven&apos;t placed any orders yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap justify-between gap-2 py-4 text-ink">
              <div>
                <p className="font-medium">{o.id}</p>
                <p className="text-sm text-muted">{new Date(o.placedAt).toLocaleDateString(locale === "Default" ? "en-US" : locale)} · {o.lines.reduce((n, l) => n + l.quantity, 0)} items</p>
              </div>
              <p className="font-semibold">{formatPrice(o.total, o.currency, locale)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
