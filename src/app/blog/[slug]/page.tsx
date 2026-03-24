import { builder } from "@builder.io/sdk";
import { RenderBuilderContent } from "@/components/builder";
import { notFound } from "next/navigation";

builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

export const revalidate = 60;

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const articles = await builder.getAll("blog-article", {
    fields: "data.slug",
    options: { noTargeting: true },
  });

  return articles
    .filter((a) => !!a.data?.slug)
    .map((a) => ({ slug: a.data!.slug as string }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const urlPath = `/blog/${slug}`;

  // Fetch the blog-post PAGE MODEL entry for drag-and-drop layout
  const pageContent = await builder
    .get("blog-post", {
      userAttributes: { urlPath },
      options: { enrich: true, includeRefs: true },
      enrich: true,
      includeRefs: true,
    })
    .toPromise();

  // If no page model entry exists, try fetching the structured blog-article data model
  // and render it using a fallback layout
  if (!pageContent) {
    const article = await builder
      .get("blog-article", {
        query: { "data.slug": slug },
        options: { noTargeting: true, enrich: true, includeRefs: true },
        enrich: true,
        includeRefs: true,
      })
      .toPromise();

    if (!article) {
      notFound();
    }

    const d = article.data ?? {};

    // Resolve author
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawAuthor: any = d.author;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authorSource: any =
      rawAuthor?.data ?? rawAuthor?.value?.data ?? rawAuthor?.value ?? rawAuthor;
    const authorName: string | undefined =
      authorSource?.authorName ?? authorSource?.name ?? authorSource?.fullName;
    const authorAvatar: string | undefined =
      authorSource?.avatar ?? authorSource?.image ?? authorSource?.photoUrl;

    const formatDate = (value?: number | string) => {
      if (!value) return "";
      try {
        const date = typeof value === "number" ? new Date(value) : new Date(String(value));
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch {
        return "";
      }
    };

    return (
      <main className="min-h-screen bg-white">
        <article className="mx-auto max-w-3xl px-4 py-14">
          {d.image && (
            <div className="mb-8 overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.image}
                alt={d.title ?? "Blog post"}
                className="h-auto w-full object-cover"
              />
            </div>
          )}

          <header className="mb-8">
            <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-gray-900">
              {d.title}
            </h1>
            {d.blurb && (
              <p className="mb-6 text-xl leading-relaxed text-gray-500">{d.blurb}</p>
            )}
            <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
              {authorAvatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={authorAvatar}
                  alt={authorName ?? "Author"}
                  className="h-10 w-10 rounded-full object-cover"
                />
              )}
              <div>
                {authorName && (
                  <p className="text-sm font-semibold text-gray-800">{authorName}</p>
                )}
                {d.date && (
                  <p className="text-xs text-gray-400">{formatDate(d.date)}</p>
                )}
              </div>
            </div>
          </header>

          {d.content && (
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: d.content }}
            />
          )}
        </article>
      </main>
    );
  }

  // Render the Builder.io page model (full drag-and-drop layout)
  return <RenderBuilderContent content={pageContent} model="blog-post" />;
}
