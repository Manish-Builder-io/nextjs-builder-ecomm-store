"use client";
import React from "react";
import { useCart } from "@/context/CartContext";
import { useLocale } from "@/i18n/useLocale";
import { formatPrice } from "@/utils/format";

export default function ShippingProgress({ threshold = 50, currency = "USD" }: { threshold?: number; currency?: string }) {
  const { subtotal } = useCart();
  const locale = useLocale();
  const remaining = Math.max(0, threshold - subtotal);
  const pct = Math.min(100, (subtotal / threshold) * 100);
  return (
    <div className="rounded-control bg-surface-alt p-4">
      <p className="text-sm text-ink">
        {remaining === 0
          ? "🎉 You've unlocked free shipping!"
          : `Add ${formatPrice(remaining, currency, locale)} more for free shipping`}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
