#!/usr/bin/env node

/**
 * Flatten object-style `enum` entries on Builder model fields to plain strings.
 *
 * WHY THIS EXISTS
 * The model editor's Fields tab renders each `enum` entry as a chip label, so
 * it only supports string entries. A field written (e.g. via the Admin API)
 * with `enum: [{ label, value }]` makes the Fields tab crash with
 * "Objects are not valid as a React child" ("Oops something went wrong").
 *
 * WHAT IT DOES
 * Walks `fields` (and nested `subFields`) of the target model(s) and rewrites
 * any non-string enum entry to `entry.value ?? entry.label`. Labels are dropped.
 * Only the `fields` key is patched. The original `fields` are backed up to
 * scripts/.backups/ before writing.
 *
 * Scoped to ONE model by id. Only the field(s) with an object enum are changed;
 * every other field is sent back exactly as fetched, and the script verifies
 * that before writing. (The Admin API replaces the whole `fields` array, so the
 * array is re-sent, but nothing else in it differs.)
 *
 * Dry-run by default. Nothing is written without --apply.
 *
 * Usage:
 *   node scripts/fix-object-enums.js --key bpk-xxx --model-id <modelId>
 *   node scripts/fix-object-enums.js --key bpk-xxx --model-id <modelId> --apply
 *
 * Env:
 *   BUILDER_PRIVATE_KEY  Used when --key is omitted.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";
const BACKUP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), ".backups");

const args = parseArgs(process.argv.slice(2));
const PRIVATE_KEY = args.key || process.env.BUILDER_PRIVATE_KEY || "";

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌  No private key. Pass --key bpk-... or set BUILDER_PRIVATE_KEY.");
    process.exit(1);
  }
  const modelId = args["model-id"];
  if (!modelId || modelId === true) {
    console.error("❌  Pass --model-id <modelId>.");
    process.exit(1);
  }

  const model = await fetchModel(modelId);
  if (!model) {
    console.error(`❌  No model with id "${modelId}".`);
    process.exit(1);
  }

  const originalFields = model.everything?.fields ?? [];
  const fields = structuredClone(originalFields);
  const changes = [];
  fixFields(fields, "fields", changes);

  if (!changes.length) {
    console.info(`✅  ${model.name}: nothing to fix — no object-style enums found.`);
    return;
  }

  assertOnlyEnumsChanged(originalFields, fields, changes);

  console.info(`${model.name} (${model.id}) — ${changes.length} field(s) to fix`);
  for (const c of changes) {
    console.info(`  ${c.path}.enum: ${JSON.stringify(c.before)} -> ${JSON.stringify(c.after)}`);
  }

  if (!args.apply) {
    console.info("\n🔍  Dry run. Re-run with --apply to write these changes.");
    return;
  }

  console.info(`Backup written: ${backupFields(model, originalFields)}`);
  await applyFields(model, fields);
  console.info("\nNext: hard-reload the Builder UI (models are cached client-side).");
}

main().catch((error) => {
  console.error("❌  Unexpected error.");
  console.error(error);
  process.exit(1);
});

// ── Fix logic ─────────────────────────────────────────────────────────────────

/** Mutates `fields` in place and records each rewritten enum in `changes`. */
function fixFields(fields, basePath, changes) {
  for (const field of fields ?? []) {
    const fieldPath = `${basePath}.${field.name}`;
    if (Array.isArray(field.enum) && field.enum.some((e) => typeof e !== "string")) {
      const before = field.enum;
      field.enum = flattenEnum(before);
      changes.push({ path: fieldPath, before, after: field.enum });
    }
    if (Array.isArray(field.subFields)) {
      fixFields(field.subFields, `${fieldPath}.subFields`, changes);
    }
  }
}

function flattenEnum(entries) {
  const out = [];
  for (const entry of entries) {
    const value =
      typeof entry === "string" ? entry : String(entry?.value ?? entry?.label ?? "");
    if (value && !out.includes(value)) out.push(value);
  }
  return out;
}

/**
 * Safety net: re-apply ONLY the recorded enum changes onto a fresh copy of the
 * original fields and require the result to equal what we're about to send.
 */
function assertOnlyEnumsChanged(original, fixed, changes) {
  const expected = structuredClone(original);
  for (const c of changes) {
    const parts = c.path.split(".").slice(1); // drop leading "fields"
    let list = expected;
    let field;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === "subFields") {
        list = field.subFields;
        continue;
      }
      field = list.find((f) => f.name === parts[i]);
    }
    field.enum = c.after;
  }
  if (JSON.stringify(expected) !== JSON.stringify(fixed)) {
    console.error("❌  Internal check failed: more than the enum fields would change. Aborting.");
    process.exit(1);
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

function backupFields(model, fields) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(BACKUP_DIR, `${model.name}-enum-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify({ id: model.id, fields }, null, 2));
  return file;
}

async function applyFields(model, fields) {
  const mutation = /* GraphQL */ `
    mutation FixObjectEnums($id: String!, $data: JSONObject!) {
      updateModel(body: { id: $id, data: $data }) {
        id
        name
      }
    }
  `;

  const { response, result } = await graphqlRequest(mutation, {
    id: model.id,
    data: { fields },
  });

  if (!response.ok || result.errors) {
    console.error(`❌  Update failed for ${model.name}.`);
    printErrors(result.errors);
    process.exit(1);
  }
  console.info(`✅  Updated ${model.name}.`);
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchModel(id) {
  const query = /* GraphQL */ `
    query GetModel($id: String!) {
      model(id: $id) {
        id
        name
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

  return result.data?.model ?? null;
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
