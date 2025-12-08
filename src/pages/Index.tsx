import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import LargeHero from "../components/content/LargeHero";
import FiftyFiftySection from "../components/content/FiftyFiftySection";
import OneThirdTwoThirdsSection from "../components/content/OneThirdTwoThirdsSection";
import ProductCarousel from "../components/content/ProductCarousel";
import EditorialSection from "../components/content/EditorialSection";
import BrandMarquee from "../components/content/BrandMarquee";
import BestSellersCarousel from "../components/content/BestSellersCarousel";
import ProductStrip from "../components/content/ProductStrip";
import ScrollReveal from "../components/ui/ScrollReveal";
import { getNewArrivals, getFeaturedProducts } from "@/data/products";
import { useLanguage } from "@/i18n/LanguageContext";

const Index = () => {
  const { t } = useLanguage();
  const newArrivals = getNewArrivals(4);
  const editorsPicks = getFeaturedProducts(4);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-4 md:pt-6">
        <FiftyFiftySection />
        
        {/* Shop by Brand Marquee - at top after first banner */}
        <ScrollReveal>
          <BrandMarquee />
        </ScrollReveal>
        
        <ScrollReveal delay={100}>
          <BestSellersCarousel />
        </ScrollReveal>
        
        <ScrollReveal delay={100}>
          <LargeHero />
        </ScrollReveal>
        
        <ScrollReveal delay={100}>
          <ProductCarousel />
        </ScrollReveal>
        
        <ScrollReveal delay={100}>
          <OneThirdTwoThirdsSection />
        </ScrollReveal>
        
        <ScrollReveal delay={100}>
          <ProductStrip 
            title={t("newArrivals")} 
            titleAr={t("newArrivalsAr")} 
            products={newArrivals} 
          />
        </ScrollReveal>
        
        <ScrollReveal delay={100}>
          <EditorialSection />
        </ScrollReveal>
        
        <ScrollReveal delay={100}>
          <ProductStrip 
            title={t("editorsPicks")} 
            titleAr={t("editorsPicksAr")} 
            products={editorsPicks} 
          />
        </ScrollReveal>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
