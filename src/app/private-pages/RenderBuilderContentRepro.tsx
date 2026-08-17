"use client";
import { ComponentProps } from "react";
import { BuilderComponent, useIsPreviewing, Builder } from "@builder.io/react";
import { builder } from "@builder.io/sdk";
import DefaultErrorPage from "next/error";
import Link, { type LinkProps } from "next/link";
import "@builder.io/widgets";
import "../../builder-registry";

type BuilderPageProps = ComponentProps<typeof BuilderComponent>;

// Builder Public API Key set in .env file
builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

// Repro variant of components/builder.tsx's RenderBuilderContent, kept
// deliberately separate so it doesn't affect the working pages elsewhere.
// Only intentional difference from the known-good version: no global
// `builder.setUserAttributes(...)` call, since this route targets by `url`
// per-request via fetchBuilderContentByUrl instead.
export function RenderBuilderContentRepro({ content, model, locale = "en-US", data }: BuilderPageProps) {
  const isPreviewing = useIsPreviewing();

  if (Builder.isEditing || Builder.isPreviewing) {
    builder.authToken = process.env.BUILDER_PRIVATE_API_KEY ?? null;
  }

  if (content || isPreviewing) {
    try {
      return (
        <BuilderComponent
          key={content?.id}
          content={content}
          model={model}
          options={{ includeRefs: true, enrich: true }}
          locale={locale}
          data={data}
          renderLink={({ href, ...props }) => (
            <Link href={href ?? ''} {...(props as Omit<LinkProps, 'href'>)} />
          )}
        />
      );
    } catch (error) {
      console.error('Builder component error (repro):', error);
      return <DefaultErrorPage statusCode={500} />;
    }
  }

  return <DefaultErrorPage statusCode={404} />;
}
