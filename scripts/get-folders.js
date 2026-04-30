#!/usr/bin/env node

/**
 * Fetch all folders (and optionally a single folder by ID) using the Builder Admin GraphQL API.
 *
 * Usage:
 *   node scripts/get-folders.js              # list root-level folders
 *   node scripts/get-folders.js --all        # list all folders, flag null string fields
 *   node scripts/get-folders.js --fix        # detect and patch folders with null string fields
 *   node scripts/get-folders.js FOLDER_ID    # get a single folder by ID
 *
 * Environment variables:
 *   - BUILDER_PRIVATE_KEY (required): Private Builder API key (bpk-***).
 *
 * Documentation: https://www.builder.io/c/docs/admin-api-content#get-folders-and-contents
 */

import process from "node:process";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";
const WRITE_API_BASE = "https://builder.io/api/v1/write";
const PRIVATE_KEY = process.env.BUILDER_PRIVATE_KEY;

// Fields that must be string | undefined — null breaks the Builder.io MST model
const STRING_FIELDS = ["name", "description", "parentFolder", "ownerId", "lastUpdateBy"];

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌  Missing BUILDER_PRIVATE_KEY environment variable.");
    process.exit(1);
  }

  const [, , arg] = process.argv;

  if (arg === "--all") {
    await getFolders({ all: true });
  } else if (arg === "--fix") {
    await fixFolders();
  } else if (arg && !arg.startsWith("--")) {
    await getFolder(arg);
  } else {
    await getFolders({ all: false });
  }
}

main().catch((error) => {
  console.error("❌  Unexpected error.");
  console.error(error);
  process.exit(1);
});

async function getFolders({ all = false } = {}) {
  console.info(all ? "ℹ️  Fetching all folders…" : "ℹ️  Fetching parent-level folders…");

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

  const folders = result.data?.getFolders ?? [];
  const displayed = all ? folders : folders.filter((f) => !f.parentFolder);
  console.info(`✅  Found ${displayed.length} folder(s).\n`);

  for (const f of displayed) {
    const archived = f.archived ? " [archived]" : "";
    const entryCount = f.entries?.length ?? 0;
    console.info(`📁 ${f.name}${archived}  (id: ${f.id}, entries: ${entryCount})`);
    if (f.description) console.info(`   ${f.description}`);
    flagNullFields(f);
  }
}

async function fixFolders() {
  console.info("ℹ️  Scanning all folders for null string fields…");

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

  const folders = result.data?.getFolders ?? [];
  const broken = folders.filter((f) => getNullFields(f).length > 0);

  if (broken.length === 0) {
    console.info("✅  No folders with null string fields found.");
    return;
  }

  console.info(`⚠️  Found ${broken.length} folder(s) with null fields. Patching…\n`);

  let fixed = 0;
  let failed = 0;

  for (const folder of broken) {
    const nullFields = getNullFields(folder);
    console.info(`🔧 Patching "${folder.name}" (id: ${folder.id}) — null fields: ${nullFields.join(", ")}`);

    const patch = {};
    for (const field of nullFields) {
      patch[field] = "";
    }

    const ok = await patchFolder(folder.id, patch);
    if (ok) {
      console.info(`   ✅  Patched.`);
      fixed++;
    } else {
      console.error(`   ❌  Failed to patch.`);
      failed++;
    }
  }

  console.info(`\nDone: ${fixed} fixed, ${failed} failed.`);
}

async function patchFolder(id, patch) {
  const writeUrl = `${WRITE_API_BASE}/folder/${id}`;
  const res = await fetch(writeUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PRIVATE_KEY}`,
    },
    body: JSON.stringify(patch),
  });

  if (res.ok) return true;

  // Fall back to GraphQL mutation if Write API doesn't support the folder model
  if (res.status === 404 || res.status === 405) {
    return patchFolderGraphQL(id, patch);
  }

  const body = await res.text();
  console.error(`   Write API error (${res.status}): ${body}`);
  return false;
}

async function patchFolderGraphQL(id, patch) {
  const mutation = /* GraphQL */ `
    mutation UpdateFolder($id: String!, $input: UpdateFolderInput!) {
      updateFolder(id: $id, input: $input) {
        id
      }
    }
  `;

  const { response, result } = await graphqlRequest(mutation, { id, input: patch });

  if (!response.ok || result.errors) {
    printErrors(result.errors);
    return false;
  }

  return !!result.data?.updateFolder?.id;
}

function getNullFields(folder) {
  return STRING_FIELDS.filter((field) => folder[field] === null);
}

function flagNullFields(folder) {
  const nullFields = getNullFields(folder);
  if (nullFields.length > 0) {
    console.warn(`   ⚠️  Null string fields detected (will break admin UI): ${nullFields.join(", ")}`);
    console.warn(`      Run with --fix to patch this folder.`);
  }
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
