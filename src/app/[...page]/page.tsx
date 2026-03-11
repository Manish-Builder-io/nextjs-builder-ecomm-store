import { builder } from "@builder.io/sdk";
import { RenderBuilderContent } from "../../components/builder";

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
        {/* Render the Builder page with no content to trigger 404 */}
        <RenderBuilderContent content={undefined} model={builderModelName} />
      </>
    );
  }
}
