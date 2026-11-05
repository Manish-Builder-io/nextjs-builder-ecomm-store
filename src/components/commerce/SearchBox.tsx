"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useLocalizedHref } from "@/i18n/useLocale";

export default function SearchBox({ placeholder = "Search products…", defaultValue = "" }: { placeholder?: string; defaultValue?: string }) {
  const router = useRouter();
  const localize = useLocalizedHref();
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
        if (q) router.push(`${localize("/search")}?q=${encodeURIComponent(q)}`);
      }}
      className="flex items-center gap-2 rounded-full border border-line bg-surface-alt px-4 py-2"
    >
      <input name="q" type="search" defaultValue={defaultValue} placeholder={placeholder} aria-label="Search products" className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none" />
      <button type="submit" aria-label="Search" className="text-muted hover:text-ink">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
      </button>
    </form>
  );
}
