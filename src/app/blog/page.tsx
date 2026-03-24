import { builder } from "@builder.io/sdk";
import BlogCard from "@/components/BlogCard";

builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

export const revalidate = 60;

export default async function BlogIndexPage() {
  const articles = await builder.getAll("blog-article", {
    fields: "data.title,data.slug,data.blurb,data.image,data.date,data.author",
    options: { noTargeting: true },
    enrich: true,
    includeRefs: true,
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Blog</h1>
          <p className="mt-2 text-lg text-gray-500">
            Insights, guides, and stories from our team.
          </p>
        </header>

        {articles.length === 0 ? (
          <p className="text-gray-500">No articles found. Check back soon!</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => {
              const d = article.data ?? {};

              // Resolve author reference if enriched
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const rawAuthor: any = d.author;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const authorSource: any =
                rawAuthor?.data ?? rawAuthor?.value?.data ?? rawAuthor?.value ?? rawAuthor;

              return (
                <BlogCard
                  key={article.id}
                  title={d.title}
                  slug={d.slug}
                  blurb={d.blurb}
                  image={d.image}
                  date={d.date}
                  authorName={
                    authorSource?.authorName ?? authorSource?.name ?? authorSource?.fullName
                  }
                  authorAvatar={
                    authorSource?.avatar ?? authorSource?.image ?? authorSource?.photoUrl
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
