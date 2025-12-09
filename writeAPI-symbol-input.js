/**
 * Script to update localized content field values for Symbol components in Builder.io
 * 
 * Configuration:
 * - Set environment variables: BUILDER_MODEL_NAME, BUILDER_ENTRY_ID, BUILDER_PRIVATE_KEY, BUILDER_CONTENT_API_KEY
 * - Or replace the placeholder values below with your actual credentials
 * 
 * Usage:
 *   BUILDER_PRIVATE_KEY=your_key BUILDER_CONTENT_API_KEY=your_key node writeAPI-symbol-input.js
 */

const fetchFn =
  typeof fetch === "function"
    ? fetch
    : (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Configuration - Replace these with your actual values or set via environment variables
const MODEL_NAME = process.env.BUILDER_MODEL_NAME || "page";
const ENTRY_ID = process.env.BUILDER_ENTRY_ID || "YOUR_ENTRY_ID_HERE";
const ENDPOINT_URL = `https://builder.io/api/v1/write/${MODEL_NAME}/${ENTRY_ID}`;
const PRIVATE_KEY = process.env.BUILDER_PRIVATE_KEY || "YOUR_PRIVATE_KEY_HERE";
const CONTENT_API_KEY = process.env.BUILDER_CONTENT_API_KEY || "YOUR_CONTENT_API_KEY_HERE";
const CONTENT_API_BASE = "https://cdn.builder.io/api/v3/content";
const LOCALIZED_CONTENT_VALUE = {
    "@type": "@builder.io/core:LocalizedValue",
    "Default": "<p>NIF is Portugal's main tax ID for residents, non-residents, and companies (9 digits).</p>",
    "en-US": "<p>NIF is Portugal's main tax ID used by residents, non-residents, and companies (9 digits).</p>",
    "fr-FR": "<p>Le NIF est l'identifiant fiscal principal au Portugal pour résidents et entreprises (9 chiffres).</p>",
    "es-ES": "<p>El NIF es el identificador fiscal principal en Portugal para residentes y empresas (9 dígitos).</p>",
    "ar-AE": "<p>الرقم الضريبي في البرتغال هو المعرف الرئيسي للمقيمين وغير المقيمين والشركات (9 أرقام).</p>",
    "de-DE": "<p>Die NIF ist die wichtigste Steuer-ID in Portugal für Einwohner und Unternehmen (9 Ziffern).</p>"
  };
  
async function fetchEntry(modelName, entryId) {
  const url = new URL(`${CONTENT_API_BASE}/${modelName}`);
  url.searchParams.set("apiKey", CONTENT_API_KEY);
  url.searchParams.set("query.id", entryId);
  url.searchParams.set("limit", "1");

  const response = await fetchFn(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch content (status ${response.status}): ${errorText}`
    );
  }

  const payload = await response.json();
  const entry = payload?.results?.[0];
  console.log("Fetched entry:", entry?.id);

  if (!entry) {
    throw new Error(
      `No entry found for model "${modelName}" with id "${entryId}"`
    );
  }

  return entry;
}

function ensureLocalizationMetadata(block) {
  block.meta = block.meta ?? {};
  block.meta["transformed.symbol.content"] = "localized";

  const existing = Array.isArray(block.meta.localizedSymbolInputs)
    ? new Set(block.meta.localizedSymbolInputs)
    : new Set();
  existing.add("content");
  block.meta.localizedSymbolInputs = Array.from(existing);
}

function createLocalizedValue(existingValue) {
  // If there's an existing LocalizedValue, preserve its structure
  if (existingValue && existingValue["@type"] === "@builder.io/core:LocalizedValue") {
    return {
      ...existingValue,
      ...LOCALIZED_CONTENT_VALUE,
    };
  }
  
  // If it's a string, convert to LocalizedValue
  if (typeof existingValue === "string") {
    return {
      ...LOCALIZED_CONTENT_VALUE,
      "Default": existingValue,
    };
  }
  
  // Otherwise, return a new LocalizedValue
  return {
    ...LOCALIZED_CONTENT_VALUE,
  };
}

function localizeSymbolContent(block) {
  let updated = false;
  const options = block?.component?.options;
  const symbol = options?.symbol;

  if (
    block?.component?.name === "Symbol" &&
    symbol &&
    symbol.data &&
    symbol.data.content !== undefined
  ) {
    const currentContent = symbol.data.content;
    
    // Check if content needs to be localized or updated
    const isString = typeof currentContent === "string";
    const isLocalizedValue = 
      currentContent && 
      currentContent["@type"] === "@builder.io/core:LocalizedValue";
    
    if (isString || isLocalizedValue) {
      symbol.data.content = createLocalizedValue(currentContent);
      ensureLocalizationMetadata(block);
      updated = true;
    }
  }

  // Recursively process nested blocks
  if (Array.isArray(options?.blocks)) {
    const nested = localizeBlocks(options.blocks);
    updated = updated || nested;
  }

  // Process children blocks
  if (Array.isArray(block.children)) {
    const childrenUpdated = localizeBlocks(block.children);
    updated = updated || childrenUpdated;
  }

  return updated;
}

function localizeBlocks(blocks) {
  let hasUpdates = false;

  if (!Array.isArray(blocks)) {
    return hasUpdates;
  }

  for (const block of blocks) {
    const symbolUpdated = localizeSymbolContent(block);
    hasUpdates = hasUpdates || symbolUpdated;
  }

  return hasUpdates;
}

async function updatePage() {
  const entry = await fetchEntry(MODEL_NAME, ENTRY_ID);
  const originalBlocks = entry?.data?.blocks;

  if (!Array.isArray(originalBlocks)) {
    throw new Error("Entry data does not contain a blocks array");
  }

  const dataCopy = JSON.parse(JSON.stringify(entry.data));
  const blocksCopy = dataCopy.blocks;
  const hasChanges = localizeBlocks(blocksCopy);

  if (!hasChanges) {
    console.log("No symbol content found to localize; skipping update.");
    return;
  }

  const payload = {
    data: dataCopy,
  };

  console.log("Updating entry with localized symbol content...");

  const response = await fetchFn(ENDPOINT_URL, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
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

  const data = await response.json();
  console.log("Update successful:", data);
}

updatePage().catch((error) => {
  console.error("Error updating Builder.io content:", error);
  process.exitCode = 1;
});

