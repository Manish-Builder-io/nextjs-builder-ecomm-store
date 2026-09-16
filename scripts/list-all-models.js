#!/usr/bin/env node

/**
 * List EVERY model in a space/org via the Builder Admin GraphQL API — including
 * models that are invisible in the Builder UI because they are hidden,
 * archived, or soft-deleted.
 *
 * Built for diagnosing "my models disappeared" reports: a bad Admin API model
 * write can flip `hidden`/`archived` (or leave a model without the fields the
 * UI needs to render it), which looks like deletion but is fully recoverable.
 *
 * NOTE ON SCOPE: the Admin API has no orgId/spaceId argument — the Bearer
 * private key IS the scope selector. Pass the key for the org/space you want.
 * `--org <id>` is only used to assert the key resolves to the org you expect.
 *
 * Usage:
 *   BUILDER_PRIVATE_KEY=bpk-xxx node scripts/list-all-models.js
 *   node scripts/list-all-models.js --key bpk-xxx
 *   node scripts/list-all-models.js --key bpk-xxx --org 6c20c92cc5704aba88edd4187fbfd8f0
 *   node scripts/list-all-models.js --key bpk-xxx --only hidden,archived
 *   node scripts/list-all-models.js --key bpk-xxx --name site-config   # substring match
 *   node scripts/list-all-models.js --key bpk-xxx --full               # dump full JSON
 *   node scripts/list-all-models.js --key bpk-xxx --json models.json   # write raw JSON
 *
 * Docs: https://www.builder.io/c/docs/admin-api-content#get-models
 */

import fs from "node:fs";
import process from "node:process";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";

/** Org this script was written to investigate; override with --org. */
const DEFAULT_EXPECTED_ORG = "6c20c92cc5704aba88edd4187fbfd8f0";

const args = parseArgs(process.argv.slice(2));
const PRIVATE_KEY = args.key || process.env.BUILDER_PRIVATE_KEY || "";
const EXPECTED_ORG = args.org || DEFAULT_EXPECTED_ORG;

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌  No private key. Pass --key bpk-... or set BUILDER_PRIVATE_KEY.");
    console.error("    The key must belong to the org/space you want to inspect —");
    console.error("    the Admin API cannot query another org by id.");
    process.exit(1);
  }

  await verifyScope();
  const models = await fetchModels();

  const groups = classify(models);
  printSummary(models, groups);

  const wanted = args.only
    ? args.only.split(",").map((s) => s.trim().toLowerCase())
    : ["active", "hidden", "archived", "deleted", "unrenderable"];

  for (const key of ["active", "hidden", "archived", "deleted", "unrenderable"]) {
    if (!wanted.includes(key)) continue;
    printGroup(key, groups[key]);
  }

  printInvisibleReport(groups);

  if (args.full) dumpFullModels(filterByName(models));
  if (args.json) writeJson(args.json, models);
}

main().catch((error) => {
  console.error("❌  Unexpected error.");
  console.error(error);
  process.exit(1);
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

/** Confirms which space/org the key actually points at. */
async function verifyScope() {
  const query = /* GraphQL */ `
    query Scope {
      settings
    }
  `;

  const { response, result } = await graphqlRequest(query);
  if (!response.ok || result.errors) {
    console.error("❌  Key rejected — could not read space settings.");
    printErrors(result.errors);
    process.exit(1);
  }

  const s = result.data?.settings ?? {};
  const label = s.type === "root" ? "ORGANIZATION" : (s.type || "space").toUpperCase();

  console.info("══════════════════════════════════════════════════════════════");
  console.info(`  SCOPE: ${label} — ${s.name ?? "(unnamed)"}`);
  console.info(`  id:     ${s.id ?? "(unknown)"}`);
  console.info(`  parent: ${s.parentOrganization ?? "(none — root org)"}`);
  console.info("══════════════════════════════════════════════════════════════");

  if (EXPECTED_ORG && s.id && s.id !== EXPECTED_ORG) {
    console.warn(
      `\n⚠️  This key resolves to ${s.id}, not the expected ${EXPECTED_ORG}.\n` +
        `    Models below belong to ${s.name ?? "this space"}, NOT the org you asked for.\n` +
        `    Re-run with that org's own private key, or pass --org ${s.id} to silence this.\n`
    );
  } else if (EXPECTED_ORG && s.id === EXPECTED_ORG) {
    console.info(`✅  Key matches expected org ${EXPECTED_ORG}.\n`);
  }
}

async function fetchModels() {
  console.info("ℹ️  Fetching ALL models (no hidden/archived filter)…\n");

  const query = /* GraphQL */ `
    query GetAllModels {
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

  return result.data?.models ?? [];
}

// ── Classification ────────────────────────────────────────────────────────────

/** True when the flag is set either top-level or inside the `everything` blob. */
function flag(model, name) {
  return Boolean(model[name] ?? model.everything?.[name]);
}

/**
 * A model the UI cannot render even though it is not hidden/archived — e.g. an
 * Admin API write that dropped `name`, `kind`, or `fields`. This is the failure
 * mode that looks most like "the model was deleted".
 */
function missingRequired(model) {
  const e = model.everything ?? {};
  const missing = [];
  if (!model.name && !e.name) missing.push("name");
  if (!model.kind && !e.kind) missing.push("kind");
  if (!Array.isArray(e.fields)) missing.push("fields");
  return missing;
}

/**
 * Field values whose SHAPE the Admin API accepts but the UI's mobx-state-tree
 * schema rejects. One of these throws while MST instantiates the models array,
 * which drops every model from the offender onward — or, once the array
 * resets, the entire space's model list. It presents as mass deletion.
 *
 * Known case: `regex` must be `{ pattern, options?, message? }`, never a bare
 * string. Fix with scripts/fix-field-regex.js.
 */
function shapeErrors(model, fields = model.everything?.fields, path = "") {
  const errors = [];
  if (!Array.isArray(fields)) return errors;

  for (const field of fields) {
    const where = `${path}${field?.name ?? "(unnamed)"}`;

    if (!field || typeof field !== "object") {
      errors.push(`${where}: field is not an object`);
      continue;
    }
    if (typeof field.name !== "string" || !field.name) {
      errors.push(`${where}: missing field name`);
    }
    if ("regex" in field) {
      const r = field.regex;
      const valid =
        r === null ||
        r === undefined ||
        (typeof r === "object" && !Array.isArray(r) && typeof r.pattern === "string");
      if (!valid) {
        errors.push(`${where}.regex is ${Array.isArray(r) ? "array" : typeof r} (must be {pattern,…})`);
      }
    }
    if (Array.isArray(field.subFields) && field.subFields.length) {
      errors.push(...shapeErrors(model, field.subFields, `${where}.`));
    }
  }

  return errors;
}

function classify(models) {
  const groups = {
    active: [],
    hidden: [],
    archived: [],
    deleted: [],
    unrenderable: [],
  };

  for (const m of models) {
    if (flag(m, "deleted")) groups.deleted.push(m);
    else if (flag(m, "archived")) groups.archived.push(m);
    else if (flag(m, "hidden")) groups.hidden.push(m);
    else if (missingRequired(m).length || shapeErrors(m).length) groups.unrenderable.push(m);
    else groups.active.push(m);
  }

  return groups;
}

// ── Display ───────────────────────────────────────────────────────────────────

const GROUP_LABELS = {
  active: "🟢 ACTIVE (no flag or shape problem found)",
  hidden: "🟡 HIDDEN (exists, not shown in UI)",
  archived: "🔴 ARCHIVED",
  deleted: "⚫ SOFT-DELETED",
  unrenderable: "🟠 MALFORMED (breaks the UI's model list — see below)",
};

function printSummary(models, groups) {
  console.info(`Total models returned by Admin API: ${models.length}`);
  for (const [key, label] of Object.entries(GROUP_LABELS)) {
    console.info(`  ${label}: ${groups[key].length}`);
  }
  console.info("");
}

function printGroup(key, group) {
  const list = filterByName(group);
  if (!list.length) return;

  const label = GROUP_LABELS[key];
  console.info(`── ${label} (${list.length}) ${"─".repeat(Math.max(0, 60 - label.length))}`);

  for (const m of [...list].sort(byKindThenName)) {
    const flags = [
      m.singleton && "singleton",
      m.repeatable && "repeatable",
      m.isPage && "page",
      flag(m, "hidden") && "hidden",
      flag(m, "archived") && "archived",
      flag(m, "deleted") && "deleted",
    ]
      .filter(Boolean)
      .join(", ");

    const e = m.everything ?? {};
    const missing = missingRequired(m);

    console.info(`  • ${m.name || "(NO NAME)"}  [${m.kind || "no kind"}${flags ? `, ${flags}` : ""}]`);
    console.info(`    id: ${m.id}`);
    if (e.pathPrefix) console.info(`    pathPrefix: ${e.pathPrefix}`);
    if (Array.isArray(e.fields)) console.info(`    fields: ${e.fields.length}`);
    if (m.helperText) console.info(`    helperText: ${m.helperText}`);
    if (m.lastUpdateBy) console.info(`    lastUpdateBy: ${m.lastUpdateBy}`);
    if (e.lastUpdated) console.info(`    lastUpdated: ${formatDate(e.lastUpdated)}`);
    if (e.createdDate) console.info(`    createdDate: ${formatDate(e.createdDate)}`);
    if (missing.length) console.info(`    ⚠️  missing required: ${missing.join(", ")}`);
    for (const err of shapeErrors(m)) console.info(`    ⚠️  bad shape: ${err}`);
  }
  console.info("");
}

/**
 * The actionable part: everything that exists in the API but not in the UI.
 * These are recoverable by setting hidden/archived back to false.
 */
function printInvisibleReport(groups) {
  const invisible = [
    ...groups.hidden,
    ...groups.archived,
    ...groups.deleted,
    ...groups.unrenderable,
  ];

  console.info("══════════════════════════════════════════════════════════════");
  console.info(`  MODELS PRESENT IN API BUT NOT VISIBLE IN UI (${invisible.length})`);
  console.info("══════════════════════════════════════════════════════════════");

  if (!invisible.length) {
    console.info("  (none — every model returned is active and well-formed)\n");
    return;
  }

  for (const m of [...invisible].sort(byKindThenName)) {
    const why = [
      flag(m, "deleted") && "deleted=true",
      flag(m, "archived") && "archived=true",
      flag(m, "hidden") && "hidden=true",
      missingRequired(m).length && `missing ${missingRequired(m).join("/")}`,
      shapeErrors(m).length && shapeErrors(m).join("; "),
    ]
      .filter(Boolean)
      .join(", ");
    console.info(`  • ${m.name || "(NO NAME)"}  (${m.id})  →  ${why}`);
  }

  console.info(
    "\n  Recovery:\n" +
      "   • hidden/archived  → updateModel setting the flag back to false\n" +
      "                        (see scripts/update-model-fields.js)\n" +
      "   • bad shape        → scripts/fix-field-regex.js\n" +
      "   • missing keys     → scripts/repair-model.js\n" +
      "  Content entries are never deleted by any of these states — they\n" +
      "  reappear as soon as the model parses again.\n"
  );
}

function dumpFullModels(models) {
  console.info("══════════════════════════════════════════════════════════════");
  console.info(`  FULL MODEL JSON (${models.length})`);
  console.info("══════════════════════════════════════════════════════════════\n");

  for (const m of [...models].sort(byKindThenName)) {
    console.info(`── ${(m.kind || "?").toUpperCase()} :: ${m.name || "(NO NAME)"} (${m.id}) ──`);
    console.info(JSON.stringify(m, null, 2));
    console.info("");
  }
}

function writeJson(path, models) {
  fs.writeFileSync(path, JSON.stringify(models, null, 2));
  console.info(`💾  Wrote ${models.length} model(s) to ${path}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function filterByName(models) {
  if (!args.name) return models;
  const needle = args.name.toLowerCase();
  return models.filter((m) => (m.name ?? "").toLowerCase().includes(needle));
}

function byKindThenName(a, b) {
  if (a.kind !== b.kind) return (a.kind ?? "").localeCompare(b.kind ?? "");
  return (a.name ?? "").localeCompare(b.name ?? "");
}

function formatDate(msEpoch) {
  if (!msEpoch) return "(not set)";
  return `${new Date(msEpoch).toISOString()}  (${msEpoch})`;
}

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
