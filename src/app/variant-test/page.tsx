import { builder } from "@builder.io/sdk";
import { RenderBuilderContent } from "@/components/builder";

// Builder Public API Key set in .env file
builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

export default async function VariantTestPage() {
  const builderModelName = "page";

  const content = await builder
    .get(builderModelName, {
      userAttributes: {
        urlPath: "/variant-test",
      },
      enrich: true,
      options: {
        enrich: true,
      },
    })
    .toPromise();

  // Debug: Log content structure for experiment + inline variant analysis
  console.log("[variant-test] builder.get content id:", content?.id);
  console.log("[variant-test] content.data keys:", content?.data ? Object.keys(content.data) : []);
  console.log(
    "[variant-test] experiment-related:",
    content?.data?.experiments ?? content?.data?.experiment ?? "none"
  );

  if (content?.data?.blocks) {
    console.log("[variant-test] content.data.blocks count:", content.data.blocks?.length);
    console.log("[variant-test] content.data.blocks:", JSON.stringify(content, null, 2));

    const inspectBlockForVariants = (block: Record<string, unknown>, path = "blocks") => {
      const comp = block?.component as Record<string, unknown> | undefined;
      const options = comp?.options as Record<string, unknown> | undefined;
      const variants = options?.variants;
      if (variants !== undefined) {
        console.log(`[variant-test] ${path}: component.options.variants`, variants);
      }
      const nestedBlocks = block?.children as Record<string, unknown>[] | undefined;
      if (Array.isArray(nestedBlocks)) {
        nestedBlocks.forEach((child, i) =>
          inspectBlockForVariants(child as Record<string, unknown>, `${path}[${i}].children`)
        );
      }
    };

    content.data.blocks.forEach((block: Record<string, unknown>, i: number) => {
      inspectBlockForVariants(block, `blocks[${i}]`);
    });
  } else {
    console.log("[variant-test] No content.data.blocks found");
  }

  return (
    <>
      <RenderBuilderContent content={content} model={builderModelName} />
    </>
  );
}
