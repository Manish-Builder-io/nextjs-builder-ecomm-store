#!/usr/bin/env node

/**
 * Simple CLI to fetch a Builder.io HTML rendering for a given
 * content entry and model, using the HTML API + Web Components.
 *
 * Usage:
 *   BUILDER_CONTENT_API_KEY=your_public_api_key \
 *   PREVIEW_URL=https://your-site.com/some-page \
 *   node shopify-preview.js CONTENT_ID MODEL_NAME
 *
 * Example:
 *   node shopify-preview.js 662d748ac54f4f43b39a8249cca1e4cc homepage
 *
 * Notes:
 * - CONTENT_ID can also be provided via BUILDER_CONTENT_ID env var.
 * - MODEL_NAME can also be provided via BUILDER_MODEL_NAME env var (defaults to "page").
 * - PREVIEW_URL controls the "url" parameter passed to the HTML API.
 */

const fetchFn =
  typeof fetch === "function"
    ? fetch
    : (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

const PUBLIC_API_KEY = "c0a2ee2c3a954423872965052b491364";

const [, , cliContentId, cliModelName] = process.argv;

const CONTENT_ID = cliContentId || "662d748ac54f4f43b39a8249cca1e4cc"
const MODEL_NAME = cliModelName || process.env.BUILDER_MODEL_NAME || "homepage";

// This should be the URL you normally use as the "preview" URL
// when editing the page in Builder.
const PREVIEW_URL =
  process.env.PREVIEW_URL || "https://your-site.com/some-page";

if (!PUBLIC_API_KEY) {
  console.error(
    "❌ Missing Builder public/content API key. Set BUILDER_CONTENT_API_KEY or BUILDER_PUBLIC_API_KEY."
  );
  process.exit(1);
}

if (!CONTENT_ID) {
  console.error(
    "❌ Missing content ID. Pass it as the first CLI argument or set BUILDER_CONTENT_ID."
  );
  process.exit(1);
}

async function main() {
  const url = new URL(`https://cdn.builder.io/api/v3/html/${MODEL_NAME}`);

  url.searchParams.set("url", PREVIEW_URL);
  url.searchParams.set("apiKey", PUBLIC_API_KEY);
  url.searchParams.set("query.id", CONTENT_ID);
  url.searchParams.set("limit", "1");
  url.searchParams.set("offset", "0");
  url.searchParams.set("includeUnpublished", "true");
  url.searchParams.set("includeRefs", "false");

  const response = await fetchFn(url.toString());

  if (!response.ok) {
    const text = await response.text();
    console.error(
      `❌ Failed to fetch HTML from Builder (status ${response.status}).`
    );
    console.error(text);
    process.exit(1);
  }

  // The HTML API returns an HTML snippet that already includes the
  // necessary <script> tags (including the Builder Web Components loader)
  // as well as any required <style> tags.
  const snippet = await response.text();

  const fullHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Builder Preview - ${MODEL_NAME} (${CONTENT_ID})</title>
  </head>
  <body>
${snippet}
  </body>
</html>`;

  // Print the full page to stdout so you can redirect it to a file:
  //   node shopify-preview.js ... > preview.html
  process.stdout.write(fullHtml);
}

main().catch((err) => {
  console.error("❌ Unexpected error while generating preview HTML.");
  console.error(err);
  process.exit(1);
});

