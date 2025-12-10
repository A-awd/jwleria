import { lazy, Suspense, useEffect } from "react";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import HeroSection from "../components/content/HeroSection";
import ServiceFeatures from "../components/content/ServiceFeatures";
import { trackPageView } from "@/lib/analytics";

// Lazy load below-fold components for better initial load performance
const CategoryShowcase = lazy(() => import("../components/content/CategoryShowcase"));
const FeaturedBrands = lazy(() => import("../components/content/FeaturedBrands"));
const NewArrivalsGrid = lazy(() => import("../components/content/NewArrivalsGrid"));
const CuratedPicks = lazy(() => import("../components/content/CuratedPicks"));
const BestSellersCarousel = lazy(() => import("../components/content/BestSellersCarousel"));
const EditorialSection = lazy(() => import("../components/content/EditorialSection"));
const BrandMarquee = lazy(() => import("../components/content/BrandMarquee"));
const ScrollReveal = lazy(() => import("../components/ui/ScrollReveal"));

// Minimal loading placeholder that doesn't affect layout
const SectionLoader = () => (
  <div className="w-full py-12 md:py-20 flex justify-center">
    <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground/60 rounded-full animate-spin" />
  </div>
);

const Index = () => {
  // Track page view on mount
  useEffect(() => {
    trackPageView('/');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main id="main-content">
        {/* Full-width Hero - Critical, not lazy loaded */}
        <HeroSection />
        
        {/* Service Features Strip - Critical, not lazy loaded */}
        <ServiceFeatures />
        
        {/* Shop by Category */}
        <Suspense fallback={<SectionLoader />}>
          <ScrollReveal>
            <CategoryShowcase />
          </ScrollReveal>
        </Suspense>
        
        {/* Best Sellers Carousel */}
        <Suspense fallback={<SectionLoader />}>
          <ScrollReveal delay={100}>
            <BestSellersCarousel />
          </ScrollReveal>
        </Suspense>
        
        {/* Featured Brands */}
        <Suspense fallback={<SectionLoader />}>
          <ScrollReveal delay={100}>
            <FeaturedBrands />
          </ScrollReveal>
        </Suspense>
        
        {/* New Arrivals Grid */}
        <Suspense fallback={<SectionLoader />}>
          <ScrollReveal delay={100}>
            <NewArrivalsGrid />
          </ScrollReveal>
        </Suspense>
        
        {/* Brand Marquee */}
        <Suspense fallback={<SectionLoader />}>
          <BrandMarquee />
        </Suspense>
        
        {/* Editorial / About Section */}
        <Suspense fallback={<SectionLoader />}>
          <ScrollReveal delay={100}>
            <div className="px-4 md:px-6 py-12 md:py-20">
              <EditorialSection />
            </div>
          </ScrollReveal>
        </Suspense>
        
        {/* Editor's Picks / Curated */}
        <Suspense fallback={<SectionLoader />}>
          <ScrollReveal delay={100}>
            <CuratedPicks />
          </ScrollReveal>
        </Suspense>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
