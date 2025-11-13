#!/usr/bin/env node

/**
 * Fetch Builder model metadata (including editingUrlLogic) using the Admin GraphQL API.
 *
 * Usage:
 *   node updateModelFields.js MODEL_ID
 *
 * Environment variables:
 *   - BUILDER_ADMIN_API_KEY (required): Private Builder API key (bpk-***).
 *   - BUILDER_MODEL_ID (optional): Default model ID if not passed on the CLI.
 *
 * Documentation: https://www.builder.io/c/docs/admin-graphql-api
 */

import process from "node:process";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";
const PRIVATE_KEY = "bpk-f1b190065f2947a6b51150cf31441b5f";

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌  Missing BUILDER_ADMIN_API_KEY environment variable.");
    process.exit(1);
  }

  const [, , maybeModelId] = process.argv;
  const modelId = maybeModelId || process.env.BUILDER_MODEL_ID;

  if (!modelId) {
    console.error("❌  Model ID not provided. Pass it as an argument or set BUILDER_MODEL_ID.");
    process.exit(1);
  }

  await logCurrentModel(modelId);
}

main().catch((error) => {
  console.error("❌  Unexpected error while fetching the model.");
  console.error(error);
  process.exit(1);
});

async function logCurrentModel(modelId) {
  console.info(`ℹ️  Fetching current model (${modelId})…`);
  const query = /* GraphQL */ `
    query GetModel($id: String!) {
      model(id: $id) {
        id
        name
        kind
        everything
      }
    }
  `;

  const { response, result } = await graphqlRequest(query, { id: modelId });

  if (!response.ok || result.errors) {
    console.error("❌  Failed to load current model data.");
    if (result.errors) {
      result.errors.forEach((error) => {
        console.error(` • ${error.message}`);
      });
    } else {
      console.error(result);
    }
    process.exit(1);
  }

  const model = result.data?.model;
  let everything = model?.everything;

  if (typeof everything === "string") {
    try {
      everything = JSON.parse(everything);
    } catch {
      // leave as-is if parsing fails
    }
  }

  const editingUrlLogic =
    everything?.editingUrlLogic ??
    everything?.settings?.editingUrlLogic ??
    everything?.options?.editingUrlLogic ??
    null;

  console.info(
    JSON.stringify(
      {
        id: model?.id,
        name: model?.name,
        kind: model?.kind,
        hasEditingUrlLogic: Boolean(editingUrlLogic),
        editingUrlLogic,
      },
      null,
      2,
    ),
  );
}

async function graphqlRequest(query, variables) {
  const response = await fetch(ADMIN_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PRIVATE_KEY}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const result = await response.json();
  return { response, result };
}

