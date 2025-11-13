"use client";
import { ComponentProps } from "react";
import { BuilderComponent, useIsPreviewing, Builder } from "@builder.io/react";
import { builder } from "@builder.io/sdk";
import DefaultErrorPage from "next/error";
import "../builder-registry";

type BuilderPageProps = ComponentProps<typeof BuilderComponent>;

// Builder Public API Key set in .env file
builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);


export function RenderBuilderContent({ content, model, locale  }: BuilderPageProps) {
  // Call the useIsPreviewing hook to determine if
  // the page is being previewed in Builder
  const isPreviewing = useIsPreviewing();

  if(Builder.isEditing || Builder.isPreviewing){
    builder.authToken = process.env.BUILDER_PRIVATE_API_KEY ?? null;  
  }
  
  // If "content" has a value or the page is being previewed in Builder,
  // render the BuilderComponent with the specified content and model props.
  if (content || isPreviewing) {
    try {
      return (
        <BuilderComponent 
          content={content} 
          model={model} 
          options={{ enrich: true }} 
          locale={locale}
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
