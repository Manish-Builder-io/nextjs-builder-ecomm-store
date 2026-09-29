import { builder } from "@builder.io/sdk";
import VariantContainerRepro from "./VariantContainerRepro";

builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

// Repro for Pylon #21532: Gen 1 SDK drops shared emotion rules when the winning
// variant is not the first variant inside a variant container.
// Create a `page` model entry with URL /variant-container-repro (see README section below).
export default async function Page() {
  // Modern implementation: NO server-side targeting via userAttributes (except urlPath).
  // The server renders every variant; the client/inline script picks the winner.
  const content =
    (await builder
      .get("page", {
        userAttributes: { urlPath: "/variant-container-repro" },
        options: { includeRefs: true, enrich: true },
        cachebust: true,
      })
      .toPromise()) ?? null;

  return <VariantContainerRepro content={content} />;
}
