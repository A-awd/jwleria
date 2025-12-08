import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import ProductImageGalleryNew from "../components/product/ProductImageGalleryNew";
import ProductInfoNew from "../components/product/ProductInfoNew";
import ProductDescriptionNew from "../components/product/ProductDescriptionNew";
import ProductCarousel from "../components/content/ProductCarousel";
import { useLanguage } from "@/i18n/LanguageContext";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { getProductById } from "@/data/products";
import { mapLegacyProduct, ProductData } from "@/types/shopify";

// Demo images for product gallery
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

const ProductDetailNew = ({ product: externalProduct, isLoading }: ProductDetailNewProps) => {
  const { productId } = useParams();
  const { t } = useLanguage();

  // If product is passed as prop (from Shopify), use it. Otherwise, fetch from legacy data
  let product: ProductData | undefined = externalProduct;
  
  if (!product && productId) {
    const legacyProduct = getProductById(Number(productId));
    if (legacyProduct) {
      // Map legacy product to ProductData format with enhanced demo data
      product = {
        ...mapLegacyProduct(legacyProduct),
        // Add demo images for gallery
        images: [
          legacyProduct.image,
          pantheonImage,
          eclipseImage,
          haloImage,
          organicEarring,
          linkBracelet,
        ].filter(Boolean),
        // Add demo product details
        material: "18k Gold Plated Sterling Silver",
        dimensions: "2.5cm x 1.2cm",
        weight: "4.2g per piece",
        editorsNotes: "A modern interpretation of classical architecture, bridging timeless elegance with contemporary minimalism.",
        description: `The ${legacyProduct.name} by ${legacyProduct.brand} embodies timeless elegance with exceptional craftsmanship. A perfect addition to any luxury collection.`,
      };
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-4 md:pt-6">
          <div className="w-full px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Image skeleton */}
              <div className="aspect-square bg-muted animate-pulse" />
              {/* Info skeleton */}
              <div className="lg:pl-12 mt-6 lg:mt-0 space-y-4">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Product not found
  if (!product) {
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
                    <Link to={`/category/${product.categoryKey}`}>
                      {getCategoryTranslation(product.categoryKey)}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{product.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <ProductImageGalleryNew 
              images={product.images} 
              productName={product.name}
            />
            
            <div className="lg:pl-12 mt-6 lg:mt-0 lg:sticky lg:top-6 lg:h-fit">
              <ProductInfoNew product={product} />
              <ProductDescriptionNew product={product} />
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
              {t("ourOtherProducts")} {getCategoryTranslation(product.categoryKey)}
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
