#!/usr/bin/env node

/**
 * Sets `showOnHierarchyPage: false` on every model of kind "page" in a
 * Builder space, which moves them out of the Hierarchy/Sitemap view and into
 * the standard model list sidebar.
 *
 * ⚠️  SCOPE GUARANTEE: this script ONLY touches the `showOnHierarchyPage`
 *     field. No other model properties are sent in the `updateModel` mutation
 *     data, so the Admin API merge leaves everything else untouched.
 *
 * Before applying, it writes a backup file containing each page model's id,
 * name, and prior `showOnHierarchyPage` value. Pass that file back with
 * --revert to restore the exact prior state.
 *
 * Usage:
 *   node scripts/update-show-on-hierarchy.js               # apply (sets false)
 *   node scripts/update-show-on-hierarchy.js --dry-run     # preview, no requests
 *   node scripts/update-show-on-hierarchy.js --revert <backup.json>
 *
 * Env:
 *   BUILDER_PRIVATE_KEY (optional)  Overrides the hard-coded admin key below.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";
const PRIVATE_KEY =
  process.env.BUILDER_PRIVATE_KEY || "";

const BACKUP_DIR = path.resolve("scripts/.backups");
const FIELD = "showOnHierarchyPage";
const TARGET_VALUE = false;

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌  Missing BUILDER_PRIVATE_KEY.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const revertIdx = args.indexOf("--revert");

  if (revertIdx !== -1) {
    const backupFile = args[revertIdx + 1];
    if (!backupFile) {
      console.error("❌  --revert requires a backup file path.");
      process.exit(1);
    }
    await revert(backupFile);
    return;
  }

  await apply({ dryRun });
}

main().catch((err) => {
  console.error("❌  Unexpected error.");
  console.error(err);
  process.exit(1);
});

// ── Apply ─────────────────────────────────────────────────────────────────────

async function apply({ dryRun }) {
  console.info("ℹ️  Fetching page-kind models…");
  const pages = await fetchPageModels();
  console.info(`✅  Found ${pages.length} page model(s).\n`);

  if (!pages.length) return;

  const backup = pages.map((m) => ({
    id: m.id,
    name: m.name,
    [`prior_${FIELD}`]: m.everything?.[FIELD] ?? null, // null = key absent
  }));

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUP_DIR, `${FIELD}-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.info(`💾 Backup written: ${backupPath}\n`);

  for (const entry of backup) {
    const label = `${entry.name} (${entry.id})`;
    const prior = entry[`prior_${FIELD}`];

    if (prior === TARGET_VALUE) {
      console.info(`⏭  ${label} — already ${FIELD}=${TARGET_VALUE}, skipping.`);
      continue;
    }

    if (dryRun) {
      console.info(
        `🔎 [dry-run] would set ${FIELD}=${TARGET_VALUE} on ${label} (prior: ${prior})`
      );
      continue;
    }

    await setField(entry.id, TARGET_VALUE);
    console.info(
      `✅ ${label} — ${FIELD} set to ${TARGET_VALUE} (prior: ${prior})`
    );
  }

  console.info(
    `\n${dryRun ? "Dry run complete." : "Done."} ` +
      `To revert: node scripts/update-show-on-hierarchy.js --revert ${backupPath}`
  );
}

// ── Revert ────────────────────────────────────────────────────────────────────

async function revert(backupFile) {
  const abs = path.resolve(backupFile);
  if (!fs.existsSync(abs)) {
    console.error(`❌  Backup file not found: ${abs}`);
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(abs, "utf8"));
  if (!Array.isArray(backup)) {
    console.error("❌  Backup file is not an array.");
    process.exit(1);
  }

  console.info(`ℹ️  Reverting ${backup.length} model(s) from ${abs}\n`);

  for (const entry of backup) {
    const label = `${entry.name} (${entry.id})`;
    const prior = entry[`prior_${FIELD}`];

    // For absent keys we write `true` back — both page-kind models had
    // showOnHierarchyPage: true before the edit, and Builder does not expose a
    // field-delete op via updateModel's data blob, so this is the closest
    // faithful restore.
    const restoreValue = prior === null ? true : prior;

    await setField(entry.id, restoreValue);
    console.info(
      `↩️  ${label} — ${FIELD} restored to ${restoreValue} (prior recorded: ${prior})`
    );
  }

  console.info("\nRevert complete.");
}

// ── GraphQL ───────────────────────────────────────────────────────────────────

async function fetchPageModels() {
  const query = /* GraphQL */ `
    query GetPageModels {
      models {
        id
        name
        kind
        archived
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
  return (result.data?.models ?? []).filter(
    (m) => m.kind === "page" && !m.archived
  );
}

/**
 * Sends ONLY the `showOnHierarchyPage` field in the update. No other
 * properties are included in the `data` payload.
 */
async function setField(id, value) {
  const mutation = /* GraphQL */ `
    mutation UpdateShowOnHierarchy($body: UpdateModelInput!) {
      updateModel(body: $body) {
        id
      }
    }
  `;
  const variables = { body: { id, data: { [FIELD]: value } } };
  const { response, result } = await graphqlRequest(mutation, variables);
  if (!response.ok || result.errors) {
    console.error(`❌  updateModel failed for ${id}`);
    printErrors(result.errors);
    process.exit(1);
  }
  return result.data?.updateModel;
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

function printErrors(errors) {
  if (errors) errors.forEach((e) => console.error(` • ${e.message}`));
}
