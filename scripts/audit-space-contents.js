#!/usr/bin/env node

/**
 * READ-ONLY audit of everything in a Builder space/org that can block account
 * deletion ("Organization has too many models, contents, or assets to delete").
 *
 * It counts, through the Admin GraphQL API, the Write API and (optionally) the
 * Content API:
 *   - ALL models (data, page, section, component/symbol, …) including hidden,
 *     archived, soft-deleted and malformed ones the UI never shows
 *   - entries per model (drafts / archived / unpublished included)
 *   - entries the Content API cannot see but the Write API can (hidden content)
 *   - assets and folders
 *
 * NOTE ON SCOPE: neither API accepts an org/space id — the Bearer private key IS
 * the scope selector. Pass the key of the org/space you want to inspect.
 * `--org <id>` only asserts that the key resolves to the org you expect.
 * For a root org, run the script once per child-space key as well.
 *
 * Usage:
 *   BUILDER_PRIVATE_KEY=bpk-xxx node scripts/audit-space-contents.js
 *   node scripts/audit-space-contents.js --key bpk-xxx --org 03f7cb95cb85458687e52870c06dfd1c
 *   node scripts/audit-space-contents.js --key bpk-xxx --public-key <pub> # adds Content API cross-check
 *   node scripts/audit-space-contents.js --key bpk-xxx --model blog-article
 *   node scripts/audit-space-contents.js --key bpk-xxx --json audit.json
 *
 * Env fallbacks: BUILDER_PRIVATE_KEY, BUILDER_PUBLIC_KEY
 *
 * Docs: https://www.builder.io/c/docs/admin-api-content
 *       https://www.builder.io/c/docs/write-api
 */

import fs from "node:fs";
import process from "node:process";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";
const WRITE_API_BASE = "https://builder.io/api/v1/write";
const CONTENT_API_BASE = "https://cdn.builder.io/api/v3/content";
const PAGE_LIMIT = 100;
const MAX_PAGES = 1000; // safety stop: 100k entries per model

const args = parseArgs(process.argv.slice(2));
const PRIVATE_KEY = args.key || process.env.BUILDER_PRIVATE_KEY || "";
let PUBLIC_KEY = args["public-key"] || process.env.BUILDER_PUBLIC_KEY || "";
const EXPECTED_ORG = typeof args.org === "string" ? args.org : "";

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌  No private key. Pass --key bpk-... or set BUILDER_PRIVATE_KEY.");
    if (EXPECTED_ORG) {
      console.error(`    An org id (${EXPECTED_ORG}) alone is not enough: the APIs cannot`);
      console.error("    query another org by id. Use that org's own private key.");
    }
    process.exit(1);
  }

  const settings = await verifyScope();
  const models = await fetchModels();
  const groups = classify(models);
  const targets = models.filter((m) => !args.model || m.name === args.model);

  const contentRows = [];
  for (const [i, model] of targets.entries()) {
    process.stdout.write(`\r  Counting entries ${i + 1}/${targets.length}: ${model.name}`.padEnd(80));
    contentRows.push(await countModelContent(model));
  }
  if (targets.length) process.stdout.write("\n\n");

  const assets = args.model ? null : await fetchAssets();
  const folders = args.model ? null : await fetchFolders();

  printModelSummary(models, groups);
  printContentTable(contentRows);
  printAssets(assets, folders);
  printBlockers({ groups, contentRows, assets, folders });

  if (typeof args.json === "string") {
    fs.writeFileSync(
      args.json,
      JSON.stringify({ settings, groups: summarizeGroups(groups), contentRows, assets, folders }, null, 2)
    );
    console.info(`💾  Wrote report to ${args.json}`);
  }
}

main().catch((error) => {
  console.error("❌  Unexpected error.");
  console.error(error);
  process.exit(1);
});

// ── Scope ─────────────────────────────────────────────────────────────────────

async function verifyScope() {
  const { response, result } = await graphqlRequest(`query Scope { settings }`);
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
        `    Results below describe ${s.name ?? "this space"}, NOT the org you asked for.\n`
    );
  } else if (EXPECTED_ORG) {
    console.info(`✅  Key matches expected org ${EXPECTED_ORG}.`);
  }

  if (s.type === "root") {
    console.info(
      "ℹ️  This is a root org. Child spaces are counted separately — run this script\n" +
        "    with each child space's private key too; leftover data there blocks org deletion.\n"
    );
  }

  if (!PUBLIC_KEY) {
    PUBLIC_KEY = s.apiKey || s.publicKey || s.publicApiKey || "";
    if (PUBLIC_KEY) console.info(`ℹ️  Using public key from settings for Content API cross-check.\n`);
    else console.info("ℹ️  No public key (--public-key) — Content API cross-check will be skipped.\n");
  }

  return s;
}

// ── Models ────────────────────────────────────────────────────────────────────

async function fetchModels() {
  const query = /* GraphQL */ `
    query GetAllModels {
      models {
        id
        name
        kind
        subType
        singleton
        hidden
        archived
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

function flag(model, name) {
  return Boolean(model[name] ?? model.everything?.[name]);
}

function stateOf(model) {
  if (flag(model, "deleted")) return "deleted";
  if (flag(model, "archived")) return "archived";
  if (flag(model, "hidden")) return "hidden";
  const e = model.everything ?? {};
  if (!model.name || !model.kind || !Array.isArray(e.fields)) return "malformed";
  return "active";
}

function classify(models) {
  const groups = { active: [], hidden: [], archived: [], deleted: [], malformed: [] };
  for (const m of models) groups[stateOf(m)].push(m);
  return groups;
}

function summarizeGroups(groups) {
  return Object.fromEntries(
    Object.entries(groups).map(([k, v]) => [k, v.map((m) => ({ id: m.id, name: m.name, kind: m.kind }))])
  );
}

// ── Content (Write API primary, Content API cross-check) ──────────────────────

async function countModelContent(model) {
  const row = {
    model: model.name,
    id: model.id,
    kind: model.kind,
    state: stateOf(model),
    writeApi: null,
    contentApi: null,
    byStatus: {},
    error: null,
  };

  try {
    const entries = await listWriteApi(model.name);
    row.writeApi = entries.length;
    for (const e of entries) {
      const status = e.published ?? e.data?.published ?? "unknown";
      row.byStatus[status] = (row.byStatus[status] ?? 0) + 1;
    }
  } catch (err) {
    row.error = `write api: ${err.message}`;
  }

  if (PUBLIC_KEY) {
    try {
      row.contentApi = await countContentApi(model.name);
    } catch (err) {
      row.error = [row.error, `content api: ${err.message}`].filter(Boolean).join("; ");
    }
  }

  return row;
}

/** Pages through GET /write/{model}. Returns all entries (id + status only matter). */
async function listWriteApi(modelName) {
  const all = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${WRITE_API_BASE}/${encodeURIComponent(modelName)}`);
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("offset", String(page * PAGE_LIMIT));
    url.searchParams.set("includeUnpublished", "true");
    url.searchParams.set("includeArchived", "true");

    const res = await fetch(url, { headers: { Authorization: `Bearer ${PRIVATE_KEY}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);

    const body = await res.json();
    const results = Array.isArray(body) ? body : body.results ?? [];
    all.push(...results);
    if (results.length < PAGE_LIMIT) break;
  }
  return all;
}

async function countContentApi(modelName) {
  let total = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${CONTENT_API_BASE}/${encodeURIComponent(modelName)}`);
    url.searchParams.set("apiKey", PUBLIC_KEY);
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("offset", String(page * PAGE_LIMIT));
    url.searchParams.set("noTargeting", "true");
    url.searchParams.set("includeUnpublished", "true");
    url.searchParams.set("cacheSeconds", "0");
    url.searchParams.set("fields", "id");

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const results = (await res.json())?.results ?? [];
    total += results.length;
    if (results.length < PAGE_LIMIT) break;
  }
  return total;
}

// ── Assets & folders (Admin API) ──────────────────────────────────────────────

async function fetchAssets() {
  const all = [];
  try {
    for (let offset = 0, page = 0; page < MAX_PAGES; page++) {
      const query = `{ assets(input: { limit: ${PAGE_LIMIT}, offset: ${offset} }) { id name folders } }`;
      const { response, result } = await graphqlRequest(query);
      if (!response.ok || result.errors) {
        // Retry without the optional `folders` selection
        const retry = await graphqlRequest(
          `{ assets(input: { limit: ${PAGE_LIMIT}, offset: ${offset} }) { id name } }`
        );
        if (!retry.response.ok || retry.result.errors) {
          throw new Error(retry.result.errors?.map((e) => e.message).join(", ") || `HTTP ${retry.response.status}`);
        }
        const rows = retry.result.data?.assets ?? [];
        all.push(...rows);
        if (rows.length < PAGE_LIMIT) break;
        offset += rows.length;
        continue;
      }
      const rows = result.data?.assets ?? [];
      all.push(...rows);
      if (rows.length < PAGE_LIMIT) break;
      offset += rows.length;
    }
    return { count: all.length, sample: all.slice(0, 10), error: null };
  } catch (err) {
    return { count: null, sample: [], error: err.message };
  }
}

async function fetchFolders() {
  try {
    const { response, result } = await graphqlRequest(
      `query GetFolders { getFolders { id name archived entries parentFolder } }`
    );
    if (!response.ok || result.errors) {
      throw new Error(result.errors?.map((e) => e.message).join(", ") || `HTTP ${response.status}`);
    }
    const folders = result.data?.getFolders ?? [];
    return {
      count: folders.length,
      archived: folders.filter((f) => f.archived).length,
      entryRefs: folders.reduce((n, f) => n + (f.entries?.length ?? 0), 0),
      error: null,
    };
  } catch (err) {
    return { count: null, archived: 0, entryRefs: 0, error: err.message };
  }
}

// ── Display ───────────────────────────────────────────────────────────────────

function printModelSummary(models, groups) {
  const byKind = {};
  for (const m of models) byKind[m.kind ?? "(none)"] = (byKind[m.kind ?? "(none)"] ?? 0) + 1;

  console.info(`── MODELS: ${models.length} total ──`);
  console.info(
    "  by state: " + Object.entries(groups).map(([k, v]) => `${k}=${v.length}`).join("  ")
  );
  console.info(
    "  by kind:  " + Object.entries(byKind).map(([k, v]) => `${k}=${v}`).join("  ") + "\n"
  );
}

function printContentTable(rows) {
  console.info(`── ENTRIES PER MODEL ──`);
  console.info(
    `  ${"model".padEnd(34)} ${"kind".padEnd(10)} ${"state".padEnd(10)} ${"write".padStart(6)} ${"content".padStart(8)}  status`
  );
  let writeTotal = 0;
  for (const r of rows) {
    writeTotal += r.writeApi ?? 0;
    const status = Object.entries(r.byStatus).map(([k, v]) => `${k}:${v}`).join(" ");
    console.info(
      `  ${String(r.model).slice(0, 34).padEnd(34)} ${String(r.kind ?? "-").padEnd(10)} ${r.state.padEnd(10)} ` +
        `${String(r.writeApi ?? "?").padStart(6)} ${String(r.contentApi ?? "-").padStart(8)}  ${status}` +
        (r.error ? `  ⚠️ ${r.error}` : "")
    );
  }
  console.info(`  ${"TOTAL entries (write api)".padEnd(57)} ${String(writeTotal).padStart(6)}\n`);
}

function printAssets(assets, folders) {
  if (!assets && !folders) return;
  console.info(`── ASSETS & FOLDERS ──`);
  if (assets) {
    console.info(
      assets.error ? `  assets:  ⚠️ ${assets.error}` : `  assets:  ${assets.count}`
    );
  }
  if (folders) {
    console.info(
      folders.error
        ? `  folders: ⚠️ ${folders.error}`
        : `  folders: ${folders.count} (${folders.archived} archived, ${folders.entryRefs} entry refs)`
    );
  }
  console.info("");
}

function printBlockers({ groups, contentRows, assets, folders }) {
  const blockers = [];

  for (const r of contentRows) {
    if ((r.writeApi ?? 0) > 0 && r.state !== "active") {
      blockers.push(`${r.state.toUpperCase()} model "${r.model}" still holds ${r.writeApi} entr${r.writeApi === 1 ? "y" : "ies"}`);
    }
    if (r.contentApi !== null && r.writeApi !== null && r.writeApi > r.contentApi) {
      blockers.push(
        `model "${r.model}": write api sees ${r.writeApi}, content api only ${r.contentApi} → ${r.writeApi - r.contentApi} entries invisible to normal listing`
      );
    }
    if (r.error) blockers.push(`model "${r.model}": could not fully count (${r.error})`);
  }
  for (const state of ["hidden", "archived", "deleted", "malformed"]) {
    if (groups[state].length) blockers.push(`${groups[state].length} ${state} model(s) exist and count toward the limit`);
  }
  if (assets?.count > 0) blockers.push(`${assets.count} asset(s) present`);
  if (folders?.archived > 0) blockers.push(`${folders.archived} archived folder(s) present`);

  console.info("══════════════════════════════════════════════════════════════");
  console.info(`  LIKELY DELETION BLOCKERS (${blockers.length})`);
  console.info("══════════════════════════════════════════════════════════════");
  if (!blockers.length) {
    console.info("  (none found — space looks empty. If delete still fails, the limit may be");
    console.info("   hit by child spaces; re-run with each child space's key.)\n");
    return;
  }
  for (const b of blockers) console.info(`  • ${b}`);
  console.info(
    "\n  Remediation:\n" +
      "   • entries  → MODEL_NAME=<model> scripts/delete-all-model-content.js (DRY_RUN=true first)\n" +
      "   • assets   → scripts/delete-all-assets.js\n" +
      "   • hidden/archived models → unhide (scripts/update-model-fields.js) so they can be\n" +
      "     emptied, then re-run this audit\n" +
      "   • malformed models → scripts/repair-model.js / fix-field-regex.js\n"
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Supports `--flag`, `--key value`, and `--key=value`. */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const [name, inlineValue] = arg.slice(2).split("=");
    if (inlineValue !== undefined) out[name] = inlineValue;
    else if (argv[i + 1] && !argv[i + 1].startsWith("--")) out[name] = argv[++i];
    else out[name] = true;
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
