/**
 * Pre-resolves Builder.io JavaScript bindings on the server using Node's
 * native `new Function()`, so the server-rendered HTML matches the client's
 * hydrated output and avoids React hydration error #418.
 *
 * Background: Builder's React SDK uses `isolated-vm` for server-side binding
 * evaluation, but that native module cannot run in Vercel's serverless sandbox.
 * This utility replaces that path for the SSR pass.
 */

function setNestedValue(obj: Record<string, any>, path: string, value: unknown): void {
  const keys = path.split(".");
  let curr = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (curr[keys[i]] == null || typeof curr[keys[i]] !== "object") {
      curr[keys[i]] = {};
    }
    curr = curr[keys[i]];
  }
  curr[keys[keys.length - 1]] = value;
}

function evalBinding(expression: string, state: Record<string, unknown>): unknown {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("state", expression);
    return fn(state);
  } catch {
    return undefined;
  }
}

function resolveBlock(block: Record<string, any>, state: Record<string, unknown>): void {
  if (!block || typeof block !== "object") return;

  // Resolve bindings declared on this block
  if (block.bindings && typeof block.bindings === "object") {
    for (const [path, expression] of Object.entries<string>(block.bindings)) {
      const value = evalBinding(expression, state);
      if (value !== undefined) {
        setNestedValue(block, path, value);
      }
    }
  }

  // Recurse into Columns component columns
  if (
    block.component?.name === "Columns" &&
    Array.isArray(block.component.options?.columns)
  ) {
    for (const col of block.component.options.columns) {
      if (Array.isArray(col.blocks)) {
        col.blocks.forEach((child: Record<string, any>) => resolveBlock(child, state));
      }
    }
  }

  // Symbol — its own `data` becomes the state for blocks inside it
  if (block.component?.name === "Symbol") {
    const symbolState: Record<string, unknown> =
      block.component.options?.symbol?.data ?? {};
    const symbolContent = block.component.options?.symbol?.content;
    if (Array.isArray(symbolContent?.data?.blocks)) {
      symbolContent.data.blocks.forEach((child: Record<string, any>) =>
        resolveBlock(child, symbolState)
      );
    }
  }

  // Recurse into explicit children array
  if (Array.isArray(block.children)) {
    block.children.forEach((child: Record<string, any>) => resolveBlock(child, state));
  }
}

/**
 * Returns a deep-cloned copy of `content` with all binding expressions
 * evaluated and applied to their target component options.
 *
 * @param content  The raw Builder content object returned by `builder.get()`
 * @param extraState  Additional state to merge (mirrors the `data` prop on BuilderComponent)
 */
export function resolveBuilderBindings(
  content: Record<string, any> | null | undefined,
  extraState?: Record<string, unknown>
): Record<string, any> | null | undefined {
  if (!content?.data?.blocks) return content;

  // Deep-clone so we never mutate the original fetch result
  const resolved: Record<string, any> = JSON.parse(JSON.stringify(content));

  const pageState: Record<string, unknown> = {
    ...(resolved.data?.state ?? {}),
    ...(extraState ?? {}),
  };

  for (const block of resolved.data.blocks) {
    resolveBlock(block, pageState);
  }

  return resolved;
}
