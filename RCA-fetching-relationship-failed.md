# RCA: Intermittent `fetching_relationship_failed` errors (Builder.io `query-v3`)

**Status:** **Root cause CONFIRMED via query-v3 server-side logs** (see §3.11): transient connection failures (`socket hang up` / `ECONNRESET`) on internal enrichment sub-requests are caught and silently swallowed, causing a fully-200'd but partially-enriched catalog response. NOT caused by deleted content or a client-side/CDN timeout wall. Now moving to engineering fix/mitigation planning. One experiment (load/pacing sensitivity) still open but no longer blocking, since the mechanism itself is confirmed.

**Scope:** `catalog` model, apiKey `a819fcf925c046d79ad64d1941f419b5` ("main" space), `enrichOptions.enrichLevel=4`, locale `en-IE`, `query.data.channel=website`.

**Tooling:** [scripts/sumup-enrich-field-repro.mjs](scripts/sumup-enrich-field-repro.mjs) — fires repeated identical enrich requests against the same content, walks the response for every `@builder.io/core:Reference` node, flags any that failed to resolve, and directly probes each failing reference by id to check whether it actually exists.

---

## 1. Problem statement

query-v3 logs showed **~935 `fetching_relationship_failed` errors over a 2-day window**. The initial example was a 404 from a direct content fetch for a specific product id:

```
https://cdn.builder.io/api/v3/content/product/a819fcf925c046d79ad64d1941f419b5_cc68139f173f4a76a0ce0b17b856bfa7?apiKey=a819fcf925c046d79ad64d1941f419b5&includeUnpublished=true&cachebust=probe
```

## 2. Original hypotheses

1. A deleted product is being referenced, causing a real 404 on lookup.
2. The issue looks intermittent only because **cached** CDN responses still hold the old (working) value while fresh responses expose the break — retrying would never fix it.
3. Nested sub-requests inside the enrich pipeline may be exceeding a ~30s server-side timeout and getting cut off.

## 3. What the data actually shows

### 3.1 Not deleted content (hypothesis 1 — mostly ruled out for the reproduced pattern)

Every unresolved reference encountered across ~700+ observed failures was independently re-fetched (same shape as the production 404 URL: `content/{model}/{id}?includeUnpublished=true`). **Every single probe came back `200 EXISTS`, typically in 400–900ms.** The referenced content is real, published/unpublished-visible, and fast to fetch on its own — it just isn't showing up in the composite enrich response.

Caveat: this doesn't rule out that a *separate*, smaller number of the 935 production errors are genuine deleted-reference 404s (like the original example) elsewhere in the catalog that we haven't specifically reproduced. But it is no longer a plausible explanation for the majority of the volume, since our repro — hitting one record repeatedly — reproduces comparable error volume with zero confirmed-deleted references.

### 3.2 Not a hard ~30s timeout wall (hypothesis 3 — refuted as stated)

- One request took **32,725ms and fully succeeded** (682/682 references resolved).
- A separate request took **32,882ms and failed** (2 references dropped).

Duration and success/failure are not cleanly coupled. There's no evidence of a fixed wall-clock cutoff at ~30s. Elevated latency loosely correlates with a higher chance of failure in some runs, but it's not causal/deterministic.

### 3.3 The real mechanism: cascading "blast radius," not independent broken relationships

When a reference fails to resolve, its own `value.data` is never populated — so anything nested *inside* that unfetched subtree silently disappears from the response entirely, rather than showing up as its own "unresolved" entry. This means the raw unresolved-reference count drastically understates real impact.

We validated this by capturing a fully-resolved baseline (682 total references) and computing, per `(model,id)`, how many descendant references live in its subtree. Predicted vs. observed match almost exactly:

| Failing reference | `missing` (actual refs lost) | predicted blast radius | diff |
|---|---|---|---|
| `market` | 194 | 195 | 1 (self) |
| `form` | 10 | 11 | 1 (self) |
| `digital-product` | 14 | 15 | 1 (self) |
| `store-product` | 24 | 25 | 1 (self) |

The constant +1 offset is expected (the failing node itself stays visible, unresolved; only its descendants vanish). This confirms a small number of root-cause drops can explain a much larger number of downstream "missing reference" events — directly relevant to why 935 log lines don't imply 935 independently broken relationships.

`market` is the single largest contributor: it has an unusually large subtree (~194 nested references), so every time it fails, ~195 references disappear from that one response in one shot.

### 3.4 Tooling bug found and fixed mid-investigation: enrich depth was being computed wrong

Early runs classified some unresolved references as "expected — beyond configured enrichLevel=4" using **raw JSON path depth** (counting array/object nesting like `productBenefits[2]`, `faqs[3]`, `images[0]`). This was incorrect: Builder's `enrichLevel` counts **reference-resolution hops** (`.value.data` traversals), not raw JSON nesting.

After switching to hop-counting, every previously-dismissed "expected" case turned out to be at true hop-depth 1–2 — well within `enrichLevel=4` — and was reclassified as a real failure. This raised the measured failure rate from **9% → 16%** on comparable runs. Net effect: **the true failure rate is higher than initially reported**, and this correction should be treated as authoritative going forward.

### 3.5 Failures are broadly distributed across many different references, not a fixed "bad list"

Across three independent 100-request runs, failing `(model,id)` pairs included: `market`, multiple distinct `store-product`s, `digital-product`s, `form`, `faq`, `product-benefit`, `ui-cart`, `ui-login-page`, `ui-checkout-page`, `metadata`, `localized-asset`, and a `product` nested inside `market`. Within any single run, almost none of these repeat — each occurrence is close to a one-off. `market` is the only reference that recurs consistently across every run.

This pattern — broad, low-probability, non-repeating drops across virtually the whole reference tree — is inconsistent with "a few specific broken relationships" and consistent with a **systemic/probabilistic defect in Builder's enrichment resolver** (e.g. a race condition, a connection-pool/concurrency limit for nested fetches, or a retry-and-silently-drop behavior).

### 3.6 `market`'s per-occurrence failure rate is an outlier

Because `market` appears once per response, its failure rate is directly comparable run to run. Other references are embedded multiple times (e.g. a shared `metadata` object referenced 9× per tree, `seenCount=898` across 100 runs), so their *per-occurrence* odds are much lower even when their raw failure count looks similar.

| Run | `market` failures / 100 | `market` per-occurrence rate | next-highest reference's rate |
|---|---|---|---|
| Run A (pre-fix) | 4 | 4% | ~1% |
| Run B (post-fix) | 9 | 9% | ~1.1% |
| Run C (post-fix, repeat) | 3 | 3% | ~1% |

`market` is consistently an order of magnitude above every other reference. It is the single highest-priority target for the vendor to investigate.

### 3.7 High run-to-run variance under identical conditions

Three back-to-back 100-request runs (same content, same pacing — no delay) produced:

| Run | Failed requests | Total missing references | Max missing in one request |
|---|---|---|---|
| B | 16/100 | 1923 | 241 |
| C | 10/100 | 706 | 215 |

Same script, same content, same pacing — nearly a 3x swing in total missing references between sessions. This points to a time-varying external factor (likely backend load/resource contention at the time of the test) rather than a fixed static probability tied purely to this content record.

### 3.8 A separate, more severe failure mode: raw network-level timeouts

Independent of the enrichment-drop phenomenon, one run hit a raw TCP/TLS socket read timeout (`ETIMEDOUT`, no HTTP response at all) partway through. This is a *different* failure category from "200 response with a dropped branch" — it suggests the backend can, in some cases, become fully unresponsive for a stretch, not just drop individual nested fetches. The script was hardened to catch and log this as its own event type (`NETWORK_ERR`) instead of crashing, so future runs won't lose data to it.

### 3.9 No confirmed positional/ordering pattern

Checked whether failures cluster at later positions within large arrays (which would suggest a concurrency/ordering cutoff, e.g. "only the first N items get resolved before some budget runs out"). Across ~600+ combined samples, failures were scattered across low-to-mid array indices (0–15) with **zero** observed failures at any index ≥16, but no clean monotonic trend within the affected range. Weak, inconclusive signal — not something to build a theory on yet.

### 3.10 Load/throughput sensitivity — open question

Because our 100-request test batches sometimes produce *more* total missing-reference events (up to 1923) than the entire 935-error, 2-day production log, one hypothesis is that firing 100 heavy (682-reference) requests back-to-back is itself inducing more failures than naturally-paced, distributed production traffic would — i.e. the defect may be sensitive to concurrent load/throughput on Builder's enrichment backend.

**This is not yet confirmed.** A paced-request mode was added to the script (`REQUEST_DELAY_MS` env var, delays between rounds instead of firing back-to-back) specifically to test this, but the most recent attempt to run it printed `Pacing: back-to-back (no delay)`, meaning the env var wasn't actually applied — so this remains an open experiment. It's no longer load-bearing for the root cause, though — see §3.11.

### 3.11 CONFIRMED root cause: internal enrichment sub-requests fail with `socket hang up` / `ECONNRESET`, swallowed silently

Cross-referencing three reproduced request IDs against query-v3's own Cloud Run logs ([query used](https://console.cloud.google.com/logs/query;query=resource.type%3D%22cloud_run_revision%22%0Aresource.labels.service_name%3D%22query-v3%22%0Atimestamp%3E%3D%222026-08-18T10:29:48Z%22%0Atimestamp%3C%3D%222026-08-18T10:30:29Z%22%0A%2528%0A%20%20jsonPayload.http.request_id%3D%2528%0A%20%20%20%20%22bde46840-9aef-11f1-a33c-49a4198c625f%22%20OR%0A%20%20%20%20%22c750d260-9aef-11f1-b627-71424b814da6%22%20OR%0A%20%20%20%20%22cf319370-9aef-11f1-80c1-0974ba9bf2dd%22%0A%20%20%2529%0A%20%20OR%0A%20%20%2528%0A%20%20%20%20jsonPayload.message%3D%22fetching_relationship_failed%22%0A%20%20%20%20AND%20jsonPayload.contentUrl:%22apiKey%3Da819fcf925c046d79ad64d1941f419b5%22%0A%20%20%2529%0A%2529;storageScope=project;cursorTimestamp=2026-08-18T10:30:19.458388Z;duration=PT5M?project=builder-3b0a2&supportedpurview=project), `builder-3b0a2` project) confirmed the exact mechanism:

- 100 `main`-space catalog requests, all HTTP 200. 3 had unresolved references (`bde46840-9aef-11f1-a33c-49a4198c625f`, `c750d260-9aef-11f1-b627-71424b814da6`, `cf319370-9aef-11f1-80c1-0974ba9bf2dd`), losing up to 30 of 682 references. Direct probes for every affected reference returned 200 immediately.
- **Each catalog request fans out to ~615–623 internal enrichment sub-requests.**
- For these 3 requests, logs contained **34 `fetching_relationship_failed` warnings: 33 `socket hang up`, 1 `read ECONNRESET`.**
- One of the three had a **burst of 31 socket hang-ups within ~600ms**, concentrated on `localized-asset` and `product-benefit` references.
- The origin itself never 404'd — every sub-request that reached origin succeeded. The failures are transport-level (connection reset/hang-up), not application-level (missing data).
- **query-v3's enrichment step catches these connection errors, omits the affected `Reference.value` field, and still returns the parent response as a clean `200`** — with no warning, flag, or indication in the payload that it's incomplete.

This confirms and sharpens the leading theory from §4: it isn't a generic "probabilistic resolver bug," it's specifically **connection-level failures on the fan-out to internal reference-fetch calls**, occurring in bursts, swallowed by query-v3's error handling instead of being retried or surfaced. The extreme sub-request fan-out (615–623 per single customer-facing request) is almost certainly why this catalog record is disproportionately affected — more internal connections attempted means more statistical exposure to whatever is causing the hang-ups/resets (e.g. a connection pool limit, keep-alive churn, or a downstream capacity limit on the internal content-fetch service).

---

## 4. Root cause assessment

| Hypothesis | Verdict |
|---|---|
| Deleted/unpublished referenced content | **Ruled out** — every probed reference exists and resolves fast; origin never returned 404 for any enrichment sub-request in the confirmed logs. Cannot rule out a small number of genuinely deleted references contributing separately to the 935 count. |
| Stale cache masking a real break, retries won't help | **Partially correct in spirit** — retries genuinely don't fix it, but not because of caching; each failure is an independent transient connection error per attempt, not a stuck cached value. |
| Hard ~30s server-side timeout cutoff | **Refuted** — requests both succeed and fail on either side of 30s; no fixed wall observed. |
| **CONFIRMED:** Internal enrichment sub-requests (615–623 per catalog call) intermittently fail with `socket hang up` / `ECONNRESET`, often in bursts; query-v3 catches these, silently omits the affected `Reference.value`, and returns 200 anyway | **Confirmed root cause**, via query-v3 server logs (§3.11). |

## 5. Recommendations

### 5.1 Internal (query-v3 / Builder engineering)

1. **Stop swallowing the error.** At minimum, surface a signal on the response when enrichment is incomplete (e.g. an `enrichment.incomplete`/`warnings` field listing the affected `model`/`id`s) instead of returning an indistinguishable clean `200`. This alone would let consumers detect and react to partial responses without needing an external repro script.
2. **Add retry-with-backoff for transient connection errors** (`socket hang up`, `ECONNRESET`, `ETIMEDOUT`) specifically on the internal enrichment sub-request path. Every affected reference resolved successfully within ~1s when probed immediately after — a single fast retry would likely recover the large majority of these before the parent response is finalized. This is the highest-leverage, lowest-risk fix and should ship first.
3. **Root-cause the connection failures themselves.** 31 socket hang-ups within ~600ms on one request is a burst, not independent noise — check connection-pool size / keep-alive settings on the internal HTTP client making these sub-requests, and whether the downstream content-fetch service has a concurrency/rate limit that resets connections under burst load.
4. **Check whether identical `(model,id)` sub-fetches are deduped within one composite enrich call.** We repeatedly observed the same reference embedded many times in one tree (e.g. a `metadata` object referenced ~9× per response, `product-benefit` shared across multiple products). If each embed triggers its own sub-request rather than being resolved once and reused, that's tripling+ the fan-out (already 615–623 sub-requests) for no benefit — deduping would directly shrink exposure to the connection-error issue.
5. **Prioritize by blast radius, not just occurrence count.** `market`'s subtree (~195 references) means a single dropped connection there wipes out far more of the response than a dropped `product-benefit` leaf. If there's a way to reduce `market`'s fan-out (e.g. it's disproportionately large relative to how often it's actually needed by consumers) that's worth flagging to the content-modeling side as well.

### 5.2 Customer-facing interim mitigations (until the backend fix ships)

1. Use model-specific fields / omit options so only the required reference data is enriched — [Enrich to Fetch References and Symbols](https://www.builder.io/c/docs/enrich#enrich-options). Less fan-out per request = less exposure.
2. Keep SSG build concurrency bounded so multiple large enrichment requests don't run at the same time.
3. Retry the whole catalog request when a required reference is unexpectedly unresolved — failures are independent per-attempt events, not stuck cache state, so a retry has a real chance of succeeding.
4. Review the catalog's reference graph to confirm every relationship actually needs enrichment in the initial request — `localized-asset` and `product-benefit` accounted for most of the burst failures. Removing obsolete/duplicate relationships and scoping enrichment to what each consumer needs reduces fan-out directly.

### 5.3 Still open

- The pacing/load-sensitivity experiment (rerun with `REQUEST_DELAY_MS=5000 node scripts/sumup-enrich-field-repro.mjs`, confirming the console prints the delayed-pacing line) — no longer needed to establish root cause, but still useful for characterizing whether concurrent customer load makes the connection-error bursts worse.

## 6. Appendix

### 6.1 Confirmed via server-side log correlation (query-v3 / Cloud Run, `builder-3b0a2`)

- `bde46840-9aef-11f1-a33c-49a4198c625f`
- `c750d260-9aef-11f1-b627-71424b814da6`
- `cf319370-9aef-11f1-80c1-0974ba9bf2dd` — the request with the 31-socket-hang-up burst within ~600ms

[Cloud Logging query used](https://console.cloud.google.com/logs/query;query=resource.type%3D%22cloud_run_revision%22%0Aresource.labels.service_name%3D%22query-v3%22%0Atimestamp%3E%3D%222026-08-18T10:29:48Z%22%0Atimestamp%3C%3D%222026-08-18T10:30:29Z%22%0A%2528%0A%20%20jsonPayload.http.request_id%3D%2528%0A%20%20%20%20%22bde46840-9aef-11f1-a33c-49a4198c625f%22%20OR%0A%20%20%20%20%22c750d260-9aef-11f1-b627-71424b814da6%22%20OR%0A%20%20%20%20%22cf319370-9aef-11f1-80c1-0974ba9bf2dd%22%0A%20%20%2529%0A%20%20OR%0A%20%20%2528%0A%20%20%20%20jsonPayload.message%3D%22fetching_relationship_failed%22%0A%20%20%20%20AND%20jsonPayload.contentUrl:%22apiKey%3Da819fcf925c046d79ad64d1941f419b5%22%0A%20%20%2529%0A%2529;storageScope=project;cursorTimestamp=2026-08-18T10:30:19.458388Z;duration=PT5M?project=builder-3b0a2&supportedpurview=project).

### 6.2 Client-side repro request IDs (earlier sessions, before server-log confirmation)

- `c0d1bb10-97f8-11f1-b4ad-e376e9974055` — single `store-product` drop, blast radius 25
- `27c663c0-97f9-11f1-b8c6-2d19c98d2ac5` — two simultaneous drops (`digital-product` + `store-product`), non-overlapping subtrees
- `8afcf300-97f9-11f1-b8c8-e94f55ecacdc` — `market` drop, 194 references lost in one request
- `af908150-97f9-11f1-8f6b-1dbcea4c0102` / preceding sequence — 32,725ms request that still fully succeeded (refutes hard-timeout theory)
- `621fc890-9803-11f1-8ae9-f5dee943b44d` — 32,882ms request that failed (two `product-benefit` drops)

Full raw data for each run is preserved in `builder-content-api-repro-results-*.json` at the repo root (results, per-space summary, reference leaderboard, and array-index failure histogram).
