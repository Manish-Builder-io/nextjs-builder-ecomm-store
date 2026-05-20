const fetchFn =
  typeof fetch === "function"
    ? fetch
    : (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

const MODEL_NAME = "new-page";
const ENTRY_ID = "ccb7ab7d3c6340eca158573df6debd9a";
const NEW_TITLE = process.env.NEW_TITLE || "My Updated Title";
const PRIVATE_KEY = process.env.BUILDER_PRIVATE_KEY || "";

const ENDPOINT_URL = `https://builder.io/api/v1/write/${MODEL_NAME}/${ENTRY_ID}?autoSaveOnly=true`;

async function updateTitle() {
  const payload = {
    data: {
      title: NEW_TITLE,
    },
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
  console.log("Title updated successfully:", data);
}

updateTitle().catch((error) => {
  console.error("Error updating title:", error);
  process.exitCode = 1;
});
