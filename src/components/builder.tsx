"use client";
import { ComponentProps } from "react";
import { BuilderComponent, useIsPreviewing, Builder } from "@builder.io/react";
import { builder } from "@builder.io/sdk";
import DefaultErrorPage from "next/error";
import '@builder.io/widgets';
import "../builder-registry";

type BuilderPageProps = ComponentProps<typeof BuilderComponent>;

// Builder Public API Key set in .env file
builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

builder.setUserAttributes({location: "IN"});

export function RenderBuilderContent({ content, model, locale = "en-US", data }: BuilderPageProps) {
  const isPreviewing = useIsPreviewing();

  if(Builder.isEditing || Builder.isPreviewing){
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
          data={{
            title: "Welcome to Our Store",
            description: "Discover amazing products and great deals. Shop the latest collection with free shipping on orders over $50.",
            ctaText: "Shop Now",
            featured: true,
            imageSrc: "https://cdn.builder.io/api/v1/image/assets%2Fdb60bf3db7fa4db7be81ef05b72bd720%2Fd44403a7f0204687882590d9b9cb2a17",
            ...data,
          }}
        />
      );
    } catch (error) {
      console.error('Builder component error:', error);
      return <DefaultErrorPage statusCode={500} />;
    }
  }
  
  // If the "content" is falsy and the page is
  // not being previewed in Builder, render the
  // DefaultErrorPage with a 404.
  return <DefaultErrorPage statusCode={404} />;
}
