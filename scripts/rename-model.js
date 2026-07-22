#!/usr/bin/env node

import process from "node:process";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";

/* ============================= */
/* Configuration                 */
/* ============================= */

const PRIVATE_KEY = process.env.BUILDER_PRIVATE_KEY || "";
const OLD_NAME = process.env.OLD_NAME || "";
const NEW_NAME = process.env.NEW_NAME || "";

if (!PRIVATE_KEY) {
  console.error("Missing BUILDER_PRIVATE_KEY.");
  process.exit(1);
}

if (!OLD_NAME || !NEW_NAME) {
  console.error("Missing OLD_NAME or NEW_NAME.");
  console.error(
    "Usage: BUILDER_PRIVATE_KEY=bpk-xxx OLD_NAME=old-identifier NEW_NAME=new-identifier node scripts/rename-model.js"
  );
  process.exit(1);
}

/* ============================= */
/* Main                          */
/* ============================= */

main().catch((err) => {
  console.error("Unexpected error:");
  console.error(err);
  process.exit(1);
});

async function main() {
  console.log(`Fetching all models...\n`);

  const allModels = await getAllModels(PRIVATE_KEY);

  const model = allModels.find((m) => m.name === OLD_NAME);

  if (!model) {
    console.error(`No model found with identifier "${OLD_NAME}".`);
    console.error("Available models:");
    for (const m of allModels) {
      console.error(`  ${m.name} (${m.id})`);
    }
    process.exit(1);
  }

  console.log(`Found model: ${model.name} (id: ${model.id})`);
  console.log(`Renaming "${OLD_NAME}" → "${NEW_NAME}"...\n`);

  const updated = await updateModelName(model.id, NEW_NAME, PRIVATE_KEY);

  console.log(`Success! Model renamed.`);
  console.log(`  id:   ${updated.id}`);
  console.log(`  name: ${updated.name}`);
}

/* ============================= */
/* GraphQL Helpers               */
/* ============================= */

async function getAllModels(key) {
  const query = `
    query GetAllModels {
      models {
        id
        name
        kind
      }
    }
  `;

  const { result } = await graphqlRequest(query, {}, key);

  if (result.errors) {
    throw new Error(JSON.stringify(result.errors, null, 2));
  }

  return result.data?.models || [];
}

async function updateModelName(id, name, key) {
  const mutation = `
    mutation UpdateModel($body: UpdateModelInput!) {
      updateModel(body: $body) {
        id
        name
      }
    }
  `;

  const { result } = await graphqlRequest(
    mutation,
    {
      body: {
        id,
        data: { name },
      },
    },
    key
  );

  if (result.errors) {
    throw new Error(JSON.stringify(result.errors, null, 2));
  }

  return result.data.updateModel;
}

async function graphqlRequest(query, variables, key) {
  const response = await fetch(ADMIN_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(result, null, 2));
  }

  return { response, result };
}
