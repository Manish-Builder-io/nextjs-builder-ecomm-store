const fetchFn =
  typeof fetch === "function"
    ? fetch
    : (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

const MODEL_NAME = process.env.MODEL_NAME || "page";
const ENTRY_ID = process.env.ENTRY_ID || "";
const PRIVATE_KEY = process.env.BUILDER_PRIVATE_KEY || "";

if (!ENTRY_ID) {
  console.error("ENTRY_ID env var is required");
  process.exit(1);
}

if (!PRIVATE_KEY) {
  console.error("BUILDER_PRIVATE_KEY env var is required");
  process.exit(1);
}

const ENDPOINT_URL = `https://builder.io/api/v1/write/${MODEL_NAME}/${ENTRY_ID}`;

async function run() {
  const payload = {
    query: [
      {
        "@type": "@builder.io/core:Query",
        property: "urlPath",
        operator: "is",
        value: process.env.TARGET_URL_PATH || "/",
      },
    ],
    data: {
      blocks: [],
    },
  };

  console.log(`PATCHing ${ENDPOINT_URL}`);
  console.log("Payload:", JSON.stringify(payload, null, 2));

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
  console.log("Update successful:", JSON.stringify(data, null, 2));
}

run().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});
