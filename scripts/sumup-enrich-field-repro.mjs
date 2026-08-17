#!/usr/bin/env node

// biome-ignore-all lint/suspicious/noConsole: CLI reproduction script reports progress to stdout.

import { createHash, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BUILDER_MAIN_PUBLIC_API_KEY = 'a819f*******5';
const BUILDER_STAGING_PUBLIC_API_KEY = 'bpk-******';

if (
  BUILDER_MAIN_PUBLIC_API_KEY.startsWith('<') ||
  BUILDER_STAGING_PUBLIC_API_KEY.startsWith('<')
) {
  console.error(
    'Replace BUILDER_MAIN_PUBLIC_API_KEY and BUILDER_STAGING_PUBLIC_API_KEY placeholders before running.',
  );
  process.exit(1);
}

const RUNS = 100;
const MODEL = 'catalog';
const LOCALE = 'en-IE';
const CHANNEL_FIELD = 'data.channel';
const CHANNEL_VALUE = 'website';
const ENRICH_LEVEL = 4;
// Server-side content resolution reportedly times out around 30s; flag
// anything creeping close to that so slow/cut-off nested fetches stand out
// from genuinely-missing (404) references.
const NEAR_TIMEOUT_MS = 25000;
// Cap live probes per unique unresolved (model,id) pair. A deleted
// reference 404s deterministically, so re-probing every occurrence across
// 100 runs just burns requests without new information; a couple of
// samples is enough to confirm it isn't flaky.
const MAX_PROBES_PER_REFERENCE = 2;
// Delay between rounds, in ms. Defaults to 0 (back-to-back, the original
// behavior). Set REQUEST_DELAY_MS=5000 to space rounds out and test whether
// the failure rate is sensitive to how much concurrent load this script
// itself is putting on the backend, vs. being a fixed per-content flakiness
// independent of request rate.
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS ?? 0);

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const timestamp = new Date()
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\.\d{3}/, '');
const output = resolve(`builder-content-api-repro-results-${timestamp}.json`);

const fingerprint = (key) =>
  createHash('sha256').update(key).digest('hex').slice(0, 12);

const isObject = (value) => value !== null && typeof value === 'object';

// First array index along the path (e.g. "$.products[10].storeproduct" -> 10).
// Used to check whether failures cluster at later positions in a list, which
// would point at a concurrency/ordering cutoff inside enrichment rather than
// a per-request timeout.
const topLevelArrayIndexOf = (path) => {
  const match = path.match(/\[(\d+)\]/);
  return match ? Number(match[1]) : null;
};

// enrichOptions.enrichLevel counts reference-resolution hops (how many times
// a Reference's value.data was itself fetched and walked into), NOT raw JSON
// path depth. A reference sitting inside three array/object levels but behind
// only one resolved parent reference is still at enrich-hop-depth 1. Raw path
// depth conflates the two and wrongly flags plenty of real failures as
// "expected, beyond configured depth" just because they happen to sit behind
// an array or two.
const enrichHopDepthOf = (path) => (path.match(/\.value\.data/g) || []).length;

const walkReferences = (value, path = '$', references = []) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walkReferences(item, `${path}[${index}]`, references),
    );
    return references;
  }

  if (!isObject(value)) {
    return references;
  }

  if (value['@type'] === '@builder.io/core:Reference') {
    const depth = path === '$' ? 0 : path.split('.').length - 1;
    const enrichHopDepth = enrichHopDepthOf(path);
    references.push({
      path,
      model: value.model,
      id: value.id,
      depth,
      enrichHopDepth,
      // References beyond the requested enrichOptions.enrichLevel (counted
      // in actual reference-resolution hops, not raw path depth) are
      // expected to come back unresolved — that's not a failure, it's the
      // API doing what was asked. Only refs within this depth that still
      // fail to resolve are real "fetching_relationship_failed" candidates.
      withinEnrichDepth: enrichHopDepth <= ENRICH_LEVEL,
      topLevelArrayIndex: topLevelArrayIndexOf(path),
      resolved: isObject(value.value) && isObject(value.value.data),
    });
  }

  Object.entries(value).forEach(([key, child]) =>
    walkReferences(child, `${path}.${key}`, references),
  );
  return references;
};

const uniqueCachebust = () => `${Date.now()}-${randomUUID()}`;

// Headers likely to reveal cache hits (stale cached responses masking a
// live 404) vs. fresh origin responses, plus request tracing.
const DIAGNOSTIC_HEADERS = [
  'age',
  'cache-control',
  'x-cache',
  'cf-cache-status',
  'x-builder-cache',
  'x-response-time',
  'server-timing',
  'via',
  'date',
];

const pickHeaders = (headers) =>
  Object.fromEntries(
    DIAGNOSTIC_HEADERS.map((name) => [name, headers.get(name)]).filter(
      ([, value]) => value !== null,
    ),
  );

// Re-fetches a single reference directly by model/id (the same shape as
// the CDN URL that 404s in prod) to determine whether it's a genuinely
// deleted/unpublished target or something transient.
const probeReference = async ({ model, id, key }) => {
  const url = new URL(`https://cdn.builder.io/api/v3/content/${model}/${id}`);
  url.searchParams.set('apiKey', key);
  url.searchParams.set('includeUnpublished', 'true');
  url.searchParams.set('cachebust', uniqueCachebust());

  const started = Date.now();
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  const body = await response.text();
  const durationMs = Date.now() - started;

  return {
    status: response.status,
    durationMs,
    requestId: response.headers.get('x-request-id'),
    headers: pickHeaders(response.headers),
    exists: response.status === 200,
    bodySnippet: body.slice(0, 300),
  };
};

const referenceKey = (reference) => `${reference.model}::${reference.id}`;

// Real-network runs occasionally hit a raw socket-level failure (e.g.
// ETIMEDOUT on read) rather than an HTTP error — undici surfaces that as
// `error.cause.code`. Falls back to error.code / error.message so whatever
// comes back is still reportable instead of crashing the whole run.
const describeNetworkError = (error) => ({
  errorCode: error.cause?.code ?? error.code ?? null,
  errorMessage: error.message,
});

// Probes are memoized per (model,id) across the whole run so the same
// deleted reference isn't re-fetched on every one of its ~100 occurrences.
const probeCache = new Map();

const probeUnresolved = async ({ reference, key, sequence }) => {
  const cacheKey = referenceKey(reference);
  const entry = probeCache.get(cacheKey) ?? {
    model: reference.model,
    id: reference.id,
    firstSeenSequence: sequence,
    occurrences: 0,
    probes: [],
  };
  entry.occurrences += 1;

  if (entry.probes.length < MAX_PROBES_PER_REFERENCE) {
    try {
      const probe = await probeReference({ model: reference.model, id: reference.id, key });
      entry.probes.push({ atSequence: sequence, ...probe });
    } catch (error) {
      // A probe failing outright (as opposed to resolving with a 404) is
      // itself a data point — it means the same network flakiness that
      // affects the main enrich request can also affect a plain single-id
      // fetch, not just composite/nested resolution.
      entry.probes.push({
        atSequence: sequence,
        probeFailed: true,
        ...describeNetworkError(error),
      });
    }
  }

  probeCache.set(cacheKey, entry);
  return entry;
};

// Per (model,id) resolution history across every run, regardless of
// pass/fail — lets us tell "this specific item intermittently drops" apart
// from "failures are spread evenly across the catalog" (the latter points
// at a probabilistic/concurrency bug in enrichment rather than one bad ref).
const referenceStats = new Map();

// Failure rate bucketed by top-level array index (e.g. products[N]), scoped
// to refs within the configured enrich depth. If later indices fail more
// often, that suggests enrichment has an ordering/concurrency cutoff rather
// than a flat per-request timeout.
const indexFailureHistogram = new Map();

const recordReferenceObservation = (reference) => {
  const cacheKey = referenceKey(reference);
  const stats = referenceStats.get(cacheKey) ?? {
    model: reference.model,
    id: reference.id,
    seenCount: 0,
    unresolvedCount: 0,
    depths: new Set(),
    topLevelArrayIndices: new Set(),
  };
  stats.seenCount += 1;
  stats.depths.add(reference.depth);
  if (reference.topLevelArrayIndex !== null) {
    stats.topLevelArrayIndices.add(reference.topLevelArrayIndex);
  }
  const isRealFailure = !reference.resolved && reference.withinEnrichDepth;
  if (isRealFailure) {
    stats.unresolvedCount += 1;
  }
  referenceStats.set(cacheKey, stats);

  if (reference.withinEnrichDepth && reference.topLevelArrayIndex !== null) {
    const bucket = indexFailureHistogram.get(reference.topLevelArrayIndex) ?? {
      seen: 0,
      unresolved: 0,
    };
    bucket.seen += 1;
    if (isRealFailure) {
      bucket.unresolved += 1;
    }
    indexFailureHistogram.set(reference.topLevelArrayIndex, bucket);
  }
};

// Captured once, from the first run that resolves every reference. When a
// reference fails to resolve, everything nested inside its (unfetched)
// value.data silently disappears from the walk instead of showing up as
// its own unresolved entry — so the raw "unresolved" list drastically
// understates the blast radius of a single broken relationship. This
// baseline lets us estimate, per (model,id), how many descendant
// references live beneath it whenever it does fail.
let baselineDescendantCounts = null;

const captureBaselineDescendantCounts = (references) => {
  const counts = new Map();
  for (const reference of references) {
    const nestedPrefix = `${reference.path}.value.data`;
    const descendantCount = references.filter((candidate) =>
      candidate.path.startsWith(nestedPrefix),
    ).length;
    counts.set(referenceKey(reference), descendantCount);
  }
  return counts;
};

// Estimated total references lost (the failing reference plus everything
// baseline-known to live beneath it) when a given (model,id) fails to
// resolve. Falls back to just itself (1) if no baseline is available yet
// or the id never appeared in a fully-resolved run.
const estimatedBlastRadius = (reference) => {
  const descendants = baselineDescendantCounts?.get(referenceKey(reference));
  return 1 + (descendants ?? 0);
};

const request = async ({ label, key, sequence }) => {
  const url = new URL(`https://cdn.builder.io/api/v3/content/${MODEL}`);
  url.searchParams.set('apiKey', key);
  url.searchParams.set('limit', '1');
  url.searchParams.set('locale', LOCALE);
  url.searchParams.set(`query.${CHANNEL_FIELD}`, CHANNEL_VALUE);
  url.searchParams.set('enrich', 'true');
  url.searchParams.set('enrichOptions.enrichLevel', String(ENRICH_LEVEL));
  url.searchParams.set('noCache', 'true');
  url.searchParams.set('cacheSeconds', '0');
  url.searchParams.set('cachebust', uniqueCachebust());

  const query = Object.fromEntries(url.searchParams.entries());
  delete query.apiKey;
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  const body = await response.text();
  const json = JSON.parse(body);
  const references = walkReferences(json.results?.[0]?.data || {});
  const unresolved = references.filter((reference) => !reference.resolved);

  const durationMs = Date.now() - started;

  return {
    sequence,
    label,
    keyFingerprint: fingerprint(key),
    startedAt,
    durationMs,
    possibleTimeout: durationMs >= NEAR_TIMEOUT_MS,
    status: response.status,
    requestId: response.headers.get('x-request-id'),
    headers: pickHeaders(response.headers),
    bodyBytes: Buffer.byteLength(body),
    query,
    totalReferences: references.length,
    // Full reference list, used by main() to update cross-run resolution-rate
    // stats. Stripped before the per-request result is persisted to the
    // output file — with ~680 refs x 200 requests that would otherwise
    // duplicate almost all of the same data hundreds of times over.
    references,
    unresolved,
  };
};

const spaces = [
  { label: 'main', key: BUILDER_MAIN_PUBLIC_API_KEY },
  { label: 'staging', key: BUILDER_STAGING_PUBLIC_API_KEY },
];

const main = async () => {
  console.log(
    REQUEST_DELAY_MS > 0
      ? `Pacing: ${REQUEST_DELAY_MS}ms delay between rounds`
      : 'Pacing: back-to-back (no delay)',
  );

  const results = [];
  let sequence = 1;
  // Running max of totalReferences per space — the highest value observed
  // is the best available estimate of the "everything resolved" baseline,
  // used for the live `missing=` figure. The authoritative version (using
  // the final max across the whole run) is recomputed post-hoc for the
  // summary/leaderboard.
  const runningMaxReferences = new Map();

  for (let round = 0; round < RUNS; round += 1) {
    if (round > 0 && REQUEST_DELAY_MS > 0) {
      await sleep(REQUEST_DELAY_MS);
    }
    for (const space of spaces) {
      const currentSequence = sequence;
      sequence += 1;

      let result;
      try {
        result = await request({ ...space, sequence: currentSequence });
      } catch (error) {
        // Real-network runs occasionally hit a raw socket failure (seen:
        // ETIMEDOUT on read) instead of an HTTP response. That's itself a
        // data point worth keeping, not a reason to lose the rest of the
        // run — log it as its own event type and move on.
        const { errorCode, errorMessage } = describeNetworkError(error);
        results.push({
          sequence: currentSequence,
          label: space.label,
          keyFingerprint: fingerprint(space.key),
          networkError: true,
          errorCode,
          errorMessage,
        });
        console.log(
          `${String(currentSequence).padStart(3)} ${space.label.padEnd(8)} NETWORK_ERR code=${errorCode ?? '-'} message=${errorMessage}`,
        );
        continue;
      }

      for (const reference of result.references) {
        recordReferenceObservation(reference);
      }
      if (!baselineDescendantCounts && result.unresolved.length === 0 && result.totalReferences > 0) {
        baselineDescendantCounts = captureBaselineDescendantCounts(result.references);
      }
      // Full per-reference list is only needed for the stats pass above;
      // drop it before persisting/summarizing this result.
      const { references: _references, ...persistedResult } = result;
      results.push(persistedResult);

      const priorMax = runningMaxReferences.get(result.label) ?? 0;
      runningMaxReferences.set(
        result.label,
        Math.max(priorMax, result.totalReferences),
      );
      const missingReferenceCount = Math.max(
        0,
        runningMaxReferences.get(result.label) - result.totalReferences,
      );

      const realUnresolved = result.unresolved.filter(
        (reference) => reference.withinEnrichDepth,
      );
      const beyondDepth = result.unresolved.filter(
        (reference) => !reference.withinEnrichDepth,
      );
      const status = realUnresolved.length
        ? 'UNRESOLVED'
        : beyondDepth.length
          ? 'DEPTH-LIMIT'
          : 'ok';
      const timeoutFlag = result.possibleTimeout ? ' NEAR_TIMEOUT' : '';
      const missingFlag = missingReferenceCount
        ? ` missing=${missingReferenceCount}`
        : '';
      console.log(
        `${String(result.sequence).padStart(3)} ${result.label.padEnd(8)} ${status.padEnd(10)} status=${result.status} duration=${result.durationMs}ms refs=${result.totalReferences} requestId=${result.requestId ?? '-'}${missingFlag}${timeoutFlag}`,
      );

      for (const reference of beyondDepth) {
        console.log(
          `      -> (beyond enrich depth, expected) ${reference.path} model=${reference.model} id=${reference.id} enrichHopDepth=${reference.enrichHopDepth} > enrichLevel=${ENRICH_LEVEL} (rawPathDepth=${reference.depth})`,
        );
      }

      for (const reference of realUnresolved) {
        const probeEntry = await probeUnresolved({
          reference,
          key: space.key,
          sequence: result.sequence,
        });
        reference.probe = probeEntry;
        const latestProbe = probeEntry.probes.at(-1);
        const verdict = latestProbe
          ? latestProbe.probeFailed
            ? `PROBE_FAILED (${latestProbe.errorCode ?? latestProbe.errorMessage}) — could not verify directly, network-level failure on the probe itself`
            : latestProbe.exists
              ? 'EXISTS (transient? re-check timeout/enrich path)'
              : `MISSING (status=${latestProbe.status}) — likely deleted/unpublished referenced content`
          : `cached verdict from earlier probe (occurrence #${probeEntry.occurrences})`;
        const blastRadius = estimatedBlastRadius(reference);
        console.log(
          `      -> ${reference.path} model=${reference.model} id=${reference.id} enrichHopDepth=${reference.enrichHopDepth} rawPathDepth=${reference.depth}${reference.topLevelArrayIndex !== null ? ` index=${reference.topLevelArrayIndex}` : ''} estBlastRadius=${blastRadius}`,
        );
        console.log(
          `         probe: ${verdict}${latestProbe ? ` duration=${latestProbe.durationMs}ms requestId=${latestProbe.requestId ?? '-'}` : ''}`,
        );
      }
    }
  }

  const summary = Object.fromEntries(
    spaces.map(({ label }) => {
      const spaceResults = results.filter((result) => result.label === label);
      const networkErrorResults = spaceResults.filter(
        (result) => result.networkError,
      );
      // Network errors never got an HTTP response, so they carry none of
      // the reference/enrichment fields — keep them out of every
      // reference-based computation below, but still count them separately.
      const successfulResults = spaceResults.filter(
        (result) => !result.networkError,
      );
      const realUnresolvedByResult = successfulResults.map((result) =>
        result.unresolved.filter((reference) => reference.withinEnrichDepth),
      );
      const failed = successfulResults.filter(
        (_, index) => realUnresolvedByResult[index].length > 0,
      );
      const unresolved = realUnresolvedByResult.flat();
      const beyondDepth = successfulResults
        .flatMap((result) => result.unresolved)
        .filter((reference) => !reference.withinEnrichDepth);
      const nearTimeout = successfulResults.filter(
        (result) => result.possibleTimeout,
      );
      // Authoritative baseline (final max across the whole run, not the
      // running max used for the live console output) and the actual
      // downstream reference count lost per request — this is the real
      // blast-radius figure, since a single failed top-level reference
      // hides everything nested beneath it from the walk entirely.
      const baselineTotalReferences = Math.max(
        0,
        ...successfulResults.map((result) => result.totalReferences),
      );
      const missingReferenceCounts = successfulResults.map((result) =>
        Math.max(0, baselineTotalReferences - result.totalReferences),
      );
      const totalMissingReferences = missingReferenceCounts.reduce(
        (sum, count) => sum + count,
        0,
      );
      return [
        label,
        {
          networkErrorRequests: networkErrorResults.length,
          networkErrorSequences: networkErrorResults.map(
            (result) => result.sequence,
          ),
          requests: spaceResults.length,
          successfulRequests: successfulResults.length,
          failedRequests: failed.length,
          // Percentage of requests that actually got an HTTP response
          // (excludes network errors, which are a different failure mode).
          failureRatePercent: successfulResults.length
            ? Number(
                ((failed.length / successfulResults.length) * 100).toFixed(2),
              )
            : 0,
          unresolvedReferences: unresolved.length,
          topLevelFailures: unresolved.filter(
            (reference) => reference.depth <= 1,
          ).length,
          expectedBeyondDepthReferences: beyondDepth.length,
          nearTimeoutRequests: nearTimeout.length,
          nearTimeoutSequences: nearTimeout.map((result) => result.sequence),
          baselineTotalReferences,
          totalMissingReferences,
          maxMissingReferencesInOneRequest: Math.max(
            0,
            ...missingReferenceCounts,
          ),
        },
      ];
    }),
  );

  // One row per unique (model,id) reference that ever failed to resolve
  // within the configured enrich depth, with its probe verdicts — this is
  // the actionable "which content is actually broken" list, independent of
  // how many of the 100 runs hit it.
  const uniqueUnresolvedReferences = Array.from(probeCache.values()).map(
    (entry) => {
      const validProbes = entry.probes.filter((probe) => !probe.probeFailed);
      const confirmedMissing =
        validProbes.length > 0 &&
        validProbes.every((probe) => probe.exists === false);
      const flaky =
        new Set(validProbes.map((probe) => probe.exists)).size > 1;
      const verdict =
        validProbes.length === 0
          ? 'PROBE_INCONCLUSIVE — every probe attempt hit a network-level failure, not an HTTP response'
          : flaky
            ? 'FLAKY — probe existence differed across samples'
            : confirmedMissing
              ? 'CONFIRMED_MISSING — deleted/unpublished content, retrying will not fix'
              : 'EXISTS_ON_PROBE — content exists and resolves quickly standalone, but drops out of the enriched response; points at an internal enrichment budget/concurrency cutoff rather than a request-level timeout or deleted content';
      return {
        model: entry.model,
        id: entry.id,
        occurrences: entry.occurrences,
        firstSeenSequence: entry.firstSeenSequence,
        probes: entry.probes.map(({ bodySnippet, ...rest }) => rest),
        verdict,
        sampleBodySnippet: entry.probes.at(-1)?.bodySnippet,
      };
    },
  );

  // Per (model,id) resolution rate across the full run, ranked by
  // estimated total downstream references lost (failures x blast radius),
  // not just raw failure count — a rarely-failing reference with a huge
  // nested subtree (e.g. "market") can be responsible for far more of the
  // 935 fetching_relationship_failed errors than a frequently-failing leaf
  // reference with no children.
  const referenceLeaderboard = Array.from(referenceStats.values())
    .filter((stats) => stats.unresolvedCount > 0)
    .map((stats) => {
      const descendantCount = baselineDescendantCounts?.get(
        `${stats.model}::${stats.id}`,
      );
      const blastRadiusPerFailure = 1 + (descendantCount ?? 0);
      return {
        model: stats.model,
        id: stats.id,
        seenCount: stats.seenCount,
        unresolvedCount: stats.unresolvedCount,
        failureRatePercent: Number(
          ((stats.unresolvedCount / stats.seenCount) * 100).toFixed(2),
        ),
        depths: Array.from(stats.depths).sort((a, b) => a - b),
        topLevelArrayIndices: Array.from(stats.topLevelArrayIndices).sort(
          (a, b) => a - b,
        ),
        blastRadiusPerFailure,
        blastRadiusKnown: descendantCount !== undefined,
        estimatedTotalReferencesLost:
          stats.unresolvedCount * blastRadiusPerFailure,
      };
    })
    .sort(
      (a, b) => b.estimatedTotalReferencesLost - a.estimatedTotalReferencesLost,
    );

  // Failure rate by list position — rising failure rate at higher indices
  // would suggest enrichment stops resolving nested refs partway through a
  // large array (concurrency/ordering cutoff) rather than a flat timeout.
  const indexFailureRates = Array.from(indexFailureHistogram.entries())
    .map(([index, bucket]) => ({
      topLevelArrayIndex: index,
      seen: bucket.seen,
      unresolved: bucket.unresolved,
      failureRatePercent: Number(
        ((bucket.unresolved / bucket.seen) * 100).toFixed(2),
      ),
    }))
    .sort((a, b) => a.topLevelArrayIndex - b.topLevelArrayIndex);

  writeFileSync(
    output,
    `${JSON.stringify(
      {
        audit: {
          model: MODEL,
          locale: LOCALE,
          channel: { field: CHANNEL_FIELD, value: CHANNEL_VALUE },
          runsPerSpace: RUNS,
          enrichLevel: ENRICH_LEVEL,
          cacheControls: [
            'noCache=true',
            'cacheSeconds=0',
            'unique cachebust per request',
          ],
          spaces: spaces.map(({ label, key }) => ({
            label,
            keyFingerprint: fingerprint(key),
          })),
          nearTimeoutThresholdMs: NEAR_TIMEOUT_MS,
          maxProbesPerReference: MAX_PROBES_PER_REFERENCE,
          requestDelayMs: REQUEST_DELAY_MS,
        },
        results,
        summary,
        uniqueUnresolvedReferences,
        referenceLeaderboard,
        indexFailureRates,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    JSON.stringify(
      { summary, referenceLeaderboard, indexFailureRates, output },
      null,
      2,
    ),
  );
  console.log(`Sanitized results: ${output}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
