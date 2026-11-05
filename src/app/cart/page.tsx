import type { Metadata } from "next";
import BuilderOrFallback from "@/components/BuilderOrFallback";
import CartPage from "@/components/commerce/CartPage";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default function Page() {
  return (
    <BuilderOrFallback urlPath="/cart">
      <CartPage />
    </BuilderOrFallback>
  );
}
