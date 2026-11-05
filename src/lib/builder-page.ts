import { builder } from "@builder.io/sdk";
import { getTargetingAttributes } from "@/lib/targeting";
import type { AppLocale } from "@/i18n/config";

builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

/**
 * Fetch a Builder entry for `urlPath` with full targeting (locale, country, device, ...).
 * Returns null when nothing is published or the request fails, so routes can fall back to
 * their built-in React implementation (this is how every ecommerce route stays overridable).
 */
export async function getBuilderPage(
  urlPath: string,
  model = "page",
  opts: { locale?: AppLocale; extraAttributes?: Record<string, string | boolean> } = {}
) {
  try {
    const userAttributes = await getTargetingAttributes({
      urlPath,
      ...(opts.locale ? { locale: opts.locale } : {}),
      ...opts.extraAttributes,
    });
    const content = await builder
      .get(model, {
        userAttributes,
        locale: userAttributes.locale,
        options: { includeRefs: true, enrich: true },
      })
      .toPromise();
    return content ?? null;
  } catch (error) {
    console.error(`Builder fetch failed for ${model} ${urlPath}:`, error);
    return null;
  }
}
