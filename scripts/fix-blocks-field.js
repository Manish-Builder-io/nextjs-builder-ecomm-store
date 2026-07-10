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

const BASE_URL = `https://builder.io/api/v1/write/${MODEL_NAME}/${ENTRY_ID}`;

async function run() {
  // Fetch current entry so we can send the full data object without data.block
  const getRes = await fetchFn(BASE_URL, {
    headers: { Authorization: `Bearer ${PRIVATE_KEY}` },
  });
  if (!getRes.ok) throw new Error(`GET failed ${getRes.status}: ${await getRes.text()}`);
  const entry = await getRes.json();

  const data = { ...(entry.data || {}), blocks: [] };
  delete data.block;

  console.log(`PATCHing ${BASE_URL}`);

  const res = await fetchFn(BASE_URL, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
  });

  if (!res.ok) throw new Error(`PATCH failed ${res.status}: ${await res.text()}`);
  const result = await res.json();
  console.log("Done:", JSON.stringify(result, null, 2));
}

run().catch((e) => { console.error(e); process.exitCode = 1; });
