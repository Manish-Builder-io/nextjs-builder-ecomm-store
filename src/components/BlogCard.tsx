import React from "react";
import Link from "next/link";

export interface BlogCardProps {
  title?: string;
  slug?: string;
  blurb?: string;
  image?: string;
  imageAlt?: string;
  date?: number | string;
  authorName?: string;
  authorAvatar?: string;
}

const formatDate = (value?: number | string) => {
  if (!value) return "";
  try {
    const d = typeof value === "number" ? new Date(value) : new Date(String(value));
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
};

const BlogCard: React.FC<BlogCardProps> = ({
  title,
  slug,
  blurb,
  image,
  imageAlt,
  date,
  authorName,
  authorAvatar,
}) => {
  const href = slug ? `/blog/${slug}` : undefined;
  const dateLabel = formatDate(date);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {image && (
        <div className="relative h-48 w-full overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={imageAlt ?? title ?? "Blog post image"}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        {dateLabel && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {dateLabel}
          </p>
        )}

        {href ? (
          <Link
            href={href}
            className="mb-2 line-clamp-2 text-lg font-bold text-gray-900 hover:text-blue-600"
          >
            {title}
          </Link>
        ) : (
          <h2 className="mb-2 line-clamp-2 text-lg font-bold text-gray-900">{title}</h2>
        )}

        {blurb && (
          <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-600">{blurb}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-3">
          {(authorName || authorAvatar) && (
            <div className="flex items-center gap-2">
              {authorAvatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={authorAvatar}
                  alt={authorName ?? "Author"}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-gray-100"
                />
              )}
              {authorName && (
                <span className="text-sm font-medium text-gray-700">{authorName}</span>
              )}
            </div>
          )}
          {href && (
            <Link
              href={href}
              className="ml-auto text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Read more →
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};

export default BlogCard;
