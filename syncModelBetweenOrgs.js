#!/usr/bin/env node

import process from "node:process";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";

/* ============================= */
/* Configuration                 */
/* ============================= */

const SOURCE_KEY = "SOURCE_SPACE_PRIVATE_KEY";
const DEST_KEY = "DESTINATION_SPACE_PRIVATE_KEY";

const SOURCE_MODEL_ID =
  "SOURCE_MODEL_ID";

const DEST_MODEL_ID =
  "DEST_MODEL_ID";

if (!SOURCE_KEY || !DEST_KEY) {
  console.error("Missing private keys.");
  process.exit(1);
}

if (!SOURCE_MODEL_ID || !DEST_MODEL_ID) {
  console.error("Missing model IDs.");
  process.exit(1);
}

if (SOURCE_MODEL_ID === DEST_MODEL_ID && SOURCE_KEY === DEST_KEY) {
  console.error("Source and destination cannot be identical.");
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
  console.log(`Fetching source model (${SOURCE_MODEL_ID})...`);
  const source = await getModel(SOURCE_MODEL_ID, SOURCE_KEY);

  console.log(`Fetching destination model (${DEST_MODEL_ID})...`);
  const destination = await getModel(DEST_MODEL_ID, DEST_KEY);

  const sourceFields = source.everything?.fields || [];
  const destinationFields = destination.everything?.fields || [];

  if (deepEqual(sourceFields, destinationFields)) {
    console.log("No differences detected in fields. Skipping update.");
    return;
  }

  console.log("Fields differ. Destination will be synced.");
  console.log("--------------------------------------------------");

  console.log("\nDestination Fields (before):");
  console.log(JSON.stringify(destinationFields, null, 2));

  console.log("\nSource Fields (authoritative):");
  console.log(JSON.stringify(sourceFields, null, 2));

  console.log("\nApplying update...\n");

  await updateModel(DEST_MODEL_ID, DEST_KEY, sourceFields);

  console.log("Update operation complete.");
}

/* ============================= */
/* GraphQL Helpers               */
/* ============================= */

async function getModel(id, key) {
  const query = `
    query GetModel($id: String!) {
      model(id: $id) {
        id
        name
        kind
        everything
      }
    }
  `;

  const { result } = await graphqlRequest(query, { id }, key);

  if (result.errors) {
    throw new Error(JSON.stringify(result.errors, null, 2));
  }

  const model = result.data?.model;

  if (!model) {
    throw new Error("Model not found.");
  }

  if (typeof model.everything === "string") {
    model.everything = JSON.parse(model.everything);
  }

  return model;
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
          fields: fields, // ONLY send fields
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

/* ============================= */
/* Utility                       */
/* ============================= */

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
