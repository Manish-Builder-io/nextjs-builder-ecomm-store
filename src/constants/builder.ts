export const BUILDER_MODEL_ID = {
  STANDARD_PAGE: 'standard-page',
  PRODUCT_PAGE: 'product-page',
  BLOG_POST: 'blog-post',
  LANDING_PAGE: 'landing-page',
  // Add more model IDs as needed
} as const;

export const BUILDER_API_KEY = process.env.NEXT_PUBLIC_BUILDER_API_KEY;

export const BUILDER_CONFIG = {
  apiKey: BUILDER_API_KEY,
  cache: true,
  cacheSeconds: 60 * 5, // 5 minutes
} as const;
