import { builder } from "@builder.io/sdk";
import { RenderBuilderContent } from "../../components/builder";
import { resolveBuilderBindings } from "../../lib/resolve-builder-bindings";

// Builder Public API Key set in .env file
builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

interface PageProps {
  params: Promise<{
    page: string[];
  }>;
}

export default async function Page(props: PageProps) {
  const builderModelName = "page";


  try {
    const content = await builder
      // Get the page content from Builder with the specified options
      .get(builderModelName, {
        userAttributes: {
          // Use the page path specified in the URL to fetch the content
          urlPath: "/" + ((await props?.params)?.page?.join("/") || ""),
        },
        options: {
          enrich: true,
          includeRefs: true,
          enrichOptions: {
            enrichLevel: 3,
          },
        },
        enrich: true,
        includeRefs: true,
      })
      // Convert the result to a promise
      .toPromise();

    console.log("🚀 ~ Page ~ content:", content);
    const resolvedContent = resolveBuilderBindings(content, {
      title: "Welcome to Our Store",
      description: "Discover amazing products and great deals. Shop the latest collection with free shipping on orders over $50.",
      ctaText: "Shop Now",
      featured: true,
      imageSrc: "https://cdn.builder.io/api/v1/image/assets%2Fdb60bf3db7fa4db7be81ef05b72bd720%2Fd44403a7f0204687882590d9b9cb2a17",
    });
    return (
      <>
        {/* Render the Builder page */}
        <RenderBuilderContent content={resolvedContent} model={builderModelName} />
      </>
    );
  } catch (error) {
    console.error('Error fetching Builder content:', error);
    return (
      <>
        {/* Render the Builder page with no content to trigger 404 */}
        <RenderBuilderContent content={undefined} model={builderModelName} />
      </>
    );
  }
}
