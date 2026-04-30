#!/usr/bin/env node

/**
 * Reproduces the bug where pages batch-published via Builder.io's content list
 * end up with an empty `meta.componentsUsed` field, causing custom components
 * not to render correctly in production (SUPP-2325).
 *
 * BACKGROUND
 * ----------
 * Customer (Roman, Fiverr) created ~30 pages via the Write API and batch-
 * published them from the content list view. Pages render broken in production.
 * Individual publishes fix it.
 *
 * Key evidence: fetching with preview=true / includeUnpublished=true shows
 * meta.componentsUsed correctly populated in the DRAFT state. After batch
 * publish the published version has it empty. After individual publish it is
 * preserved. The bug is in the batch publish pipeline, not in the content.
 *
 * THREE-PHASE FLOW
 * ----------------
 * Phase 1 — Draft baseline
 *   Create two sets of BATCH_SIZE pages via Write API, seeding meta.componentsUsed
 *   (simulating pages saved through the visual editor, matching Roman's state
 *   where preview=true shows the correct value). Verify the draft state with
 *   includeUnpublished=true before touching the published state.
 *
 * Phase 2 — Publish
 *   Set A: individual publish — one sequential await per entry
 *   Set B: batch publish     — all entries concurrently via Promise.all
 *   (Both use the same PATCH endpoint, matching what the UI sends per entry.)
 *
 * Phase 3 — Compare
 *   Fetch published versions of both sets. Print a side-by-side table showing
 *   draft componentsUsed vs published componentsUsed for each entry.
 *
 * INTERPRETATION
 * --------------
 * If bug is reproduced:
 *   Set A (individual): componentsUsed preserved ✅
 *   Set B (batch):      componentsUsed lost      ❌
 *   → Confirms the batch publish pipeline drops meta.componentsUsed.
 *
 * If not reproduced (both sets preserve the field):
 *   → Concurrent PATCH calls are not the trigger. The bug is in a different
 *     Builder UI code path (e.g. an internal bulk-publish endpoint). The
 *     workaround (seeding meta.componentsUsed in the Write API POST body)
 *     is still valid for Roman.
 *
 * If draft state is empty for both sets:
 *   → This space's Write API doesn't derive componentsUsed from blocks.
 *     The workaround is to include meta.componentsUsed explicitly at creation.
 *
 * Usage:
 *   BUILDER_PRIVATE_KEY=bpk-… BUILDER_API_KEY=… node scripts/reproduce-batch-publish-bug.js
 *   BUILDER_PRIVATE_KEY=bpk-… BUILDER_API_KEY=… node scripts/reproduce-batch-publish-bug.js --cleanup
 *
 * Env:
 *   BUILDER_PRIVATE_KEY   Required — private key for write operations
 *   BUILDER_API_KEY       Required — public API key for Content API read-back
 *   MODEL_NAME            Optional — defaults to "page"
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const fetchFn =
  typeof fetch === "function"
    ? fetch
    : (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

const PRIVATE_KEY = process.env.BUILDER_PRIVATE_KEY || "";
const API_KEY = process.env.BUILDER_API_KEY || "";
const MODEL_NAME = process.env.MODEL_NAME || "page";
// Component names taken from customer's actual Write API payload (fiverr:* namespace).
// These must be registered in the target space for Builder to derive componentsUsed.
// Component names registered in this Builder space via src/builder-registry.ts.
const COMPONENT_NAMES = ["Hero", "ProductCard", "ProductGrid", "Heading", "BlogCard"];
const BATCH_SIZE = 5;

const WRITE_BASE = "https://builder.io/api/v1/write";
const CONTENT_BASE = "https://cdn.builder.io/api/v3/content";
const RUN_IDS_FILE = path.resolve("scripts/repro-run-ids.json");

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌  Missing BUILDER_PRIVATE_KEY.");
    process.exit(1);
  }
  if (!API_KEY) {
    console.error("❌  Missing BUILDER_API_KEY.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.includes("--cleanup")) {
    await cleanup();
  } else {
    await runRepro();
  }
}

main().catch((err) => {
  console.error("❌  Unexpected error:", err);
  process.exit(1);
});

// ── Repro run ─────────────────────────────────────────────────────────────────

async function runRepro() {
  console.info(`ℹ️  Model: ${MODEL_NAME}  Components: ${COMPONENT_NAMES.join(", ")}  Batch size: ${BATCH_SIZE}\n`);

  // ── Phase 1: Draft baseline ───────────────────────────────────────────────
  // Both sets are created identically — with meta.componentsUsed seeded —
  // matching Roman's state where preview=true confirms the draft is correct.
  console.info("── Phase 1: Create draft pages ──");
  console.info("📝  Creating Set A (individual publish)…");
  const individualIds = await createDraftPages("indiv");

  console.info("📝  Creating Set B (batch publish)…");
  const batchIds = await createDraftPages("batch");

  fs.writeFileSync(RUN_IDS_FILE, JSON.stringify({ individualIds, batchIds }, null, 2));
  console.info(`💾  Entry IDs saved to ${RUN_IDS_FILE}\n`);

  // Verify draft state with includeUnpublished=true — mirrors customer's
  // preview=true check that confirms componentsUsed is present before publish.
  console.info("⏳  Waiting 2 s for draft to propagate…");
  await sleep(2000);

  console.info("\n── Draft state (includeUnpublished=true) ──");
  const draftIndiv = await fetchAndPrint(individualIds, { draft: true, label: "indiv" });
  const draftBatch = await fetchAndPrint(batchIds, { draft: true, label: "batch" });

  const draftIndivEmpty = draftIndiv.filter((r) => r.empty).length;
  const draftBatchEmpty = draftBatch.filter((r) => r.empty).length;

  if (draftIndivEmpty > 0 || draftBatchEmpty > 0) {
    console.warn(
      "\n⚠️  Draft state has empty componentsUsed — Builder did not derive the field " +
        "from the registered component blocks (components may not be recognised server-side).\n" +
        "    Results will be inconclusive for the publish-pipeline bug.\n" +
        "    Workaround: include meta: { componentsUsed: { " +
        COMPONENT_NAMES.map((c) => `"${c}": 1`).join(", ") +
        " } } in the Write API POST body when creating pages."
    );
  } else {
    console.info(`\n✅  Draft baseline confirmed: all ${BATCH_SIZE * 2} pages have componentsUsed in draft state.\n`);
  }

  // ── Phase 2: Publish ──────────────────────────────────────────────────────
  console.info("── Phase 2: Publish ──");

  console.info("🔁  Publishing Set A individually (sequential await)…");
  for (const id of individualIds) {
    await publishOne(id);
    console.info(`    ✅  ${id}`);
  }

  console.info("\n⚡  Publishing Set B as batch (concurrent Promise.all)…");
  await Promise.all(batchIds.map((id) => publishOne(id)));
  batchIds.forEach((id) => console.info(`    ✅  ${id}`));

  // ── Phase 3: Compare draft vs published ───────────────────────────────────
  console.info("\n⏳  Waiting 3 s for publish to propagate…");
  await sleep(3000);

  console.info("\n── Phase 3: Published state comparison ──");
  console.info("\n  Set A — individually published:");
  const pubIndiv = await fetchAndPrint(individualIds, { draft: false, label: "indiv" });

  console.info("\n  Set B — batch published:");
  const pubBatch = await fetchAndPrint(batchIds, { draft: false, label: "batch" });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.info("\n── Summary ──");
  printDelta("indiv (draft → published)", draftIndiv, pubIndiv);
  printDelta("batch (draft → published)", draftBatch, pubBatch);
  console.info("");

  const indivLost = pubIndiv.filter((r) => r.empty).length;
  const batchLost = pubBatch.filter((r) => r.empty).length;

  if (indivLost === 0 && batchLost > 0) {
    console.error(
      `❌  Bug reproduced: batch publish dropped meta.componentsUsed on ` +
        `${batchLost}/${pubBatch.length} pages while individual publish preserved it.`
    );
    console.error(`    → The batch publish pipeline does not carry meta.componentsUsed to the published snapshot.`);
    process.exitCode = 1;
  } else if (indivLost === 0 && batchLost === 0) {
    console.info(
      "ℹ️  No difference between publish paths — both preserved meta.componentsUsed.\n" +
        "    Concurrent PATCH calls are not the trigger. The bug may be caused by " +
        "a different Builder UI internal endpoint used for bulk publish.\n" +
        "    The workaround (seeding meta.componentsUsed at page creation) remains valid."
    );
  } else if (draftIndivEmpty + draftBatchEmpty > 0) {
    console.warn(
      "⚠️  Draft state was empty — cannot determine if publish pipeline is at fault.\n" +
        "    Builder did not derive componentsUsed from blocks (components not\n" +
        "    recognised server-side in this space). Apply the workaround: include\n" +
        "    meta: { componentsUsed: { " +
        COMPONENT_NAMES.map((c) => `"${c}": 1`).join(", ") +
        " } } in the Write API POST body."
    );
  } else {
    console.info(`ℹ️  Mixed results — individual lost: ${indivLost}, batch lost: ${batchLost}`);
  }

  console.info("\nRun --cleanup to archive test entries.");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createDraftPages(label) {
  const ids = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    const name = `repro-${label}-${i}-${Date.now()}`;
    const id = await createDraftPage(name, label, i);
    ids.push(id);
  }
  return ids;
}

async function createDraftPage(name, label, index) {
  const urlPath = `/repro-${label}-${index}-${Date.now()}`;
  // Mirrors the customer's (Roman/Fiverr) actual Write API payload structure.
  // Intentionally NO meta.componentsUsed — the customer never sends it.
  // Builder is expected to derive it server-side from the registered fiverr:*
  // components in the blocks. This derivation works in draft (visible via
  // preview=true / includeUnpublished=true) but may be lost during batch publish.
  const body = {
    name,
    published: "draft",
    query: [
      {
        "@type": "@builder.io/core:Query",
        property: "urlPath",
        operator: "is",
        value: urlPath,
      },
    ],
    data: {
      url: urlPath,
      pageTitle: {
        "@type": "@builder.io/core:LocalizedValue",
        Default: `Repro page ${label}-${index}`,
      },
      seoDescription: {
        "@type": "@builder.io/core:LocalizedValue",
        Default: `SEO description for repro page ${label}-${index}`,
      },
      title: {
        "@type": "@builder.io/core:LocalizedValue",
        Default: `Repro page ${label}-${index}`,
      },
      blocks: [
        {
          "@type": "@builder.io/sdk:Element",
          component: {
            name: "Hero",
            options: {
              title: `Repro ${label} page ${index}`,
              subtitle: "Reproduction test page for SUPP-2325",
              ctaPrimary: { label: "Shop now", href: "/collections/all" },
            },
          },
        },
        {
          "@type": "@builder.io/sdk:Element",
          component: {
            name: "Heading",
            options: {
              text: `Section heading for ${label}-${index}`,
              level: "h2",
            },
          },
        },
        {
          "@type": "@builder.io/sdk:Element",
          component: {
            name: "ProductGrid",
            options: { columns: 3 },
            children: [
              {
                "@type": "@builder.io/sdk:Element",
                component: {
                  name: "ProductCard",
                  options: {
                    title: `Product ${index}`,
                    price: 29.99,
                  },
                },
              },
            ],
          },
        },
        {
          "@type": "@builder.io/sdk:Element",
          component: {
            name: "BlogCard",
            options: {
              title: `Blog post ${index}`,
              excerpt: "Repro test blog card.",
            },
          },
        },
      ],
    },
  };

  const response = await fetchFn(`${WRITE_BASE}/${MODEL_NAME}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`createDraftPage failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const id = data?.id ?? data?.results?.[0]?.id;
  if (!id) throw new Error(`createDraftPage: no id in response: ${JSON.stringify(data)}`);
  return id;
}

async function publishOne(entryId) {
  const response = await fetchFn(`${WRITE_BASE}/${MODEL_NAME}/${entryId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ published: "published" }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`publishOne(${entryId}) failed (${response.status}): ${text}`);
  }
}

async function fetchEntry(entryId, { draft = false } = {}) {
  const url = new URL(`${CONTENT_BASE}/${MODEL_NAME}`);
  url.searchParams.set("apiKey", API_KEY);
  url.searchParams.set("query.id", entryId);
  url.searchParams.set("limit", "1");
  url.searchParams.set("cachebust", "true");
  if (draft) url.searchParams.set("includeUnpublished", "true");

  const response = await fetchFn(url.toString());
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`fetchEntry(${entryId}) failed (${response.status}): ${text}`);
  }

  const payload = await response.json();
  return payload?.results?.[0] ?? null;
}

async function fetchAndPrint(ids, { draft = false, label = "" } = {}) {
  const results = [];
  for (const id of ids) {
    const entry = await fetchEntry(id, { draft });
    const componentsUsed = entry?.meta?.componentsUsed ?? null;
    const empty =
      componentsUsed === null ||
      (typeof componentsUsed === "object" && Object.keys(componentsUsed).length === 0);

    const status = empty ? "❌  empty" : "✅";
    const detail = componentsUsed !== null ? JSON.stringify(componentsUsed) : "(field absent)";
    console.info(`  ${id}  componentsUsed: ${detail}  ${status}`);
    results.push({ id, componentsUsed, empty });
  }
  return results;
}

function printDelta(label, draftResults, pubResults) {
  const draftPopulated = draftResults.filter((r) => !r.empty).length;
  const pubPopulated = pubResults.filter((r) => !r.empty).length;
  const lost = draftPopulated - pubPopulated;
  const arrow = lost > 0 ? "❌  lost" : "✅  preserved";
  console.info(
    `  ${label}: draft ${draftPopulated}/${draftResults.length} populated → ` +
      `published ${pubPopulated}/${pubResults.length} populated  ${arrow}`
  );
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

async function cleanup() {
  if (!fs.existsSync(RUN_IDS_FILE)) {
    console.error(`❌  ${RUN_IDS_FILE} not found. Run the repro first.`);
    process.exit(1);
  }

  const saved = JSON.parse(fs.readFileSync(RUN_IDS_FILE, "utf8"));
  const allIds = [
    ...(saved.individualIds ?? saved.bugIds ?? []),
    ...(saved.batchIds ?? saved.fixIds ?? []),
  ];

  console.info(`ℹ️  Archiving ${allIds.length} test entries…`);
  for (const id of allIds) {
    await archiveEntry(id);
    console.info(`    🗑️  archived ${id}`);
  }

  fs.unlinkSync(RUN_IDS_FILE);
  console.info(`✅  Done. ${RUN_IDS_FILE} removed.`);
}

async function archiveEntry(entryId) {
  const response = await fetchFn(`${WRITE_BASE}/${MODEL_NAME}/${entryId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ published: "archived" }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.warn(`⚠️  archiveEntry(${entryId}) failed (${response.status}): ${text}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
