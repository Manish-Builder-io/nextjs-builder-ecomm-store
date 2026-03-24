"use client";

import Link from "next/link";

export interface PromoBannerProps {
  badgeEmoji?: string;
  badgeText?: string;
  title?: string;
  titleHighlight?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
}

export default function PromoBanner({
  badgeEmoji = "🔥",
  badgeText = "Limited Time Offer — Ends Sunday",
  title = "Summer Sale",
  titleHighlight = "Up to 50% Off",
  description = "Massive savings across our entire summer collection. Hundreds of styles added — grab yours before they're gone.",
  ctaText = "Shop the Sale",
  ctaHref = "/collections/all",
}: PromoBannerProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 py-20">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
          <span>{badgeEmoji}</span>
          <span>{badgeText}</span>
        </div>

        <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
          {title}
          <span className="block text-yellow-300">{titleHighlight}</span>
        </h2>

        <p className="mx-auto mb-10 max-w-xl text-lg text-blue-100">
          {description}
        </p>

        <Link
          href={ctaHref}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-10 py-4 text-base font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition-colors"
        >
          {ctaText}
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
