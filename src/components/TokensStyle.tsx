import { tokensToCss } from "@/design-tokens/tokens";

/** Emits the design-token CSS custom properties. Render once in the root layout <head>. */
export default function TokensStyle() {
  return <style id="design-tokens" dangerouslySetInnerHTML={{ __html: tokensToCss() }} />;
}
