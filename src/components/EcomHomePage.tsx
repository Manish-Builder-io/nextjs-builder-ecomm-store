import PromoBar from "@/components/homepage/PromoBar";
import HomeHero from "@/components/homepage/HomeHero";
import CategorySection from "@/components/homepage/CategorySection";
import FeaturedProductsSection from "@/components/homepage/FeaturedProductsSection";
import PromoBanner from "@/components/homepage/PromoBanner";
import TestimonialsSection from "@/components/homepage/TestimonialsSection";
import NewsletterSection from "@/components/homepage/NewsletterSection";

export default function EcomHomePage() {
  return (
    <main>
      <PromoBar />
      <HomeHero />
      <CategorySection />
      <FeaturedProductsSection />
      <PromoBanner />
      <TestimonialsSection />
      <NewsletterSection />
    </main>
  );
}
