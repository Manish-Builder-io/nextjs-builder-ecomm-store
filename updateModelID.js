#!/usr/bin/env node

import process from "node:process";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";

/* ============================= */
/* Configuration                 */
/* ============================= */

const SOURCE_KEY = "bpk-d791096d22984b578a3afc854c1a0fa7";

if (!SOURCE_KEY) {
  console.error("Missing private key.");
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
  console.log("Fetching all models from source space...\n");

  const allModels = await getAllModels(SOURCE_KEY);

  const pageModels = allModels.filter(
    (model) => model.kind === "page"
  );

  console.log(`Total Page Models Found: ${pageModels.length}`);
  console.log("--------------------------------------------------\n");

  for (const model of pageModels) {
    if (typeof model.everything === "string") {
      model.everything = JSON.parse(model.everything);
    }

    console.log("Model ID:", model.id);
    console.log("Model Name:", model.name);
    console.log("Model Kind:", model.kind);
    console.log("Fields:");
    console.log(
      JSON.stringify(model.everything?.fields || [], null, 2)
    );
    console.log("==================================================\n");

    /*
    // Example update call (disabled for testing)
    await updateModel(model.id, SOURCE_KEY, model.everything?.fields || []);
    */
  }

  console.log("Completed listing all page models.");
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
        everything
      }
    }
  `;

  const { result } = await graphqlRequest(query, {}, key);

  if (result.errors) {
    throw new Error(JSON.stringify(result.errors, null, 2));
  }

  return result.data?.models || [];
}

async function updateModel(id, key, fields) {
  const mutation = `
    mutation UpdateModel($body: UpdateModelInput!) {
      updateModel(body: $body) {
        id
      }
    }
  `;

  const { result } = await graphqlRequest(
    mutation,
    {
      body: {
        id,
        data: {
          fields
        },
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
