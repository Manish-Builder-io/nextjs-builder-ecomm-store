import { getAllBuilderContent } from "@/utils/builder-content";
import type { BuilderContent } from "@builder.io/sdk";

type SearchParams = {
  model?: string;
  limit?: string;
  urlPath?: string;
};

export default async function BuilderContentTestPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const model = searchParams?.model || "page";
  const limit = Number(searchParams?.limit) || 20;
  const urlPath = searchParams?.urlPath || undefined;

  let content: BuilderContent[] = [];
  let errorMessage: string | null = null;
  const requestUrls: string[] = [];

  try {
    content = await getAllBuilderContent({
      model,
      limit,
      urlPath,
      fields: ["id", "name", "data.url", "data.title", "data.seoTitle"],
      onRequestUrl: (url) => {
        requestUrls.push(url);
        console.log("[BuilderContentTest] Request URL:", url);
      },
    });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Builder Content Test</h1>
      <p className="mt-2 text-sm text-gray-600">
        Model: <span className="font-medium">{model}</span> | Limit:{" "}
        <span className="font-medium">{limit}</span>
        {urlPath ? (
          <>
            {" "}
            | urlPath: <span className="font-medium">{urlPath}</span>
          </>
        ) : null}
      </p>

      {errorMessage ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!errorMessage ? (
        <>
          <div className="mt-6 rounded-md border bg-white p-4 text-sm">
            <div>
              Total results: <span className="font-medium">{content.length}</span>
            </div>
          </div>

          <div className="mt-6 rounded-md border bg-white p-4 text-sm">
            <div className="font-medium">Request URLs</div>
            <div className="mt-2 space-y-2 wrap-break-word text-gray-700">
              {requestUrls.length === 0 ? (
                <div>No requests captured.</div>
              ) : (
                requestUrls.map((url, index) => <div key={url + index}>{url}</div>)
              )}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {content.slice(0, 10).map((item) => {
              const url =
                typeof item?.data?.url === "string"
                  ? item.data.url
                  : typeof item?.data?.url?.value === "string"
                  ? item.data.url.value
                  : undefined;
              const title =
                typeof item?.data?.title === "string"
                  ? item.data.title
                  : typeof item?.data?.seoTitle === "string"
                  ? item.data.seoTitle
                  : item?.name;

              return (
                <div key={item.id} className="rounded-md border p-4 text-sm">
                  <div className="font-medium">{title || "Untitled"}</div>
                  <div className="text-gray-600">id: {item.id}</div>
                  {url ? <div className="text-gray-600">url: {url}</div> : null}
                </div>
              );
            })}
          </div>

          <details className="mt-6 rounded-md border bg-white p-4 text-sm">
            <summary className="cursor-pointer font-medium">Raw JSON</summary>
            <pre className="mt-4 whitespace-pre-wrap">
              {JSON.stringify(content, null, 2)}
            </pre>
          </details>
        </>
      ) : null}
    </main>
  );
}
