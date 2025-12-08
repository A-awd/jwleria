import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import LargeHero from "../components/content/LargeHero";
import FiftyFiftySection from "../components/content/FiftyFiftySection";
import OneThirdTwoThirdsSection from "../components/content/OneThirdTwoThirdsSection";
import ProductCarousel from "../components/content/ProductCarousel";
import EditorialSection from "../components/content/EditorialSection";
import BrandLogosStrip from "../components/content/BrandLogosStrip";
import ProductStrip from "../components/content/ProductStrip";
import { getBestSellers, getNewArrivals, getFeaturedProducts } from "@/data/products";
import { useLanguage } from "@/i18n/LanguageContext";

const Index = () => {
  const { t } = useLanguage();
  const bestSellers = getBestSellers(4);
  const newArrivals = getNewArrivals(4);
  const editorsPicks = getFeaturedProducts(4);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-4 md:pt-6">
        <FiftyFiftySection />
        <BrandLogosStrip />
        <ProductCarousel />
        <LargeHero />
        <ProductStrip 
          title={t("bestSellers")} 
          titleAr={t("bestSellersAr")} 
          products={bestSellers} 
        />
        <OneThirdTwoThirdsSection />
        <ProductStrip 
          title={t("newArrivals")} 
          titleAr={t("newArrivalsAr")} 
          products={newArrivals} 
        />
        <EditorialSection />
        <ProductStrip 
          title={t("editorsPicks")} 
          titleAr={t("editorsPicksAr")} 
          products={editorsPicks} 
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
