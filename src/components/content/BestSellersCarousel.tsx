import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { allProducts, Product } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import QuickViewModal from "@/components/product/QuickViewModal";

const BestSellersCarousel = () => {
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();
  
  // Get first 8 products as "best sellers"
  const bestSellers = allProducts.slice(0, 8);
  
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Slow auto-scroll effect
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.3; // Very slow scroll

    const scroll = () => {
      scrollPosition += scrollSpeed;
      
      // Reset when scrolled past half (seamless loop)
      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0;
      }
      
      scrollContainer.scrollLeft = scrollPosition;
      animationId = requestAnimationFrame(scroll);
    };

    // Pause on hover
    const handleMouseEnter = () => cancelAnimationFrame(animationId);
    const handleMouseLeave = () => { animationId = requestAnimationFrame(scroll); };

    scrollContainer.addEventListener("mouseenter", handleMouseEnter);
    scrollContainer.addEventListener("mouseleave", handleMouseLeave);
    
    animationId = requestAnimationFrame(scroll);

    return () => {
      cancelAnimationFrame(animationId);
      scrollContainer.removeEventListener("mouseenter", handleMouseEnter);
      scrollContainer.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const handleQuickView = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  // Double the products for seamless loop
  const duplicatedProducts = [...bestSellers, ...bestSellers];

  if (bestSellers.length === 0) {
    return null;
  }

  // Convert Product to QuickViewModal format
  const quickViewData = quickViewProduct ? {
    id: quickViewProduct.id,
    name: quickViewProduct.name,
    brand: quickViewProduct.brand,
    price: quickViewProduct.priceEUR,
    description: quickViewProduct.description,
    images: quickViewProduct.images || [quickViewProduct.image],
    leadTime: quickViewProduct.leadTime,
  } : null;

  return (
    <section className="w-full py-8 md:py-10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 mb-6 md:mb-8">
        <h2 className="text-base md:text-lg font-medium text-foreground tracking-wide">
          {t("bestSellers")}
        </h2>
        <p className="text-xs md:text-sm font-light text-foreground/50 mt-1" dir="rtl">
          {t("bestSellersAr")}
        </p>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide px-4 md:px-6"
        style={{ scrollBehavior: "auto" }}
      >
        {duplicatedProducts.map((product, index) => (
          <Link
            key={`${product.id}-${index}`}
            to={`/product/${product.id}`}
            className="group flex-shrink-0 w-[220px] md:w-[280px]"
          >
            <div className="space-y-3 transition-transform duration-300 group-hover:-translate-y-1">
              {/* Image with Quick View */}
              <div className="aspect-square overflow-hidden bg-muted/10 relative">
                <img
                  src={product.image || '/placeholder.svg'}
                  alt={product.name}
                  className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                
                {/* Quick View Button */}
                <button
                  onClick={(e) => handleQuickView(product, e)}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 bg-background/95 text-foreground px-4 py-2 text-xs font-medium flex items-center gap-2 hover:bg-background"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {t("viewDetails")}
                </button>
              </div>

              {/* Info */}
              <div className="space-y-1">
                <p className="text-[10px] md:text-xs font-medium text-foreground/50 uppercase tracking-wide group-hover:text-foreground/70 transition-colors duration-300">
                  {product.brand}
                </p>
                <h3 className="text-xs md:text-sm font-medium text-foreground line-clamp-1">
                  {product.name}
                </h3>
                <p className="text-xs md:text-sm font-light text-foreground/80">
                  {convertPrice(product.priceEUR)}
                </p>
                {/* Pre-order indicator */}
                <div className="pt-0.5">
                  <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400 border-b border-transparent hover:border-amber-500 pb-0.5 transition-all duration-300 cursor-default">
                    {t("preOrder")} — {product.leadTime}
                  </span>
                </div>
              </div>

              {/* Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 md:h-9 border-foreground/20 hover:bg-foreground hover:text-background transition-all duration-300 group-hover:border-foreground/40"
              >
                {t("viewDetails")}
              </Button>
            </div>
          </Link>
        ))}
      </div>

      <QuickViewModal
        product={quickViewData}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </section>
  );
};

export default BestSellersCarousel;
