import { builder, type GetContentOptions } from "@builder.io/sdk";

// Mirrors the extra per-call keys `builder.get()` accepts on top of
// GetContentOptions, so apiKey/authToken can be forwarded per request.
type FetchOptions = GetContentOptions & {
  apiKey?: string;
  authToken?: string;
};

// Based on the customer's repro snippet. Forwards authToken/apiKey per-call
// via `options` rather than mutating the shared `builder` singleton (this is
// safe server-side: builder.class.js's `.get()` creates a fresh instance from
// `options.authToken` whenever `Builder.isBrowser` is false).
//
// FIX vs. the customer's original: `enrich` must be a top-level key on the
// options object passed to `.get()` — builder.class.js only ever checks
// `options.enrich` (see the `'enrich' in options` check in its content/query
// endpoint handling). The customer's snippet nested it as `options.options.enrich`,
// which the SDK never reads, so referenced/enriched content silently never loads.
export function fetchBuilderContentByUrl(
  modelName: string,
  options: FetchOptions
) {
  return builder
    .get(modelName, {
      ...options, // apiKey, authToken, url, userAttributes
      includeRefs: true,
      enrich: true,
    })
    .toPromise();
}
