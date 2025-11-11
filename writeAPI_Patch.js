const fetchFn =
  typeof fetch === "function"
    ? fetch
    : (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

const MODEL_NAME = "homepage";
const ENTRY_ID = "57383b6d9d474083a54b5cdcd402c4db";
const ENDPOINT_URL = `https://builder.io/api/v1/write/${MODEL_NAME}/${ENTRY_ID}`;
const PRIVATE_KEY = "bpk-f1b190065f2947a6b51150cf31441b5f";
const CONTENT_API_KEY = "db60bf3db7fa4db7be81ef05b72bd720";
const CONTENT_API_BASE = "https://cdn.builder.io/api/v3/content";
const LOCALIZED_TEXT_VALUE = {
  "@type": "@builder.io/core:LocalizedValue",
  "Default": "Updated Text Here",
  "ca-ES": "<p>This is ca-ES text</p>",
  "en-US": "<p>This is en-US Text</p>",
  "fr-FR": "<p>This is fr-FR Text</p>",
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
  console.log(entry)

  if (!entry) {
    throw new Error(
      `No entry found for model "${modelName}" with id "${entryId}"`
    );
  }

  return entry;
}

function ensureLocalizationMetadata(block) {
  block.meta = block.meta ?? {};
  block.meta["transformed.text"] = "localized";

  const existing = Array.isArray(block.meta.localizedTextInputs)
    ? new Set(block.meta.localizedTextInputs)
    : new Set();
  existing.add("text");
  block.meta.localizedTextInputs = Array.from(existing);
}

function createLocalizedValue() {
  return {
    ...LOCALIZED_TEXT_VALUE,
  };
}

function localizeTextInputs(block) {
  let updated = false;
  const options = block?.component?.options;

  if (
    block?.component?.name === "Text" &&
    options &&
    typeof options.text === "string"
  ) {
    options.text = createLocalizedValue();
    ensureLocalizationMetadata(block);
    updated = true;
  }

  if (Array.isArray(options?.blocks)) {
    const nested = localizeBlocks(options.blocks);
    updated = updated || nested;
  }

  return updated;
}

function localizeBlocks(blocks) {
  let hasUpdates = false;

  if (!Array.isArray(blocks)) {
    return hasUpdates;
  }

  for (const block of blocks) {
    const textUpdated = localizeTextInputs(block);
    const childrenUpdated = localizeBlocks(block.children);
    hasUpdates = hasUpdates || textUpdated || childrenUpdated;
  }

  return hasUpdates;
}

async function updateHomepage() {
  const entry = await fetchEntry(MODEL_NAME, ENTRY_ID);
  const originalBlocks = entry?.data?.blocks;

  if (!Array.isArray(originalBlocks)) {
    throw new Error("Entry data does not contain a blocks array");
  }

  const dataCopy = JSON.parse(JSON.stringify(entry.data));
  const blocksCopy = dataCopy.blocks;
  const hasChanges = localizeBlocks(blocksCopy);

  if (!hasChanges) {
    console.log("No non-localized text found; skipping update.");
    return;
  }

  const payload = {
    data: dataCopy,
  };

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

updateHomepage().catch((error) => {
  console.error("Error updating Builder.io content:", error);
  process.exitCode = 1;
});
