import React from "react";
import Link from "next/link";
import Image from "next/image";

export interface ProductData {
  title?: string;
  description?: string;
  price?: number;
  compareAtPrice?: number;
  currency?: string;
  imageSrc?: string;
  badge?: string;
  tags?: string[];
}

interface ProductsHeroProps {
  products: ProductData[];
}

export function ProductsHero({ products }: ProductsHeroProps) {
  const featured = products[0];

  if (!featured) return null;

  return (
    <section className="relative overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-10">
          {/* Text */}
          <div>
            {featured.badge && (
              <span className="inline-block mb-3 rounded-full bg-black/5 dark:bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide">
                {featured.badge}
              </span>
            )}
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {featured.title ?? "Our Products"}
            </h1>
            {featured.description && (
              <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300 line-clamp-3">
                {featured.description}
              </p>
            )}
            {featured.price != null && (
              <p className="mt-3 text-2xl font-bold">
                {featured.currency ?? "USD"} {featured.price.toFixed(2)}
                {featured.compareAtPrice != null && (
                  <span className="ml-2 text-base font-normal text-gray-400 line-through">
                    {featured.currency ?? "USD"} {featured.compareAtPrice.toFixed(2)}
                  </span>
                )}
              </p>
            )}
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <Link
                href="/collections/all"
                className="inline-flex items-center justify-center rounded-md bg-black text-white px-5 py-2.5 text-sm font-medium hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90"
              >
                Shop now
              </Link>
              <Link
                href="/collections/new"
                className="inline-flex items-center justify-center rounded-md border border-black/10 px-5 py-2.5 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/10"
              >
                View all ({products.length})
              </Link>
            </div>
            {featured.tags && featured.tags.length > 0 && (
              <div className="mt-6 flex gap-2 flex-wrap">
                {featured.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs text-gray-500 dark:text-gray-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Image */}
          <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden relative shadow-md">
            {featured.imageSrc ? (
              <Image
                src={featured.imageSrc}
                alt={featured.title ?? "Featured product"}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700" />
            )}
          </div>
        </div>

        {/* Secondary product strip */}
        {products.length > 1 && (
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {products.slice(1, 5).map((p, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm"
              >
                {p.imageSrc ? (
                  <Image
                    src={p.imageSrc}
                    alt={p.title ?? "Product"}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700" />
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-white text-xs font-medium line-clamp-1">{p.title}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default ProductsHero;
