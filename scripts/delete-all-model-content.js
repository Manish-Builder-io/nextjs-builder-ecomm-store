/**
 * Deletes all content entries for a given Builder.io model.
 *
 * Usage:
 *   BUILDER_PRIVATE_KEY=<key> BUILDER_PUBLIC_KEY=<key> MODEL_NAME=<model> node scripts/delete-all-model-content.js
 *
 * Or set the constants below directly.
 *
 * Required:
 *   - BUILDER_PRIVATE_KEY  : Private API key (for delete requests)
 *   - BUILDER_PUBLIC_KEY   : Public API key (for listing content)
 *   - MODEL_NAME           : The model whose entries will be deleted
 *
 * Optional:
 *   - DRY_RUN=true         : Log entries that would be deleted without actually deleting them
 */

const fetchFn =
  typeof fetch === "function"
    ? fetch
    : (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

const MODEL_NAME = process.env.MODEL_NAME || "page";
const PRIVATE_KEY = process.env.BUILDER_PRIVATE_KEY || "";
const PUBLIC_KEY = process.env.BUILDER_PUBLIC_KEY || "";
const DRY_RUN = process.env.DRY_RUN === "true";

const CONTENT_API_BASE = "https://cdn.builder.io/api/v3/content";
const WRITE_API_BASE = "https://builder.io/api/v1/write";
const PAGE_LIMIT = 100;

if (!PRIVATE_KEY) {
  console.error("Error: BUILDER_PRIVATE_KEY is required.");
  process.exit(1);
}

if (!PUBLIC_KEY) {
  console.error("Error: BUILDER_PUBLIC_KEY is required.");
  process.exit(1);
}

async function fetchPage(modelName, offset) {
  const url = new URL(`${CONTENT_API_BASE}/${modelName}`);
  url.searchParams.set("apiKey", PUBLIC_KEY);
  url.searchParams.set("limit", String(PAGE_LIMIT));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("noTargeting", "true");
  url.searchParams.set("includeUnpublished", "true");
  // Only fetch the id field to keep responses small
  url.searchParams.set("fields", "id,name");

  const response = await fetchFn(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch content (status ${response.status}): ${errorText}`
    );
  }

  const payload = await response.json();
  return payload?.results ?? [];
}

async function fetchAllEntries(modelName) {
  const all = [];
  let offset = 1;

  while (true) {
    const page = await fetchPage(modelName, offset);
    all.push(...page);
    console.log(`  Fetched ${all.length} entries so far...`);

    if (page.length < PAGE_LIMIT) {
      break;
    }
    offset += page.length;
  }

  return all;
}

async function deleteEntry(modelName, entryId) {
  const url = `${WRITE_API_BASE}/${modelName}/${entryId}`;

  const response = await fetchFn(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to delete entry ${entryId} (status ${response.status}): ${errorText}`
    );
  }

  return response.json();
}

async function deleteAllModelContent() {
  console.log(`\nFetching all entries for model: "${MODEL_NAME}"...`);
  const entries = await fetchAllEntries(MODEL_NAME);

  if (entries.length === 0) {
    console.log("No entries found. Nothing to delete.");
    return;
  }

  console.log(`\nFound ${entries.length} entries.`);

  if (DRY_RUN) {
    console.log("\nDRY RUN — the following entries would be deleted:");
    for (const entry of entries) {
      console.log(`  [${entry.id}] ${entry.name ?? "(no name)"}`);
    }
    console.log("\nRe-run without DRY_RUN=true to perform actual deletion.");
    return;
  }

  console.log(`\nDeleting ${entries.length} entries...`);
  let deleted = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      await deleteEntry(MODEL_NAME, entry.id);
      deleted++;
      console.log(
        `  [${deleted}/${entries.length}] Deleted ${entry.id} (${entry.name ?? "no name"})`
      );
    } catch (err) {
      failed++;
      console.error(`  Failed to delete ${entry.id}: ${err.message}`);
    }
  }

  console.log(`\nDone. ${deleted} deleted, ${failed} failed.`);
}

deleteAllModelContent().catch((err) => {
  console.error("Unexpected error:", err);
  process.exitCode = 1;
});
