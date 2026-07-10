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

function stripMediaQueriesFromStyles(styles) {
  if (!styles || typeof styles !== "object") return styles;
  const cleaned = {};
  for (const [key, value] of Object.entries(styles)) {
    if (key.startsWith("@media")) {
      // skip — object values under @media keys are invalid in MST
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
}

function fixResponsiveStyles(responsiveStyles) {
  if (!responsiveStyles || typeof responsiveStyles !== "object") return responsiveStyles;
  const fixed = {};
  for (const [breakpoint, styles] of Object.entries(responsiveStyles)) {
    fixed[breakpoint] = stripMediaQueriesFromStyles(styles);
  }
  return fixed;
}

function fixBlock(block) {
  if (!block || typeof block !== "object") return block;
  const fixed = { ...block };
  if (fixed.responsiveStyles) {
    fixed.responsiveStyles = fixResponsiveStyles(fixed.responsiveStyles);
  }
  if (Array.isArray(fixed.children)) {
    fixed.children = fixed.children.map(fixBlock);
  }
  // recurse into component options blocks/columns
  if (fixed.component?.options?.blocks) {
    fixed.component = {
      ...fixed.component,
      options: {
        ...fixed.component.options,
        blocks: fixed.component.options.blocks.map(fixBlock),
      },
    };
  }
  if (fixed.component?.options?.columns) {
    fixed.component = {
      ...fixed.component,
      options: {
        ...fixed.component.options,
        columns: fixed.component.options.columns.map((col) => ({
          ...col,
          blocks: Array.isArray(col.blocks) ? col.blocks.map(fixBlock) : col.blocks,
        })),
      },
    };
  }
  return fixed;
}

async function run() {
  // Fetch current entry
  const getRes = await fetchFn(BASE_URL, {
    headers: { Authorization: `Bearer ${PRIVATE_KEY}` },
  });
  if (!getRes.ok) throw new Error(`GET failed ${getRes.status}: ${await getRes.text()}`);
  const entry = await getRes.json();

  const originalBlocks = entry?.data?.blocks;
  if (!Array.isArray(originalBlocks)) {
    console.log("No blocks array found, nothing to fix");
    return;
  }

  const fixedBlocks = originalBlocks.map(fixBlock);

  // Check if anything changed
  if (JSON.stringify(fixedBlocks) === JSON.stringify(originalBlocks)) {
    console.log("No @media object values found in responsiveStyles — nothing to fix");
    return;
  }

  console.log("Found @media object values to strip. PATCHing...");

  const patchRes = await fetchFn(BASE_URL, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${PRIVATE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { ...entry.data, blocks: fixedBlocks } }),
  });

  if (!patchRes.ok) throw new Error(`PATCH failed ${patchRes.status}: ${await patchRes.text()}`);
  const result = await patchRes.json();
  console.log("Fix applied successfully:", JSON.stringify(result, null, 2));
}

run().catch((e) => { console.error(e); process.exitCode = 1; });
