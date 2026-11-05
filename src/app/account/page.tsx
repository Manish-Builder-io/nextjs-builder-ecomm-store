import type { Metadata } from "next";
import BuilderOrFallback from "@/components/BuilderOrFallback";
import AccountDashboard from "@/components/commerce/AccountDashboard";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default function Page() {
  return (
    <BuilderOrFallback urlPath="/account">
      <AccountDashboard />
    </BuilderOrFallback>
  );
}
