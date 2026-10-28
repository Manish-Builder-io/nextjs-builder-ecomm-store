#!/usr/bin/env node

/**
 * Interactive Builder.io space cleanup. Combines delete-all-assets.js,
 * delete-all-model-content.js and the user listing from get-space-info.js
 * into one guided tool, for spaces that have too much content/assets to be
 * deleted from the Builder UI.
 *
 * Flow:
 *   1. Resolves the space from the private key and prints a summary
 *      (name, id, content entries per model, assets, users).
 *   2. Menu: delete content / assets / users / models / refresh / quit.
 *   3. Every destructive step shows exactly what will go and requires typing
 *      the space name to confirm.
 *
 * Usage:
 *   BUILDER_PRIVATE_KEY=bpk-xxx node scripts/space-cleanup.js
 *   node scripts/space-cleanup.js --key bpk-xxx
 *   node scripts/space-cleanup.js --key bpk-xxx --dry-run     # never deletes
 *
 * Env / flags:
 *   BUILDER_PRIVATE_KEY / --key   Private key of the space (required). The key
 *                                 is the scope selector: the Admin API has no
 *                                 space id argument.
 *   BUILDER_PUBLIC_KEY  / --public-key
 *                                 Optional. Defaults to the space id, which is
 *                                 the space's public API key.
 *   DRY_RUN=true        / --dry-run
 *                                 List what would be deleted, delete nothing.
 *   --concurrency <n>             Parallel delete requests (default 5).
 *
 * Notes:
 *   - Deleting content/assets is NOT recoverable.
 *   - The space owner (settings.ownerId) is never offered for removal.
 *   - User removal uses whichever removal mutation the Admin API exposes
 *     (discovered via introspection). If none is exposed, users must be
 *     removed from the Builder UI and the script says so.
 *   - After everything is emptied, delete the space from the Builder UI.
 */

import process from "node:process";
import readline from "node:readline/promises";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";
const CONTENT_API_BASE = "https://cdn.builder.io/api/v3/content";
const WRITE_API_BASE = "https://builder.io/api/v1/write";
const ASSETS_API_BASE = "https://cdn.builder.io/api/v1/assets";
const PAGE_LIMIT = 100;

const args = parseArgs(process.argv.slice(2));
const PRIVATE_KEY = args.key || process.env.BUILDER_PRIVATE_KEY || "";
let PUBLIC_KEY = args["public-key"] || process.env.BUILDER_PUBLIC_KEY || "";
const DRY_RUN = args["dry-run"] === true || process.env.DRY_RUN === "true";
const CONCURRENCY = Math.max(1, Number(args.concurrency) || 5);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌  No private key. Pass --key bpk-... or set BUILDER_PRIVATE_KEY.");
    process.exit(1);
  }

  const space = await loadSpace();
  if (!PUBLIC_KEY) PUBLIC_KEY = space.settings.id;
  if (!PUBLIC_KEY) {
    console.error("❌  Could not determine the public key. Pass --public-key.");
    process.exit(1);
  }

  console.info(`\n══ SPACE ─ ${space.name} ──`);
  console.info(`  id:    ${space.settings.id}`);
  console.info(`  type:  ${space.settings.type ?? "-"}`);
  if (space.settings.type === "root") {
    console.info("  ⚠️  This key belongs to an ORGANIZATION (root), not a single space.");
  }
  if (DRY_RUN) console.info("  mode:  DRY RUN — nothing will be deleted");

  const state = { models: null, assets: null, users: space.users };

  while (true) {
    await printOverview(state);
    console.info(
      [
        "",
        "What do you want to do?",
        "  1) Delete content entries (pick models)",
        "  2) Delete assets",
        "  3) Remove users",
        "  4) Delete models (the default \"page\" model is protected)",
        "  5) Refresh counts",
        "  q) Quit",
      ].join("\n")
    );
    const choice = (await ask("> ")).toLowerCase();

    try {
      if (choice === "1") await deleteContentFlow(space, state);
      else if (choice === "2") await deleteAssetsFlow(space, state);
      else if (choice === "3") await removeUsersFlow(space, state);
      else if (choice === "4") await deleteModelsFlow(space, state);
      else if (choice === "5") {
        state.models = null;
        state.assets = null;
        state.users = (await loadSpace()).users;
      } else if (choice === "q" || choice === "quit") break;
      else console.info("Unknown option.");
    } catch (err) {
      console.error(`❌  ${err.message}`);
    }
  }

  console.info(
    "\nDone. If the space is now empty, delete it from the Builder UI (Account settings)."
  );
}

main()
  .catch((err) => {
    console.error("❌  Unexpected error.");
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => rl.close());

// ── Space / overview ──────────────────────────────────────────────────────────

async function loadSpace() {
  const data = await graphql(/* GraphQL */ `
    query SpaceInfo {
      settings
      users {
        id
        name
        email
        role
        lastActive
      }
    }
  `);
  const settings = data.settings ?? {};
  return {
    settings,
    name: settings.name ?? "(unnamed)",
    users: data.users ?? [],
  };
}

async function printOverview(state) {
  if (!state.models) state.models = await countContentByModel();
  if (!state.assets) state.assets = await fetchAllAssets({ quiet: true });

  const totalEntries = state.models.reduce((n, m) => n + m.ids.length, 0);
  console.info("\n── OVERVIEW ──");
  console.info(`  content entries: ${totalEntries} across ${state.models.length} model(s) with content`);
  console.info(`  assets:          ${state.assets.length}`);
  console.info(`  users:           ${state.users.length}`);
}

// ── Content ───────────────────────────────────────────────────────────────────

/** Lists every model and collects the entry ids of those that have any. */
async function countContentByModel() {
  const data = await graphql(/* GraphQL */ `
    query Models {
      models {
        id
        name
        kind
      }
    }
  `);
  // Component models have no content entries.
  const models = (data.models ?? []).filter((m) => m.kind !== "component");

  process.stdout.write(`  Scanning ${models.length} models for content`);
  const out = [];
  for (const m of models) {
    process.stdout.write(".");
    try {
      const entries = await fetchEntries(m.name);
      if (entries.length) out.push({ model: m, ids: entries });
    } catch (err) {
      console.error(`\n  ⚠️  Could not list "${m.name}": ${err.message}`);
    }
  }
  process.stdout.write("\n");
  return out.sort((a, b) => b.ids.length - a.ids.length);
}

async function fetchEntries(modelName) {
  const all = [];
  let offset = 0;
  while (true) {
    const url = new URL(`${CONTENT_API_BASE}/${encodeURIComponent(modelName)}`);
    url.searchParams.set("apiKey", PUBLIC_KEY);
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("noTargeting", "true");
    url.searchParams.set("includeUnpublished", "true");
    url.searchParams.set("cachebust", "true");
    url.searchParams.set("fields", "id,name");

    const res = await withRetry(() => fetch(url));
    if (!res.ok) throw new Error(`status ${res.status}: ${await res.text()}`);
    const page = (await res.json())?.results ?? [];
    all.push(...page.map((e) => ({ id: e.id, name: e.name })));
    if (page.length < PAGE_LIMIT) break;
    offset += page.length;
  }
  return all;
}

async function deleteContentFlow(space, state) {
  if (!state.models.length) return console.info("No content entries found.");

  console.info("\n── MODELS WITH CONTENT ──");
  state.models.forEach((m, i) =>
    console.info(`  ${String(i + 1).padStart(3)}) ${m.model.name}  (${m.ids.length} entries, kind=${m.model.kind})`)
  );
  const picked = await pickFromList(
    "Models to empty (e.g. 1,3,5-7 or 'all', blank to cancel)",
    state.models
  );
  if (!picked.length) return;

  const total = picked.reduce((n, m) => n + m.ids.length, 0);
  console.info(`\nThis will delete ${total} entries from: ${picked.map((m) => m.model.name).join(", ")}`);
  if (!(await confirmDestructive(space, `delete ${total} content entries`))) return;

  let deleted = 0;
  let failed = 0;
  for (const m of picked) {
    console.info(`\n  Emptying "${m.model.name}" (${m.ids.length})...`);
    const results = await runPool(m.ids, async (entry) => {
      if (DRY_RUN) return;
      const res = await withRetry(() =>
        fetch(`${WRITE_API_BASE}/${encodeURIComponent(m.model.name)}/${entry.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${PRIVATE_KEY}` },
        })
      );
      if (!res.ok) throw new Error(`status ${res.status}: ${await res.text()}`);
    }, (done, n) => progress(done, n));
    process.stdout.write("\n");
    deleted += results.filter((r) => r.ok).length;
    failed += results.filter((r) => !r.ok).length;
    results.filter((r) => !r.ok).slice(0, 5).forEach((r) =>
      console.error(`    ✗ ${r.item.id}: ${r.error.message}`)
    );
  }
  report("entries", deleted, failed);
  state.models = null;
}

// ── Assets ────────────────────────────────────────────────────────────────────

async function fetchAllAssets({ quiet = false } = {}) {
  const all = [];
  let offset = 0;
  while (true) {
    const data = await graphql(/* GraphQL */ `
      {
        assets(input: { limit: ${PAGE_LIMIT}, offset: ${offset} }) {
          id
          name
          url
        }
      }
    `);
    const page = data.assets ?? [];
    all.push(...page);
    if (!quiet) console.info(`  Fetched ${all.length} assets so far...`);
    if (page.length < PAGE_LIMIT) break;
    offset += page.length;
  }
  return all;
}

async function deleteAssetsFlow(space, state) {
  const assets = state.assets;
  if (!assets.length) return console.info("No assets found.");

  console.info("\nSample:");
  assets.slice(0, 5).forEach((a) => console.info(`  [${a.id}] ${a.name ?? a.url ?? "(no name)"}`));
  if (assets.length > 5) console.info(`  ...and ${assets.length - 5} more`);

  console.info(`\nThis will delete ALL ${assets.length} assets in the space.`);
  if (!(await confirmDestructive(space, `delete ${assets.length} assets`))) return;

  const results = await runPool(assets, async (asset) => {
    if (DRY_RUN) return;
    const res = await withRetry(() =>
      fetch(`${ASSETS_API_BASE}/${asset.id}?apiKey=${PUBLIC_KEY}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${PRIVATE_KEY}` },
      })
    );
    if (!res.ok) throw new Error(`status ${res.status}: ${await res.text()}`);
  }, progress);
  process.stdout.write("\n");

  results.filter((r) => !r.ok).slice(0, 5).forEach((r) =>
    console.error(`  ✗ ${r.item.id}: ${r.error.message}`)
  );
  report("assets", results.filter((r) => r.ok).length, results.filter((r) => !r.ok).length);
  state.assets = null;
}

// ── Users ─────────────────────────────────────────────────────────────────────

async function removeUsersFlow(space, state) {
  const protectedIds = new Set([space.settings.ownerId].filter(Boolean));
  const removable = state.users.filter((u) => !protectedIds.has(u.id));

  console.info("\n── MEMBERS ──");
  state.users.forEach((u) => {
    const last = u.lastActive ? new Date(u.lastActive).toISOString().slice(0, 10) : "never";
    const locked = protectedIds.has(u.id) ? "  🔒 owner (protected)" : "";
    const idx = removable.indexOf(u);
    const label = idx >= 0 ? String(idx + 1).padStart(3) + ")" : "    -";
    console.info(`  ${label} ${u.email ?? "(no email)"}  role=${u.role || "-"}  lastActive=${last}${locked}`);
  });
  if (!removable.length) return console.info("No removable users.");

  const mutation = await findUserRemovalMutation();
  if (!mutation) {
    console.info(
      "\nThe Admin API does not expose a user-removal mutation for this key.\n" +
        "Remove the members above from the Builder UI (Account settings → Users)."
    );
    return;
  }
  console.info(`\n(using Admin API mutation: ${mutation.name})`);

  const picked = await pickFromList("Users to remove (e.g. 1,3 or 'all', blank to cancel)", removable);
  if (!picked.length) return;

  console.info(`\nThis will remove: ${picked.map((u) => u.email).join(", ")}`);
  if (!(await confirmDestructive(space, `remove ${picked.length} user(s)`))) return;

  const results = await runPool(picked, async (user) => {
    if (DRY_RUN) return;
    await graphql(
      /* GraphQL */ `mutation RemoveUser($id: String!) { ${mutation.name}(${mutation.argName}: $id)${mutation.selection} }`,
      { id: user.id }
    );
  }, progress, 1);
  process.stdout.write("\n");

  results.filter((r) => !r.ok).forEach((r) => console.error(`  ✗ ${r.item.email}: ${r.error.message}`));
  report("users", results.filter((r) => r.ok).length, results.filter((r) => !r.ok).length);
  state.users = (await loadSpace()).users;
}

/**
 * Looks for a user-removal mutation in the Admin API schema instead of
 * hard-coding one. Returns null if introspection is off or nothing matches.
 */
async function findUserRemovalMutation() {
  return findMutation(/^(remove|delete)(space)?(user|member)$/i, /^(id|userId)$/i);
}

/**
 * Introspects the Admin API for a mutation by name pattern; null if absent.
 * Also resolves a sub-selection when the mutation returns an object type,
 * since GraphQL rejects object-typed fields without one.
 */
async function findMutation(namePattern, argPattern) {
  try {
    const data = await graphql(/* GraphQL */ `
      {
        __schema {
          mutationType {
            fields {
              name
              args { name }
              type { kind name ofType { kind name ofType { kind name } } }
            }
          }
        }
      }
    `);
    const fields = data.__schema?.mutationType?.fields ?? [];
    const match = fields.find((f) => namePattern.test(f.name));
    const arg = match?.args.find((a) => argPattern.test(a.name));
    if (!match || !arg) return null;

    let t = match.type;
    while (t && !t.name && t.ofType) t = t.ofType;
    let selection = "";
    if (t?.kind === "OBJECT") {
      const info = await graphql(
        /* GraphQL */ `query T($n: String!) { __type(name: $n) { fields { name type { kind ofType { kind } } } } }`,
        { n: t.name }
      );
      const tf = info.__type?.fields ?? [];
      const isScalar = (f) => f.type.kind === "SCALAR" || f.type.ofType?.kind === "SCALAR";
      const pick = tf.find((f) => f.name === "id") ?? tf.find(isScalar);
      selection = pick ? ` { ${pick.name} }` : "";
    }
    return { name: match.name, argName: arg.name, selection };
  } catch {
    return null;
  }
}

// ── Models ────────────────────────────────────────────────────────────────────

/** Models that are never offered for deletion. */
const PROTECTED_MODELS = new Set(["page"]);

async function deleteModelsFlow(space, state) {
  const data = await graphql(/* GraphQL */ `
    query AllModels {
      models {
        id
        name
        kind
      }
    }
  `);
  const models = (data.models ?? []).filter((m) => !PROTECTED_MODELS.has(m.name));
  if (!models.length) return console.info("No deletable models.");

  const mutation = await findMutation(/^(delete|remove)model$/i, /^(id|modelId)$/i);
  if (!mutation) {
    console.info(
      "\nThe Admin API does not expose a model-deletion mutation for this key.\n" +
        "Delete models from the Builder UI (Models page)."
    );
    return;
  }

  const counts = new Map((state.models ?? []).map((m) => [m.model.id, m.ids.length]));
  console.info("\n── MODELS (page is protected) ──");
  models.forEach((m, i) =>
    console.info(`  ${String(i + 1).padStart(3)}) ${m.name}  kind=${m.kind}  entries=${counts.get(m.id) ?? 0}`)
  );
  console.info("\n⚠️  Deleting a model also removes every entry in it. Empty content first (option 1) if unsure.");

  const picked = await pickFromList("Models to delete (e.g. 1,3,5-7 or 'all', blank to cancel)", models);
  if (!picked.length) return;

  console.info(`\nThis will delete models: ${picked.map((m) => m.name).join(", ")}`);
  if (!(await confirmDestructive(space, `delete ${picked.length} model(s)`))) return;

  const results = await runPool(picked, async (m) => {
    if (DRY_RUN) return;
    await graphql(
      /* GraphQL */ `mutation DeleteModel($id: String!) { ${mutation.name}(${mutation.argName}: $id)${mutation.selection} }`,
      { id: m.id }
    );
  }, progress, 1);
  process.stdout.write("\n");

  results.filter((r) => !r.ok).forEach((r) => console.error(`  ✗ ${r.item.name}: ${r.error.message}`));
  report("models", results.filter((r) => r.ok).length, results.filter((r) => !r.ok).length);
  state.models = null;
}

// ── Prompts ───────────────────────────────────────────────────────────────────

async function ask(question) {
  return (await rl.question(question)).trim();
}

/** Requires typing the space name; the one gate for every destructive step. */
async function confirmDestructive(space, action) {
  if (DRY_RUN) {
    console.info("(dry run — proceeding without deleting anything)");
    return true;
  }
  console.info(`\n⚠️  About to ${action} in "${space.name}". This cannot be undone.`);
  const typed = await ask(`Type the space name (${space.name}) to confirm, or press Enter to cancel: `);
  if (typed !== space.name) {
    console.info("Cancelled.");
    return false;
  }
  return true;
}

/** Parses "1,3,5-7" or "all" into items from `list`. Blank/invalid → []. */
async function pickFromList(prompt, list) {
  const input = (await ask(`${prompt}: `)).toLowerCase();
  if (!input) return [];
  if (input === "all") return [...list];

  const picked = new Set();
  for (const part of input.split(",")) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) {
      console.info(`Could not parse "${part.trim()}" — cancelled.`);
      return [];
    }
    const from = Number(m[1]);
    const to = Number(m[2] ?? m[1]);
    for (let i = from; i <= to; i++) {
      if (i < 1 || i > list.length) {
        console.info(`${i} is out of range — cancelled.`);
        return [];
      }
      picked.add(list[i - 1]);
    }
  }
  return [...picked];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function graphql(query, variables = {}) {
  const res = await withRetry(() =>
    fetch(ADMIN_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PRIVATE_KEY}`,
      },
      body: JSON.stringify({ query, variables }),
    })
  );
  const result = await res.json().catch(() => ({}));
  if (!res.ok || result.errors) {
    const msg = result.errors?.map((e) => e.message).join(", ") || `status ${res.status}`;
    throw new Error(`Admin API: ${msg}`);
  }
  return result.data ?? {};
}

/** Retries on 429/5xx with backoff; large deletes routinely hit rate limits. */
async function withRetry(fn, attempts = 5) {
  for (let i = 0; ; i++) {
    const res = await fn();
    if ((res.status !== 429 && res.status < 500) || i >= attempts - 1) return res;
    await new Promise((r) => setTimeout(r, 500 * 2 ** i));
  }
}

/** Runs `worker` over items with bounded concurrency; never throws. */
async function runPool(items, worker, onProgress, concurrency = CONCURRENCY) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  async function lane() {
    while (next < items.length) {
      const i = next++;
      try {
        await worker(items[i]);
        results[i] = { item: items[i], ok: true };
      } catch (error) {
        results[i] = { item: items[i], ok: false, error };
      }
      onProgress?.(++done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, lane));
  return results;
}

function progress(done, total) {
  process.stdout.write(`\r    ${done}/${total}`);
}

function report(noun, ok, failed) {
  const verb = DRY_RUN ? "would be deleted" : "deleted";
  console.info(`\n  ${ok} ${noun} ${verb}, ${failed} failed.`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else out[key] = true;
  }
  return out;
}
