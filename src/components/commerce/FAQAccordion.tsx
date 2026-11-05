"use client";
import React from "react";

export interface FAQItem { question: string; answer: string }

export default function FAQAccordion({ heading = "Frequently asked questions", items = [] }: { heading?: string; items?: FAQItem[] }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {heading && <h2 className="mb-6 text-2xl font-semibold tracking-tight text-ink">{heading}</h2>}
      <div className="divide-y divide-line border-y border-line">
        {items.map((item, i) => (
          <details key={`${item.question}-${i}`} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">
              {item.question}
              <span aria-hidden="true" className="text-muted transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 leading-relaxed text-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
