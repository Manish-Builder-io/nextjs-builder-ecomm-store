#!/usr/bin/env node

// biome-ignore-all lint/suspicious/noConsole: CLI reproduction script reports progress to stdout.

/**
 * ACR intermittent enrichment failure — repro harness (ticket 20394 / ENG-13627).
 *
 * What we're testing
 * -----------------
 * ACR's storefront home page intermittently renders a full-page
 * "Missing required config and theme" error. Their `getContentEntry({ modelId:
 * 'site-storefront-home-page' })` call comes back HTTP 200, clean, but with the
 * `theme` Reference's `value` omitted — so every theme-derived field (config,
 * nav, footer) is gone and their render guard trips.
 *
 * ENG-13627 documents the same shape: `enrich` silently dropping references on
 * transient connection errors (socket hang up / ECONNRESET) during reference
 * fan-out, still returning 200 with `Reference.value` missing. But that repro
 * was on a space doing 600+ enrichment sub-requests per call. ACR's home page
 * does single digits to low tens. The open question this script exists to
 * answer: **does the same drop happen at small fan-out, and if so what makes it
 * fire?**
 *
 * So unlike the SumUp/catalog script (scripts/sumup-enrich-field-repro.mjs),
 * which varied list position inside one huge response, this one holds the
 * response tiny and varies the things that could plausibly matter at low
 * volume:
 *   - request CONCURRENCY (does it need parallel in-flight requests to fire?)
 *   - enrichLevel (2 vs 3 — is the drop at the theme hop or the fields hop?)
 *   - fetch shape (by-id path vs query.id) — a difference here is itself a clue
 *
 * Every request records its measured fan-out, so the report can state plainly
 * "we observed drops at a fan-out of N" — which is exactly what ENG needs to
 * decide whether ENG-13627's fix covers this case.
 *
 * Usage
 * -----
 *   BUILDER_PUBLIC_API_KEY=<acr space public key> node scripts/acr-symbol-theme-enrich-repro.mjs
 *
 * Useful knobs:
 *   RUNS=500 CONCURRENCY=10 node scripts/acr-symbol-theme-enrich-repro.mjs
 *   ENRICH_LEVELS=2,3 FETCH_SHAPES=by-id,query-id ...
 *   REQUEST_DELAY_MS=250 ...            # pace batches
 *   CHECK_EDIT_PREVIEW=1 ...            # also run the separate `/edit` id-undefined check
 */

import { createHash, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// ACR's space. Passed via env so a customer key never lands in git — unlike the
// SumUp script, where the keys were our own demo spaces.
const PUBLIC_API_KEY =
  process.env.BUILDER_PUBLIC_API_KEY ?? process.env.ACR_PUBLIC_API_KEY ?? '';

const MODEL = process.env.MODEL ?? 'site-storefront-home-page';

// Root content from the audit — ACR's storefront home page entry whose `theme`
// reference intermittently fails to resolve. (992072fdd32c40769f97bb19c3c9f8c9,
// named in the original brief, turned out to be the org id, not a content id.)
const ROOT_CONTENT_ID =
  process.env.ROOT_CONTENT_ID ?? 'c56a65e4954141018006cfd4224aea24';

// The 6 theme reference entries the audit confirmed published and unchanged for
// 3+ months. They live one enrich hop *below* `theme`, so if `theme` itself
// drops, all 6 vanish from the response entirely rather than showing up as
// unresolved references — that distinction is the whole point of
// `absentExpectedFields` vs `unresolvedExpectedFields` below.
const EXPECTED_THEME_FIELDS = (
  process.env.EXPECTED_FIELDS ??
  [
    'styles',
    'headerSearchBar',
    'headerNavigationLinkGroup',
    'headerTopNavigationLinkGroup',
    'footerNavigationLinkGroup',
    'footerSocialLinkGroup',
  ].join(',')
)
  .split(',')
  .map((field) => field.trim())
  .filter(Boolean);

// The field whose absence produces ACR's user-visible "Missing required config
// and theme" full-page error.
const CRITICAL_FIELD = process.env.CRITICAL_FIELD ?? 'theme';

const RUNS = Number(process.env.RUNS ?? 300);

// Requests fired simultaneously. ACR's failure is intermittent under real
// traffic, and a socket-level drop during reference fan-out is far more likely
// when the connection pool is contended — so concurrency is the primary
// variable here, not response size.
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY ?? 6));

// enrichLevel 2 is the minimum that reaches the 6 theme fields (symbol ->
// theme -> field). Rotating 2 and 3 tells us whether drops track the number of
// hops requested or are independent of it.
const ENRICH_LEVELS = (process.env.ENRICH_LEVELS ?? '2,3')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);

// `by-id` mirrors a direct getContentEntry-by-id; `query-id` mirrors the
// filtered-list shape (which is what produces `ctx: { id: undefined }` in
// ACR's log sample). If only one shape drops references, that narrows the code
// path considerably.
const FETCH_SHAPES = (process.env.FETCH_SHAPES ?? 'by-id,query-id')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS ?? 0);

// Server-side content resolution reportedly cuts off around 30s. At this
// fan-out nothing should come close, so anything near it is a strong signal on
// its own.
const NEAR_TIMEOUT_MS = Number(process.env.NEAR_TIMEOUT_MS ?? 15000);

// Unlike the catalog script (where a deleted ref 404s deterministically and
// re-probing wastes requests), here we WANT to probe every single drop. The
// ENG-13627 signature is "direct probe always succeeds", and the audit already
// ruled out deleted/unpublished content — so each probe is a fresh data point
// on transience, and the fan-out is small enough that it's cheap.
const MAX_PROBES_PER_REFERENCE = Number(
  process.env.MAX_PROBES_PER_REFERENCE ?? 25,
);

// Separate item from the brief: the symbol `/edit` preview route sometimes
// yields `id: undefined`. Off by default — it's an independent question and
// costs extra requests.
const CHECK_EDIT_PREVIEW = process.env.CHECK_EDIT_PREVIEW === '1';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const timestamp = new Date()
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\.\d{3}/, '');
const output = resolve(`acr-enrich-repro-results-${timestamp}.json`);

const fingerprint = (key) =>
  createHash('sha256').update(key).digest('hex').slice(0, 12);

const isObject = (value) => value !== null && typeof value === 'object';

const uniqueCachebust = () => `${Date.now()}-${randomUUID()}`;

// ---------------------------------------------------------------------------
// Reference walking
// ---------------------------------------------------------------------------

// enrichOptions.enrichLevel counts reference-resolution hops (how many times a
// Reference's value.data was itself fetched and walked into), NOT raw JSON path
// depth. A reference nested inside three objects but behind a single resolved
// parent reference is still at hop depth 1. Conflating the two wrongly excuses
// real failures as "expected, beyond configured depth".
const enrichHopDepthOf = (path) => (path.match(/\.value\.data/g) || []).length;

// Field name a reference is stored under, e.g.
// "$.theme.value.data.headerSearchBar" -> "headerSearchBar". Array indices are
// stripped so "links[3]" reads as "links".
const fieldNameOf = (path) => {
  const segments = path.split('.');
  const last = segments.at(-1) ?? '';
  return last.replace(/\[\d+\]$/, '');
};

const walkReferences = (value, enrichLevel, path = '$', references = []) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walkReferences(item, enrichLevel, `${path}[${index}]`, references),
    );
    return references;
  }

  if (!isObject(value)) {
    return references;
  }

  if (value['@type'] === '@builder.io/core:Reference') {
    const enrichHopDepth = enrichHopDepthOf(path);
    references.push({
      path,
      field: fieldNameOf(path),
      model: value.model,
      id: value.id,
      rawPathDepth: path === '$' ? 0 : path.split('.').length - 1,
      enrichHopDepth,
      // References past the requested enrichLevel are *supposed* to come back
      // unresolved. Only refs within the level that still fail are real
      // fetching_relationship_failed candidates.
      //
      // The boundary is `<`, not `<=`: a reference sitting at hop depth N needs
      // N+1 resolution hops to get its own value, so enrichLevel L resolves
      // hop depths 0..L-1. Verified against this space at L=1/2/3 — every
      // reference at hop depth exactly L came back unresolved in all three
      // cases, uniformly and in every request. Using `<=` here mislabels that
      // entire tier of expected truncation as intermittent enrichment
      // failures, which would manufacture a false reproduction.
      withinEnrichDepth: enrichHopDepth < enrichLevel,
      resolved: isObject(value.value) && isObject(value.value.data),
    });
  }

  Object.entries(value).forEach(([key, child]) =>
    walkReferences(child, enrichLevel, `${path}.${key}`, references),
  );
  return references;
};

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

// Headers likely to expose a cached response masking a live failure, plus
// tracing ids ENG can use to grep query-v3 logs.
const DIAGNOSTIC_HEADERS = [
  'age',
  'cache-control',
  'x-cache',
  'cf-cache-status',
  'cf-ray',
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

// The ENG-13627 signature is a *transport* failure swallowed mid-fan-out.
// Classifying these explicitly lets the report say whether we saw the same
// socket-level errors client-side too, or only the silent server-side drop.
const TRANSIENT_ERROR_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);

// undici surfaces socket-level failures on error.cause.code; fall back through
// error.code / message so nothing crashes the run just because it's an
// unfamiliar shape.
const describeNetworkError = (error) => {
  const errorCode = error.cause?.code ?? error.code ?? null;
  const errorMessage = error.message ?? String(error);
  return {
    errorCode,
    errorMessage,
    transientSignature:
      (errorCode !== null && TRANSIENT_ERROR_CODES.has(errorCode)) ||
      /socket hang up|other side closed|terminated|premature close/i.test(
        errorMessage,
      ),
  };
};

const buildRequestUrl = ({ shape, enrichLevel }) => {
  const url =
    shape === 'by-id'
      ? new URL(`https://cdn.builder.io/api/v3/content/${MODEL}/${ROOT_CONTENT_ID}`)
      : new URL(`https://cdn.builder.io/api/v3/content/${MODEL}`);

  if (shape !== 'by-id') {
    url.searchParams.set('query.id', ROOT_CONTENT_ID);
    url.searchParams.set('limit', '1');
  }

  url.searchParams.set('apiKey', PUBLIC_API_KEY);
  url.searchParams.set('enrich', 'true');
  url.searchParams.set('enrichOptions.enrichLevel', String(enrichLevel));
  // Cache must be defeated on every request — a cached good response would
  // hide exactly the intermittency we're hunting.
  url.searchParams.set('noCache', 'true');
  url.searchParams.set('cacheSeconds', '0');
  url.searchParams.set('cachebust', uniqueCachebust());
  return url;
};

// by-id returns the entry directly; the query shape wraps it in results[].
// Handle both so a shape difference shows up as a real finding rather than as a
// parsing bug.
//
// Non-2xx bodies must not count as entries: the by-id route answers a miss with
// a plain `{status, message}` object, which would otherwise walk cleanly, find
// zero references, and get reported as "the theme reference was dropped".
const extractEntry = (json, responseOk) => {
  if (!responseOk || !isObject(json)) {
    return null;
  }
  const candidate = Array.isArray(json.results)
    ? (json.results[0] ?? null)
    : json;
  if (!isObject(candidate)) {
    return null;
  }
  // A real content entry carries at least one of these; an error envelope
  // carries none of them.
  return 'data' in candidate || 'id' in candidate || 'name' in candidate
    ? candidate
    : null;
};

// Re-fetches one reference directly by model/id — the "does it exist right
// now?" question. In ENG-13627 these always succeeded while the enriched
// response kept omitting them; that combination is the fingerprint we're
// looking for, and it's also exactly what ACR's new per-field fallback does.
const probeReference = async ({ model, id }) => {
  const url = new URL(`https://cdn.builder.io/api/v3/content/${model}/${id}`);
  url.searchParams.set('apiKey', PUBLIC_API_KEY);
  url.searchParams.set('includeUnpublished', 'true');
  url.searchParams.set('cachebust', uniqueCachebust());

  const started = Date.now();
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const body = await response.text();

  return {
    status: response.status,
    durationMs: Date.now() - started,
    requestId: response.headers.get('x-request-id'),
    headers: pickHeaders(response.headers),
    exists: response.status === 200,
    bodySnippet: body.slice(0, 300),
  };
};

const referenceKey = (reference) => `${reference.model}::${reference.id}`;

// ---------------------------------------------------------------------------
// Per-request execution
// ---------------------------------------------------------------------------

const request = async ({ sequence, shape, enrichLevel, batch }) => {
  const url = buildRequestUrl({ shape, enrichLevel });
  const query = Object.fromEntries(url.searchParams.entries());
  delete query.apiKey;

  const startedAt = new Date().toISOString();
  const started = Date.now();
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const body = await response.text();
  const durationMs = Date.now() - started;

  let json = null;
  let parseError = null;
  try {
    json = JSON.parse(body);
  } catch (error) {
    parseError = error.message;
  }

  const entry = extractEntry(json, response.ok);
  const references = walkReferences(entry?.data ?? {}, enrichLevel);
  const withinDepth = references.filter((ref) => ref.withinEnrichDepth);
  const unresolved = withinDepth.filter((ref) => !ref.resolved);
  const beyondDepth = references.filter((ref) => !ref.withinEnrichDepth);

  // No entry came back at all (404, or an empty results[]). That is NOT a
  // reference drop — it's a wrong key/model/id, or content genuinely absent
  // from this space. Kept as its own category so it can't masquerade as a
  // reproduction of the enrichment bug.
  const entryFound = entry !== null;

  const criticalRef = references.find((ref) => ref.field === CRITICAL_FIELD);
  const resolvedFields = new Set(
    references.filter((ref) => ref.resolved).map((ref) => ref.field),
  );
  const presentFields = new Set(references.map((ref) => ref.field));

  // Two distinct ways an expected theme field goes missing, and the difference
  // matters for diagnosis:
  //   unresolved — the Reference object is there but value was omitted (the
  //                field's own fetch failed)
  //   absent     — the Reference object isn't in the response at all, because
  //                an ancestor (`theme`) dropped and took its whole subtree
  // Both lists are only meaningful when an entry actually came back; with no
  // entry every field is trivially "absent" and would inflate the drop counts.
  const unresolvedExpectedFields = entryFound
    ? EXPECTED_THEME_FIELDS.filter(
        (field) => presentFields.has(field) && !resolvedFields.has(field),
      )
    : [];
  const absentExpectedFields = entryFound
    ? EXPECTED_THEME_FIELDS.filter((field) => !presentFields.has(field))
    : [];

  return {
    sequence,
    batch,
    shape,
    enrichLevel,
    startedAt,
    durationMs,
    possibleTimeout: durationMs >= NEAR_TIMEOUT_MS,
    status: response.status,
    requestId: response.headers.get('x-request-id'),
    headers: pickHeaders(response.headers),
    bodyBytes: Buffer.byteLength(body),
    parseError,
    entryFound,
    // Top-level `id` presence — relevant to the separate `/edit` preview item
    // where ACR sees `id: undefined`.
    entryId: entry?.id ?? null,
    query,
    // Measured reference fan-out for this exact request. This is the number
    // ENG needs: it establishes the volume at which drops were observed,
    // versus ENG-13627's 600+.
    fanOutWithinDepth: withinDepth.length,
    totalReferences: references.length,
    beyondDepthReferences: beyondDepth.length,
    // The user-visible failure: `theme` present but unresolved, or gone. Only
    // claimed when the entry itself was returned — otherwise this is a
    // missing-content problem, not an enrichment one.
    criticalFieldPresent: criticalRef !== undefined,
    criticalFieldResolved: criticalRef?.resolved === true,
    wouldRenderConfigError:
      entryFound && (criticalRef === undefined || criticalRef.resolved !== true),
    unresolvedExpectedFields,
    absentExpectedFields,
    // A clean 200 that silently lost references — the exact ENG-13627 shape,
    // and the reason ACR had no error to catch.
    silentPartialResponse:
      entryFound &&
      response.status === 200 &&
      (unresolved.length > 0 || absentExpectedFields.length > 0),
    references,
    unresolved,
  };
};

// ---------------------------------------------------------------------------
// Cross-run accumulators
// ---------------------------------------------------------------------------

const probeCache = new Map();

const probeUnresolved = async ({ reference, sequence }) => {
  const cacheKey = referenceKey(reference);
  const entry = probeCache.get(cacheKey) ?? {
    model: reference.model,
    id: reference.id,
    field: reference.field,
    firstSeenSequence: sequence,
    occurrences: 0,
    probes: [],
  };
  entry.occurrences += 1;

  if (entry.probes.length < MAX_PROBES_PER_REFERENCE) {
    try {
      const probe = await probeReference(reference);
      entry.probes.push({ atSequence: sequence, ...probe });
    } catch (error) {
      // A probe failing at the socket level is itself a finding: it means the
      // same transport flakiness reaches a plain single-id fetch, not just
      // composite reference resolution.
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

// Per (model,id) resolution history across every request, pass or fail. Tells
// "one specific reference intermittently drops" apart from "drops are spread
// evenly across all references" — the latter points at the fan-out machinery
// rather than any single piece of content.
const referenceStats = new Map();

const recordReferenceObservation = (reference) => {
  const cacheKey = referenceKey(reference);
  const stats = referenceStats.get(cacheKey) ?? {
    model: reference.model,
    id: reference.id,
    fields: new Set(),
    hopDepths: new Set(),
    seenCount: 0,
    unresolvedCount: 0,
  };
  stats.seenCount += 1;
  stats.fields.add(reference.field);
  stats.hopDepths.add(reference.enrichHopDepth);
  if (!reference.resolved && reference.withinEnrichDepth) {
    stats.unresolvedCount += 1;
  }
  referenceStats.set(cacheKey, stats);
};

// Generic "failure rate bucketed by X" accumulator, used for concurrency,
// enrichLevel, fetch shape, and measured fan-out. Each of these is a candidate
// answer to "what makes it fire at low volume?".
const makeHistogram = () => new Map();

const recordHistogram = (histogram, bucket, failed) => {
  const entry = histogram.get(bucket) ?? { requests: 0, failed: 0 };
  entry.requests += 1;
  if (failed) {
    entry.failed += 1;
  }
  histogram.set(bucket, entry);
};

const summarizeHistogram = (histogram, bucketName) =>
  Array.from(histogram.entries())
    .map(([bucket, entry]) => ({
      [bucketName]: bucket,
      requests: entry.requests,
      failedRequests: entry.failed,
      failureRatePercent: Number(
        ((entry.failed / entry.requests) * 100).toFixed(2),
      ),
    }))
    .sort((a, b) =>
      typeof a[bucketName] === 'number'
        ? a[bucketName] - b[bucketName]
        : String(a[bucketName]).localeCompare(String(b[bucketName])),
    );

const concurrencyHistogram = makeHistogram();
const enrichLevelHistogram = makeHistogram();
const shapeHistogram = makeHistogram();
const fanOutHistogram = makeHistogram();
const fieldDropCounts = new Map(
  [CRITICAL_FIELD, ...EXPECTED_THEME_FIELDS].map((field) => [
    field,
    { unresolved: 0, absent: 0 },
  ]),
);

const bumpFieldDrop = (field, kind) => {
  const entry = fieldDropCounts.get(field) ?? { unresolved: 0, absent: 0 };
  entry[kind] += 1;
  fieldDropCounts.set(field, entry);
};

// ---------------------------------------------------------------------------
// Separate item: `/edit` preview route producing `id: undefined`
// ---------------------------------------------------------------------------

// Not the enrichment bug — logged in the brief as an independent issue with a
// customer-side workaround. This checks the narrow factual question: does the
// preview-shaped request return an entry carrying a usable top-level `id`?
const checkEditPreviewShape = async () => {
  const variants = [
    { label: 'plain-query', params: {} },
    { label: 'preview-flag', params: { preview: MODEL } },
    { label: 'include-unpublished', params: { includeUnpublished: 'true' } },
    {
      label: 'preview-plus-unpublished',
      params: { preview: MODEL, includeUnpublished: 'true' },
    },
  ];

  const observations = [];
  for (const variant of variants) {
    const url = new URL(`https://cdn.builder.io/api/v3/content/${MODEL}`);
    url.searchParams.set('apiKey', PUBLIC_API_KEY);
    url.searchParams.set('limit', '1');
    url.searchParams.set('query.id', ROOT_CONTENT_ID);
    url.searchParams.set('cachebust', uniqueCachebust());
    for (const [name, value] of Object.entries(variant.params)) {
      url.searchParams.set(name, value);
    }

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      const json = await response.json();
      const entry = extractEntry(json, response.ok);
      observations.push({
        variant: variant.label,
        status: response.status,
        requestId: response.headers.get('x-request-id'),
        entryFound: entry !== null,
        topLevelId: entry?.id ?? null,
        // If `id` only exists nested, a caller reading the raw top-level field
        // legitimately sees undefined — which matches ACR's report.
        idOnlyNested: entry !== null && !entry.id && Boolean(entry?.data?.id),
      });
    } catch (error) {
      observations.push({ variant: variant.label, ...describeNetworkError(error) });
    }
  }
  return observations;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Full request plan up front, rotating the two variables so every enrichLevel
// and fetch shape gets an even spread across the whole run rather than being
// clustered in time (which would confound them with backend conditions).
const buildPlan = () => {
  const plan = [];
  for (let index = 0; index < RUNS; index += 1) {
    plan.push({
      sequence: index + 1,
      shape: FETCH_SHAPES[index % FETCH_SHAPES.length],
      enrichLevel: ENRICH_LEVELS[index % ENRICH_LEVELS.length],
    });
  }
  return plan;
};

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const main = async () => {
  if (!PUBLIC_API_KEY) {
    console.error(
      "Set BUILDER_PUBLIC_API_KEY to ACR's space public API key, e.g.\n" +
        '  BUILDER_PUBLIC_API_KEY=xxxx node scripts/acr-symbol-theme-enrich-repro.mjs',
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    [
      `Space: ${fingerprint(PUBLIC_API_KEY)} (fingerprint)`,
      `Model: ${MODEL}  Root: ${ROOT_CONTENT_ID}`,
      `Runs: ${RUNS}  Concurrency: ${CONCURRENCY}`,
      `enrichLevels: ${ENRICH_LEVELS.join(',')}  shapes: ${FETCH_SHAPES.join(',')}`,
      REQUEST_DELAY_MS > 0
        ? `Pacing: ${REQUEST_DELAY_MS}ms between batches`
        : 'Pacing: back-to-back',
    ].join('\n'),
  );

  // Preflight: confirm the key/model/id combination actually returns the root
  // entry with its theme reference before spending hundreds of requests. A
  // misconfigured run would otherwise look like a 100% reproduction.
  const preflight = await request({
    sequence: 0,
    shape: FETCH_SHAPES[0],
    enrichLevel: Math.max(...ENRICH_LEVELS),
    batch: 0,
  });
  if (!preflight.entryFound) {
    console.error(
      `\nPreflight failed: ${MODEL}/${ROOT_CONTENT_ID} returned no entry (http=${preflight.status}) for space ${fingerprint(PUBLIC_API_KEY)}.\n` +
        'Check BUILDER_PUBLIC_API_KEY, MODEL, and ROOT_CONTENT_ID — this is a configuration problem, not the enrichment bug.',
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `Preflight ok: entry found, fanOut=${preflight.fanOutWithinDepth} refs, ` +
      `${CRITICAL_FIELD}=${preflight.criticalFieldResolved ? 'resolved' : preflight.criticalFieldPresent ? 'PRESENT BUT UNRESOLVED' : 'ABSENT'}` +
      `${preflight.absentExpectedFields.length ? `, missing expected fields: ${preflight.absentExpectedFields.join(', ')}` : ''}\n`,
  );

  const results = [];
  const batches = chunk(buildPlan(), CONCURRENCY);

  for (const [batchIndex, batch] of batches.entries()) {
    if (batchIndex > 0 && REQUEST_DELAY_MS > 0) {
      await sleep(REQUEST_DELAY_MS);
    }

    // Fire the batch genuinely in parallel — the concurrency dimension is only
    // meaningful if the requests actually overlap in flight.
    const settled = await Promise.allSettled(
      batch.map((spec) => request({ ...spec, batch: batchIndex + 1 })),
    );

    // Then walk the outcomes sequentially: logging stays readable, and probes
    // run after the batch so they don't perturb the concurrency they're
    // supposed to be measuring.
    for (const [specIndex, outcome] of settled.entries()) {
      const spec = batch[specIndex];

      if (outcome.status === 'rejected') {
        const described = describeNetworkError(outcome.reason);
        results.push({
          sequence: spec.sequence,
          batch: batchIndex + 1,
          shape: spec.shape,
          enrichLevel: spec.enrichLevel,
          networkError: true,
          ...described,
        });
        recordHistogram(concurrencyHistogram, CONCURRENCY, true);
        recordHistogram(enrichLevelHistogram, spec.enrichLevel, true);
        recordHistogram(shapeHistogram, spec.shape, true);
        console.log(
          `${String(spec.sequence).padStart(4)} ${spec.shape.padEnd(9)} L${spec.enrichLevel} NETWORK_ERR code=${described.errorCode ?? '-'}${described.transientSignature ? ' TRANSIENT_SIGNATURE' : ''} message=${described.errorMessage}`,
        );
        continue;
      }

      const result = outcome.value;
      for (const reference of result.references) {
        recordReferenceObservation(reference);
      }

      const failed =
        result.wouldRenderConfigError ||
        result.unresolved.length > 0 ||
        result.absentExpectedFields.length > 0;

      // Requests that returned no entry are excluded from every failure
      // statistic — counting them would report a misconfigured run as a 100%
      // reproduction of the bug.
      if (result.entryFound) {
        recordHistogram(concurrencyHistogram, CONCURRENCY, failed);
        recordHistogram(enrichLevelHistogram, result.enrichLevel, failed);
        recordHistogram(shapeHistogram, result.shape, failed);
        recordHistogram(fanOutHistogram, result.fanOutWithinDepth, failed);
        for (const field of result.unresolvedExpectedFields) {
          bumpFieldDrop(field, 'unresolved');
        }
        for (const field of result.absentExpectedFields) {
          bumpFieldDrop(field, 'absent');
        }
        if (result.wouldRenderConfigError) {
          bumpFieldDrop(
            CRITICAL_FIELD,
            result.criticalFieldPresent ? 'unresolved' : 'absent',
          );
        }
      }

      // The full per-reference list is only needed for the stats pass above;
      // at 300+ requests keeping it in the output file would duplicate the
      // same handful of references hundreds of times.
      const { references: _references, ...persisted } = result;
      results.push(persisted);

      const status = !result.entryFound
        ? 'NO_ENTRY'
        : result.wouldRenderConfigError
          ? 'CONFIG_ERROR'
          : failed
            ? 'PARTIAL'
            : 'ok';
      console.log(
        `${String(result.sequence).padStart(4)} ${result.shape.padEnd(9)} L${result.enrichLevel} ${status.padEnd(12)} http=${result.status} ${result.durationMs}ms fanOut=${result.fanOutWithinDepth} requestId=${result.requestId ?? '-'}${result.silentPartialResponse ? ' SILENT_200' : ''}${result.possibleTimeout ? ' NEAR_TIMEOUT' : ''}`,
      );

      if (result.absentExpectedFields.length > 0) {
        console.log(
          `      -> absent entirely (parent reference dropped, subtree gone): ${result.absentExpectedFields.join(', ')}`,
        );
      }

      for (const reference of result.unresolved) {
        const probeEntry = await probeUnresolved({
          reference,
          sequence: result.sequence,
        });
        const latest = probeEntry.probes.at(-1);
        const verdict = !latest
          ? `cached verdict from earlier probe (occurrence #${probeEntry.occurrences})`
          : latest.probeFailed
            ? `PROBE_FAILED (${latest.errorCode ?? latest.errorMessage}) — transport failure on a plain single-id fetch too`
            : latest.exists
              ? 'EXISTS ON PROBE — content is live and fetches fine standalone; the enriched response dropped it'
              : `MISSING (status=${latest.status}) — referenced content genuinely not retrievable`;
        console.log(
          `      -> ${reference.path} field=${reference.field} model=${reference.model} id=${reference.id} hop=${reference.enrichHopDepth}`,
        );
        console.log(
          `         probe: ${verdict}${latest && !latest.probeFailed ? ` duration=${latest.durationMs}ms requestId=${latest.requestId ?? '-'}` : ''}`,
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  const networkErrors = results.filter((result) => result.networkError);
  const respondedRaw = results.filter((result) => !result.networkError);
  // Requests where the root content came back at all. Every rate below is
  // computed against these, so a run pointed at the wrong space/model/id
  // reports "no entry returned" instead of a bogus 100% failure rate.
  const missingEntry = respondedRaw.filter((result) => !result.entryFound);
  const responded = respondedRaw.filter((result) => result.entryFound);
  const configErrors = responded.filter((result) => result.wouldRenderConfigError);
  const silentPartials = responded.filter((result) => result.silentPartialResponse);
  const anyDrop = responded.filter(
    (result) =>
      result.wouldRenderConfigError ||
      result.unresolved.length > 0 ||
      result.absentExpectedFields.length > 0,
  );

  // Split drops by what the direct probes proved about the target content.
  // This is the distinction that decides whether this run reproduces
  // ENG-13627 at all: a reference to deleted content failing to resolve is
  // correct behaviour, while a reference to live, published content being
  // omitted from a 200 is the bug. The audit already ruled out the former on
  // ACR's space, so conflating them would report a false reproduction.
  const liveOnProbeIds = new Set();
  const missingOnProbeIds = new Set();
  for (const entry of probeCache.values()) {
    const validProbes = entry.probes.filter((probe) => !probe.probeFailed);
    if (validProbes.length === 0) {
      continue;
    }
    const key = `${entry.model}::${entry.id}`;
    if (validProbes.some((probe) => probe.exists)) {
      liveOnProbeIds.add(key);
    } else {
      missingOnProbeIds.add(key);
    }
  }
  const droppedLiveContent = responded.filter((result) =>
    result.unresolved.some((ref) => liveOnProbeIds.has(referenceKey(ref))),
  );
  const droppedMissingContentOnly = responded.filter(
    (result) =>
      result.unresolved.length > 0 &&
      result.unresolved.every((ref) => missingOnProbeIds.has(referenceKey(ref))),
  );
  const fanOutValues = responded.map((result) => result.fanOutWithinDepth);

  const summary = {
    requests: results.length,
    // Requests that returned the root entry — the denominator for every rate
    // below.
    respondedRequests: responded.length,
    // Returned an HTTP response but no entry: wrong key/model/id, or content
    // absent from the space. Not an enrichment failure.
    missingEntryRequests: missingEntry.length,
    missingEntryStatuses: Array.from(
      new Set(missingEntry.map((result) => result.status)),
    ),
    networkErrorRequests: networkErrors.length,
    transientNetworkErrorRequests: networkErrors.filter(
      (result) => result.transientSignature,
    ).length,
    networkErrorCodes: Object.fromEntries(
      Object.entries(
        networkErrors.reduce((counts, result) => {
          const code = result.errorCode ?? 'unknown';
          counts[code] = (counts[code] ?? 0) + 1;
          return counts;
        }, {}),
      ),
    ),
    // The headline number: how often ACR's page would have shown "Missing
    // required config and theme".
    configErrorRequests: configErrors.length,
    configErrorRatePercent: responded.length
      ? Number(((configErrors.length / responded.length) * 100).toFixed(2))
      : 0,
    configErrorRequestIds: configErrors.map((result) => result.requestId),
    anyReferenceDropRequests: anyDrop.length,
    anyReferenceDropRatePercent: responded.length
      ? Number(((anyDrop.length / responded.length) * 100).toFixed(2))
      : 0,
    // The bug: live, published content omitted from an otherwise-fine response.
    droppedLiveContentRequests: droppedLiveContent.length,
    droppedLiveContentRatePercent: responded.length
      ? Number(((droppedLiveContent.length / responded.length) * 100).toFixed(2))
      : 0,
    // Not the bug: references pointing at content that genuinely 404s.
    droppedMissingContentOnlyRequests: droppedMissingContentOnly.length,
    // Clean 200s that lost references — why the customer had nothing to catch.
    silentPartialResponses: silentPartials.length,
    nearTimeoutRequests: responded.filter((result) => result.possibleTimeout).length,
    // Directly answers the ENG open question about fan-out scale: this is the
    // reference volume at which any drops were observed, to compare against
    // ENG-13627's 600+ sub-requests.
    fanOut: {
      min: fanOutValues.length ? Math.min(...fanOutValues) : 0,
      max: fanOutValues.length ? Math.max(...fanOutValues) : 0,
      atFailure: Array.from(
        new Set(anyDrop.map((result) => result.fanOutWithinDepth)),
      ).sort((a, b) => a - b),
    },
    durationMs: {
      min: responded.length ? Math.min(...responded.map((r) => r.durationMs)) : 0,
      max: responded.length ? Math.max(...responded.map((r) => r.durationMs)) : 0,
      mean: responded.length
        ? Number(
            (
              responded.reduce((sum, r) => sum + r.durationMs, 0) /
              responded.length
            ).toFixed(1),
          )
        : 0,
    },
  };

  const fieldDropSummary = Array.from(fieldDropCounts.entries())
    .map(([field, counts]) => ({
      field,
      // Reference present, value omitted — this field's own fetch failed.
      unresolvedCount: counts.unresolved,
      // Reference missing entirely — an ancestor dropped and took it along.
      absentCount: counts.absent,
      totalDrops: counts.unresolved + counts.absent,
    }))
    .sort((a, b) => b.totalDrops - a.totalDrops);

  const uniqueUnresolvedReferences = Array.from(probeCache.values()).map(
    (entry) => {
      const validProbes = entry.probes.filter((probe) => !probe.probeFailed);
      const allExist =
        validProbes.length > 0 && validProbes.every((probe) => probe.exists);
      const noneExist =
        validProbes.length > 0 && validProbes.every((probe) => !probe.exists);
      const verdict =
        validProbes.length === 0
          ? 'PROBE_INCONCLUSIVE — every probe hit a transport failure rather than an HTTP response'
          : allExist
            ? 'EXISTS_ON_EVERY_PROBE — matches ENG-13627: content is live, resolves fine standalone, yet enrich omitted it from a 200 response'
            : noneExist
              ? 'CONFIRMED_MISSING — referenced content not retrievable; contradicts the published-content audit, re-check the space'
              : 'FLAKY_ON_PROBE — direct single-id fetches also intermittently fail, so the flakiness is not confined to reference fan-out';
      return {
        model: entry.model,
        id: entry.id,
        field: entry.field,
        occurrences: entry.occurrences,
        firstSeenSequence: entry.firstSeenSequence,
        probeCount: entry.probes.length,
        probes: entry.probes.map(({ bodySnippet, ...rest }) => rest),
        verdict,
        sampleBodySnippet: entry.probes.at(-1)?.bodySnippet,
      };
    },
  );

  const referenceLeaderboard = Array.from(referenceStats.values())
    .map((stats) => ({
      model: stats.model,
      id: stats.id,
      fields: Array.from(stats.fields),
      hopDepths: Array.from(stats.hopDepths).sort((a, b) => a - b),
      seenCount: stats.seenCount,
      unresolvedCount: stats.unresolvedCount,
      failureRatePercent: Number(
        ((stats.unresolvedCount / stats.seenCount) * 100).toFixed(2),
      ),
    }))
    .sort((a, b) => b.unresolvedCount - a.unresolvedCount);

  const editPreviewObservations = CHECK_EDIT_PREVIEW
    ? await checkEditPreviewShape()
    : null;

  // Plain-language readout of what this run does and doesn't establish, so the
  // JSON isn't left to interpretation when it's pasted into the ticket.
  const findings = [];
  if (summary.missingEntryRequests > 0) {
    findings.push(
      `${summary.missingEntryRequests} requests returned no entry at all (statuses ${summary.missingEntryStatuses.join('/')}) for ${MODEL}/${ROOT_CONTENT_ID}. These are excluded from the rates below — if this is most of the run, the API key, model, or content id is wrong for this space.`,
    );
  }
  if (summary.respondedRequests === 0) {
    findings.push(
      'No request returned the root entry, so nothing about enrichment can be concluded from this run.',
    );
  } else if (summary.droppedLiveContentRequests > 0) {
    findings.push(
      `REPRODUCED: ${summary.droppedLiveContentRequests}/${summary.respondedRequests} requests (${summary.droppedLiveContentRatePercent}%) omitted a reference to content that direct probes prove is live and published, at a fan-out of only ${summary.fanOut.atFailure.join('/')} references within the requested enrich depth — orders of magnitude below ENG-13627's 600+ sub-requests. The failure threshold is therefore lower than that ticket currently scopes.`,
    );
  } else if (summary.anyReferenceDropRequests === 0) {
    findings.push(
      `NOT REPRODUCED: no reference drops in ${summary.respondedRequests} responded requests at fan-out ${summary.fanOut.min}-${summary.fanOut.max} and concurrency ${CONCURRENCY}. Raise RUNS/CONCURRENCY before concluding the low-fan-out path is unaffected.`,
    );
  } else {
    findings.push(
      `NOT REPRODUCED: ${summary.anyReferenceDropRequests}/${summary.respondedRequests} requests lost a reference, but every dropped reference points at content that also 404s on a direct probe — that is correct behaviour for deleted/unpublished targets, not the ENG-13627 silent-drop bug.`,
    );
  }
  if (
    summary.droppedMissingContentOnlyRequests > 0 &&
    summary.droppedLiveContentRequests > 0
  ) {
    findings.push(
      `Separately, ${summary.droppedMissingContentOnlyRequests} requests dropped only references whose targets 404 on direct probe — genuinely missing content, unrelated to the enrichment bug, and worth cleaning up independently.`,
    );
  }
  if (summary.configErrorRequests > 0) {
    findings.push(
      `${summary.configErrorRequests} requests (${summary.configErrorRatePercent}%) came back without a resolved '${CRITICAL_FIELD}' reference — each of these is one "Missing required config and theme" page for a real user.`,
    );
  }
  if (summary.droppedLiveContentRequests > 0) {
    findings.push(
      `${summary.silentPartialResponses} responses were HTTP 200 with references silently omitted (including the live-content drops above) — no error surfaced to the client, which is why the customer's integration could not detect it.`,
    );
  }
  if (summary.networkErrorRequests > 0) {
    findings.push(
      `${summary.networkErrorRequests} requests failed at the transport layer client-side (${summary.transientNetworkErrorRequests} matching the socket-hang-up/ECONNRESET signature), indicating the same transient connection conditions ENG-13627 attributes the drops to are present for this space.`,
    );
  }
  const existsOnProbe = uniqueUnresolvedReferences.filter((ref) =>
    ref.verdict.startsWith('EXISTS_ON_EVERY_PROBE'),
  );
  if (existsOnProbe.length > 0) {
    findings.push(
      `${existsOnProbe.length} dropped reference(s) succeeded on every direct probe, confirming the content is published and retrievable and ruling out deleted/unpublished/stale references as the cause — the same probe result as ENG-13627.`,
    );
  }
  if (summary.configErrorRequests > 0 || summary.droppedLiveContentRequests > 0) {
    findings.push(
      'Request ids for every failing call are in summary.configErrorRequestIds and results[]; ENG can grep query-v3 logs for fetching_relationship_failed against those exact ids.',
    );
  }

  writeFileSync(
    output,
    `${JSON.stringify(
      {
        audit: {
          ticket: '20394',
          relatedEngTicket: 'ENG-13627',
          model: MODEL,
          rootContentId: ROOT_CONTENT_ID,
          criticalField: CRITICAL_FIELD,
          expectedThemeFields: EXPECTED_THEME_FIELDS,
          runs: RUNS,
          concurrency: CONCURRENCY,
          enrichLevels: ENRICH_LEVELS,
          fetchShapes: FETCH_SHAPES,
          requestDelayMs: REQUEST_DELAY_MS,
          nearTimeoutThresholdMs: NEAR_TIMEOUT_MS,
          maxProbesPerReference: MAX_PROBES_PER_REFERENCE,
          cacheControls: [
            'noCache=true',
            'cacheSeconds=0',
            'unique cachebust per request',
          ],
          spaceKeyFingerprint: fingerprint(PUBLIC_API_KEY),
        },
        findings,
        summary,
        fieldDropSummary,
        failureRateByConcurrency: summarizeHistogram(
          concurrencyHistogram,
          'concurrency',
        ),
        failureRateByEnrichLevel: summarizeHistogram(
          enrichLevelHistogram,
          'enrichLevel',
        ),
        failureRateByFetchShape: summarizeHistogram(shapeHistogram, 'fetchShape'),
        failureRateByFanOut: summarizeHistogram(fanOutHistogram, 'fanOut'),
        uniqueUnresolvedReferences,
        referenceLeaderboard,
        editPreviewObservations,
        results,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    JSON.stringify(
      {
        findings,
        summary,
        fieldDropSummary,
        failureRateByEnrichLevel: summarizeHistogram(
          enrichLevelHistogram,
          'enrichLevel',
        ),
        failureRateByFetchShape: summarizeHistogram(shapeHistogram, 'fetchShape'),
        failureRateByFanOut: summarizeHistogram(fanOutHistogram, 'fanOut'),
        uniqueUnresolvedReferences: uniqueUnresolvedReferences.map(
          ({ probes: _probes, sampleBodySnippet: _snippet, ...rest }) => rest,
        ),
        editPreviewObservations,
      },
      null,
      2,
    ),
  );
  console.log(`\nSanitized results: ${output}`);
  if (summary.respondedRequests > 0 && summary.anyReferenceDropRequests === 0) {
    console.log(
      'Not reproduced at this volume. Try: RUNS=1000 CONCURRENCY=25 node scripts/acr-symbol-theme-enrich-repro.mjs',
    );
  }
};

// Only run when executed directly, so the pure classification helpers below can
// be imported and checked against fixtures without firing off live requests.
const invokedDirectly =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  enrichHopDepthOf,
  extractEntry,
  fieldNameOf,
  describeNetworkError,
  walkReferences,
};
