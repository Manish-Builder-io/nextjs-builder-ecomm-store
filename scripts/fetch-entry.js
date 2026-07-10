const fetchFn =
  typeof fetch === "function"
    ? fetch
    : (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

const MODEL_NAME = process.env.MODEL_NAME || "page";
const ENTRY_ID = process.env.ENTRY_ID || "";
const PRIVATE_KEY = process.env.BUILDER_PRIVATE_KEY || "";

if (!ENTRY_ID) { console.error("ENTRY_ID env var is required"); process.exit(1); }
if (!PRIVATE_KEY) { console.error("BUILDER_PRIVATE_KEY env var is required"); process.exit(1); }

async function run() {
  const url = `https://builder.io/api/v1/write/${MODEL_NAME}/${ENTRY_ID}`;
  const response = await fetchFn(url, {
    headers: { Authorization: `Bearer ${PRIVATE_KEY}` },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed ${response.status}: ${errorText}`);
  }
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

run().catch((e) => { console.error(e); process.exitCode = 1; });
