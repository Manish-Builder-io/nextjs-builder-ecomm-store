/**
 * Single source of truth for design tokens.
 *
 *  - `tokensToCss()` emits the CSS custom properties (rendered by <TokensStyle /> in the root layout)
 *  - `builderDesignTokens` feeds Builder's visual editor (`editor.settings.designTokens`)
 *  - globals.css maps these variables to Tailwind utilities (bg-brand, text-ink, border-line, ...)
 *
 * Change a value here and the site and the Builder editor pick it up together.
 */

export const tokens = {
  color: {
    primary: "#2563eb",
    "primary-hover": "#1d4ed8",
    "primary-contrast": "#ffffff",
    secondary: "#111827",
    accent: "#f59e0b",
    surface: "#ffffff",
    "surface-alt": "#f9fafb",
    text: "#111827",
    "text-muted": "#6b7280",
    border: "#e5e7eb",
    success: "#16a34a",
    warning: "#d97706",
    danger: "#dc2626",
  },
  space: {
    "3xs": "2px",
    "2xs": "4px",
    xs: "8px",
    sm: "12px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    "2xl": "48px",
    "3xl": "64px",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "16px",
    pill: "9999px",
  },
  shadow: {
    sm: "0 1px 2px rgba(17, 24, 39, 0.06)",
    md: "0 4px 12px rgba(17, 24, 39, 0.08)",
    lg: "0 12px 32px rgba(17, 24, 39, 0.12)",
  },
  font: {
    base: "'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    heading: "'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
  container: {
    max: "80rem",
  },
} as const;

type Group = keyof typeof tokens;

const cssVar = (group: Group, key: string) => `--ds-${group}-${key}`;

/** `:root { --ds-color-primary: ...; }` */
export function tokensToCss(): string {
  const lines: string[] = [];
  for (const group of Object.keys(tokens) as Group[]) {
    for (const [key, value] of Object.entries(tokens[group])) {
      lines.push(`  ${cssVar(group, key)}: ${value};`);
    }
  }
  return `:root {\n${lines.join("\n")}\n}`;
}

/** Reference a token with its literal value as the fallback, e.g. `var(--ds-color-primary, #2563eb)`. */
const ref = (group: Group, key: string) =>
  `var(${cssVar(group, key)}, ${(tokens[group] as Record<string, string>)[key]})`;

const label = (key: string) =>
  key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Shape expected by Builder's `editor.settings.designTokens`. */
export const builderDesignTokens = {
  colors: Object.keys(tokens.color).map((key) => ({
    name: label(key),
    value: ref("color", key),
  })),
  spacing: Object.keys(tokens.space).map((key) => ({
    name: key.toUpperCase(),
    value: ref("space", key),
  })),
  fontFamily: (["base", "heading", "mono"] as const).map((key) => ({
    name: label(key),
    value: ref("font", key),
  })),
};
