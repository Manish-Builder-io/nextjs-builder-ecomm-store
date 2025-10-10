export function formatPrice(
  amount: number,
  currency: string,
  locale: string = "Default"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function calculateDiscountPercentage(
  price: number,
  compareAtPrice?: number
): number | null {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

// Helper to resolve Builder LocalizedValue shape
type LocalizedValue<T> = {
  "@type": "@builder.io/core:LocalizedValue";
  [locale: string]: T | string | undefined;
};

export function resolveLocalized<T = string>(
  value: unknown,
  locale: string,
  fallbacks: string[] = ["en-US"]
): T | undefined {
  if (
    value &&
    typeof value === "object" &&
    (value as Record<string, unknown>)["@type"] === "@builder.io/core:LocalizedValue"
  ) {
    const lv = value as LocalizedValue<T>;
    const localesToTry = [locale, ...fallbacks];
    for (const loc of localesToTry) {
      const v = lv[loc] ?? lv[loc.replace("_", "-")];
      if (v != null && v !== "") return v as T;
    }
    const def = (lv as Record<string, unknown>)["Default"] ?? (lv as Record<string, unknown>)["default"];
    if (def != null && def !== "") return def as T;
    return undefined;
  }
  return value as T | undefined;
}



