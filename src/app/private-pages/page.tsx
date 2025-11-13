import { builder } from "@builder.io/sdk";
import { RenderBuilderContent } from "@/components/builder";

// Builder Public API Key set in .env file
builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

const modelName = "landing-pages";



export default async function PrivatePagesIndex() {
  const urlPath = "/private-pages";

  // Set private key for server-side access only
  builder.authToken = process.env.BUILDER_PRIVATE_API_KEY ?? null;

  const page = await builder
    .get(modelName, {
      userAttributes: { urlPath },
      includeUnpublished: true, // Allow preview mode to work
    })
    .toPromise();

  // Don't call notFound() here - let RenderBuilderContent handle preview mode
  // It will check useIsPreviewing() and show 404 only if not in preview
  return <RenderBuilderContent model={modelName} content={page || null} />;
}
