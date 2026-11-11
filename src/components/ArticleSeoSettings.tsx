import React from "react";

interface SeoSettings {
  pageTitle?: string;
  description?: string;
}

interface ArticleSeoSettingsProps {
  seo?: SeoSettings;
}

export function ArticleSeoSettings({ seo }: ArticleSeoSettingsProps) {
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
    </section>
  );
}

export default ArticleSeoSettings;
