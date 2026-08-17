import { builder } from "@builder.io/sdk";
import { fetchBuilderContentByUrl } from "../fetchBuilderContentByUrl";
import { RenderBuilderContentRepro } from "../RenderBuilderContentRepro";

// Builder Public API Key set in .env file
builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

const modelName = "landing-pages";

// Repro route for a customer-reported preview issue. Uses the customer's
// fetchBuilderContentByUrl (url + per-call authToken, nested enrich option)
// instead of the app's usual userAttributes.urlPath + global builder.authToken
// mutation. Kept isolated from the working private-pages routes.
export default async function PrivatePagesRepro() {
  const urlPath = "/private-pages/repro";

  const page = await fetchBuilderContentByUrl(modelName, {
    url: urlPath,
    authToken: process.env.BUILDER_PRIVATE_API_KEY,
    includeUnpublished: true,
  });

  return <RenderBuilderContentRepro model={modelName} content={page || null} />;
}
