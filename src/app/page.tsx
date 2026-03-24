import { builder } from "@builder.io/sdk";
import HomeBuilderContent from "@/components/HomeBuilderContent";

// Builder Public API Key set in .env file
builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

export default async function Page() {
  let content = null;

  try {
    content =
      (await builder
        .get("page", {
          userAttributes: { urlPath: "/" },
          options: { includeRefs: true, enrich: true },
        })
        .toPromise()) ?? null;
  } catch {
    // fall through — HomeBuilderContent handles null content
  }

  return <HomeBuilderContent content={content} />;
}
