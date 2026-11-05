import type { Metadata } from "next";
import BuilderOrFallback from "@/components/BuilderOrFallback";
import CheckoutForm from "@/components/commerce/CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function Page() {
  return (
    <BuilderOrFallback urlPath="/checkout">
      <CheckoutForm />
    </BuilderOrFallback>
  );
}
