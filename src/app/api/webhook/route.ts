import { NextRequest, NextResponse } from "next/server";

const CONTENT_API_BASE = "https://cdn.builder.io/api/v3/content";
const WRITE_API_BASE = "https://builder.io/api/v1/write";

interface LocalizedValue {
  "@type": "@builder.io/core:LocalizedValue";
  Default?: string;
  "ca-ES"?: string;
  "en-US"?: string;
  "fr-FR"?: string;
  [key: string]: unknown;
}

interface BuilderBlock {
  "@type"?: string;
  component?: {
    name?: string;
    options?: {
      text?: string | LocalizedValue;
      blocks?: BuilderBlock[];
      columns?: Array<{ blocks?: BuilderBlock[] }>;
      [key: string]: unknown;
    };
  };
  children?: BuilderBlock[];
  meta?: {
    "transformed.text"?: string;
    localizedTextInputs?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const LOCALIZED_TEXT_VALUE: LocalizedValue = {
  "@type": "@builder.io/core:LocalizedValue",
  Default: "Updated New Text Here",
  "ca-ES": "<p>This is New ca-ES text</p>",
  "en-US": "<p>This is New en-US Text</p>",
  "fr-FR": "<p>This is New fr-FR Text</p>",
};

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function isLocalizedValue(val: unknown): val is LocalizedValue {
  return (
    val !== null &&
    typeof val === "object" &&
    "@type" in val &&
    val["@type"] === "@builder.io/core:LocalizedValue"
  );
}

function ensureLocalizationMetadata(block: BuilderBlock) {
  block.meta = block.meta ?? {};
  block.meta["transformed.text"] = "localized";

  const existing = Array.isArray(block.meta.localizedTextInputs)
    ? new Set(block.meta.localizedTextInputs)
    : new Set<string>();
  existing.add("text");
  block.meta.localizedTextInputs = Array.from(existing);
}

function createLocalizedValue(): LocalizedValue {
  return { ...LOCALIZED_TEXT_VALUE };
}

function localizeTextInputs(block: BuilderBlock): boolean {
  let updated = false;
  const options = block?.component?.options;

  // Any component with string options.text that isn't already a LocalizedValue
  if (
    options &&
    typeof options.text === "string" &&
    !isLocalizedValue(options.text)
  ) {
    options.text = createLocalizedValue();
    ensureLocalizationMetadata(block);
    updated = true;
  }

  if (Array.isArray(options?.blocks)) {
    const nested = localizeBlocks(options.blocks);
    updated = updated || nested;
  }

  // Columns: recurse into each column's blocks
  if (Array.isArray(options?.columns)) {
    for (const col of options.columns) {
      if (Array.isArray(col?.blocks)) {
        const nested = localizeBlocks(col.blocks);
        updated = updated || nested;
      }
    }
  }

  return updated;
}

function localizeBlocks(blocks: BuilderBlock[] | undefined): boolean {
  let hasUpdates = false;

  if (!Array.isArray(blocks)) {
    return hasUpdates;
  }

  for (const block of blocks) {
    const textUpdated = localizeTextInputs(block);
    const childrenUpdated = localizeBlocks(block?.children);
    hasUpdates = hasUpdates || textUpdated || childrenUpdated;
  }

  return hasUpdates;
}

async function fetchEntry(
  modelName: string,
  entryId: string
): Promise<{ data: { blocks?: BuilderBlock[] }; [key: string]: unknown }> {
  const contentApiKey = process.env.NEXT_PUBLIC_BUILDER_API_KEY;
  if (!contentApiKey) {
    throw new Error("NEXT_PUBLIC_BUILDER_API_KEY is not set");
  }

  const url = new URL(`${CONTENT_API_BASE}/${modelName}`);
  url.searchParams.set("apiKey", contentApiKey);
  url.searchParams.set("query.id", entryId);
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch content (status ${response.status}): ${errorText}`
    );
  }

  const payload = await response.json();
  const entry = payload?.results?.[0];

  if (!entry) {
    throw new Error(
      `No entry found for model "${modelName}" with id "${entryId}"`
    );
  }

  return entry;
}

async function updateEntry(
  modelName: string,
  entryId: string,
  data: { blocks?: BuilderBlock[]; [key: string]: unknown }
): Promise<unknown> {
  const privateKey = process.env.BUILDER_PRIVATE_API_KEY;
  if (!privateKey) {
    throw new Error("BUILDER_PRIVATE_API_KEY is not set");
  }

  const endpointUrl = new URL(
    `${WRITE_API_BASE}/${modelName}/${entryId}`
  );
  endpointUrl.searchParams.set("triggerWebhooks", "false");
  endpointUrl.searchParams.set("autoSaveOnly", "true");

  const payload = {
    data,
    meta: {
      hasAutosaves: true,
    },
  };

  const response = await fetch(endpointUrl.toString(), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${privateKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Request failed with status ${response.status}: ${errorText}`
    );
  }

  return response.json();
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: getCorsHeaders() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { newValue, previousValue } = body as {
      newValue?: unknown;
      previousValue?: unknown;
    };

    console.log("New Value:", newValue);
    console.log("Previous Value:", previousValue);

    // Extract entry ID and model from webhook body
    // Builder sends { newValue, previousValue }; id and modelId live on those objects
    const newVal = (body as { newValue?: { id?: string; modelId?: string; modelName?: string } }).newValue;
    const prevVal = (body as { previousValue?: { id?: string; modelId?: string; modelName?: string } }).previousValue;

    const entryId =
      newVal?.id ??
      prevVal?.id ??
      (body as { id?: string })?.id ??
      (body as { entryId?: string })?.entryId ??
      (body as { data?: { id?: string } })?.data?.id;

    // Builder sends modelName at top level (e.g. "page"); Content/Write APIs require name, not modelId
    const modelOrId =
      (body as { modelName?: string })?.modelName ??
      newVal?.modelName ??
      newVal?.modelId ??
      prevVal?.modelName ??
      prevVal?.modelId ??
      (body as { modelId?: string })?.modelId ??
      (body as { model?: string })?.model ??
      (body as { data?: { model?: string } })?.data?.model;
    // If we got a modelId (UUID-like), Content/Write APIs need model name; fallback to "page"
    const modelName =
      typeof modelOrId === "string" && /^[a-f0-9]{32}$/i.test(modelOrId)
        ? (process.env.BUILDER_PAGE_MODEL_NAME ?? "homepage")
        : modelOrId;

    if (!entryId || !modelName) {
      console.log(
        "Missing entryId or modelName in webhook body, skipping localization",
        { entryId: entryId ?? null, modelName: modelName ?? null, hasNewValue: !!newVal, hasPreviousValue: !!prevVal }
      );
      return NextResponse.json(
        { message: "Webhook received (no entry to process)" },
        { headers: getCorsHeaders() }
      );
    }

    console.log(`Processing entry: ${entryId} in model: ${modelName}`);

    // Fetch the entry
    const entry = await fetchEntry(modelName, entryId);

    if (!Array.isArray(entry?.data?.blocks)) {
      console.log("Entry data does not contain a blocks array, skipping");
      return NextResponse.json(
        { message: "Webhook received (no blocks to process)" },
        { headers: getCorsHeaders() }
      );
    }

    // Deep clone the data to avoid mutating the original
    const dataCopy = JSON.parse(JSON.stringify(entry.data)) as {
      blocks?: BuilderBlock[];
      [key: string]: unknown;
    };
    const blocksCopy = dataCopy.blocks;
    const hasChanges = localizeBlocks(blocksCopy);

    if (!hasChanges) {
      console.log("No non-localized text found; skipping update.");
      return NextResponse.json(
        { message: "Webhook received (no changes needed)" },
        { headers: getCorsHeaders() }
      );
    }

    // Update via Write API
    const updateResult = await updateEntry(modelName, entryId, dataCopy);

    console.log("Update successful:", updateResult);

    return NextResponse.json(
      {
        message: "Webhook received and processed",
        entryId,
        modelName,
        localized: true,
      },
      { headers: getCorsHeaders() }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

export async function GET() {
  return new NextResponse(`Method GET Not Allowed`, {
    status: 405,
    headers: { Allow: "POST", ...getCorsHeaders() },
  });
}
