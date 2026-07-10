/**
 * Fetches all assets for a given Builder.io space and deletes them in bulk.
 * Uses the Admin GraphQL API to list assets and the REST API to delete them.
 *
 * Usage:
 *   BUILDER_PRIVATE_KEY=<key> BUILDER_PUBLIC_KEY=<key> node scripts/delete-all-assets.js
 *
 * Required:
 *   - BUILDER_PRIVATE_KEY  : Private API key (for both listing and deleting)
 *   - BUILDER_PUBLIC_KEY   : Public API key (used in delete URL)
 *
 * Optional:
 *   - DRY_RUN=true         : Log assets that would be deleted without actually deleting them
 *   - FOLDER_ID=<id>       : Only delete assets in a specific folder
 *
 * Docs: https://www.builder.io/c/docs/assets-api
 */

const fetchFn =
  typeof fetch === "function"
    ? fetch
    : (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

const PRIVATE_KEY = process.env.BUILDER_PRIVATE_KEY || "";
const PUBLIC_KEY = process.env.BUILDER_PUBLIC_KEY || "";
const DRY_RUN = process.env.DRY_RUN === "true";
const FOLDER_ID = process.env.FOLDER_ID || "";

const GRAPHQL_ENDPOINT = "https://cdn.builder.io/api/v2/admin";
const DELETE_ENDPOINT = "https://cdn.builder.io/api/v1/assets";
const PAGE_LIMIT = 100;

if (!PRIVATE_KEY) {
  console.error("Error: BUILDER_PRIVATE_KEY is required.");
  process.exit(1);
}

if (!PUBLIC_KEY) {
  console.error("Error: BUILDER_PUBLIC_KEY is required.");
  process.exit(1);
}

async function fetchPage(offset) {
  const queryFilter = FOLDER_ID
    ? `query: { folders: { $in: ["${FOLDER_ID}"] } }, `
    : "";

  const query = `
    {
      assets(input: { ${queryFilter}limit: ${PAGE_LIMIT}, offset: ${offset} }) {
        id
        name
        url
      }
    }
  `;

  const response = await fetchFn(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PRIVATE_KEY}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch assets (status ${response.status}): ${errorText}`
    );
  }

  const payload = await response.json();

  if (payload.errors) {
    throw new Error(
      `GraphQL error: ${payload.errors.map((e) => e.message).join(", ")}`
    );
  }

  return payload?.data?.assets ?? [];
}

async function fetchAllAssets() {
  const all = [];
  let offset = 0;

  while (true) {
    const page = await fetchPage(offset);
    all.push(...page);
    console.log(`  Fetched ${all.length} assets so far...`);

    if (page.length < PAGE_LIMIT) {
      break;
    }
    offset += page.length;
  }

  return all;
}

async function deleteAsset(assetId) {
  const url = `${DELETE_ENDPOINT}/${assetId}?apiKey=${PUBLIC_KEY}`;

  const response = await fetchFn(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to delete asset ${assetId} (status ${response.status}): ${errorText}`
    );
  }

  return response.json().catch(() => ({}));
}

async function deleteAllAssets() {
  const scope = FOLDER_ID ? `folder "${FOLDER_ID}"` : "entire space";
  console.log(`\nFetching all assets for ${scope}...`);
  const assets = await fetchAllAssets();

  if (assets.length === 0) {
    console.log("No assets found. Nothing to delete.");
    return;
  }

  console.log(`\nFound ${assets.length} assets.`);

  if (DRY_RUN) {
    console.log("\nDRY RUN — the following assets would be deleted:");
    for (const asset of assets) {
      console.log(`  [${asset.id}] ${asset.name ?? asset.url ?? "(no name)"}`);
    }
    console.log("\nRe-run without DRY_RUN=true to perform actual deletion.");
    return;
  }

  console.log(`\nDeleting ${assets.length} assets...`);
  let deleted = 0;
  let failed = 0;

  for (const asset of assets) {
    try {
      await deleteAsset(asset.id);
      deleted++;
      console.log(
        `  [${deleted}/${assets.length}] Deleted ${asset.id} (${asset.name ?? asset.url ?? "no name"})`
      );
    } catch (err) {
      failed++;
      console.error(`  Failed to delete ${asset.id}: ${err.message}`);
    }
  }

  console.log(`\nDone. ${deleted} deleted, ${failed} failed.`);
}

deleteAllAssets().catch((err) => {
  console.error("Unexpected error:", err);
  process.exitCode = 1;
});
