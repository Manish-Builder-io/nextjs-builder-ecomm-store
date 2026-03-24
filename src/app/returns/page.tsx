import React from "react";
import Link from "next/link";

export const metadata = { title: "Returns & Refunds", description: "Our hassle-free return policy." };

const STEPS = [
  { step: "1", title: "Initiate your return", body: "Email us at returns@store.com within 30 days of delivery with your order number." },
  { step: "2", title: "Pack your items", body: "Place the unworn, unwashed items with tags attached back in their original packaging." },
  { step: "3", title: "Ship it back", body: "Use the prepaid label we email you. Drop off at any carrier location." },
  { step: "4", title: "Get your refund", body: "Refunds are processed within 5–7 business days once we receive your return." },
];

export default function ReturnsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Hassle-free</p>
      <h1 className="mt-2 text-4xl font-extrabold text-gray-900">Returns &amp; Refunds</h1>
      <p className="mt-4 text-gray-500 leading-relaxed">
        Not 100% happy? No problem. We accept returns within <strong>30 days</strong> of delivery —
        free of charge.
      </p>

      <div className="mt-12 space-y-6">
        {STEPS.map(({ step, title, body }) => (
          <div key={step} className="flex gap-5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {step}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{title}</p>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl bg-amber-50 border border-amber-100 p-6 text-sm text-amber-800">
        <strong>Non-returnable items:</strong> Final sale items, gift cards, and personalised products cannot be returned.
      </div>

      <div className="mt-8">
        <Link href="/contact" className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors inline-block">
          Start a Return
        </Link>
      </div>
    </main>
  );
}
