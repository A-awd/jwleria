import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./i18n/LanguageContext";
import { CurrencyProvider } from "./i18n/CurrencyContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { AriaLiveProvider } from "./components/ui/AriaLiveRegion";
import ScrollToTop from "./components/ScrollToTop";
import SkipLink from "./components/ui/SkipLink";
import Index from "./pages/Index";
import Category from "./pages/Category";
import ProductDetailNew from "./pages/ProductDetailNew";
import NotFound from "./pages/NotFound";
import OurStory from "./pages/about/OurStory";
import Sustainability from "./pages/about/Sustainability";
import SizeGuide from "./pages/about/SizeGuide";
import CustomerCare from "./pages/about/CustomerCare";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ShopByBrand from "./pages/ShopByBrand";
import BrandDetail from "./pages/BrandDetail";
import Favorites from "./pages/Favorites";
import HowItWorks from "./pages/HowItWorks";
import RefundPolicy from "./pages/RefundPolicy";
import Contact from "./pages/Contact";
import Install from "./pages/Install";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <CurrencyProvider>
        <AriaLiveProvider>
          <FavoritesProvider>
            <TooltipProvider>
              <SkipLink />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/brands" element={<ShopByBrand />} />
                  <Route path="/brand/:brandId" element={<BrandDetail />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/category/:category" element={<Category />} />
                  <Route path="/category/brand/:brandId" element={<Category />} />
                  <Route path="/product/:productId" element={<ProductDetailNew />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/about/our-story" element={<OurStory />} />
                  <Route path="/about/sustainability" element={<Sustainability />} />
                  <Route path="/about/size-guide" element={<SizeGuide />} />
                  <Route path="/about/customer-care" element={<CustomerCare />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/refund-policy" element={<RefundPolicy />} />
                  <Route path="/install" element={<Install />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </FavoritesProvider>
        </AriaLiveProvider>
      </CurrencyProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
