#!/usr/bin/env node

/**
 * Update the list of plugins loaded for a Builder.io space using the Admin GraphQL API.
 *
 * Usage:
 *   node update-plugins.js [plugin-url-1] [plugin-url-2] ...
 *
 *   If no plugin URLs are passed as CLI arguments the BUILDER_PLUGINS env var is
 *   used instead (comma-separated list of URLs).
 *
 *   Pass --dry-run to print the payload without executing the mutation.
 *   Pass --list  to query and print the current plugins without making changes.
 *
 * Environment variables:
 *   BUILDER_PRIVATE_KEY  (required) – Private Builder API key (bpk-***).
 *   BUILDER_PLUGINS      (optional) – Comma-separated plugin URLs used as a
 *                                     fallback when no CLI args are supplied.
 *
 * Documentation:
 *   https://www.builder.io/c/docs/admin-graphql-schema#mutation
 */

import process from "node:process";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";

// ─── Hardcoded fallback key (same pattern as other scripts in this repo) ───────
const PRIVATE_KEY =
  process.env.BUILDER_PRIVATE_API_KEY || "bpk-f1b190065f2947a6b51150cf31441b5f";

// ─── Parse CLI flags ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isList = args.includes("--list");
const pluginArgs = args.filter((a) => !a.startsWith("--"));

// ─── Resolve plugin list ──────────────────────────────────────────────────────
function resolvePlugins() {
  if (pluginArgs.length > 0) return pluginArgs;

  const fromEnv = process.env.BUILDER_PLUGINS;
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

// ─── GraphQL helpers ──────────────────────────────────────────────────────────
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

// ─── Query current settings (plugins live inside the settings JSONObject) ─────
async function listPlugins() {
  console.info("ℹ️  Fetching space settings…");

  // The Admin GraphQL schema exposes a top-level `settings: JSONObject!` field.
  // There is no dedicated `plugins` query — plugin data is embedded in settings.
  const query = /* GraphQL */ `
    {
      settings
    }
  `;

  const { response, result } = await graphqlRequest(query);

  if (!response.ok || result.errors) {
    console.error("❌  Failed to fetch settings.");
    logErrors(result.errors);
    process.exit(1);
  }

  const settings = result.data?.settings ?? {};

  // Surface any plugin-related keys for easy inspection
  const pluginKeys = Object.keys(settings).filter((k) =>
    /plugin/i.test(k)
  );

  if (pluginKeys.length > 0) {
    console.info("📦  Plugin-related settings:");
    pluginKeys.forEach((k) =>
      console.info(JSON.stringify({ [k]: settings[k] }, null, 2))
    );
  } else {
    console.info(
      "ℹ️  No plugin-related keys found in settings. Full settings:"
    );
    console.info(JSON.stringify(settings, null, 2));
  }
}

// ─── Mutation ─────────────────────────────────────────────────────────────────
async function updatePlugins(loadPlugins) {
  const mutation = /* GraphQL */ `
    mutation UpdatePlugins($loadPlugins: [String!]!) {
      updatePlugins(loadPlugins: $loadPlugins)
    }
  `;

  const { response, result } = await graphqlRequest(mutation, { loadPlugins });

  if (!response.ok || result.errors) {
    console.error("❌  updatePlugins mutation failed.");
    logErrors(result.errors);
    process.exit(1);
  }

  console.info("✅  Plugins updated successfully.");
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
    console.error("❌  Missing BUILDER_PRIVATE_KEY environment variable.");
    process.exit(1);
  }

  if (isList) {
    await listPlugins();
    return;
  }

  const plugins = resolvePlugins();

  if (plugins.length === 0) {
    console.error(
      "❌  No plugin URLs provided.\n" +
        "    Pass them as CLI arguments, set BUILDER_PLUGINS=url1,url2, or use --list to inspect current plugins."
    );
    process.exit(1);
  }

  console.info(`ℹ️  Plugins to load (${plugins.length}):`);
  plugins.forEach((p) => console.info(`   • ${p}`));

  if (isDryRun) {
    console.info("\n🔍  Dry-run mode — skipping mutation.");
    console.info("Payload:", JSON.stringify({ loadPlugins: plugins }, null, 2));
    return;
  }

  await updatePlugins(plugins);
}

main().catch((error) => {
  console.error("❌  Unexpected error.");
  console.error(error);
  process.exit(1);
});
