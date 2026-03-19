import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./i18n/LanguageContext";
import { CurrencyProvider } from "./i18n/CurrencyContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { AuthProvider } from "./contexts/AuthContext";
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
import Products from "./pages/Products";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminHome from "./pages/admin/AdminHome";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminBrands from "./pages/admin/AdminBrands";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminProductForm from "./pages/admin/AdminProductForm";
import AdminBrandForm from "./pages/admin/AdminBrandForm";
import AdminCategoryForm from "./pages/admin/AdminCategoryForm";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
                    {/* Admin Routes */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin" element={<AdminDashboard />}>
                      <Route index element={<AdminHome />} />
                      <Route path="products" element={<AdminProducts />} />
                      <Route path="products/new" element={<AdminProductForm />} />
                      <Route path="products/:id" element={<AdminProductForm />} />
                      <Route path="brands" element={<AdminBrands />} />
                      <Route path="brands/new" element={<AdminBrandForm />} />
                      <Route path="brands/:id" element={<AdminBrandForm />} />
                      <Route path="categories" element={<AdminCategories />} />
                      <Route path="categories/new" element={<AdminCategoryForm />} />
                      <Route path="categories/:id" element={<AdminCategoryForm />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </FavoritesProvider>
          </AriaLiveProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
