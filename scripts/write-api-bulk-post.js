#!/usr/bin/env node

/**
 * Tests whether Builder.io's Write API accepts a BULK create — a single POST to
 * /api/v1/write/:model whose body is an ARRAY of entries, instead of one POST
 * per entry.
 *
 *   curl -X POST 'https://builder.io/api/v1/write/my-model' \
 *     -H 'Content-Type: application/json' \
 *     -H 'Authorization: Bearer YOUR_PRIVATE_KEY' \
 *     -d '[{"name":"Entry 1","published":"draft","data":{"title":"First"}}, …]'
 *
 * WHY THIS SCRIPT
 * ---------------
 * A 200 response does not prove the bulk create worked. The endpoint may:
 *   a) create every entry and return an array of results        → bulk supported
 *   b) create only the FIRST entry (array coerced to an object) → partial, silent
 *   c) create ONE entry whose data is the whole array           → garbage, silent
 *   d) reject with 4xx                                          → not supported
 * Only a read-back distinguishes these. Every run tags its entries with a unique
 * runId in `data.bulkTestRunId`, then queries the Content API for that runId and
 * reports how many of the requested entries actually exist.
 *
 * PHASES
 * ------
 *   1. POST the array in one request. Record status, timing, response shape.
 *   2. Read back by runId (Content API, includeUnpublished) and count entries.
 *   3. --compare: repeat with N sequential single-object POSTs, as a control.
 *   4. --cleanup: DELETE only the entries carrying this run's runId.
 *
 * Usage:
 *   node scripts/write-api-bulk-post.js --model=page --count=3
 *   node scripts/write-api-bulk-post.js --model=page --count=3 --compare --cleanup
 *   node scripts/write-api-bulk-post.js --model=page --dry-run
 *   node scripts/write-api-bulk-post.js --model=page --file=./entries.json
 *   node scripts/write-api-bulk-post.js --cleanup-run=<runId>   # clean an older run
 *
 * Flags:
 *   --model=<name>      Model to write to            (default "page")
 *   --count=<n>         Entries to create            (default 3)
 *   --published=<state> draft | published            (default "draft")
 *   --file=<path>       JSON array of entry bodies, used instead of generated ones
 *   --compare           Also run N sequential single POSTs as a control
 *   --cleanup           Delete this run's entries when finished
 *   --cleanup-run=<id>  Delete a previous run's entries and exit
 *   --dry-run           Print the payload and exit without writing
 *   --out=<path>        Write the full JSON result to this file
 *
 * Env (a .env in the project root is loaded automatically on Node >= 22):
 *   BUILDER_PRIVATE_KEY / BUILDER_PRIVATE_API_KEY   Required — bpk-… write key
 *   BUILDER_API_KEY / NEXT_PUBLIC_BUILDER_API_KEY   Required for read-back
 */

try {
  process.loadEnvFile?.();
} catch {
  // No .env present — rely on the ambient environment.
}

const fetchFn =
  typeof fetch === "function"
    ? fetch
    : (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

const WRITE_BASE = "https://builder.io/api/v1/write";
const CONTENT_BASE = "https://cdn.builder.io/api/v3/content";

const PRIVATE_KEY =
  process.env.BUILDER_PRIVATE_KEY || process.env.BUILDER_PRIVATE_API_KEY || "";
const PUBLIC_KEY =
  process.env.BUILDER_API_KEY || process.env.NEXT_PUBLIC_BUILDER_API_KEY || "";

function parseArgs(argv) {
  const args = { flags: new Set(), opts: {} };
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=");
    if (value === undefined) args.flags.add(key);
    else args.opts[key] = value;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const MODEL_NAME = args.opts.model || "page";
const COUNT = Number(args.opts.count || 3);
const PUBLISHED = args.opts.published || "draft";
const COMPARE = args.flags.has("compare");
const CLEANUP = args.flags.has("cleanup");
const DRY_RUN = args.flags.has("dry-run");
const OUT_PATH = args.opts.out;
const CLEANUP_RUN = args.opts["cleanup-run"];

const RUN_ID = CLEANUP_RUN || `run-${Date.now().toString(36)}`;

function buildEntry(index, runId, kind) {
  return {
    name: `bulk-test ${runId} ${kind} ${index}`,
    published: PUBLISHED,
    data: {
      title: `Bulk write test entry ${index}`,
      // Read-back key: every entry this script creates is findable by runId.
      bulkTestRunId: runId,
      bulkTestKind: kind,
      bulkTestIndex: index,
    },
  };
}

async function loadEntriesFromFile(path) {
  const { readFile } = await import("node:fs/promises");
  const parsed = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`--file must contain a JSON array, got ${typeof parsed}`);
  }
  // Tag supplied entries so read-back and cleanup can still find them.
  return parsed.map((entry, i) => ({
    ...entry,
    data: {
      ...(entry.data ?? {}),
      bulkTestRunId: RUN_ID,
      bulkTestKind: "bulk",
      bulkTestIndex: i + 1,
    },
  }));
}

async function writeRequest(method, path, body) {
  const started = Date.now();
  const response = await fetchFn(`${WRITE_BASE}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }

  return {
    ok: response.ok,
    status: response.status,
    durationMs: Date.now() - started,
    json,
    text,
  };
}

/** Describes what the endpoint handed back, so silent coercion is visible. */
function describeResponse(json) {
  if (Array.isArray(json)) {
    return {
      shape: "array",
      length: json.length,
      ids: json.map((item) => item?.id).filter(Boolean),
    };
  }
  if (json && typeof json === "object") {
    const ids = Array.isArray(json.results)
      ? json.results.map((item) => item?.id).filter(Boolean)
      : [json.id].filter(Boolean);
    return { shape: "object", length: ids.length, ids };
  }
  return { shape: typeof json, length: 0, ids: [] };
}

async function readBackByRunId(runId, kind) {
  if (!PUBLIC_KEY) {
    return { skipped: true, reason: "no public API key set" };
  }

  const url = new URL(`${CONTENT_BASE}/${MODEL_NAME}`);
  url.searchParams.set("apiKey", PUBLIC_KEY);
  url.searchParams.set("query.data.bulkTestRunId", runId);
  if (kind) url.searchParams.set("query.data.bulkTestKind", kind);
  url.searchParams.set("includeUnpublished", "true");
  url.searchParams.set("cachebust", "true");
  url.searchParams.set("limit", "100");
  url.searchParams.set("fields", "id,name,published,data");

  const response = await fetchFn(url.toString());
  const text = await response.text();

  if (!response.ok) {
    return { skipped: false, error: `status ${response.status}: ${text}` };
  }

  const results = JSON.parse(text)?.results ?? [];
  return {
    skipped: false,
    count: results.length,
    entries: results.map((entry) => ({
      id: entry.id,
      name: entry.name,
      published: entry.published,
      index: entry?.data?.bulkTestIndex,
      // Catches case (c): the array landed inside one entry's data.
      dataIsArray: Array.isArray(entry?.data?.data) || Array.isArray(entry?.data),
    })),
  };
}

async function deleteEntries(entries) {
  const deleted = [];
  const failed = [];

  for (const entry of entries) {
    const result = await writeRequest("DELETE", `${MODEL_NAME}/${entry.id}`);
    if (result.ok) deleted.push(entry.id);
    else failed.push({ id: entry.id, status: result.status, body: result.text });
  }

  return { deleted, failed };
}

function verdict(requested, readBack) {
  if (readBack.skipped) return `UNVERIFIED — ${readBack.reason}`;
  if (readBack.error) return `UNVERIFIED — read-back failed: ${readBack.error}`;
  if (readBack.entries?.some((entry) => entry.dataIsArray)) {
    return "BROKEN — the array was stored inside a single entry's data";
  }
  if (readBack.count === requested) return "SUPPORTED — every entry was created";
  if (readBack.count === 0) return "NOT SUPPORTED — nothing was created";
  return `PARTIAL — ${readBack.count} of ${requested} entries were created`;
}

async function runBulk(entries) {
  console.log(`\n── Bulk: one POST with an array of ${entries.length} entries ──`);

  const result = await writeRequest("POST", MODEL_NAME, entries);
  const shape = describeResponse(result.json);

  console.log(`status        ${result.status} (${result.durationMs} ms)`);
  console.log(`body shape    ${shape.shape}, ${shape.length} id(s) returned`);
  if (!result.ok) console.log(`error body    ${result.text.slice(0, 600)}`);

  const readBack = await readBackByRunId(RUN_ID, "bulk");
  console.log(
    `read-back     ${readBack.count ?? "n/a"} of ${entries.length} entries found`
  );
  console.log(`verdict       ${verdict(entries.length, readBack)}`);

  return { request: { status: result.status, durationMs: result.durationMs }, shape, readBack };
}

async function runSequential(count) {
  console.log(`\n── Control: ${count} sequential single-entry POSTs ──`);

  const started = Date.now();
  const statuses = [];

  for (let i = 1; i <= count; i += 1) {
    const result = await writeRequest("POST", MODEL_NAME, buildEntry(i, RUN_ID, "single"));
    statuses.push(result.status);
    if (!result.ok) console.log(`  entry ${i} failed: ${result.text.slice(0, 300)}`);
  }

  const durationMs = Date.now() - started;
  const readBack = await readBackByRunId(RUN_ID, "single");

  console.log(`statuses      ${statuses.join(", ")} (${durationMs} ms total)`);
  console.log(`read-back     ${readBack.count ?? "n/a"} of ${count} entries found`);

  return { statuses, durationMs, readBack };
}

async function main() {
  if (!PRIVATE_KEY) {
    throw new Error(
      "Set BUILDER_PRIVATE_KEY (or BUILDER_PRIVATE_API_KEY) to a bpk-… private key"
    );
  }

  if (CLEANUP_RUN) {
    const readBack = await readBackByRunId(CLEANUP_RUN);
    if (readBack.skipped || readBack.error) {
      throw new Error(`Cannot look up run ${CLEANUP_RUN}: ${readBack.reason ?? readBack.error}`);
    }
    console.log(`Deleting ${readBack.count} entries from run ${CLEANUP_RUN}…`);
    const { deleted, failed } = await deleteEntries(readBack.entries);
    console.log(`Deleted ${deleted.length}, failed ${failed.length}`);
    if (failed.length) console.log(JSON.stringify(failed, null, 2));
    return;
  }

  const entries = args.opts.file
    ? await loadEntriesFromFile(args.opts.file)
    : Array.from({ length: COUNT }, (_, i) => buildEntry(i + 1, RUN_ID, "bulk"));

  console.log(`model         ${MODEL_NAME}`);
  console.log(`runId         ${RUN_ID}`);
  console.log(`entries       ${entries.length} (published: ${PUBLISHED})`);
  console.log(`read-back key data.bulkTestRunId = ${RUN_ID}`);

  if (DRY_RUN) {
    console.log(`\nPOST ${WRITE_BASE}/${MODEL_NAME}\n`);
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  if (!PUBLIC_KEY) {
    console.log(
      "\n⚠︎  No public API key — entries will be created but NOT verified or cleaned up."
    );
  }

  const results = { runId: RUN_ID, model: MODEL_NAME, bulk: await runBulk(entries) };
  if (COMPARE) results.sequential = await runSequential(COUNT);

  if (CLEANUP) {
    console.log("\n── Cleanup ──");
    const readBack = await readBackByRunId(RUN_ID);
    if (readBack.skipped || readBack.error) {
      console.log(`Skipped — cannot list run entries (${readBack.reason ?? readBack.error})`);
      console.log(`Clean up later with: --cleanup-run=${RUN_ID}`);
    } else {
      const { deleted, failed } = await deleteEntries(readBack.entries);
      console.log(`Deleted ${deleted.length}, failed ${failed.length}`);
      if (failed.length) console.log(`Retry with: --cleanup-run=${RUN_ID}`);
      results.cleanup = { deleted: deleted.length, failed };
    }
  } else {
    console.log(`\nEntries left in place. Remove them with: --cleanup-run=${RUN_ID}`);
  }

  if (OUT_PATH) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(OUT_PATH, JSON.stringify(results, null, 2));
    console.log(`\nWrote ${OUT_PATH}`);
  }
}

main().catch((error) => {
  console.error(`\nError: ${error.message}`);
  process.exitCode = 1;
});
