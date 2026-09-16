#!/usr/bin/env node

/**
 * Repair a malformed Builder model — one created/overwritten by an Admin API
 * write that omitted the normalized keys the Builder UI expects.
 *
 * WHY THIS EXISTS
 * A model written via `addModel`/`updateModel` with a hand-rolled JSON body
 * keeps only the keys you sent. Builder's own model editor writes ~60 keys;
 * an API-generated model can end up with ~44 and with `hidden`/`isPage` set to
 * `null` instead of `false`. Such a model is returned normally by the Admin API
 * (so it looks perfectly healthy in scripts/list-all-models.js) but can break
 * the UI's model list while rendering — hiding every model after it. The result
 * looks exactly like "my models were deleted", while no data was lost.
 *
 * WHAT IT DOES
 * Fills in keys the target model is MISSING, using a healthy reference model in
 * the same space as the source of defaults, and coerces null booleans to false.
 * It never touches content-bearing or identity keys (fields, schema, name, id,
 * hooks, webhooks, …) — see IDENTITY_KEYS.
 *
 * Dry-run by default. Nothing is written without --apply.
 *
 * Usage:
 *   node scripts/repair-model.js --key bpk-xxx --model chronique
 *   node scripts/repair-model.js --key bpk-xxx --model chronique --reference person
 *   node scripts/repair-model.js --key bpk-xxx --model chronique --apply
 *
 * Env:
 *   BUILDER_PRIVATE_KEY  Used when --key is omitted.
 */

import process from "node:process";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";

const args = parseArgs(process.argv.slice(2));
const PRIVATE_KEY = args.key || process.env.BUILDER_PRIVATE_KEY || "";

/**
 * Keys that are specific to a model's identity or content. Copying these from
 * a reference model would corrupt the target, so they are never patched.
 */
const IDENTITY_KEYS = new Set([
  "id",
  "name",
  "kind",
  "subType",
  "fields",
  "schema",
  "hooks",
  "webhooks",
  "defaultQuery",
  "requiredTargets",
  "displayName",
  "helperText",
  "examplePageUrl",
  "nameField",
  "repeatable",
  "singleton",
  "createdBy",
  "createdDate",
  "updatedAt",
  "lastUpdateBy",
  "apiGenerated",
  "archived",
]);

/** Booleans that must never be null — the UI reads them without guarding. */
const BOOLEAN_KEYS = [
  "hidden",
  "hideFromUI",
  "isPage",
  "archived",
  "componentsOnlyMode",
  "bigData",
  "clientSideOnly",
  "getSchemaFromPage",
  "individualEmbed",
  "autoTracked",
  "hideOptions",
];

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌  No private key. Pass --key bpk-... or set BUILDER_PRIVATE_KEY.");
    process.exit(1);
  }
  if (!args.model) {
    console.error("❌  Pass --model <name|id> — the model to repair.");
    process.exit(1);
  }

  const models = await fetchModels();
  const target = pick(models, args.model);
  if (!target) {
    console.error(`❌  No model matching "${args.model}".`);
    process.exit(1);
  }

  const reference = args.reference
    ? pick(models, args.reference)
    : pickHealthiest(models, target);

  if (!reference) {
    console.error("❌  Could not find a healthy reference model to copy defaults from.");
    process.exit(1);
  }

  console.info(`Target model:    ${target.name} (${target.id})  — ${keyCount(target)} keys`);
  console.info(`Reference model: ${reference.name} (${reference.id})  — ${keyCount(reference)} keys\n`);

  const patch = buildPatch(target, reference);
  const changes = Object.keys(patch);

  if (!changes.length) {
    console.info("✅  Nothing to repair — target already has every normalized key.");
    return;
  }

  console.info(`── PATCH (${changes.length} key(s)) ──`);
  console.info(JSON.stringify(patch, null, 2));
  console.info("");
  const untouched = [...IDENTITY_KEYS].filter((k) => !(k in patch));
  console.info("Never copied from the reference (identity/content keys):");
  console.info(`  ${untouched.join(", ")}\n`);

  if (!args.apply) {
    console.info("🔍  Dry run. Re-run with --apply to write this patch.");
    return;
  }

  await applyPatch(target.id, patch);
}

main().catch((error) => {
  console.error("❌  Unexpected error.");
  console.error(error);
  process.exit(1);
});

// ── Patch construction ────────────────────────────────────────────────────────

/**
 * Builds the minimal patch: keys present on the reference but missing on the
 * target, plus null-boolean coercions and the two derived identity defaults.
 */
function buildPatch(target, reference) {
  const t = target.everything ?? {};
  const r = reference.everything ?? {};
  const patch = {};

  // 1. Keys the reference has and the target lacks entirely.
  for (const [key, value] of Object.entries(r)) {
    if (IDENTITY_KEYS.has(key)) continue;
    if (key in t) continue;
    patch[key] = value;
  }

  // 2. Booleans that exist but are null/undefined.
  for (const key of BOOLEAN_KEYS) {
    if (IDENTITY_KEYS.has(key)) continue;
    const current = key in patch ? patch[key] : t[key];
    if (current === null || current === undefined) {
      patch[key] = key === "isPage" ? (t.kind ?? target.kind) === "page" : false;
    }
  }

  // 3. Derived identity defaults — never copied from the reference.
  if (t.displayName === undefined || t.displayName === null) {
    patch.displayName = t.name ?? target.name;
  }
  if (t.designerVersion === undefined || t.designerVersion === null) {
    patch.designerVersion = r.designerVersion ?? 1;
  }

  return patch;
}

async function applyPatch(id, patch) {
  const mutation = /* GraphQL */ `
    mutation RepairModel($id: String!, $data: JSONObject!) {
      updateModel(body: { id: $id, data: $data }) {
        id
        name
        hidden
        archived
        designerVersion
      }
    }
  `;

  const { response, result } = await graphqlRequest(mutation, { id, data: patch });

  if (!response.ok || result.errors) {
    console.error("❌  Patch failed.");
    printErrors(result.errors);
    process.exit(1);
  }

  console.info("✅  Patch applied.");
  console.info(JSON.stringify(result.data?.updateModel, null, 2));
  console.info(
    "\nNext: hard-reload the Builder UI (models are cached client-side) and\n" +
      "re-run scripts/list-all-models.js to confirm the model set is unchanged."
  );
}

// ── Selection ─────────────────────────────────────────────────────────────────

function pick(models, needle) {
  return (
    models.find((m) => m.id === needle) ||
    models.find((m) => m.name === needle) ||
    models.find((m) => (m.name ?? "").toLowerCase() === String(needle).toLowerCase())
  );
}

/** The model with the most keys, preferring one of the same kind. */
function pickHealthiest(models, target) {
  const candidates = models.filter((m) => m.id !== target.id && !m.archived);
  const sameKind = candidates.filter((m) => m.kind === target.kind);
  const pool = sameKind.length ? sameKind : candidates;
  return pool.sort((a, b) => keyCount(b) - keyCount(a))[0];
}

function keyCount(model) {
  return Object.keys(model.everything ?? {}).length;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchModels() {
  const query = /* GraphQL */ `
    query GetAllModels {
      models {
        id
        name
        kind
        archived
        hidden
        isPage
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

  return result.data?.models ?? [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Supports `--flag`, `--key value`, and `--key=value`. */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const [name, inlineValue] = arg.slice(2).split("=");
    if (inlineValue !== undefined) {
      out[name] = inlineValue;
    } else if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
      out[name] = argv[++i];
    } else {
      out[name] = true;
    }
  }
  return out;
}

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
