#!/usr/bin/env node

/**
 * Fetch space (or organization) metadata and member list using the Builder
 * Admin GraphQL API. Also supports resolving a user id against the space
 * members.
 *
 * The Bearer key is the scope selector — querying with a space key returns
 * that space's settings+users; querying with an org key returns the org's.
 * There is no orgId/spaceId argument on the Admin API.
 *
 * Usage:
 *   node scripts/get-space-info.js                   # dump space/org info + members
 *   node scripts/get-space-info.js <USER_ID>         # also resolve USER_ID against members
 *
 * Env:
 *   BUILDER_PRIVATE_KEY (optional)  Overrides the hard-coded key below.
 *
 * Docs: https://www.builder.io/c/docs/admin-api-manage-spaces
 */

import process from "node:process";

const ADMIN_API_ENDPOINT = "https://cdn.builder.io/api/v2/admin";
const PRIVATE_KEY =
  process.env.BUILDER_PRIVATE_KEY || "";

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌  Missing BUILDER_PRIVATE_KEY.");
    process.exit(1);
  }

  const [, , maybeUserId] = process.argv;

  const query = /* GraphQL */ `
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
  `;

  const { response, result } = await graphqlRequest(query);
  if (!response.ok || result.errors) {
    console.error("❌  Failed to fetch space info.");
    printErrors(result.errors);
    process.exit(1);
  }

  const settings = result.data?.settings ?? {};
  const users = result.data?.users ?? [];

  printSettings(settings);
  console.info("");
  printMembers(users);

  if (maybeUserId) {
    console.info("");
    resolveUserId(maybeUserId, users, settings);
  }
}

main().catch((err) => {
  console.error("❌  Unexpected error.");
  console.error(err);
  process.exit(1);
});

// ── Display ───────────────────────────────────────────────────────────────────

function printSettings(s) {
  const typeLabel = s.type === "root" ? "ORGANIZATION" : s.type?.toUpperCase() || "UNKNOWN";
  console.info(`══ ${typeLabel} ─ ${s.name ?? "(unnamed)"} ──`);
  console.info(`  id:                  ${s.id ?? "-"}`);
  console.info(`  type:                ${s.type ?? "-"}`);
  console.info(`  createdDate:         ${formatDate(s.createdDate)}`);
  console.info(`  trialStartUserId:    ${s.trialStartUserId ?? "(not set)"}`);
  console.info(`  ownerId:             ${s.ownerId ?? "-"}`);
  console.info(`  parentOrganization:  ${s.parentOrganization ?? "(none — this is a root org)"}`);
  console.info(`  subscription:        ${s.subscription ?? "-"}`);
  console.info(`  siteUrl:             ${s.siteUrl ?? "-"}`);
  console.info(`  lastUpdateBy:        ${s.lastUpdateBy ?? "(not set)"}`);
}

function printMembers(users) {
  console.info(`── MEMBERS (${users.length}) ──`);
  if (!users.length) {
    console.info("  (no members returned)");
    return;
  }
  // Sort admins first, then by email
  const sorted = [...users].sort((a, b) => {
    const roleRank = (r) => (r === "admin" ? 0 : 1);
    const d = roleRank(a.role) - roleRank(b.role);
    if (d !== 0) return d;
    return (a.email ?? "").localeCompare(b.email ?? "");
  });
  for (const u of sorted) {
    const last = u.lastActive
      ? new Date(u.lastActive).toISOString().slice(0, 10)
      : "never";
    console.info(
      `  • ${u.email ?? "(no email)"}  role=${u.role || "(none)"}  lastActive=${last}`
    );
    console.info(`    id: ${u.id}`);
  }
}

function resolveUserId(userId, users, settings) {
  console.info(`── RESOLVE USER ID: ${userId} ──`);
  const match = users.find((u) => u.id === userId);
  if (match) {
    console.info(`✅ Matched a current member:`);
    console.info(`    email:      ${match.email}`);
    console.info(`    name:       ${match.name ?? "(no name)"}`);
    console.info(`    role:       ${match.role}`);
    console.info(`    lastActive: ${match.lastActive ? new Date(match.lastActive).toISOString() : "never"}`);
    return;
  }
  console.info(`⚠️  Not found in current members of this ${settings.type || "entity"}.`);
  console.info(`    The user may have been removed, or may belong to a different`);
  console.info(`    space/org. The Admin API has no cross-space user lookup — try`);
  console.info(`    running this script with that space's / org's private key.`);

  // Flag known "creator-ish" signals
  if (settings.trialStartUserId === userId) {
    console.info(`    Note: this id matches settings.trialStartUserId (the user who`);
    console.info(`          started the trial that provisioned the space).`);
  }
  if (settings.lastUpdateBy === userId) {
    console.info(`    Note: this id matches settings.lastUpdateBy.`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(msEpoch) {
  if (!msEpoch) return "(not set)";
  const iso = new Date(msEpoch).toISOString();
  return `${iso}  (${msEpoch})`;
}

function printErrors(errors) {
  if (errors) errors.forEach((e) => console.error(` • ${e.message}`));
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
