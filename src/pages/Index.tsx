import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import FiftyFiftySection from "../components/content/FiftyFiftySection";
import LargeHero from "../components/content/LargeHero";
import BestSellersCarousel from "../components/content/BestSellersCarousel";
import BrandMarquee from "../components/content/BrandMarquee";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-4 md:pt-6">
        {/* First hero banner */}
        <FiftyFiftySection />
        
        {/* Best Sellers carousel */}
        <BestSellersCarousel />
        
        {/* Second hero banner */}
        <LargeHero />
        
        {/* Brand marquee strip */}
        <BrandMarquee />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
