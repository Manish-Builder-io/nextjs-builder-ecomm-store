"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { LOCALE_META, SUPPORTED_LOCALES, getUrlLocale, localizePath, stripUrlLocale, isSupportedLocale } from "@/i18n/config";
import { useLocale } from "@/i18n/useLocale";

export default function LocaleSwitcher({ label = "Language" }: { label?: string }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const current = useLocale();

  const change = (next: string) => {
    if (!isSupportedLocale(next)) return;
    // Remember the choice for un-prefixed pages, then navigate to the same page in the new locale.
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    const bare = stripUrlLocale(pathname);
    router.push(next === "Default" ? bare : localizePath(bare, next));
  };

  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted">
      <span className="sr-only">{label}</span>
      <select value={getUrlLocale(pathname) ?? current} onChange={(e) => change(e.target.value)} className="rounded-control border border-line bg-surface px-2 py-1 text-sm text-ink">
        {SUPPORTED_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_META[l].label}</option>)}
      </select>
    </label>
  );
}
