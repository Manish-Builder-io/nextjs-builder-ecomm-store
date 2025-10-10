import React from "react";
import Link from "next/link";

interface HeroProps {
  title?: string;
  subtitle?: string;
  ctaPrimary?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
  image?: string;
}

export function Hero({
  title = "Discover your next favorite",
  subtitle = "Premium products curated for everyday life.",
  ctaPrimary = { label: "Shop now", href: "/collections/all" },
  ctaSecondary = { label: "Explore", href: "/collections/new" },
  image,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-10">
          <div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300">
              {subtitle}
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link href={ctaPrimary.href} className="inline-flex items-center justify-center rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-black/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black dark:bg-white dark:text-black dark:hover:bg-white/90">
                {ctaPrimary.label}
              </Link>
              <Link href={ctaSecondary.href} className="inline-flex items-center justify-center rounded-md border border-black/10 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/10">
                {ctaSecondary.label}
              </Link>
            </div>
          </div>
          <div className="aspect-[4/3] w-full rounded-xl overflow-hidden">
            {image ? (
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;



