import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import LargeHero from "../components/content/LargeHero";
import FiftyFiftySection from "../components/content/FiftyFiftySection";
import OneThirdTwoThirdsSection from "../components/content/OneThirdTwoThirdsSection";
import ProductCarousel from "../components/content/ProductCarousel";
import EditorialSection from "../components/content/EditorialSection";
import BrandMarquee from "../components/content/BrandMarquee";
import BrandLogoStrip from "../components/content/BrandLogoStrip";
import BestSellersCarousel from "../components/content/BestSellersCarousel";
import ProductStrip from "../components/content/ProductStrip";
import ScrollReveal from "../components/ui/ScrollReveal";
import { useNewArrivals, useFeaturedProducts } from "@/hooks/useShopifyProducts";
import { useLanguage } from "@/i18n/LanguageContext";

const Index = () => {
  const { t } = useLanguage();
  const { data: newArrivalsData } = useNewArrivals(4);
  const { data: editorsPicksData } = useFeaturedProducts(4);
  
  const newArrivals = newArrivalsData?.products || [];
  const editorsPicks = editorsPicksData?.products || [];

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
        
        {/* Brand strip to reduce gap */}
        <BrandLogoStrip />
        
        <ScrollReveal delay={100}>
          <LargeHero />
        </ScrollReveal>
        
        <ScrollReveal delay={100}>
          <ProductCarousel />
        </ScrollReveal>
        
        {/* Brand strip to reduce gap */}
        <BrandLogoStrip />
        
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
        
        {/* Brand strip to reduce gap */}
        <BrandLogoStrip />
        
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
