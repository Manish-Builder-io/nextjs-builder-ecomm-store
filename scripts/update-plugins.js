#!/usr/bin/env node

/**
 * Update the list of plugins loaded for a Builder.io space using the Admin GraphQL API.
 *
 * Default behaviour (no flags):
 *   1. Fetches the current loadPlugins list from the space.
 *   2. Keeps ALL existing plugins intact.
 *   3. Ensures @builder.io/plugin-magento is in the list (appends if missing).
 *   4. Sends updatePlugins with the full loadPlugins array AND pluginSettings
 *      for the Magento plugin only — all other plugins are untouched.
 *   5. Re-reads settings and verifies the Magento config was persisted.
 *
 * Usage:
 *   node update-plugins.js                  # fetch + update Magento plugin settings
 *   node update-plugins.js --dry-run        # print payload, skip mutation
 *   node update-plugins.js --list           # print current plugins and exit
 *
 * Environment variables:
 *   BUILDER_PRIVATE_API_KEY   (required) – Private Builder API key (bpk-***).
 *   MAGENTO_STORE_URL         (optional) – Overrides default storeUrl.
 *   MAGENTO_API_KEY           (optional) – Overrides default apiKey.
 *
 * Documentation:
 *   https://www.builder.io/c/docs/admin-graphql-schema#mutation
 */

import process from "node:process";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";
const MAGENTO_PLUGIN_ID  = "@builder.io/plugin-magento2";

const PRIVATE_KEY =
  process.env.BUILDER_PRIVATE_API_KEY || "";

// Magento plugin config — override via env vars or edit directly
const MAGENTO_PLUGIN_SETTINGS = {
  storeUrl: process.env.MAGENTO_STORE_URL || "https://store.magento-demo.com",
  apiKey:   process.env.MAGENTO_API_KEY   || "abc123",
};

// ─── Parse CLI flags ──────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isList   = args.includes("--list");

// ─── GraphQL helper ───────────────────────────────────────────────────────────
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

// ─── Step 1: fetch current plugins ───────────────────────────────────────────
async function fetchCurrentPlugins() {
  console.info("ℹ️  Fetching current space settings…");

  const { response, result } = await graphqlRequest(`{ settings }`);

  if (!response.ok || result.errors) {
    console.error("❌  Failed to fetch settings — check BUILDER_PRIVATE_API_KEY.");
    logErrors(result.errors);
    process.exit(1);
  }

  const settings    = result.data?.settings ?? {};
  const loadPlugins = settings.loadPlugins  ?? [];
  const pluginCfgs  = settings.settings?.plugins ?? {};

  console.info(`\n  loadPlugins (${loadPlugins.length} found):`);
  loadPlugins.forEach((p, i) => console.info(`    [${i}] ${p}`));

  const magentoLoaded = loadPlugins.includes(MAGENTO_PLUGIN_ID);
  const magentoConfig = pluginCfgs[MAGENTO_PLUGIN_ID];

  console.info(`\n  ${MAGENTO_PLUGIN_ID}:`);
  console.info(`    In loadPlugins : ${magentoLoaded ? "✅ yes" : "❌ no — will be appended"}`);
  console.info(`    Has config     : ${magentoConfig ? "✅ yes" : "❌ no"}`);
  if (magentoConfig) {
    console.info(
      "    Current config :",
      JSON.stringify(magentoConfig, null, 2).replace(/\n/g, "\n    ")
    );
  }

  return { loadPlugins, pluginCfgs, magentoLoaded };
}

// ─── Step 2: update plugins ───────────────────────────────────────────────────
// Sends the FULL existing loadPlugins list (so nothing is removed) plus
// pluginSettings scoped to the Magento plugin only.
async function updateMagentoPluginSettings(loadPlugins, pluginCfgs, magentoLoaded) {
  // Preserve all existing plugins; add Magento only if it wasn't already present
  const updatedLoadPlugins = magentoLoaded
    ? loadPlugins
    : [...loadPlugins, MAGENTO_PLUGIN_ID];

  // Merge: preserve all existing plugin configs, overlay only Magento fields
  const pluginSettings = {
    ...pluginCfgs,
    [MAGENTO_PLUGIN_ID]: {
      ...(pluginCfgs[MAGENTO_PLUGIN_ID] || {}),
      ...MAGENTO_PLUGIN_SETTINGS,
    },
  };

  console.info("\n  Payload to send:");
  console.info("    loadPlugins   :", JSON.stringify(updatedLoadPlugins, null, 2).replace(/\n/g, "\n    "));
  console.info("    pluginSettings:", JSON.stringify(pluginSettings, null, 2).replace(/\n/g, "\n    "));

  if (isDryRun) {
    console.info("\n🔍  Dry-run — skipping mutation.");
    return;
  }

  const mutation = /* GraphQL */ `
    mutation UpdatePlugins($loadPlugins: [String!]!, $pluginSettings: JSONObject) {
      updatePlugins(loadPlugins: $loadPlugins, pluginSettings: $pluginSettings)
    }
  `;

  console.info("\nℹ️  Sending mutation…");
  const { response, result } = await graphqlRequest(mutation, {
    loadPlugins: updatedLoadPlugins,
    pluginSettings,
  });

  // Schema rejected the pluginSettings arg → fix not live
  const schemaRejectsArg = result.errors?.some(
    (e) =>
      /unknown argument/i.test(e.message) ||
      /pluginSettings/i.test(e.message)
  );
  if (schemaRejectsArg) {
    console.error("❌  Server rejected pluginSettings — fix is NOT live yet.");
    logErrors(result.errors);
    process.exit(1);
  }

  // Pre-existing Void! null-violation (ISSUE 1) — warn but still verify the write
  const nullViolation = result.errors?.some((e) =>
    e.message.includes("Cannot return null for non-nullable field")
  );
  if (nullViolation) {
    console.warn(
      "⚠️  Void! null-violation (pre-existing ISSUE 1). Checking whether the write applied…"
    );
  } else if (!response.ok || result.errors?.length) {
    console.error("❌  Mutation failed.");
    logErrors(result.errors);
    process.exit(1);
  } else {
    console.info("✅  Mutation accepted.");
  }

  await verifyMagentoSettings(updatedLoadPlugins);
}

// ─── Step 3: verify persisted config ─────────────────────────────────────────
async function verifyMagentoSettings(expectedLoadPlugins) {
  console.info("\nℹ️  Re-reading settings to verify…");

  const { response, result } = await graphqlRequest(`{ settings }`);

  if (!response.ok || result.errors) {
    console.warn("⚠️  Could not re-fetch settings for verification.");
    logErrors(result.errors);
    return;
  }

  const settings    = result.data?.settings ?? {};
  const loadPlugins = settings.loadPlugins ?? [];
  const persisted   = settings.settings?.plugins?.[MAGENTO_PLUGIN_ID];

  // Confirm no other plugins were accidentally removed
  const missing = expectedLoadPlugins.filter((p) => !loadPlugins.includes(p));
  if (missing.length > 0) {
    console.error(`❌  ${missing.length} plugin(s) missing from loadPlugins after update:`);
    missing.forEach((p) => console.error(`    • ${p}`));
  } else {
    console.info(`✅  loadPlugins intact — all ${loadPlugins.length} plugin(s) present.`);
  }

  // Verify Magento config keys
  console.info(`\n  Persisted config for ${MAGENTO_PLUGIN_ID}:`);
  if (!persisted) {
    console.error("❌  No config found — pluginSettings were NOT persisted.");
    process.exit(1);
  }

  let allMatch = true;
  for (const [key, expected] of Object.entries(MAGENTO_PLUGIN_SETTINGS)) {
    const actual = persisted[key];
    const ok     = actual === expected;
    if (!ok) allMatch = false;
    console.info(
      `  ${ok ? "✅" : "❌"}  ${key}: ${
        ok ? actual : `expected "${expected}", got "${actual ?? "(missing)"}"`
      }`
    );
  }

  if (allMatch) {
    console.info(`\n✅  All Magento plugin settings verified successfully.`);
  } else {
    console.error("\n❌  Some settings did not persist correctly — see above.");
    process.exit(1);
  }
}

// ─── List mode ────────────────────────────────────────────────────────────────
async function listPlugins() {
  const { loadPlugins } = await fetchCurrentPlugins();
  console.info(`\nℹ️  Total plugins loaded: ${loadPlugins.length}`);
}

// ─── Error logging helper ─────────────────────────────────────────────────────
function logErrors(errors) {
  if (Array.isArray(errors)) {
    errors.forEach((e) => console.error(` • ${e.message}`));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌  Missing BUILDER_PRIVATE_API_KEY environment variable.");
    process.exit(1);
  }

  console.info("🛒  Builder.io — update Magento plugin settings\n");

  if (isList) {
    await listPlugins();
    return;
  }

  const { loadPlugins, pluginCfgs, magentoLoaded } = await fetchCurrentPlugins();

  console.info("\n" + "─".repeat(56));
  await updateMagentoPluginSettings(loadPlugins, pluginCfgs, magentoLoaded);
}

main().catch((err) => {
  console.error("❌  Unexpected error:", err);
  process.exit(1);
});