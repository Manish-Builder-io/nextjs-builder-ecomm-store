import type { Metadata } from "next";
import HomeBuilderContent from "@/components/HomeBuilderContent";
import { getBuilderPage } from "@/lib/builder-page";
import { getRequestLocale } from "@/lib/targeting";
import { metadataFromBuilder } from "@/lib/builder-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getBuilderPage("/", "page", { locale: await getRequestLocale() });
  return metadataFromBuilder(content, "/", await getRequestLocale());
}

export default async function Page() {
  const content = await getBuilderPage("/", "page", { locale: await getRequestLocale() });
  return <HomeBuilderContent content={content} />;
}
