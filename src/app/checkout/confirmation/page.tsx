import type { Metadata } from "next";
import BuilderOrFallback from "@/components/BuilderOrFallback";
import OrderConfirmation from "@/components/commerce/OrderConfirmation";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default function Page() {
  return (
    <BuilderOrFallback urlPath="/checkout/confirmation">
      <OrderConfirmation />
    </BuilderOrFallback>
  );
}
