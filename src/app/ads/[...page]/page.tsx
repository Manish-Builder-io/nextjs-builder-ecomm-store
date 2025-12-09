import { builder } from "@builder.io/sdk";
import { RenderBuilderContent } from "../../../components/builder";

// Builder Public API Key set in .env file
builder.init("3a5958f65346417f9899d3c37529e3c7");

interface PageProps {
  params: Promise<{
    page: string[];
  }>;
}

export default async function Page(props: PageProps) {
  const builderModelName = "product-listing-ad";


  try {
    const content = await builder
      // Get the page content from Builder with the specified options
      .get(builderModelName, {
        userAttributes: {
          // Use the page path specified in the URL to fetch the content
          urlPath: "/ads/" + ((await props?.params)?.slug?.join("/") || ""),
        },
      })
      // Convert the result to a promise
      .toPromise();


    return (
      <>
        {/* Render the Builder page */}
        <RenderBuilderContent content={content} model={builderModelName} />
      </>
    );
  } catch (error) {
    console.error('Error fetching Builder content:', error);
    return (
      <>
        {/* Render the Builder page with undefined content to trigger 404 */}
        <RenderBuilderContent content={undefined} model={builderModelName} />
      </>
    );
  }
}
