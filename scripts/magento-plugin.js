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
 *  FIX VERIFICATION — pluginSettings argument now supported
 *    Tests the new pluginSettings argument on updatePlugins to confirm the
 *    fix for ISSUE 2 is live and correctly persists per-plugin configuration.
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
const PRIVATE_KEY        = process.env.BUILDER_PRIVATE_API_KEY || "";
const MAGENTO_PLUGIN_ID  = "@builder.io/plugin-magento";

// Desired plugin config — now testable via the new pluginSettings argument
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

// ─── FIX VERIFICATION ─────────────────────────────────────────────────────────
// Tests the newly shipped pluginSettings argument on updatePlugins.
// Verifies that:
//   1. The mutation is accepted without errors (schema now supports the arg)
//   2. The config is actually persisted — confirmed by re-reading settings
// ─────────────────────────────────────────────────────────────────────────────
async function fixVerification_pluginSettingsTest(loadPlugins, magentoLoaded) {
  sep("FIX VERIFICATION — pluginSettings argument (ISSUE 2 fix)");

  console.info(`
  Testing the new pluginSettings argument on updatePlugins:

    mutation {
      updatePlugins(
        loadPlugins: ["${MAGENTO_PLUGIN_ID}"]
        pluginSettings: {
          "${MAGENTO_PLUGIN_ID}": {
            "storeUrl": "${MAGENTO_PLUGIN_CONFIG.storeUrl}",
            "apiKey":   "${MAGENTO_PLUGIN_CONFIG.apiKey}"
          }
        }
      )
    }

  Expected: mutation succeeds AND config appears in settings.settings.plugins
  `);

  const targetPlugins = magentoLoaded
    ? loadPlugins
    : [...loadPlugins, MAGENTO_PLUGIN_ID];

  // The pluginSettings value is passed as a JSON string variable since
  // the Admin API schema types it as a JSONObject / untyped scalar.
  const MUTATION_WITH_PLUGIN_SETTINGS = /* GraphQL */ `
    mutation UpdatePluginsWithSettings(
      $loadPlugins: [String!]!
      $pluginSettings: JSON
    ) {
      updatePlugins(
        loadPlugins: $loadPlugins
        pluginSettings: $pluginSettings
      )
    }
  `;

  const pluginSettings = {
    [MAGENTO_PLUGIN_ID]: MAGENTO_PLUGIN_CONFIG,
  };

  console.info("  ── Step 1: send updatePlugins with pluginSettings");
  console.info(`     loadPlugins    : ${JSON.stringify(targetPlugins)}`);
  console.info(`     pluginSettings : ${JSON.stringify(pluginSettings, null, 2).replace(/\n/g, "\n                      ")}\n`);

  if (isDryRun) {
    label("INFO", "Dry-run — skipping mutation. Payload printed above.");
    return;
  }

  const { json: mutJson } = await graphqlRequest(MUTATION_WITH_PLUGIN_SETTINGS, {
    loadPlugins: targetPlugins,
    pluginSettings,
  });

  console.info("  📡  Raw mutation response:");
  console.info(JSON.stringify(mutJson, null, 2).replace(/^/gm, "  "));

  const mutationErrors = mutJson.errors ?? [];
  const schemaRejectsArg = mutationErrors.some(
    (e) =>
      /unknown argument/i.test(e.message) ||
      /pluginSettings/i.test(e.message)
  );
  const nullViolation = mutationErrors.some((e) =>
    e.message.includes("Cannot return null for non-nullable field")
  );
  const otherErrors = mutationErrors.filter(
    (e) => !schemaRejectsArg && !nullViolation
  );

  if (schemaRejectsArg) {
    label("FAIL", "Schema still does not accept pluginSettings — fix is NOT live.");
    console.info(`\n  Error: ${mutationErrors[0]?.message}`);
    return;
  }

  if (nullViolation) {
    // Null-violation means the resolver ran (arg accepted) but Void! still broken.
    // The write may still have applied — check settings to find out.
    label("WARN", "Null-violation on Void! return (ISSUE 1 persists), but the write may have applied.");
    label("INFO", "Continuing to verify settings — checking if config was persisted…");
  } else if (otherErrors.length > 0) {
    label("WARN", `Unexpected errors — see raw response above.`);
    otherErrors.forEach((e) => console.info(`  • ${e.message}`));
  } else {
    label("PASS", "Mutation accepted without errors — pluginSettings arg is live ✅");
  }

  // ── Step 2: re-read settings and verify the config was persisted ────────────
  console.info("\n  ── Step 2: re-read settings to verify config was persisted");

  const { json: settingsJson } = await graphqlRequest(`{ settings }`);

  if (settingsJson.errors) {
    label("WARN", "Could not re-fetch settings for verification.");
    settingsJson.errors.forEach((e) => console.info(`  • ${e.message}`));
    return;
  }

  const persistedPluginCfg =
    settingsJson.data?.settings?.settings?.plugins?.[MAGENTO_PLUGIN_ID];

  console.info("\n  Persisted config for @builder.io/plugin-magento:");
  console.info(
    persistedPluginCfg
      ? JSON.stringify(persistedPluginCfg, null, 2).replace(/^/gm, "    ")
      : "    (none found)"
  );

  if (!persistedPluginCfg) {
    label("FAIL", "Config was NOT persisted — fix may be incomplete.");
    return;
  }

  // Spot-check a few expected keys
  const checks = [
    ["storeUrl",  MAGENTO_PLUGIN_CONFIG.storeUrl],
    ["apiKey",    MAGENTO_PLUGIN_CONFIG.apiKey],
    ["currency",  MAGENTO_PLUGIN_CONFIG.currency],
  ];

  let allMatch = true;
  for (const [key, expected] of checks) {
    const actual = persistedPluginCfg[key];
    const ok = actual === expected;
    if (!ok) allMatch = false;
    console.info(
      `\n  ${ok ? "✅" : "❌"}  settings.settings.plugins["${MAGENTO_PLUGIN_ID}"].${key}`
    );
    console.info(`       expected : ${expected}`);
    console.info(`       actual   : ${actual ?? "(missing)"}`);
  }

  console.info();
  if (allMatch) {
    label("PASS", "All spot-checked config values match — ISSUE 2 fix is verified ✅");
  } else {
    label("FAIL", "One or more config values did not persist correctly — see diff above.");
  }

  // ── Step 3: confirm loadPlugins still intact ────────────────────────────────
  console.info("\n  ── Step 3: confirm loadPlugins was not clobbered");
  const updatedLoadPlugins =
    settingsJson.data?.settings?.loadPlugins ?? [];

  const magentoStillLoaded = updatedLoadPlugins.includes(MAGENTO_PLUGIN_ID);
  console.info(`\n  loadPlugins after mutation: ${JSON.stringify(updatedLoadPlugins)}`);

  if (magentoStillLoaded) {
    label("PASS", `${MAGENTO_PLUGIN_ID} is present in loadPlugins ✅`);
  } else {
    label("FAIL", `${MAGENTO_PLUGIN_ID} was removed from loadPlugins — regression!`);
  }
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
  console.info("🛒  Builder.io Admin API — updatePlugins issue reproduction + fix verification");
  if (isDryRun) console.info("    (--dry-run: mutations are skipped)\n");

  const { loadPlugins, magentoLoaded } = await fetchCurrentPlugins();

  await issue1_nullViolationTest(loadPlugins, magentoLoaded);
  await issue2_noConfigSupportTest();
  await fixVerification_pluginSettingsTest(loadPlugins, magentoLoaded);

  printJiraTicket();

  sep("Done");
  console.info();
}

main().catch((err) => {
  console.error("❌  Unexpected error:", err);
  process.exit(1);
});