#!/usr/bin/env node

/**
 * Fetch all folders (and optionally a single folder by ID) using the Builder Admin GraphQL API.
 *
 * Usage:
 *   node scripts/get-folders.js              # list all folders
 *   node scripts/get-folders.js FOLDER_ID    # get a single folder by ID
 *
 * Environment variables:
 *   - BUILDER_PRIVATE_KEY (required): Private Builder API key (bpk-***).
 *
 * Documentation: https://www.builder.io/c/docs/admin-api-content#get-folders-and-contents
 */

import process from "node:process";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";
const PRIVATE_KEY = process.env.BUILDER_PRIVATE_KEY || "bpk-f1b190065f2947a6b51150cf31441b5f";

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌  Missing BUILDER_PRIVATE_KEY environment variable.");
    process.exit(1);
  }

  const [, , folderId] = process.argv;

  if (folderId) {
    await getFolder(folderId);
  } else {
    await getFolders();
  }
}

main().catch((error) => {
  console.error("❌  Unexpected error.");
  console.error(error);
  process.exit(1);
});

async function getFolders() {
  console.info("ℹ️  Fetching parent-level folders…");

  const query = /* GraphQL */ `
    query GetFolders {
      getFolders {
        id
        name
        description
        archived
        createdDate
        entries
        parentFolder
        ownerId
        lastUpdateBy
      }
    }
  `;

  const { response, result } = await graphqlRequest(query);

  if (!response.ok || result.errors) {
    console.error("❌  Failed to fetch folders.");
    printErrors(result.errors);
    process.exit(1);
  }

  const all = result.data?.getFolders ?? [];
  const rootFolders = all.filter((f) => !f.parentFolder);
  console.info(`✅  Found ${rootFolders.length} parent-level folder(s).\n`);
  rootFolders.forEach((f) => {
    const archived = f.archived ? " [archived]" : "";
    const entryCount = f.entries?.length ?? 0;
    console.info(`📁 ${f.name}${archived}  (id: ${f.id}, entries: ${entryCount})`);
    if (f.description) console.info(`   ${f.description}`);
  });
}

async function getFolder(id) {
  console.info(`ℹ️  Fetching folder (${id})…`);

  const query = /* GraphQL */ `
    query GetFolder($id: String!) {
      getFolder(id: $id) {
        id
        name
        description
        archived
        createdDate
        entries
        parentFolder
        ownerId
        lastUpdateBy
      }
    }
  `;

  const { response, result } = await graphqlRequest(query, { id });

  if (!response.ok || result.errors) {
    console.error("❌  Failed to fetch folder.");
    printErrors(result.errors);
    process.exit(1);
  }

  const folder = result.data?.getFolder;
  if (!folder) {
    console.error(`❌  No folder found with id: ${id}`);
    process.exit(1);
  }

  console.info(JSON.stringify(folder, null, 2));
}

/** Renders a simple tree view grouped by parentFolder. */
function printFolderTree(folders) {
  const byParent = new Map();
  for (const folder of folders) {
    const key = folder.parentFolder || null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(folder);
  }

  function printLevel(parentId, indent) {
    const children = byParent.get(parentId) ?? [];
    for (const folder of children) {
      const archived = folder.archived ? " [archived]" : "";
      const entryCount = folder.entries?.length ?? 0;
      console.info(
        `${indent}📁 ${folder.name}${archived}  (id: ${folder.id}, entries: ${entryCount})`
      );
      if (folder.description) {
        console.info(`${indent}   ${folder.description}`);
      }
      printLevel(folder.id, indent + "   ");
    }
  }

  printLevel(null, "");
}

function printErrors(errors) {
  if (errors) {
    errors.forEach((e) => console.error(` • ${e.message}`));
  }
}

async function graphqlRequest(query, variables = {}) {
  const response = await fetch(ADMIN_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PRIVATE_KEY}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  return { response, result };
}
