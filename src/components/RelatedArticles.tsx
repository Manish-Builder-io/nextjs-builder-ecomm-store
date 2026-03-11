import React from "react";

type Author = {
  name?: string;
  avatar?: string;
};

type BuilderReferencedArticle = {
  data?: {
    title?: string;
    slug?: string;
    blurb?: string;
    image?: string;
    author?: Author;
    date?: number | string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type NormalizedArticle = {
  title?: string;
  slug?: string;
  blurb?: string;
  image?: string;
  authorName?: string;
  authorAvatar?: string;
  date?: number | string;
};

type RelatedArticlesListItem = {
  // Builder list item with nested reference field "articles"
  articles?:
    | BuilderReferencedArticle
    | NormalizedArticle
    | (BuilderReferencedArticle | NormalizedArticle)[];
  [key: string]: unknown;
};

export interface RelatedArticlesProps {
  title?: string;
  /**
   * Articles will typically come from a Builder reference field
   * pointing at the `blog-articles` model.
   */
  articles?:
    | BuilderReferencedArticle[]
    | NormalizedArticle[]
    | RelatedArticlesListItem[];
}

const normalizeArticle = (
  item: BuilderReferencedArticle | NormalizedArticle | RelatedArticlesListItem
): NormalizedArticle => {
  const maybeListItem = item as RelatedArticlesListItem;

  // Handle Builder list item shape: { articles: [ref, ref] } or { articles: ref }
  if (maybeListItem.articles) {
    const inner = maybeListItem.articles;
    const firstInner =
      Array.isArray(inner) && inner.length > 0 ? inner[0] : inner;
    if (firstInner) {
      const ref: any = firstInner;
      const innerSource: any =
        ref.data ??
        ref.value?.data ??
        ref.value ??
        ref;

      // Resolve author reference (enriched level 2)
      const rawAuthor: any = innerSource.author;
      const authorSource: any =
        rawAuthor?.data ??
        rawAuthor?.value?.data ??
        rawAuthor?.value ??
        rawAuthor;

      const innerAuthor: Author | undefined = authorSource
        ? {
            name:
              authorSource.authorName ??
              authorSource.name ??
              authorSource.fullName,
            avatar:
              authorSource.avatar ??
              authorSource.image ??
              authorSource.photoUrl,
          }
        : undefined;
      return {
        title: innerSource.title,
        slug: innerSource.slug,
        blurb: innerSource.blurb,
        image: innerSource.image,
        authorName: innerAuthor?.name,
        authorAvatar: innerAuthor?.avatar,
        date: innerSource.date,
      };
    }
  }

  const ref: any = item as BuilderReferencedArticle;
  const source: any =
    ref.data ??
    ref.value?.data ??
    ref.value ??
    ref;

  // Resolve author reference (enriched level 2) for non-list usage
  const rawAuthor: any = source.author;
  const authorSource: any =
    rawAuthor?.data ??
    rawAuthor?.value?.data ??
    rawAuthor?.value ??
    rawAuthor;

  const author: Author | undefined = authorSource
    ? {
        name:
          authorSource.authorName ??
          authorSource.name ??
          authorSource.fullName,
        avatar:
          authorSource.avatar ??
          authorSource.image ??
          authorSource.photoUrl,
      }
    : undefined;

  return {
    title: source.title,
    slug: source.slug,
    blurb: source.blurb,
    image: source.image,
    authorName: author?.name,
    authorAvatar: author?.avatar,
    date: source.date,
  };
};

const formatDate = (value?: number | string) => {
  if (!value) return "";
  try {
    const date =
      typeof value === "number" ? new Date(value) : new Date(String(value));
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

const RelatedArticles: React.FC<RelatedArticlesProps> = ({
  title = "Related articles",
  articles = [],
}) => {
  // Debug: inspect raw data coming from Builder
  console.log("RelatedArticles props:", { title, articles });

  if (!articles.length) return null;

  const normalized = articles.map(normalizeArticle);

  return (
    <section className="w-full py-8">
      <div className="mx-auto max-w-5xl px-4">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            {title}
          </h2>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {normalized.map((article, index) => {
            const href = article.slug ? `/blog/${article.slug}` : undefined;
            const dateLabel = formatDate(article.date);

            return (
              <article
                key={article.slug ?? index}
                className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
              >
                {article.image && (
                  <div className="relative h-40 w-full overflow-hidden bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={article.image}
                      alt={article.title ?? "Article image"}
                      className="h-full w-full object-cover transition-transform duration-200 ease-out hover:scale-105"
                    />
                  </div>
                )}

                <div className="flex flex-1 flex-col p-4">
                  {dateLabel && (
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                      {dateLabel}
                    </p>
                  )}

                  {href ? (
                    <a
                      href={href}
                      className="mb-2 line-clamp-2 text-sm font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {article.title}
                    </a>
                  ) : (
                    <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-gray-900">
                      {article.title}
                    </h3>
                  )}

                  {article.blurb && (
                    <p className="mb-3 line-clamp-3 text-sm text-gray-600">
                      {article.blurb}
                    </p>
                  )}

                  {(article.authorName || article.authorAvatar) && (
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      {article.authorAvatar && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={article.authorAvatar}
                          alt={article.authorName ?? "Author avatar"}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      )}
                      {article.authorName && (
                        <span className="text-xs font-medium text-gray-700">
                          {article.authorName}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RelatedArticles;

