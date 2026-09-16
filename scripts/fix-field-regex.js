#!/usr/bin/env node

/**
 * Normalize malformed `regex` values on Builder model fields.
 *
 * ROOT CAUSE THIS FIXES
 * Builder stores a field's regex validation as an OBJECT:
 *     { pattern: string, options?: string, message?: string }
 * An Admin API write that sets it to a bare string instead:
 *     "regex": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
 * is accepted by the Admin API and reads back fine — but the Builder UI parses
 * models through mobx-state-tree, where the string fails to match the union:
 *
 *   Error: [mobx-state-tree] No matching type for union
 *     ({ pattern: string; options: (string | undefined?);
 *        message: (string | undefined?) } | undefined?)
 *   Could not apply snapshot, resetting array
 *
 * MST throws while instantiating the models array, so the UI drops models from
 * the offending one onward — or, once the array resets, every model in the
 * space. It looks exactly like mass deletion; no content is lost.
 *
 * Scans every model (including nested subFields) and rewrites string regexes
 * into the object form, preserving the pattern verbatim.
 *
 * Dry-run by default. Nothing is written without --apply.
 *
 * Usage:
 *   node scripts/fix-field-regex.js --key bpk-xxx
 *   node scripts/fix-field-regex.js --key bpk-xxx --model chronique
 *   node scripts/fix-field-regex.js --key bpk-xxx --apply
 *
 * Env:
 *   BUILDER_PRIVATE_KEY  Used when --key is omitted.
 */

import process from "node:process";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";

const args = parseArgs(process.argv.slice(2));
const PRIVATE_KEY = args.key || process.env.BUILDER_PRIVATE_KEY || "";

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌  No private key. Pass --key bpk-... or set BUILDER_PRIVATE_KEY.");
    process.exit(1);
  }

  const models = await fetchModels();
  const scope = args.model
    ? models.filter((m) => m.id === args.model || m.name === args.model)
    : models;

  if (!scope.length) {
    console.error(`❌  No model matching "${args.model}".`);
    process.exit(1);
  }

  const repairs = [];

  for (const model of scope) {
    const fields = model.everything?.fields;
    if (!Array.isArray(fields)) continue;

    const found = [];
    const fixed = normalizeFields(fields, model.name, found);
    if (found.length) repairs.push({ model, fields: fixed, found });
  }

  if (!repairs.length) {
    console.info("✅  No malformed regex values found. Nothing to fix.");
    return;
  }

  console.info(`── MALFORMED REGEX VALUES (${repairs.reduce((n, r) => n + r.found.length, 0)}) ──\n`);
  for (const { model, found } of repairs) {
    for (const f of found) {
      console.info(`  ${model.name} → ${f.path}`);
      console.info(`    before: ${JSON.stringify(f.before)}`);
      console.info(`    after:  ${JSON.stringify(f.after)}\n`);
    }
  }

  if (!args.apply) {
    console.info("🔍  Dry run. Re-run with --apply to write these fixes.");
    return;
  }

  for (const { model, fields } of repairs) {
    await writeFields(model, fields);
  }

  console.info(
    "\nNext: hard-reload the Builder UI (Cmd+Shift+R) — the model list is cached\n" +
      "client-side, and the MST snapshot must be rebuilt from the fixed data."
  );
}

main().catch((error) => {
  console.error("❌  Unexpected error.");
  console.error(error);
  process.exit(1);
});

// ── Normalization ─────────────────────────────────────────────────────────────

/** True when `regex` already matches the shape the UI's MST schema expects. */
function isValidRegex(value) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "object" &&
      !Array.isArray(value) &&
      typeof value.pattern === "string")
  );
}

/**
 * Returns a deep copy of `fields` with every malformed regex converted to the
 * object form. Appends a record to `found` for each conversion.
 */
function normalizeFields(fields, path, found) {
  return fields.map((field) => {
    const next = { ...field };
    const fieldPath = `${path}.${field.name}`;

    if ("regex" in next && !isValidRegex(next.regex)) {
      const before = next.regex;
      // A bare string is the pattern itself; anything else is unusable.
      next.regex =
        typeof before === "string"
          ? { pattern: before, options: "", message: "" }
          : undefined;
      if (next.regex === undefined) delete next.regex;
      found.push({ path: fieldPath, before, after: next.regex ?? "(removed)" });
    }

    if (Array.isArray(next.subFields) && next.subFields.length) {
      next.subFields = normalizeFields(next.subFields, fieldPath, found);
    }

    return next;
  });
}

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchModels() {
  const query = /* GraphQL */ `
    query GetAllModels {
      models {
        id
        name
        kind
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

async function writeFields(model, fields) {
  const mutation = /* GraphQL */ `
    mutation FixFields($id: String!, $data: JSONObject!) {
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
    console.error(`❌  Failed to update ${model.name}.`);
    printErrors(result.errors);
    process.exit(1);
  }

  console.info(`✅  Fixed ${model.name} (${model.id}).`);
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
