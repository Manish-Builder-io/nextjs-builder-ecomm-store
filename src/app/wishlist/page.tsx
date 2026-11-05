import type { Metadata } from "next";
import BuilderOrFallback from "@/components/BuilderOrFallback";
import WishlistGrid from "@/components/commerce/WishlistGrid";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default function Page() {
  return (
    <BuilderOrFallback urlPath="/wishlist">
      <WishlistGrid />
    </BuilderOrFallback>
  );
}
