"use client";

import React from "react";
import {
  BuilderContent,
  BuilderComponent,
  useIsPreviewing,
} from "@builder.io/react";
import { ComponentProps } from "react";
import DefaultErrorPage from "next/error";
import PromoBar from "@/components/homepage/PromoBar";
import HomeHero from "@/components/homepage/HomeHero";
import CategorySection from "@/components/homepage/CategorySection";
import FeaturedProductsSection from "@/components/homepage/FeaturedProductsSection";
import PromoBanner from "@/components/homepage/PromoBanner";
import TestimonialsSection from "@/components/homepage/TestimonialsSection";
import NewsletterSection from "@/components/homepage/NewsletterSection";
import "../builder-registry";

const MODEL = "page";

type BuilderContentProp = ComponentProps<typeof BuilderComponent>["content"];

interface Props {
  content: BuilderContentProp | null;
}

const HomeSections = () => (
  <>
    <PromoBar />
    <HomeHero />
    <CategorySection />
    <FeaturedProductsSection />
    <PromoBanner />
    <TestimonialsSection />
    <NewsletterSection />
  </>
);

export default function HomeBuilderContent({ content }: Props) {
  const isPreviewing = useIsPreviewing();

  // No CMS content and not in Builder preview — render static sections only
  if (!content && !isPreviewing) {
    return (
      <main>
        <HomeSections />
      </main>
    );
  }

  // No CMS content but we're inside the Builder preview iframe — show 404
  // so the editor can start creating the page from scratch
  if (!content && isPreviewing) {
    return <DefaultErrorPage statusCode={404} />;
  }

  return (
    <BuilderContent
      content={content ?? undefined}
      options={{ includeRefs: true }}
      model={MODEL}
    >
      {(data, loading, fullContent) => (
        <React.Fragment>
          {/* Builder drag-and-drop content rendered first (e.g. hero) */}
          {!loading && (
            <BuilderComponent
              name={MODEL}
              content={fullContent}
              options={{ includeRefs: true }}
              data={{
                title: data?.title,
                description: data?.description,
              }}
            />
          )}

          {/* Static homepage sections */}
          <main>
            <HomeSections />
          </main>
        </React.Fragment>
      )}
    </BuilderContent>
  );
}
