"use client";

import React, { useState } from "react";

const FAQS = [
  { q: "How long does shipping take?", a: "Standard shipping takes 5–7 business days. Express (2–3 days) and Overnight options are also available." },
  { q: "Is shipping free?", a: "Yes! Standard shipping is free on all orders over $50. Below $50 a flat $5.99 fee applies." },
  { q: "Can I return an item?", a: "Absolutely. We offer free returns within 30 days of delivery on all full-price items." },
  { q: "How do I track my order?", a: "You'll receive a tracking link by email as soon as your order ships, usually within 24 hours of placing your order." },
  { q: "Do you ship internationally?", a: "Yes, we ship to over 50 countries. International shipping starts at $14.99 and takes 10–20 business days." },
  { q: "What payment methods do you accept?", a: "We accept all major credit cards (Visa, Mastercard, Amex), PayPal, Apple Pay, and Google Pay." },
  { q: "Can I change or cancel my order?", a: "Contact us within 1 hour of placing your order and we'll do our best to accommodate changes before it ships." },
  { q: "Are the sizes true to fit?", a: "Most items are true to size. Each product page includes a detailed size guide. When in doubt, size up." },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Got questions?</p>
      <h1 className="mt-2 text-4xl font-extrabold text-gray-900">Frequently Asked Questions</h1>

      <div className="mt-10 divide-y divide-gray-100">
        {FAQS.map(({ q, a }, i) => (
          <div key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between py-5 text-left"
            >
              <span className="text-sm font-semibold text-gray-900">{q}</span>
              <svg
                className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${open === i ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {open === i && (
              <p className="pb-5 text-sm text-gray-500 leading-relaxed">{a}</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
