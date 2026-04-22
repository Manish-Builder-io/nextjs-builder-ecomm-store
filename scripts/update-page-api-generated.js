#!/usr/bin/env node

/**
 * Sets `apiGenerated: true` on every model of kind "page" in a Builder space.
 *
 * ⚠️  SCOPE GUARANTEE: this script ONLY touches the `apiGenerated` field.
 *     No other model properties are sent in the `updateModel` mutation data.
 *
 * Before applying, it writes a backup file containing each page model's id,
 * name, and prior `apiGenerated` value. Pass that file back with --revert to
 * restore the exact prior state.
 *
 * Usage:
 *   node scripts/update-page-api-generated.js               # apply (default: apiGenerated = true)
 *   node scripts/update-page-api-generated.js --dry-run     # show what would change, make no requests
 *   node scripts/update-page-api-generated.js --revert <backup.json>
 *                                                           # restore apiGenerated to prior values
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

  // Capture prior values for reversal.
  const backup = pages.map((m) => ({
    id: m.id,
    name: m.name,
    priorApiGenerated: m.everything?.apiGenerated ?? null, // null = key was absent
  }));

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUP_DIR, `apiGenerated-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.info(`💾 Backup written: ${backupPath}\n`);

  for (const entry of backup) {
    const label = `${entry.name} (${entry.id})`;
    const prior = entry.priorApiGenerated;

    if (prior === true) {
      console.info(`⏭  ${label} — already apiGenerated=true, skipping.`);
      continue;
    }

    if (dryRun) {
      console.info(`🔎 [dry-run] would set apiGenerated=true on ${label} (prior: ${prior})`);
      continue;
    }

    await setApiGenerated(entry.id, true);
    console.info(`✅ ${label} — apiGenerated set to true (prior: ${prior})`);
  }

  console.info(
    `\n${dryRun ? "Dry run complete." : "Done."} ` +
      `To revert: node scripts/update-page-api-generated.js --revert ${backupPath}`
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
    const prior = entry.priorApiGenerated;

    // Whatever it was before (true, false, or null/absent), write it back.
    // For the "absent" case we explicitly set apiGenerated=false to undo our
    // having added the key. Builder does not expose a field-delete op via
    // updateModel's data blob, so this is the closest faithful restore.
    const restoreValue = prior === null ? false : prior;

    await setApiGenerated(entry.id, restoreValue);
    console.info(`↩️  ${label} — apiGenerated restored to ${restoreValue} (prior recorded: ${prior})`);
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
 * Sends ONLY the `apiGenerated` field in the update. No other properties are
 * included in the `data` payload, so the Admin API merge will leave everything
 * else on the model untouched.
 */
async function setApiGenerated(id, value) {
  const mutation = /* GraphQL */ `
    mutation UpdateApiGenerated($body: UpdateModelInput!) {
      updateModel(body: $body) {
        id
      }
    }
  `;
  // `data` is a partial merge — only apiGenerated is sent, nothing else.
  const variables = { body: { id, data: { apiGenerated: value } } };
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
