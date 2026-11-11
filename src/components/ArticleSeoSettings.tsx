import React from "react";

interface SeoSettings {
  pageTitle?: string;
  description?: string;
  keywords?: { keyword?: string; notes?: string }[];
}

interface SocialCard {
  title?: string;
  imageUrl?: string;
}

interface ArticleSeoSettingsProps {
  seo?: SeoSettings;
  socialCard?: SocialCard;
}

export function ArticleSeoSettings({ seo, socialCard }: ArticleSeoSettingsProps) {
  const pageTitle = seo?.pageTitle?.trim();
  const description = seo?.description?.trim();

  return (
    <section className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Article SEO Settings
      </h2>
      <p className="text-base font-medium">
        {pageTitle || "(empty - Page Title is required)"}
      </p>
      <p className="text-sm text-gray-600">{description || "(no description)"}</p>
      <ul className="mt-2 flex flex-wrap gap-2 text-xs">
        {(seo?.keywords ?? []).map((k, i) => (
          <li key={i} className="rounded bg-gray-200 px-2 py-0.5">
            {k.keyword || "(empty keyword)"}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-gray-500">
        Social card: {socialCard?.title || "(empty - Card Title is required)"}
      </p>
    </section>
  );
}

export default ArticleSeoSettings;
