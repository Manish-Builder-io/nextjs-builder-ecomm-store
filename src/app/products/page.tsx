import { builder } from "@builder.io/sdk";
import { RenderBuilderContent } from "../../components/builder";
import { ProductsHero, type ProductData } from "../../components/ProductsHero";

builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

export default async function Page() {
  const builderModelName = "products-page";

  const [content, productsResult] = await Promise.all([
    builder
      .get(builderModelName, { options: { enrich: true }, enrich: true })
      .toPromise(),
    builder.getAll("products", { options: { enrich: true }, enrich: true }),
  ]);

  const products: ProductData[] = productsResult.flatMap((entry) => {
    const d = entry.data;
    if (!d) return [];
    return [
      {
        title: typeof d.title === "string" ? d.title : undefined,
        description: typeof d.description === "string" ? d.description : undefined,
        price: typeof d.price === "number" ? d.price : undefined,
        compareAtPrice:
          typeof d.compareAtPrice === "number" ? d.compareAtPrice : undefined,
        currency: typeof d.currency === "string" ? d.currency : undefined,
        imageSrc: typeof d.imageSrc === "string" ? d.imageSrc : undefined,
        badge: typeof d.badge === "string" ? d.badge : undefined,
        tags: Array.isArray(d.tags)
          ? d.tags.filter((tag): tag is string => typeof tag === "string")
          : undefined,
      },
    ];
  });

  return (
    <>
      <ProductsHero products={products} />
    </>
  );
}
