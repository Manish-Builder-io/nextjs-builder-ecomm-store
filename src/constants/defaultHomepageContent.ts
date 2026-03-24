/**
 * Default homepage content in Builder.io content format.
 *
 * This is used when no content has been published for "/" in the CMS.
 * Because it follows Builder.io's block schema, the page is still fully
 * editable in the visual editor — the registered components can be
 * rearranged, removed, or replaced without any code changes.
 */

const block = (name: string, id: string) => ({
  "@type": "@builder.io/sdk:Element" as const,
  id,
  component: { name, options: {} },
  responsiveStyles: {
    large: { display: "flex", flexDirection: "column", position: "relative" },
  },
});

const defaultHomepageContent = {
  "@version": 2,
  id: "default-homepage-content",
  name: "Homepage (default)",
  published: "published",
  data: {
    blocks: [
      block("PromoBar",               "hp-promo-bar"),
      block("HomeHero",               "hp-hero"),
      block("CategorySection",        "hp-categories"),
      block("FeaturedProductsSection","hp-featured-products"),
      block("PromoBanner",            "hp-promo-banner"),
      block("TestimonialsSection",    "hp-testimonials"),
      block("NewsletterSection",      "hp-newsletter"),
    ],
  },
};

export default defaultHomepageContent;
