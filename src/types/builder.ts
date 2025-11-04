export enum BuilderBlockNames {
  ALTERNATING_BLOCK = 'alternating-block',
  HERO = 'hero',
  PRODUCT_GRID = 'product-grid',
  PRODUCT_CARD = 'product-card',
  CONVERSION_BUTTON = 'conversion-button',
  // Add more block names as needed
}

export interface BuilderBlockProps {
  id?: string;
  name?: string;
  url?: string;
  [key: string]: any;
}

export interface BuilderPageProps {
  id: string;
  name: string;
  url: string;
  data: any;
  html?: string;
  [key: string]: any;
}
