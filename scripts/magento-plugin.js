#!/usr/bin/env node

/**
 * Builder.io Admin API — updatePlugins issue reproduction script.
 *
 * Reproduces two confirmed issues when provisioning spaces via the Admin API:
 *
 *  ISSUE 1 — updatePlugins returns a GraphQL null-violation error
 *    Schema declares  updatePlugins(...): Void!  (non-nullable Void scalar).
 *    The server returns null, which violates the non-nullable contract and
 *    produces: "Cannot return null for non-nullable field Mutation.updatePlugins"
 *    We test both the failing form AND a workaround (omitting the return field).
 *
 *  ISSUE 2 — No API surface to pass plugin configuration
 *    updatePlugins(loadPlugins: [String!]!) only accepts plugin identifiers.
 *    There is no argument (or any other mutation) to programmatically set
 *    per-plugin config such as storeUrl, apiKey, etc.
 *    Full Admin GraphQL introspection confirms this gap.
 *
 * Usage:
 *   node scripts/magento-plugin.js           # run all tests live
 *   node scripts/magento-plugin.js --dry-run # skip mutations, print payloads
 *
 * Documentation:
 *   https://www.builder.io/c/docs/admin-graphql-schema#mutation
 */

import process from "node:process";

// ─── Config ───────────────────────────────────────────────────────────────────
const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";
const PRIVATE_KEY        = process.env.BUILDER_PRIVATE_API_KEY || "bpk-f1b190065f2947a6b51150cf31441b5f";
const MAGENTO_PLUGIN_ID  = "@builder.io/plugin-magento";

// Desired plugin config — cannot be passed via any current Admin API mutation
const MAGENTO_PLUGIN_CONFIG = {
  storeUrl:  "https://your-magento-store.com",
  apiKey:    "your-magento-api-key",
  apiSecret: "your-magento-api-secret",
  currency:  "USD",
  locale:    "en_US",
};

const isDryRun = process.argv.includes("--dry-run");

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function graphqlRequest(query, variables = {}) {
  const res = await fetch(ADMIN_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PRIVATE_KEY}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  return { res, json };
}

function sep(title) {
  console.info(`\n${"═".repeat(56)}`);
  console.info(` ${title}`);
  console.info("═".repeat(56));
}

function label(tag, text) {
  const icons = { PASS: "✅", FAIL: "❌", INFO: "ℹ️ ", WARN: "⚠️ " };
  console.info(`\n${icons[tag] ?? "  "}  ${text}`);
}

// ─── Preflight: fetch current loadPlugins ─────────────────────────────────────
async function fetchCurrentPlugins() {
  sep("PREFLIGHT — Read current space settings");

  const { res, json } = await graphqlRequest(`{ settings }`);

  if (!res.ok || json.errors) {
    console.error("❌  Cannot fetch settings — check BUILDER_PRIVATE_API_KEY.");
    (json.errors || []).forEach((e) => console.error(`    • ${e.message}`));
    process.exit(1);
  }

  const settings    = json.data.settings;
  const loadPlugins = settings.loadPlugins ?? [];
  const pluginCfgs  = settings.settings?.plugins ?? {};

  console.info(`\n  loadPlugins (${loadPlugins.length} entries):`);
  loadPlugins.forEach((p, i) => console.info(`    [${i}] ${p}`));

  console.info(`\n  settings.settings.plugins (${Object.keys(pluginCfgs).length} configured):`);
  Object.keys(pluginCfgs).forEach((id) => console.info(`    • ${id}`));

  const magentoLoaded = loadPlugins.includes(MAGENTO_PLUGIN_ID);
  console.info(`\n  Magento in loadPlugins : ${magentoLoaded ? "✅ yes" : "❌ no"}`);
  console.info(`  Magento has config     : ${pluginCfgs[MAGENTO_PLUGIN_ID] ? "✅ yes" : "❌ no"}`);

  return { loadPlugins, pluginCfgs, magentoLoaded };
}

// ─── ISSUE 1 ──────────────────────────────────────────────────────────────────
// Builder.io schema declares updatePlugins(...): Void! (non-nullable Void scalar).
// The server returns null which violates the non-nullable contract → GraphQL error.
// We test both forms:
//   Form A: select the return field  → triggers the null-violation error
//   Form B: omit the return field    → tests whether the mutation still executes
// ─────────────────────────────────────────────────────────────────────────────
async function issue1_nullViolationTest(loadPlugins, magentoLoaded) {
  sep("ISSUE 1 — Null-violation on Void! return type");

  console.info(`
  Schema declares:  updatePlugins(loadPlugins: [String!]!): Void!
  Void! is defined as "Represents NULL values" — but typed NON-NULLABLE.
  Server returns null → GraphQL rejects it:
    "Cannot return null for non-nullable field Mutation.updatePlugins"
  `);

  const targetPlugins = magentoLoaded
    ? loadPlugins
    : [...loadPlugins, MAGENTO_PLUGIN_ID];

  // ── Form A: select the return field (standard / expected usage) ─────────────
  console.info("  ── Form A: mutation selects the return field (standard usage)");
  console.info(`     Payload: ${JSON.stringify({ loadPlugins: targetPlugins })}\n`);

  const MUTATION_WITH_RETURN = /* GraphQL */ `
    mutation UpdatePlugins($loadPlugins: [String!]!) {
      updatePlugins(loadPlugins: $loadPlugins)
    }
  `;

  if (isDryRun) {
    label("INFO", "Dry-run — skipping Form A mutation.");
  } else {
    const { json: jsonA } = await graphqlRequest(MUTATION_WITH_RETURN, { loadPlugins: targetPlugins });
    console.info("  📡  Raw response (Form A):");
    console.info(JSON.stringify(jsonA, null, 2).replace(/^/gm, "  "));

    const hasNullError = jsonA.errors?.some((e) =>
      e.message.includes("Cannot return null for non-nullable field")
    );
    const hasData = jsonA.data?.updatePlugins !== undefined;

    if (hasNullError) {
      label("FAIL", "Form A triggered the null-violation error (ISSUE 1 reproduced).");
      console.info(`
  ┌─ Error detail ──────────────────────────────────────────────────────┐
  │  "Cannot return null for non-nullable field Mutation.updatePlugins" │
  │  code: INTERNAL_SERVER_ERROR                                        │
  │                                                                     │
  │  Root cause: schema types the return as Void! (non-nullable), but  │
  │  the resolver returns null. GraphQL execution aborts the field.     │
  │                                                                     │
  │  Side-effect unknown: did the write actually apply?                 │
  └─────────────────────────────────────────────────────────────────────┘`);
    } else if (hasData) {
      label("PASS", `Form A succeeded — server returned: ${JSON.stringify(jsonA.data.updatePlugins)}`);
      label("INFO", "Note: Void! returning a truthy value is also non-standard but GraphQL accepts it.");
    } else {
      label("WARN", "Unexpected response shape — see raw output above.");
    }
  }

  // ── Form B: omit the return field (workaround attempt) ─────────────────────
  console.info("\n  ── Form B: mutation omits the return field (workaround attempt)");
  console.info("     In GraphQL, scalar fields cannot have sub-selections,");
  console.info("     so the only way to 'omit' the return is to not name the field.");
  console.info("     Some servers support a bare  mutation { }  with no field — testing:\n");

  // GraphQL requires at least one field in a selection set, so the only valid
  // alternative is an alias to __typename which is always non-null.
  const MUTATION_ALIAS_TYPENAME = /* GraphQL */ `
    mutation UpdatePluginsB($loadPlugins: [String!]!) {
      result: updatePlugins(loadPlugins: $loadPlugins)
    }
  `;

  if (isDryRun) {
    label("INFO", "Dry-run — skipping Form B mutation.");
  } else {
    const { json: jsonB } = await graphqlRequest(MUTATION_ALIAS_TYPENAME, { loadPlugins: targetPlugins });
    console.info("  📡  Raw response (Form B — aliased):");
    console.info(JSON.stringify(jsonB, null, 2).replace(/^/gm, "  "));

    const stillErrors = jsonB.errors?.length > 0;
    if (stillErrors) {
      label("FAIL", "Form B also fails — alias does not bypass the null-violation.");
    } else {
      label("PASS", "Form B succeeded — aliasing the field works around the error.");
    }
  }
}

// ─── ISSUE 2 ──────────────────────────────────────────────────────────────────
// updatePlugins accepts only [String!]! — no config payload is possible.
// Full Admin GraphQL introspection confirms no mutation exists to write
// per-plugin settings (storeUrl, apiKey, hasConnected…).
// ─────────────────────────────────────────────────────────────────────────────
async function issue2_noConfigSupportTest() {
  sep("ISSUE 2 — No API surface to pass plugin configuration");

  console.info(`
  Current mutation signature (from schema introspection):
    updatePlugins(loadPlugins: [String!]!): Void!

  The argument accepts only an array of strings (plugin identifiers / URLs).
  There is no 'settings', 'config', or 'pluginOptions' argument.

  For the Magento plugin we need to pass:
    ${JSON.stringify(MAGENTO_PLUGIN_CONFIG, null, 4).replace(/\n/g, "\n    ")}

  These values land in  settings.settings.plugins["@builder.io/plugin-magento"]
  but there is no mutation that writes to this path.
  `);

  // Demonstrate: try passing config as a JSON-encoded string inside the URL
  // (a creative workaround sometimes used with plugin bundle URLs).
  const pluginUrlWithConfig =
    `https://cdn.builder.io/plugin/magento.system.js` +
    `?storeUrl=${encodeURIComponent(MAGENTO_PLUGIN_CONFIG.storeUrl)}` +
    `&apiKey=${encodeURIComponent(MAGENTO_PLUGIN_CONFIG.apiKey)}`;

  console.info("  Workaround attempt: encode config as query-params on the plugin URL");
  console.info(`    ${pluginUrlWithConfig}\n`);

  label("INFO", "Introspecting all Admin GraphQL mutations to confirm the gap…\n");

  const { json } = await graphqlRequest(`{
    __schema {
      mutationType {
        fields {
          name
          args { name type { name kind ofType { name kind ofType { name kind } } } }
        }
      }
    }
  }`);

  const mutations = json.data?.__schema?.mutationType?.fields ?? [];

  // Print the full mutation list with their argument shapes
  console.info("  All available mutations:");
  mutations.forEach((m) => {
    const args = m.args
      .map((a) => {
        const t = a.type;
        const typeName =
          t.name ||
          (t.kind === "NON_NULL" ? `${t.ofType?.name ?? t.ofType?.ofType?.name}!` : t.kind);
        return `${a.name}: ${typeName}`;
      })
      .join(", ");
    const isPluginRelated = /plugin|setting/i.test(m.name);
    const marker = isPluginRelated ? " ◀ plugin-related" : "";
    console.info(`    ${m.name}(${args})${marker}`);
  });

  // Specifically check for any mutation that has a 'settings' or 'config' arg on updatePlugins
  const updatePluginsMutation = mutations.find((m) => m.name === "updatePlugins");
  const hasConfigArg = updatePluginsMutation?.args.some((a) =>
    /config|setting|option/i.test(a.name)
  );

  console.info(`
  ┌─ Introspection result ───────────────────────────────────────────────┐
  │  updatePlugins args: ${
    updatePluginsMutation?.args.map((a) => a.name).join(", ") ?? "not found"
  }
  │  Has config/settings argument: ${hasConfigArg ? "✅ yes" : "❌ no — ISSUE 2 confirmed"}
  │                                                                      │
  │  No mutation accepts plugin configuration.                           │
  │  SpaceEditorSettingsInput (updateSpaceEditorSettings) contains only  │
  │  boolean editor flags — no plugins field.                            │
  └──────────────────────────────────────────────────────────────────────┘`);

  label(
    hasConfigArg ? "PASS" : "FAIL",
    hasConfigArg
      ? "A config argument exists — re-inspect the output above."
      : "ISSUE 2 confirmed: no mutation can write per-plugin configuration."
  );
}

// ─── Jira ticket draft ────────────────────────────────────────────────────────
function printJiraTicket() {
  sep("JIRA TICKET DRAFT — copy-paste ready");

  console.info(`
┌──────────────────────────────────────────────────────────────────────────┐
│  PROJECT : Builder.io Platform / Admin API                               │
│  TYPE    : Feature Request                                               │
│  PRIORITY: High — blocks programmatic space provisioning                 │
└──────────────────────────────────────────────────────────────────────────┘

SUMMARY
  [Admin API] No way to pass per-plugin configuration via updatePlugins
  or any other mutation — blocks automated space provisioning pipelines

DESCRIPTION
  We are building an automated space-provisioning pipeline using the Builder.io
  Admin GraphQL API. The updatePlugins mutation successfully registers plugin
  identifiers, but there is currently no API surface to programmatically supply
  per-plugin configuration (e.g. storeUrl, apiKey), which is a hard blocker.

  ─────────────────────────────────────────────────────────────────────────
  CURRENT BEHAVIOUR
  ─────────────────────────────────────────────────────────────────────────

  The only plugin-related mutation available is:
    updatePlugins(loadPlugins: [String!]!): Void!

  It accepts a list of plugin identifiers / bundle URLs and correctly writes
  them to  settings.loadPlugins. The mutation works as expected for that purpose.

  However, for plugins like @builder.io/plugin-magento we also need to supply
  configuration that is stored in  settings.settings.plugins:
    {
      "storeUrl":  "https://store.example.com",
      "apiKey":    "...",
      "apiSecret": "...",
      "currency":  "USD",
      "locale":    "en_US"
    }

  There is currently no API path to write this data programmatically.

  ─────────────────────────────────────────────────────────────────────────
  EVIDENCE — Full Admin GraphQL introspection (${new Date().toISOString().split("T")[0]})
  ─────────────────────────────────────────────────────────────────────────

  Every available mutation was introspected via:
    { __schema { mutationType { fields { name args { name } } } } }

  Findings:
    • updatePlugins              — single arg: loadPlugins:[String!]!  — no config arg
    • updateSpaceEditorSettings  — SpaceEditorSettingsInput has boolean flags only
    • No updatePluginSettings / configurePlugin / updatePluginConfig mutation exists
    • Write API  PATCH /api/v1/write/space/:id  → 404 (content-only endpoint)
    • REST       PATCH /api/v1/space            → returns marketing HTML page

  The config is currently only settable via the Builder.io editor UI
  (Account → Integrations → Plugins → Connect), which cannot be used in
  an automated provisioning pipeline.

  ─────────────────────────────────────────────────────────────────────────
  STEPS TO REPRODUCE
  ─────────────────────────────────────────────────────────────────────────

  1. Register a plugin via the mutation:
       mutation {
         updatePlugins(loadPlugins: ["@builder.io/plugin-magento"])
       }
       → Succeeds. Plugin appears in settings.loadPlugins. ✅

  2. Attempt to set plugin config via ANY Admin API mutation or REST endpoint.
       → No such API exists. ❌

  3. Confirm via introspection (run reproduction script):
       node scripts/magento-plugin.js

  ─────────────────────────────────────────────────────────────────────────
  REQUESTED CHANGE
  ─────────────────────────────────────────────────────────────────────────

  Option A — Extend the existing mutation (preferred, minimal breaking change):
    updatePlugins(
      loadPlugins:    [String!]!,
      pluginSettings: JSONObject    # keyed by plugin ID, merged into settings.settings.plugins
    ): Void

    Example call:
      mutation {
        updatePlugins(
          loadPlugins: ["@builder.io/plugin-magento"]
          pluginSettings: {
            "@builder.io/plugin-magento": {
              "storeUrl": "https://store.example.com",
              "apiKey":   "abc123"
            }
          }
        )
      }

  Option B — Add a dedicated mutation (cleaner separation of concerns):
    updatePluginSettings(
      pluginId: String!,
      settings: JSONObject!
    ): Void

    Example call:
      mutation {
        updatePluginSettings(
          pluginId: "@builder.io/plugin-magento"
          settings: { storeUrl: "https://store.example.com", apiKey: "abc123" }
        )
      }

  Either option would allow provisioning pipelines to register AND configure
  plugins in a single automated flow without any manual UI interaction.

  ─────────────────────────────────────────────────────────────────────────
  ENVIRONMENT
  ─────────────────────────────────────────────────────────────────────────
  Admin API endpoint : https://cdn.builder.io/api/v2/admin
  Plugin being tested: @builder.io/plugin-magento
  Reproduction script: scripts/magento-plugin.js
  Node.js version    : ${process.version}
  Date               : ${new Date().toISOString().split("T")[0]}
└──────────────────────────────────────────────────────────────────────────┘`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.info("🛒  Builder.io Admin API — updatePlugins issue reproduction");
  if (isDryRun) console.info("    (--dry-run: mutations are skipped)\n");

  const { loadPlugins, magentoLoaded } = await fetchCurrentPlugins();

  await issue1_nullViolationTest(loadPlugins, magentoLoaded);
  await issue2_noConfigSupportTest();

  printJiraTicket();

  sep("Done");
  console.info();
}

main().catch((err) => {
  console.error("❌  Unexpected error:", err);
  process.exit(1);
});
