"use client";
import { ComponentProps } from "react";
import { BuilderComponent, useIsPreviewing, Builder, BuilderContent } from "@builder.io/react";
import { builder } from "@builder.io/sdk";
import DefaultErrorPage from "next/error";
import '@builder.io/widgets';
import "../builder-registry";

type BuilderPageProps = ComponentProps<typeof BuilderComponent>;

// Builder Public API Key set in .env file
builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!);

builder.setUserAttributes({accountsId: "5"});

export function RenderBuilderContent({ content, model, locale = "en-US"  }: BuilderPageProps) {
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
        <BuilderContent key={content?.id} model="page" content={content} options={{enrich: true}}>
          {(data, loading, fullContent) => {
            if (loading) {
              return <h1>Loading...</h1>;
            }
            return (
              <BuilderComponent 
                content={fullContent} 
                model={model} 
                options={{ enrich: true }} 
                locale={locale}
                data={{
                  content: fullContent
                }}
              />
            );
          }}
        </BuilderContent>
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
