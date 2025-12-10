import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import ProductImageGalleryNew from "../components/product/ProductImageGalleryNew";
import ProductInfoNew from "../components/product/ProductInfoNew";
import ProductDescriptionNew from "../components/product/ProductDescriptionNew";
import ProductCarousel from "../components/content/ProductCarousel";
import { useLanguage } from "@/i18n/LanguageContext";
import { getProductById, Product } from "@/data/products";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";

// Demo images for product gallery fallback
import pantheonImage from "@/assets/pantheon.jpg";
import eclipseImage from "@/assets/eclipse.jpg";
import haloImage from "@/assets/halo.jpg";
import organicEarring from "@/assets/organic-earring.png";
import linkBracelet from "@/assets/link-bracelet.png";

interface ProductDetailNewProps {
  product?: Product;
}

const ProductDetailNew = ({ product: externalProduct }: ProductDetailNewProps) => {
  const { productId } = useParams();
  const { t } = useLanguage();

  // Get product from native data
  const product = externalProduct || getProductById(Number(productId));

  // Enhance product with demo images if needed
  const enhancedProduct = product ? {
    ...product,
    price: product.priceEUR,
    images: product.images && product.images.length > 0 ? product.images : [
      product.image || pantheonImage,
      eclipseImage,
      haloImage,
      organicEarring,
      linkBracelet,
    ],
    material: product.material || "18k Gold Plated Sterling Silver",
    dimensions: product.dimensions || "2.5cm x 1.2cm",
    weight: product.weight || "4.2g per piece",
  } : undefined;

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
      
      <main id="main-content" className="pt-4 md:pt-6">
        <section className="w-full px-4 md:px-6 lg:px-8 max-w-[1800px] mx-auto">
          {/* Mobile Breadcrumb */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden mb-4"
          >
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
          </motion.div>
          
          {/* Main Product Layout - Gallery wider, info sticky */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
            {/* Product Gallery - Takes more space */}
            <ProductImageGalleryNew 
              images={enhancedProduct.images} 
              productName={enhancedProduct.name}
            />
            
            {/* Product Info - Sticky sidebar */}
            <div className="w-full lg:w-[45%] lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:scrollbar-hide">
              <ProductInfoNew product={enhancedProduct} />
              <div className="mt-6">
                <ProductDescriptionNew product={enhancedProduct} />
              </div>
            </div>
          </div>
        </section>
        
        {/* Related Products */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="w-full mt-16 lg:mt-24"
        >
          <div className="mb-4 md:mb-6 px-4 md:px-6 lg:px-8">
            <h2 className="text-lg md:text-xl font-light text-foreground">
              {t("youMightAlsoLike")}
            </h2>
          </div>
          <ProductCarousel />
        </motion.section>
        
        {/* More from category */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="w-full mt-8"
        >
          <div className="mb-4 md:mb-6 px-4 md:px-6 lg:px-8">
            <h2 className="text-lg md:text-xl font-light text-foreground">
              {t("ourOtherProducts")} {getCategoryTranslation(enhancedProduct.categoryKey)}
            </h2>
          </div>
          <ProductCarousel />
        </motion.section>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProductDetailNew;
