import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";
import { Product } from "@/types/product";
import Link from "next/link";

export default function Home() {
  const products: Product[] = [
    {
      id: "p1",
      title: "Everyday Ceramic Mug",
      description: "A minimalist mug for your daily rituals.",
      price: 18,
      compareAtPrice: 24,
      currency: "USD",
      rating: 4.5,
      ratingCount: 128,
      imageSrc: "/vercel.svg",
      badge: "sale",
    },
    {
      id: "p2",
      title: "Linen Throw Blanket",
      description: "Soft, breathable, and perfect for any season.",
      price: 79,
      currency: "USD",
      rating: 4.2,
      ratingCount: 89,
      imageSrc: "/next.svg",
      badge: "new",
    },
    {
      id: "p3",
      title: "Scented Soy Candle",
      description: "Clean burn with calming fragrances.",
      price: 22,
      currency: "USD",
      rating: 4.8,
      ratingCount: 432,
      imageSrc: "/globe.svg",
      badge: "featured",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <Hero />
      <section className="py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Featured products</h2>
          <Link href="/collections/all" className="text-sm text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white">View all</Link>
        </div>
        <ProductGrid products={products} />
      </section>
    </div>
  );
}
