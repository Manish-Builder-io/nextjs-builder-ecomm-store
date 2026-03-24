"use client";

import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/product";

export interface FeaturedProductsSectionProps {
  heading?: string;
  subheading?: string;
  viewAllText?: string;
  viewAllHref?: string;
}

const featuredProducts: Product[] = [
  {
    id: "fp-1",
    title: "Classic White Oxford Shirt",
    description: "Timeless style meets premium comfort. 100% organic cotton with a relaxed fit.",
    price: 89,
    compareAtPrice: 120,
    currency: "USD",
    rating: 4.8,
    ratingCount: 342,
    badge: "sale",
    imageSrc: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=450&fit=crop",
    tags: ["men", "shirts"],
  },
  {
    id: "fp-2",
    title: "Slim Fit Dark Denim",
    description: "Modern cut with all-day comfort. Stretch denim that moves with you.",
    price: 115,
    currency: "USD",
    rating: 4.7,
    ratingCount: 218,
    badge: "new",
    imageSrc: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&h=450&fit=crop",
    tags: ["men", "denim"],
  },
  {
    id: "fp-3",
    title: "Floral Wrap Midi Dress",
    description: "Effortlessly elegant for any occasion. Breathable and lightweight fabric.",
    price: 95,
    compareAtPrice: 145,
    currency: "USD",
    rating: 4.9,
    ratingCount: 476,
    badge: "sale",
    imageSrc: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=450&fit=crop",
    tags: ["women", "dresses"],
  },
  {
    id: "fp-4",
    title: "Leather Crossbody Bag",
    description: "Premium full-grain leather. Spacious yet compact — perfect for everyday use.",
    price: 185,
    currency: "USD",
    rating: 4.8,
    ratingCount: 189,
    badge: "featured",
    imageSrc: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=450&fit=crop",
    tags: ["accessories", "bags"],
  },
];

export default function FeaturedProductsSection({
  heading = "Trending Now",
  subheading = "Curated for you",
  viewAllText = "View all products",
  viewAllHref = "/collections/all",
}: FeaturedProductsSectionProps) {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-600">
              {subheading}
            </p>
            <h2 className="text-4xl font-extrabold text-gray-900">{heading}</h2>
          </div>
          <Link
            href={viewAllHref}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors sm:mt-0"
          >
            {viewAllText}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
