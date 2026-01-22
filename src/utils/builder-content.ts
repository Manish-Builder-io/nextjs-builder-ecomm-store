import type { BuilderContent } from "@builder.io/sdk";

type BuilderUserAttributes = Record<string, string | number | boolean | null | undefined>;
type BuilderSort = Record<string, string | number | boolean | null | undefined>;
type BuilderQuery = Record<string, unknown>;

export type GetAllBuilderContentArgs = {
  model?: string;
  urlPath?: string;
  userAttributes?: BuilderUserAttributes;
  query?: BuilderQuery;
  fields?: string[];
  limit?: number;
  sort?: BuilderSort;
  enrich?: boolean;
  onRequestUrl?: (url: string) => void;
};

export async function getAllBuilderContent({
  model = "article-page",
  urlPath,
  userAttributes = {},
  query = {},
  fields = [],
  limit = 100,
  sort = {},
  enrich = true,
  onRequestUrl,
}: GetAllBuilderContentArgs): Promise<BuilderContent[]> {
  const BRAND = process.env.NEXT_PUBLIC_BRAND;
  const API_KEY = process.env.NEXT_PUBLIC_BUILDER_API_KEY;

  if (!BRAND || !API_KEY) {
    throw new Error(
      "[ERROR] getAllBuilderContent | Missing env vars: NEXT_PUBLIC_BRAND or NEXT_PUBLIC_BUILDER_API_KEY"
    );
  }

  const allContent: BuilderContent[] = [];
  let offset = 0;
  let pageCount = 0;
  const MAX_PAGES = 100;

  while (true) {
    if (pageCount++ > MAX_PAGES) {
      console.error(
        `[ERROR] getAllBuilderContent | Exceeded safe pagination limit of ${MAX_PAGES} pages — aborting`
      );
      break;
    }

    const url = new URL(`https://cdn.builder.io/api/v3/content/${model}`);
    url.searchParams.set("apiKey", API_KEY);
    url.searchParams.set("cachebust", "true");
    url.searchParams.set("noTargeting", "false");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("enrich", String(enrich));

    Object.entries(userAttributes).forEach(([key, value]) => {
      if (key !== "brand" && value !== undefined && value !== null) {
        url.searchParams.set(`userAttributes.${key}`, String(value));
      }
    });

    Object.entries(sort).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(`sort.${key}`, String(value));
      }
    });

    const mergedQuery: BuilderQuery = { ...query };
    const brandFilter = { property: "brand", operator: "is", value: BRAND };
    const existingAnd = (mergedQuery as { query?: { $elemMatch?: { $and?: unknown } } }).query
      ?.$elemMatch?.$and;

    const andFilters = Array.isArray(existingAnd) ? [...existingAnd] : [];
    const hasBrandFilter = andFilters.some(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "property" in item &&
        (item as { property?: string }).property === "brand"
    );

    if (!hasBrandFilter) {
      andFilters.push(brandFilter);
    }

    andFilters.forEach((filter, index) => {
      if (typeof filter !== "object" || filter === null) {
        return;
      }
      const typedFilter = filter as {
        property?: string;
        operator?: string;
        value?: string | number | boolean;
      };
      const baseKey = `query.query.$elemMatch.$and[${index}]`;
      if (typedFilter.property) {
        url.searchParams.set(`${baseKey}.property`, String(typedFilter.property));
      }
      if (typedFilter.operator) {
        url.searchParams.set(`${baseKey}.operator`, String(typedFilter.operator));
      }
      if (typedFilter.value !== undefined) {
        url.searchParams.set(`${baseKey}.value`, String(typedFilter.value));
      }
    });

    if (urlPath) {
      url.searchParams.set("userAttributes.urlPath", urlPath);
    }

    if (fields.length > 0) {
      url.searchParams.set("fields", fields.join(","));
    }

    const requestUrl = url.toString();
    onRequestUrl?.(requestUrl);
    const response = await fetch(requestUrl, { cache: "no-store" });

    if (!response.ok) {
      console.error(
        `[ERROR] getAllBuilderContent | Builder fetch failed: ${response.status} ${response.statusText}`
      );
    }

    const json = await response.json();
    const results: BuilderContent[] = json.results || [];

    allContent.push(...results);

    if (results.length < limit) {
      break;
    } else {
      offset += limit;
    }
  }

  if (allContent.length === 0) {
    console.error(
      `[ERROR] getAllBuilderContent | Failed to load Builder content for model "${model}"`
    );
  }

  return allContent;
}
