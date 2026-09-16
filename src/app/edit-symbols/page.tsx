import { builder } from "@builder.io/sdk";
import { RenderBuilderContent } from "../../components/builder";

// Builder Public API Key set in .env file
builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

export default async function Page() {
  const builderModelName = "symbol";

  const content = await builder
    // Get the page content from Builder with the specified options
    .get(builderModelName, {
      enrich: true,
      includeRefs: true,
      noTraverse: false,
      options: {
        enrich: true,
        enrichOptions: {
          enrichLevel: 4,
          model: {
            "project-references": {
              fields: "id,name,data",
            },
            "featured-products": {
              fields: "id,name,data",
            },
          },
        },
      },
    })
    // Convert the result to a promise
    .toPromise();

  return (
    <>
      {/* Render the Builder page */}
      <RenderBuilderContent content={content} options={{enrich: true}} model={builderModelName} data={{ apiBaseUrl:"production-cougars-services-public.profitoptics.com/api", warehouseCode: "GADS"  }} />
    </>
  );
}
