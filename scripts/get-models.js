#!/usr/bin/env node

/**
 * Fetch all models (or a single model by ID) using the Builder Admin GraphQL API.
 *
 * Usage:
 *   node scripts/get-models.js              # list all models
 *   node scripts/get-models.js MODEL_ID     # get a single model by ID
 *
 * Environment variables:
 *   - BUILDER_PRIVATE_KEY (required): Private Builder API key (bpk-***).
 *
 * Documentation: https://www.builder.io/c/docs/admin-api-content#get-models
 */

import process from "node:process";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";
const PRIVATE_KEY = process.env.BUILDER_PRIVATE_KEY || "bpk-ca7b71ed924f431b88341653fa088fc3";

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌  Missing BUILDER_PRIVATE_KEY environment variable.");
    process.exit(1);
  }

  const [, , modelId] = process.argv;

  if (modelId) {
    await getModel(modelId);
  } else {
    await getModels();
  }
}

main().catch((error) => {
  console.error("❌  Unexpected error.");
  console.error(error);
  process.exit(1);
});

// ── Queries ────────────────────────────────────────────────────────────────────

async function getModels() {
  console.info("ℹ️  Fetching all models…");

  const query = /* GraphQL */ `
    query GetModels {
      models {
        id
        name
        kind
        subType
        repeatable
        singleton
        hidden
        archived
        isPage
        examplePageUrl
        helperText
        lastUpdateBy
        everything
      }
    }
  `;

  const { response, result } = await graphqlRequest(query);

  if (!response.ok || result.errors) {
    console.error("❌  Failed to fetch models.");
    printErrors(result.errors);
    process.exit(1);
  }

  const all = result.data?.models ?? [];
  const models = all.filter(
    (m) => m.kind === "page" || m.name === "grid" || m.name === "banner"
  );
  const active = models.filter((m) => !m.archived);
  const archived = models.filter((m) => m.archived);

  console.info(
    `✅  Showing ${models.length} of ${all.length} model(s) — ` +
      `filter: kind=page OR name in [grid, banner] — ` +
      `${active.length} active, ${archived.length} archived.\n`
  );
  displayModels(active, archived);
  dumpFullModels(models);
  printEverythingKeyMatrix(models);
}

async function getModel(id) {
  console.info(`ℹ️  Fetching model (${id})…`);

  const query = /* GraphQL */ `
    query GetModel($id: String!) {
      model(id: $id) {
        id
        name
        kind
        subType
        repeatable
        singleton
        hidden
        archived
        isPage
        examplePageUrl
        helperText
        lastUpdateBy
        everything
      }
    }
  `;

  const { response, result } = await graphqlRequest(query, { id });

  if (!response.ok || result.errors) {
    console.error("❌  Failed to fetch model.");
    printErrors(result.errors);
    process.exit(1);
  }

  const model = result.data?.model;
  if (!model) {
    console.error(`❌  No model found with id: ${id}`);
    process.exit(1);
  }

  console.info(JSON.stringify(model, null, 2));
}

// ── Display ────────────────────────────────────────────────────────────────────

/** Groups models by kind and prints a formatted table. */
function displayModels(active, archived) {
  const byKind = new Map();
  for (const model of active) {
    if (!byKind.has(model.kind)) byKind.set(model.kind, []);
    byKind.get(model.kind).push(model);
  }

  for (const [kind, group] of [...byKind.entries()].sort()) {
    console.info(`── ${kind.toUpperCase()} (${group.length}) ${"─".repeat(Math.max(0, 50 - kind.length))}`);
    for (const m of group.sort((a, b) => a.name.localeCompare(b.name))) {
      const flags = [
        m.singleton && "singleton",
        m.repeatable && "repeatable",
        m.hidden && "hidden",
        m.isPage && "page",
      ]
        .filter(Boolean)
        .join(", ");

      const pathPrefix = m.everything?.pathPrefix ?? null;
      const status = m.archived ? "🔴 archived" : "🟢 active";
      const flagStr = flags ? `  [${flags}]` : "";
      const path = pathPrefix ? `  → ${pathPrefix}` : "";
      console.info(`  • ${m.name}${flagStr}${path}`);
      console.info(`    id: ${m.id}  |  ${status}${m.helperText ? `  |  ${m.helperText}` : ""}`);
    }
    console.info("");
  }

  if (archived.length) {
    console.info(`── ARCHIVED (${archived.length}) ${"─".repeat(44)}`);
    for (const m of archived.sort((a, b) => a.name.localeCompare(b.name))) {
      console.info(`  • ${m.name}  (${m.kind})`);
      console.info(`    id: ${m.id}  |  🔴 archived${m.helperText ? `  |  ${m.helperText}` : ""}`);
    }
    console.info("");
  }
}

// ── Detail dump & diff helpers ─────────────────────────────────────────────────

/** Prints the full JSON (top-level fields + everything blob) for each model. */
function dumpFullModels(models) {
  console.info("══════════════════════════════════════════════════════════════");
  console.info(`  FULL MODEL DETAILS (${models.length})`);
  console.info("══════════════════════════════════════════════════════════════\n");

  for (const m of [...models].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.name.localeCompare(b.name);
  })) {
    console.info(`── ${m.kind.toUpperCase()} :: ${m.name} (${m.id}) ───────────────────────`);
    console.info(JSON.stringify(m, null, 2));
    console.info("");
  }
}

/**
 * Prints a matrix: for each model, which top-level keys exist in `everything`.
 * Makes it trivial to spot which fields differ between models.
 */
function printEverythingKeyMatrix(models) {
  const rows = models.map((m) => ({
    label: `${m.kind}/${m.name}`,
    id: m.id,
    keys: new Set(Object.keys(m.everything ?? {})),
  }));

  const allKeys = [...new Set(rows.flatMap((r) => [...r.keys]))].sort();

  console.info("══════════════════════════════════════════════════════════════");
  console.info(`  EVERYTHING KEY PRESENCE MATRIX  (${allKeys.length} unique keys)`);
  console.info("══════════════════════════════════════════════════════════════");
  console.info("Legend: ✓ present, · missing\n");

  const labelWidth = Math.max(...rows.map((r) => r.label.length), 20);
  const header = "KEY".padEnd(42) + rows.map((r) => r.label.padEnd(labelWidth + 2)).join("");
  console.info(header);
  console.info("─".repeat(header.length));

  for (const key of allKeys) {
    const line =
      key.padEnd(42) +
      rows.map((r) => (r.keys.has(key) ? "✓" : "·").padEnd(labelWidth + 2)).join("");
    console.info(line);
  }

  // Keys unique to a single model (most diagnostic)
  console.info("\n── Keys present in ONLY some models ──");
  const partial = allKeys.filter((k) => {
    const count = rows.filter((r) => r.keys.has(k)).length;
    return count > 0 && count < rows.length;
  });
  if (!partial.length) {
    console.info("  (none — all models share identical everything-key sets)");
  } else {
    for (const k of partial) {
      const present = rows.filter((r) => r.keys.has(k)).map((r) => r.label);
      const missing = rows.filter((r) => !r.keys.has(k)).map((r) => r.label);
      console.info(`  • ${k}`);
      console.info(`      present: ${present.join(", ")}`);
      console.info(`      missing: ${missing.join(", ")}`);
    }
  }
  console.info("");
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function printErrors(errors) {
  if (errors) errors.forEach((e) => console.error(` • ${e.message}`));
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
