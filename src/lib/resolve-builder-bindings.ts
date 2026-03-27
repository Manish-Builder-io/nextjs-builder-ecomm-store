/**
 * Pre-resolves Builder.io JavaScript bindings on the server using Node's
 * native `new Function()`, so the server-rendered HTML matches the client's
 * hydrated output and avoids React hydration error #418.
 *
 * Background: Builder's React SDK uses `isolated-vm` for server-side binding
 * evaluation, but that native module cannot run in Vercel's serverless sandbox.
 * This utility replaces that path for the SSR pass.
 */

type BuilderBlock = Record<string, unknown>;
type BuilderState = Record<string, unknown>;

function setNestedValue(obj: BuilderBlock, path: string, value: unknown): void {
  const keys = path.split(".");
  let curr = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (curr[key] == null || typeof curr[key] !== "object") {
      curr[key] = {};
    }
    curr = curr[key] as BuilderBlock;
  }
  curr[keys[keys.length - 1]] = value;
}

function evalBinding(expression: string, state: BuilderState): unknown {
  try {
    const fn = new Function("state", expression);
    return fn(state);
  } catch {
    return undefined;
  }
}

function resolveBlock(block: BuilderBlock, state: BuilderState): void {
  if (!block || typeof block !== "object") return;

  // Resolve bindings declared on this block
  const bindings = block.bindings;
  if (bindings && typeof bindings === "object") {
    for (const [path, expression] of Object.entries(bindings as Record<string, string>)) {
      const value = evalBinding(expression, state);
      if (value !== undefined) {
        setNestedValue(block, path, value);
      }
    }
  }

  const component = block.component as BuilderBlock | undefined;

  // Recurse into Columns component columns
  if (component?.name === "Columns") {
    const columns = (component.options as BuilderBlock)?.columns;
    if (Array.isArray(columns)) {
      for (const col of columns as BuilderBlock[]) {
        if (Array.isArray(col.blocks)) {
          (col.blocks as BuilderBlock[]).forEach((child) => resolveBlock(child, state));
        }
      }
    }
  }

  // Symbol — its own `data` becomes the state for blocks inside it
  if (component?.name === "Symbol") {
    const options = component.options as BuilderBlock | undefined;
    const symbol = options?.symbol as BuilderBlock | undefined;
    const symbolState: BuilderState = (symbol?.data as BuilderState) ?? {};
    const symbolContent = symbol?.content as BuilderBlock | undefined;
    const symbolBlocks = (symbolContent?.data as BuilderBlock)?.blocks;
    if (Array.isArray(symbolBlocks)) {
      (symbolBlocks as BuilderBlock[]).forEach((child) =>
        resolveBlock(child, symbolState)
      );
    }
  }

  // Recurse into explicit children array
  if (Array.isArray(block.children)) {
    (block.children as BuilderBlock[]).forEach((child) => resolveBlock(child, state));
  }
}

/**
 * Returns a deep-cloned copy of `content` with all binding expressions
 * evaluated and applied to their target component options.
 *
 * @param content   The raw Builder content object returned by `builder.get()`
 * @param extraState  Additional state to merge (mirrors the `data` prop on BuilderComponent)
 */
export function resolveBuilderBindings(
  content: BuilderBlock | null | undefined,
  extraState?: BuilderState
): BuilderBlock | null | undefined {
  if (!content?.data) return content;

  const data = content.data as BuilderBlock;
  if (!Array.isArray(data.blocks)) return content;

  // Deep-clone so we never mutate the original fetch result
  const resolved: BuilderBlock = JSON.parse(JSON.stringify(content));
  const resolvedData = resolved.data as BuilderBlock;

  const pageState: BuilderState = {
    ...((resolvedData.state as BuilderState) ?? {}),
    ...(extraState ?? {}),
  };

  for (const block of resolvedData.blocks as BuilderBlock[]) {
    resolveBlock(block, pageState);
  }

  return resolved;
}
