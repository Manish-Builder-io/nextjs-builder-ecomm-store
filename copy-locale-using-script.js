// Fetch function wrapper that uses native fetch if available, otherwise falls back to node-fetch
const fetchFn =
  typeof fetch === "function"
    ? fetch
    : (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Builder.io model name (e.g., "page", "symbol", "custom-component")
const MODEL_NAME = "page";

// The entry ID of the Builder.io content to update
const ENTRY_ID = "77502bb417ce4de8a7abdb228d5"; // Update your test content ID

// Builder.io Write API endpoint URL for updating content
const ENDPOINT_URL = `https://builder.io/api/v1/write/${MODEL_NAME}/${ENTRY_ID}`;

// Builder.io Private API Key (starts with "bpk-") - used for write operations
const PRIVATE_KEY = "bpk-f1b190065f2947a6b51150cf31"; // Update your builder test space private KEY

// Builder.io Content API Key - used for reading content from the CDN
const CONTENT_API_KEY = "db60bf3db7fa4db7be81ef05b72b"; // Update your builder test space content API KEY

// Base URL for Builder.io Content API (CDN endpoint)
const CONTENT_API_BASE = "https://cdn.builder.io/api/v3/content";

// Target locale code to copy "Default" values to (e.g., "en-DE", "fr-FR", "es-ES")
const TARGET_LOCALE = "fr-FR";

/**
 * Fetches a Builder.io entry from the Content API
 * @param {string} modelName - The Builder.io model name
 * @param {string} entryId - The entry ID to fetch
 * @returns {Promise<Object>} The entry object from Builder.io
 */
async function fetchEntry(modelName, entryId) {
  // Construct the Content API URL with query parameters
  const url = new URL(`${CONTENT_API_BASE}/${modelName}`);
  url.searchParams.set("apiKey", CONTENT_API_KEY);
  url.searchParams.set("query.id", entryId);
  url.searchParams.set("limit", "1");

  // Fetch the entry from Builder.io CDN
  const response = await fetchFn(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch content (status ${response.status}): ${errorText}`
    );
  }

  // Parse the JSON response
  const payload = await response.json();
  // Extract the first result from the results array
  const entry = payload?.results?.[0];

  if (!entry) {
    throw new Error(
      `No entry found for model "${modelName}" with id "${entryId}"`
    );
  }

  return entry;
}

/**
 * Recursively traverses an object/array and updates all LocalizedValue objects
 * by copying the "Default" value to the target locale if it doesn't exist
 * @param {any} obj - The object or value to process (can be object, array, or primitive)
 * @param {string} path - The current path in the object hierarchy (for logging/debugging)
 * @returns {boolean} True if any changes were made, false otherwise
 */
function updateLocalizedValues(obj, path = "") {
  // Track whether any changes were made during traversal
  let hasChanges = false;

  if (obj === null || obj === undefined) {
    return hasChanges;
  }

  // Check if this is a LocalizedValue object (Builder.io localization structure)
  if (
    typeof obj === "object" &&
    obj["@type"] === "@builder.io/core:LocalizedValue"
  ) {
    // If "Default" exists and target locale doesn't exist, copy it
    if (
      obj["Default"] !== undefined &&
      obj[TARGET_LOCALE] === undefined
    ) {
      // Copy the Default value to the target locale
      obj[TARGET_LOCALE] = obj["Default"];
      hasChanges = true;
      console.log(`Updated localized value at path: ${path || "root"}`);
    }
    return hasChanges;
  }

  // If it's an array, process each element recursively
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      // Build the path for the current array element
      const itemPath = path ? `${path}[${i}]` : `[${i}]`;
      // Recursively process the element
      const itemChanged = updateLocalizedValues(obj[i], itemPath);
      hasChanges = hasChanges || itemChanged;
    }
    return hasChanges;
  }

  // If it's an object, process all properties recursively
  if (typeof obj === "object") {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Build the path for the current property
        const itemPath = path ? `${path}.${key}` : key;
        // Recursively process the property value
        const itemChanged = updateLocalizedValues(obj[key], itemPath);
        hasChanges = hasChanges || itemChanged;
      }
    }
    return hasChanges;
  }

  // Primitive value (string, number, boolean), nothing to do
  return hasChanges;
}

/**
 * Main function that fetches, processes, and updates Builder.io content
 * Copies "Default" locale values to the target locale for all localized fields
 */
async function updateHomepage() {
  console.log(`Fetching entry ${ENTRY_ID} from model ${MODEL_NAME}...`);
  // Fetch the current entry from Builder.io Content API
  const entry = await fetchEntry(MODEL_NAME, ENTRY_ID);

  if (!entry?.data) {
    throw new Error("Entry data is missing");
  }

  // Deep clone the data to avoid mutating the original entry object
  const dataCopy = JSON.parse(JSON.stringify(entry.data));

  console.log("Processing data structure for localized values...");
  // Recursively update all localized values in the data structure
  const hasChanges = updateLocalizedValues(dataCopy);

  if (!hasChanges) {
    console.log(
      `No localized values found that need updating (or "${TARGET_LOCALE}" already exists for all).`
    );
    return;
  }

  console.log(`Found changes. Updating entry...`);

  // Prepare the payload for the Write API
  const payload = {
    data: dataCopy,
  };

  // Send PATCH request to Builder.io Write API to update the entry
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

  // Parse and log the successful response
  const data = await response.json();
  console.log("Update successful:", data);
}

updateHomepage().catch((error) => {
  console.error("Error updating Builder.io content:", error);
  process.exitCode = 1;
});
