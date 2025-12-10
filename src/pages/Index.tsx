import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import HeroSection from "../components/content/HeroSection";
import CategoryShowcase from "../components/content/CategoryShowcase";
import FeaturedBrands from "../components/content/FeaturedBrands";
import NewArrivalsGrid from "../components/content/NewArrivalsGrid";
import CuratedPicks from "../components/content/CuratedPicks";
import ServiceFeatures from "../components/content/ServiceFeatures";
import BestSellersCarousel from "../components/content/BestSellersCarousel";
import EditorialSection from "../components/content/EditorialSection";
import BrandMarquee from "../components/content/BrandMarquee";
import ScrollReveal from "../components/ui/ScrollReveal";
import { useEffect } from "react";
import { trackPageView } from "@/lib/analytics";

const Index = () => {
  // Track page view on mount
  useEffect(() => {
    trackPageView('/');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main id="main-content">
        {/* Full-width Hero */}
        <HeroSection />
        
        {/* Service Features Strip */}
        <ServiceFeatures />
        
        {/* Shop by Category */}
        <ScrollReveal>
          <CategoryShowcase />
        </ScrollReveal>
        
        {/* Best Sellers Carousel */}
        <ScrollReveal delay={100}>
          <BestSellersCarousel />
        </ScrollReveal>
        
        {/* Featured Brands */}
        <ScrollReveal delay={100}>
          <FeaturedBrands />
        </ScrollReveal>
        
        {/* New Arrivals Grid */}
        <ScrollReveal delay={100}>
          <NewArrivalsGrid />
        </ScrollReveal>
        
        {/* Brand Marquee */}
        <BrandMarquee />
        
        {/* Editorial / About Section */}
        <ScrollReveal delay={100}>
          <div className="px-4 md:px-6 py-12 md:py-20">
            <EditorialSection />
          </div>
        </ScrollReveal>
        
        {/* Editor's Picks / Curated */}
        <ScrollReveal delay={100}>
          <CuratedPicks />
        </ScrollReveal>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
