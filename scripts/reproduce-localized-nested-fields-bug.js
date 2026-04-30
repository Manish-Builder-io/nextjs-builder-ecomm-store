#!/usr/bin/env node

/**
 * Reproduces the bug where nested localized array subfields are not automatically
 * registered in meta.localizedTextInputs when a component is placed on a Builder
 * page via the visual editor.
 *
 * BACKGROUND
 * ----------
 * The "Vertical Tab" component registers localized: true on fields at two levels:
 *
 *   Top-level:       tabHeader, pagerLabel, nextItem.nextItemText
 *   Nested (array):  tabs[N].label  (inside the "tabs" list input)
 *
 * When the component is dragged to the canvas, Builder's editor auto-populates
 * meta.localizedTextInputs on the block element with top-level localized fields
 * only. The nested array paths (tabs.0.label, tabs.1.label, …) are absent until
 * the user manually clicks each field in the visual editor.
 *
 * EXPECTED BEHAVIOR
 * -----------------
 * All localized fields — top-level AND nested — should be present in
 * meta.localizedTextInputs on component placement, without requiring manual
 * editor interaction.
 *
 * TWO-PHASE FLOW
 * ----------------
 * Phase 1 — Create two representative entries via the Write API:
 *
 *   "before":  Simulates what the editor auto-generates on drag-and-drop.
 *              meta.localizedTextInputs has only top-level fields.
 *              This is the buggy state — nested tab labels are NOT localized.
 *
 *   "after":   Simulates the correct state after manually clicking all fields.
 *              meta.localizedTextInputs has all fields including nested tab labels.
 *              This is the workaround — pass the full list via the Write API.
 *
 * Phase 2 — Fetch both entries, inspect meta.localizedTextInputs on the Vertical
 *           Tab block, and print which paths are missing in the "before" state.
 *
 * Usage:
 *   BUILDER_PRIVATE_KEY=bpk-… BUILDER_API_KEY=… node scripts/reproduce-localized-nested-fields-bug.js
 *   BUILDER_PRIVATE_KEY=bpk-… BUILDER_API_KEY=… node scripts/reproduce-localized-nested-fields-bug.js --cleanup
 *
 * Env:
 *   BUILDER_PRIVATE_KEY   Required — private key for write operations
 *   BUILDER_API_KEY       Required — public API key for Content API read-back
 *   MODEL_NAME            Optional — defaults to "page"
 *   TAB_COUNT             Optional — number of tabs to create (defaults to 3)
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
const TAB_COUNT = Number(process.env.TAB_COUNT) || 3;

const WRITE_BASE = "https://builder.io/api/v1/write";
const CONTENT_BASE = "https://cdn.builder.io/api/v3/content";
const RUN_IDS_FILE = path.resolve("scripts/repro-localized-run-ids.json");

// ── Localized field definitions ───────────────────────────────────────────────

// These match the registered inputs in the "Vertical Tab" component config
// that have localized: true. Top-level fields are auto-detected by the editor;
// nested array fields are not — that is the bug.
const TOP_LEVEL_LOCALIZED = ["tabHeader", "pagerLabel", "nextItem.nextItemText"];
const NESTED_LOCALIZED = Array.from({ length: TAB_COUNT }, (_, i) => `tabs.${i}.label`);
const ALL_LOCALIZED = [...TOP_LEVEL_LOCALIZED, ...NESTED_LOCALIZED];

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
  console.info("ℹ️  Reproducing: nested localized fields missing from meta.localizedTextInputs\n");
  console.info(`    Component:        Vertical Tab`);
  console.info(`    Tab count:        ${TAB_COUNT}`);
  console.info(`    Top-level fields: ${TOP_LEVEL_LOCALIZED.join(", ")}`);
  console.info(`    Nested fields:    ${NESTED_LOCALIZED.join(", ")}`);
  console.info(`    Total expected:   ${ALL_LOCALIZED.length} fields\n`);

  // ── Phase 1: Create entries ───────────────────────────────────────────────
  console.info("── Phase 1: Create representative entries ──\n");

  console.info(
    "📝  Creating 'before' entry  (top-level only — simulates editor auto-generation on drag-and-drop)…"
  );
  const beforeId = await createEntry("before", TOP_LEVEL_LOCALIZED);
  console.info(`    ✅  ${beforeId}\n`);

  console.info(
    "📝  Creating 'after'  entry  (all fields — simulates state after manually clicking every field)…"
  );
  const afterId = await createEntry("after", ALL_LOCALIZED);
  console.info(`    ✅  ${afterId}\n`);

  fs.writeFileSync(RUN_IDS_FILE, JSON.stringify({ beforeId, afterId }, null, 2));
  console.info(`💾  Entry IDs saved to ${RUN_IDS_FILE}\n`);

  // ── Phase 2: Fetch and inspect ────────────────────────────────────────────
  console.info("⏳  Waiting 2 s for entries to propagate…");
  await sleep(2000);

  console.info("\n── Phase 2: Inspect meta.localizedTextInputs on the Vertical Tab block ──\n");

  const beforeActual = await fetchAndInspect(beforeId, "before");
  const afterActual = await fetchAndInspect(afterId, "after");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.info("── Summary ──\n");

  if (beforeActual === null || afterActual === null) {
    console.error("❌  Could not fetch one or both entries. Check API credentials and MODEL_NAME.");
    process.exitCode = 1;
    return;
  }

  const missingFromBefore = ALL_LOCALIZED.filter((f) => !beforeActual.includes(f));
  const missingFromAfter = ALL_LOCALIZED.filter((f) => !afterActual.includes(f));

  if (missingFromBefore.length > 0 && missingFromAfter.length === 0) {
    console.error("❌  Bug reproduced.\n");
    console.error(
      `    The 'before' entry is missing ${missingFromBefore.length} field(s) from meta.localizedTextInputs:\n`
    );
    missingFromBefore.forEach((f) => console.error(`      - ${f}`));
    console.error(
      "\n    These paths only appear after the user manually clicks each field in the visual editor."
    );
    console.error(
      `    Expected: all ${ALL_LOCALIZED.length} fields present automatically on component placement.`
    );
    console.error(
      "\n    Workaround: include the full meta.localizedTextInputs list in the Write API POST body"
    );
    console.error(
      "    (as demonstrated by the 'after' entry).\n"
    );
    process.exitCode = 1;
  } else if (missingFromBefore.length === 0 && missingFromAfter.length === 0) {
    console.info("✅  Both entries have all localized fields present. Bug not reproduced in this space.");
    console.info(
      "    (Both entries were created via Write API with explicit meta.localizedTextInputs — no editor interaction needed.)"
    );
  } else if (missingFromAfter.length > 0) {
    console.warn(`⚠️  Unexpected: 'after' entry is also missing fields: ${missingFromAfter.join(", ")}`);
    console.warn("    The Write API may not have preserved the meta as written. Check the PATCH response.");
  } else {
    console.info(
      `ℹ️  Partial result — before missing: ${missingFromBefore.length}, after missing: ${missingFromAfter.length}`
    );
  }

  console.info("\nRun --cleanup to archive the test entries.");
}

// ── Block builder ─────────────────────────────────────────────────────────────

function makeVerticalTabBlock(localizedTextInputs) {
  const tabs = Array.from({ length: TAB_COUNT }, (_, i) => ({
    label: {
      "@type": "@builder.io/core:LocalizedValue",
      Default: `Tab ${i + 1}`,
    },
    blocks: [],
  }));

  return {
    "@type": "@builder.io/sdk:Element",
    component: {
      name: "Vertical Tab",
      options: {
        tabHeader: {
          "@type": "@builder.io/core:LocalizedValue",
          Default: "Features",
        },
        pagerLabel: {
          "@type": "@builder.io/core:LocalizedValue",
          Default: "View More Features",
        },
        theme: "gray",
        shownFeatures: TAB_COUNT,
        nextItem: {
          displayNextItemLink: false,
          nextItemText: {
            "@type": "@builder.io/core:LocalizedValue",
            Default: "Next Item",
          },
        },
        tabs,
      },
    },
    // This is the field under investigation: what paths end up here determines
    // which fields Builder will serve locale variants for. The bug is that the
    // editor only auto-populates top-level paths, leaving nested array paths absent.
    meta: {
      localizedTextInputs,
    },
  };
}

// ── Write API helpers ─────────────────────────────────────────────────────────

async function createEntry(label, localizedTextInputs) {
  const ts = Date.now();
  const urlPath = `/repro-localized-${label}-${ts}`;

  const body = {
    name: `repro-localized-${label}-${ts}`,
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
      blocks: [makeVerticalTabBlock(localizedTextInputs)],
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
    throw new Error(`createEntry(${label}) failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const id = data?.id ?? data?.results?.[0]?.id;
  if (!id) throw new Error(`createEntry: no id in response: ${JSON.stringify(data)}`);
  return id;
}

// ── Content API helpers ───────────────────────────────────────────────────────

async function fetchEntry(entryId) {
  const url = new URL(`${CONTENT_BASE}/${MODEL_NAME}`);
  url.searchParams.set("apiKey", API_KEY);
  url.searchParams.set("query.id", entryId);
  url.searchParams.set("limit", "1");
  url.searchParams.set("cachebust", "true");
  url.searchParams.set("includeUnpublished", "true");

  const response = await fetchFn(url.toString());
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`fetchEntry(${entryId}) failed (${response.status}): ${text}`);
  }

  const payload = await response.json();
  return payload?.results?.[0] ?? null;
}

function findVerticalTabBlock(blocks) {
  if (!Array.isArray(blocks)) return null;
  for (const block of blocks) {
    if (block?.component?.name === "Vertical Tab") return block;
    const inChildren = findVerticalTabBlock(block?.children);
    if (inChildren) return inChildren;
  }
  return null;
}

async function fetchAndInspect(entryId, label) {
  const entry = await fetchEntry(entryId);
  if (!entry) {
    console.error(`  ❌  Entry "${label}" (${entryId}) not found — check BUILDER_API_KEY and MODEL_NAME.`);
    return null;
  }

  const block = findVerticalTabBlock(entry?.data?.blocks);
  if (!block) {
    console.error(`  ❌  Vertical Tab block not found in entry "${label}" (${entryId}).`);
    return null;
  }

  const actual = block?.meta?.localizedTextInputs ?? null;

  console.info(`  ${label} (${entryId}):`);
  if (actual === null) {
    console.info(`    meta.localizedTextInputs: (field absent)`);
  } else {
    console.info(`    meta.localizedTextInputs: ${JSON.stringify(actual)}`);

    const presentTopLevel = TOP_LEVEL_LOCALIZED.filter((f) => actual.includes(f));
    const presentNested = NESTED_LOCALIZED.filter((f) => actual.includes(f));
    const missingNested = NESTED_LOCALIZED.filter((f) => !actual.includes(f));
    const missingTopLevel = TOP_LEVEL_LOCALIZED.filter((f) => !actual.includes(f));

    console.info(`    Top-level:  ${presentTopLevel.length}/${TOP_LEVEL_LOCALIZED.length} present  ${missingTopLevel.length > 0 ? "❌ missing: " + missingTopLevel.join(", ") : "✅"}`);
    console.info(`    Nested:     ${presentNested.length}/${NESTED_LOCALIZED.length} present  ${missingNested.length > 0 ? "❌ missing: " + missingNested.join(", ") : "✅"}`);
  }
  console.info("");

  return actual ?? [];
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

async function cleanup() {
  if (!fs.existsSync(RUN_IDS_FILE)) {
    console.error(`❌  ${RUN_IDS_FILE} not found. Run the repro first.`);
    process.exit(1);
  }

  const { beforeId, afterId } = JSON.parse(fs.readFileSync(RUN_IDS_FILE, "utf8"));
  const ids = [beforeId, afterId].filter(Boolean);

  console.info(`ℹ️  Archiving ${ids.length} test entries…`);
  for (const id of ids) {
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
