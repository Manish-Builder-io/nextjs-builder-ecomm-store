"use client";

import Link from "next/link";

export interface StatItem {
  value: string;
  label: string;
}

export interface PreviewCard {
  bg: string;
  icon: string;
  label: string;
  sub: string;
  tag: string;
}

export interface HomeHeroProps {
  badge?: string;
  title?: string;
  titleHighlight?: string;
  subtitle?: string;
  primaryCtaText?: string;
  primaryCtaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  stats?: StatItem[];
  previewCards?: PreviewCard[];
}

const defaultStats: StatItem[] = [
  { value: "10K+", label: "Products" },
  { value: "50K+", label: "Happy Customers" },
  { value: "4.9★", label: "Average Rating" },
];

const defaultPreviewCards: PreviewCard[] = [
  { bg: "from-pink-200 via-rose-200 to-fuchsia-300",  icon: "👗", label: "Women",       sub: "2,400+ items",  tag: "New"      },
  { bg: "from-slate-200 via-gray-300 to-zinc-400",    icon: "👔", label: "Men",         sub: "1,800+ items",  tag: "Popular"  },
  { bg: "from-amber-200 via-orange-200 to-yellow-300",icon: "👜", label: "Accessories", sub: "900+ items",    tag: "Trending" },
  { bg: "from-red-200 via-rose-200 to-pink-300",      icon: "🏷️", label: "Sale",        sub: "Up to 50% off", tag: "Hot"      },
];

export default function HomeHero({
  badge = "New Season Collection",
  title = "Style That",
  titleHighlight = "Speaks For You.",
  subtitle = "Discover curated collections that define modern fashion. From everyday essentials to statement pieces — all in one place.",
  primaryCtaText = "Shop Now",
  primaryCtaHref = "/collections/all",
  secondaryCtaText = "View Collections",
  secondaryCtaHref = "/collections/all",
  stats = defaultStats,
  previewCards = defaultPreviewCards,
}: HomeHeroProps) {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />

      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-100/50 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              {badge}
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.05]">
              {title}
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {titleHighlight}
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-500 max-w-lg leading-relaxed">
              {subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={primaryCtaHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                {primaryCtaText}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href={secondaryCtaHref}
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 hover:border-gray-900 transition-colors"
              >
                {secondaryCtaText}
              </Link>
            </div>

            <div className="flex items-center gap-10 pt-4 border-t border-gray-100">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="text-3xl font-black text-gray-900">{s.value}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:grid grid-cols-2 gap-4">
            {previewCards.map((card) => (
              <div
                key={card.label}
                className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${card.bg} aspect-square flex flex-col justify-between p-6 cursor-pointer hover:scale-[1.02] transition-transform`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-5xl drop-shadow-sm">{card.icon}</span>
                  <span className="rounded-full bg-white/70 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-gray-700">
                    {card.tag}
                  </span>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{card.label}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
