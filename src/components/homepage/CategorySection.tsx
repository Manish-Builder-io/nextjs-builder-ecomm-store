"use client";

import Link from "next/link";

export interface CategoryItem {
  name: string;
  description: string;
  href: string;
  gradient: string;
  icon: string;
  count: string;
}

export interface CategorySectionProps {
  heading?: string;
  subheading?: string;
  categories?: CategoryItem[];
}

const defaultCategories: CategoryItem[] = [
  { name: "Women",      description: "New season styles",  href: "/collections/all", gradient: "from-pink-400 via-rose-400 to-fuchsia-500",  icon: "👗", count: "2,400+ items"  },
  { name: "Men",        description: "Modern essentials",  href: "/collections/all", gradient: "from-slate-600 via-gray-700 to-zinc-800",     icon: "👔", count: "1,800+ items"  },
  { name: "Accessories",description: "Complete the look",  href: "/collections/all", gradient: "from-amber-400 via-orange-400 to-yellow-500", icon: "👜", count: "900+ items"    },
  { name: "Sale",       description: "Up to 50% off",      href: "/collections/all", gradient: "from-red-500 via-rose-500 to-pink-600",        icon: "🏷️", count: "Limited time" },
];

export default function CategorySection({
  heading = "Shop by Category",
  subheading = "Explore",
  categories = defaultCategories,
}: CategorySectionProps) {
  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-600">
            {subheading}
          </p>
          <h2 className="text-4xl font-extrabold text-gray-900">{heading}</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              className="group relative overflow-hidden rounded-2xl"
            >
              <div className={`bg-gradient-to-br ${cat.gradient} flex aspect-[3/4] flex-col justify-between p-6`}>
                <span className="text-5xl drop-shadow-sm">{cat.icon}</span>
                <div>
                  <h3 className="text-2xl font-bold text-white drop-shadow-sm">{cat.name}</h3>
                  <p className="mt-1 text-sm text-white/80">{cat.description}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                    {cat.count}
                    <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
