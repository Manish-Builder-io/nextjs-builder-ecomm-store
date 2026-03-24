// Fetch function wrapper that uses native fetch if available, otherwise falls back to node-fetch
const fetchFn =
  typeof fetch === "function"
    ? fetch
    : (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Builder.io model name (e.g., "page", "symbol", "custom-component")
const MODEL_NAME = "symbol-main";

// The entry ID of the Builder.io content to update
const ENTRY_ID = "6ce09ad4789e49a69edaa665b7eaf81b"; // Update your test content ID

// Builder.io Write API endpoint URL for updating content
// Note: Will be constructed dynamically with normalized model name

// Builder.io Private API Key (starts with "bpk-") - used for write operations
const PRIVATE_KEY = "bpk-bc31e5c975f24d208bd3f37e1da563d4"; // Update your builder test space private KEY

// Builder.io Content API Key - used for reading content from the CDN
const CONTENT_API_KEY = "2b3aed8e6a0542e6a194e47c94001ee6"; // Update your builder test space content API KEY

// Base URL for Builder.io Content API (CDN endpoint)
const CONTENT_API_BASE = "https://cdn.builder.io/api/v3/content";

// Target locale code to copy "Default" values to (e.g., "en-DE", "fr-FR", "es-ES")
const TARGET_LOCALE = "en-US";

/**
 * Lists available entries for a model (helper function for debugging)
 * @param {string} modelName - The Builder.io model name
 * @param {number} limit - Maximum number of entries to return
 * @returns {Promise<Array>} Array of entry objects
 */
async function listEntries(modelName, limit = 10) {
  const normalizedModelName = modelName.toLowerCase();
  const url = new URL(`${CONTENT_API_BASE}/${normalizedModelName}`);
  url.searchParams.set("apiKey", CONTENT_API_KEY);
  url.searchParams.set("limit", limit.toString());
  url.searchParams.set("fields", "id,name,url");

  const response = await fetchFn(url.toString());
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list entries (status ${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  return payload?.results || [];
}

/**
 * Fetches a Builder.io entry from the Content API
 * @param {string} modelName - The Builder.io model name
 * @param {string} entryId - The entry ID to fetch
 * @returns {Promise<Object>} The entry object from Builder.io
 */
async function fetchEntry(modelName, entryId) {
  // Validate model name (must be lowercase)
  const normalizedModelName = modelName.toLowerCase();
  if (normalizedModelName !== modelName) {
    console.warn(
      `⚠️  Warning: Model name "${modelName}" was converted to lowercase: "${normalizedModelName}"`
    );
  }

  // Construct the Content API URL with query parameters
  const url = new URL(`${CONTENT_API_BASE}/${normalizedModelName}`);
  url.searchParams.set("apiKey", CONTENT_API_KEY);
  url.searchParams.set("query.id", entryId);
  url.searchParams.set("limit", "1");

  console.log(`📡 Fetching from: ${url.toString().replace(CONTENT_API_KEY, "***")}`);

  // Fetch the entry from Builder.io CDN
  const response = await fetchFn(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to fetch content (status ${response.status}): ${errorText}`;
    
    // Provide helpful error messages for common issues
    if (response.status === 404) {
      errorMessage += `\n\n💡 Troubleshooting tips:
- Verify the model name "${normalizedModelName}" exists in your Builder.io space
- Check that the entry ID "${entryId}" exists for this model
- Common model names: "page", "symbol", "custom-component"
- Model names are case-sensitive and should be lowercase`;
    } else if (response.status === 400) {
      errorMessage += `\n\n💡 This might indicate:
- Invalid API key
- Invalid entry ID format
- Model "${normalizedModelName}" doesn't exist in your space`;
    }
    
    throw new Error(errorMessage);
  }

  // Parse the JSON response
  const payload = await response.json();
  
  // Log the response for debugging
  if (payload?.results?.length === 0) {
    console.warn(`⚠️  API returned empty results array. Response:`, JSON.stringify(payload, null, 2));
  }
  
  // Extract the first result from the results array
  const entry = payload?.results?.[0];

  if (!entry) {
    // Try to list available entries to help with debugging
    let availableEntriesHint = "";
    try {
      const availableEntries = await listEntries(normalizedModelName, 5);
      if (availableEntries.length > 0) {
        availableEntriesHint = `\n\n📋 Available entries for model "${normalizedModelName}":\n` +
          availableEntries.map(e => `   - ${e.id} (${e.name || "unnamed"})`).join("\n");
      }
    } catch {
      // Ignore errors when trying to list entries
    }

    throw new Error(
      `No entry found for model "${normalizedModelName}" with id "${entryId}".\n` +
      `API Response: ${JSON.stringify(payload, null, 2)}` +
      availableEntriesHint +
      `\n\n💡 Troubleshooting tips:\n` +
      `- Verify the entry ID "${entryId}" exists in Builder.io\n` +
      `- Check that the model "${normalizedModelName}" is correct\n` +
      `- Model names must be lowercase (e.g., "symbol" not "Symbol")\n` +
      `- Common model names: "page", "symbol", "custom-component"`
    );
  }

  console.log(`✅ Successfully fetched entry: ${entry.id} (${entry.name || "unnamed"})`);
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
  console.log(`🚀 Starting locale update process...`);
  console.log(`📋 Configuration:`);
  console.log(`   Model: ${MODEL_NAME}`);
  console.log(`   Entry ID: ${ENTRY_ID}`);
  console.log(`   Target Locale: ${TARGET_LOCALE}`);
  console.log(`\n`);
  
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

  // Normalize model name for Write API (must match Content API)
  const normalizedModelName = MODEL_NAME.toLowerCase();
  const writeEndpointUrl = `https://builder.io/api/v1/write/${normalizedModelName}/${ENTRY_ID}`;
  
  console.log(`📤 Updating via Write API: ${writeEndpointUrl.replace(PRIVATE_KEY, "***")}`);

  // Send PATCH request to Builder.io Write API to update the entry
  const response = await fetchFn(writeEndpointUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Request failed with status ${response.status}: ${errorText}`;
    
    // Provide helpful error messages
    if (response.status === 404) {
      errorMessage += `\n\n💡 Troubleshooting tips:
- Verify the Write API endpoint URL is correct: ${writeEndpointUrl}
- Check that the model "${normalizedModelName}" exists
- Verify the entry ID "${ENTRY_ID}" exists for this model
- Ensure your private API key (bpk-...) has write permissions`;
    } else if (response.status === 401 || response.status === 403) {
      errorMessage += `\n\n💡 This might indicate:
- Invalid or expired private API key
- Insufficient permissions for this model
- API key doesn't have write access`;
    }
    
    throw new Error(errorMessage);
  }

  // Parse and log the successful response
  const data = await response.json();
  console.log("Update successful:", data);
}

updateHomepage().catch((error) => {
  console.error("Error updating Builder.io content:", error);
  process.exitCode = 1;
});
