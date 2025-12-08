import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import ProductImageGalleryNew from "../components/product/ProductImageGalleryNew";
import ProductInfoNew from "../components/product/ProductInfoNew";
import ProductDescriptionNew from "../components/product/ProductDescriptionNew";
import ProductCarousel from "../components/content/ProductCarousel";
import { useLanguage } from "@/i18n/LanguageContext";
import { useProduct } from "@/hooks/useProduct";
import { Loader2 } from "lucide-react";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { ProductData } from "@/types/shopify";

// Demo images for product gallery fallback
import pantheonImage from "@/assets/pantheon.jpg";
import eclipseImage from "@/assets/eclipse.jpg";
import haloImage from "@/assets/halo.jpg";
import organicEarring from "@/assets/organic-earring.png";
import linkBracelet from "@/assets/link-bracelet.png";

interface ProductDetailNewProps {
  // Optional: Pass product data directly (for Shopify integration)
  product?: ProductData;
  // Optional: Loading state
  isLoading?: boolean;
}

const ProductDetailNew = ({ product: externalProduct, isLoading: externalLoading }: ProductDetailNewProps) => {
  const { productId } = useParams();
  const { t } = useLanguage();

  // Try to fetch from Shopify using handle
  const { product: shopifyProduct, isLoading, isFromLegacy } = useProduct({
    handle: productId,
    legacyId: Number(productId) || undefined,
    useLegacyFallback: true,
    enabled: !externalProduct,
  });

  // Use external product if provided, otherwise use fetched product
  const product = externalProduct || shopifyProduct;
  const loading = externalLoading || isLoading;

  // Enhance product with demo images if needed (for legacy fallback)
  const enhancedProduct = product ? {
    ...product,
    images: product.images.length > 0 ? product.images : [
      pantheonImage,
      eclipseImage,
      haloImage,
      organicEarring,
      linkBracelet,
    ],
    // Add demo product details if missing
    material: product.material || "18k Gold Plated Sterling Silver",
    dimensions: product.dimensions || "2.5cm x 1.2cm",
    weight: product.weight || "4.2g per piece",
    editorsNotes: product.editorsNotes || "A modern interpretation of classical architecture, bridging timeless elegance with contemporary minimalism.",
  } : undefined;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-4 md:pt-6 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-foreground/50" />
        </main>
        <Footer />
      </div>
    );
  }

  // Product not found
  if (!enhancedProduct) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-4 md:pt-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-light text-foreground mb-2">
              {t("noProductsFound")}
            </h1>
            <Link to="/" className="text-primary hover:underline">
              {t("continueShopping")}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const getCategoryTranslation = (categoryKey: string) => {
    const categoryMap: Record<string, string> = {
      rings: t("rings"),
      necklaces: t("necklaces"),
      earrings: t("earrings"),
      bracelets: t("bracelets"),
      watches: t("watches"),
      bags: t("bags"),
      sunglasses: t("sunglasses"),
      brooches: t("brooches"),
    };
    return categoryMap[categoryKey] || categoryKey;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-4 md:pt-6">
        <section className="w-full px-4 md:px-6">
          {/* Mobile Breadcrumb */}
          <div className="lg:hidden mb-4">
            <Breadcrumb>
              <BreadcrumbList className="text-xs">
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/">{t("home")}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/category/${enhancedProduct.categoryKey}`}>
                      {getCategoryTranslation(enhancedProduct.categoryKey)}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{enhancedProduct.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <ProductImageGalleryNew 
              images={enhancedProduct.images} 
              productName={enhancedProduct.name}
            />
            
            <div className="lg:pl-12 mt-6 lg:mt-0 lg:sticky lg:top-6 lg:h-fit">
              <ProductInfoNew product={enhancedProduct} />
              <ProductDescriptionNew product={enhancedProduct} />
            </div>
          </div>
        </section>
        
        <section className="w-full mt-12 lg:mt-24">
          <div className="mb-3 md:mb-4 px-4 md:px-6">
            <h2 className="text-xs md:text-sm font-light text-foreground">
              {t("youMightAlsoLike")}
            </h2>
          </div>
          <ProductCarousel />
        </section>
        
        <section className="w-full">
          <div className="mb-3 md:mb-4 px-4 md:px-6">
            <h2 className="text-xs md:text-sm font-light text-foreground">
              {t("ourOtherProducts")} {getCategoryTranslation(enhancedProduct.categoryKey)}
            </h2>
          </div>
          <ProductCarousel />
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProductDetailNew;
