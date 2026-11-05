import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/commerce/Breadcrumbs";
import ProductDetail from "@/components/commerce/ProductDetail";
import ProductRail from "@/components/commerce/ProductRail";
import BuilderOrFallback from "@/components/BuilderOrFallback";
import { getProduct, getProducts } from "@/lib/products";
import { getRequestLocale } from "@/lib/targeting";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id, await getRequestLocale());
  if (!product) return { title: "Product not found", robots: { index: false } };
  return {
    title: product.title,
    description: product.description.slice(0, 160),
    openGraph: { title: product.title, description: product.description.slice(0, 160), images: product.imageSrc ? [product.imageSrc] : undefined },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const product = await getProduct(id, locale);
  if (!product) notFound();

  const related = (await getProducts(locale)).filter((p) => p.id !== product.id).slice(0, 4);

  // Products can be overridden per product ("/products/<id>") or for every product ("/products/*")
  // with a Builder page entry; otherwise the built-in layout renders.
  return (
    <BuilderOrFallback urlPath={`/products/${id}`}>
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/collections/all" }, { label: product.title }]} />
      </div>
      <ProductDetail product={product} />
      <ProductRail products={related} heading="You may also like" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            description: product.description,
            image: product.imageSrc,
            offers: {
              "@type": "Offer",
              price: product.price,
              priceCurrency: product.currency,
              availability: product.inStock === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            },
            ...(product.ratingCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.ratingCount } } : {}),
          }).replace(/</g, "\\u003c"),
        }}
      />
    </BuilderOrFallback>
  );
}
