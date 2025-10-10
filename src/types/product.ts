export type CurrencyCode =
  | "USD"
  | "EUR"
  | "GBP"
  | "INR"
  | string;

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  currency: CurrencyCode;
  rating: number; // 0-5
  ratingCount: number;
  imageSrc?: string;
  badge?: "new" | "sale" | "featured";
  tags?: string[];
}



