"use client";
import { BuilderComponent, useIsPreviewing } from "@builder.io/react";
import { builder } from "@builder.io/sdk";
import DefaultErrorPage from "next/error";
import { useEffect, type ComponentProps } from "react";
import "@builder.io/widgets";
import "../../builder-registry";

builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

// Modern implementation (https://www.builder.io/c/docs/variant-containers#modern-implementation):
// set user attributes at module scope, before React renders, so the SSR inline
// script and the first client render agree on the winning variant.
// Change `locale` via ?locale=... on the server (see page.tsx) or edit here.
// Target variant 1 in Builder with `locale is en-GB`; variant 0 with `locale is not en-GB`.
// The server-side cookie (middleware.ts, ?locale=...) is the source of truth; fall back to en-US.
const cookieLocale =
  typeof document !== "undefined"
    ? (() => {
        try {
          const c = document.cookie.split("; ").find((x) => x.startsWith("builder.userAttributes="));
          return c ? JSON.parse(decodeURIComponent(c.split("=").slice(1).join("="))).locale : undefined;
        } catch {
          return undefined;
        }
      })()
    : undefined;
const LOCALE = cookieLocale ?? "en-US";
builder.setUserAttributes({ locale: LOCALE });

type Props = { content: ComponentProps<typeof BuilderComponent>["content"] | null };

export default function VariantContainerRepro({ content }: Props) {
  const isPreviewing = useIsPreviewing();
  // Docs snippet: subsequent updates after hydration (same value here; must not affect first paint).
  useEffect(() => {
    builder.setUserAttributes({ locale: LOCALE });
  }, []);
  if (!content && !isPreviewing) return <DefaultErrorPage statusCode={404} />;
  return (
    <BuilderComponent
      model="page"
      content={content ?? undefined}
      options={{ includeRefs: true, enrich: true }}
    />
  );
}
