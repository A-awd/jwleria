import { useState } from "react";
import { Link } from "react-router-dom";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart, Eye, ArrowRight } from "lucide-react";
import { allProducts, Product, mergeProducts } from "@/data/products";
import QuickViewModal from "@/components/product/QuickViewModal";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";

const BestSellersCarousel = () => {
  const { convertPrice } = useCurrency();
  const { t, direction } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { data: supabaseProducts = [] } = useSupabaseProducts();
  const allMergedProducts = mergeProducts(supabaseProducts);
  
  // Get best sellers (higher-priced items)
  const bestSellers = [...allMergedProducts]
    .sort((a, b) => b.priceEUR - a.priceEUR)
    .slice(0, 8);
  
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const handleQuickView = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewProduct(product);
  };

  if (bestSellers.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-12 md:py-20 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 md:mb-12">
          <div>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-foreground/50 mb-2">
              {t("bestSellersAr")}
            </p>
            <h2 className="text-xl md:text-3xl font-light text-foreground">
              {t("bestSellers")}
            </h2>
          </div>
          <Link
            to="/category/all"
            className="hidden md:inline-flex items-center gap-2 text-xs font-light text-foreground/70 hover:text-foreground transition-colors mt-4 md:mt-0"
          >
            {t("viewAll")}
            <ArrowRight size={12} className={direction === 'rtl' ? 'rotate-180' : ''} />
          </Link>
        </div>

        {/* Scrollable horizontal list */}
        <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide scroll-smooth-touch pb-4 -mx-4 px-4 md:mx-0 md:px-0">
          {bestSellers.map((product) => (
            <div 
              key={product.id} 
              className="group relative flex-shrink-0 w-[200px] md:w-[280px]"
            >
              <Link to={`/product/${product.id}`}>
                {/* Image container */}
                <div className="aspect-[3/4] mb-4 overflow-hidden bg-muted/5 relative">
                  <img
                    src={product.image || '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                    width={280}
                    height={373}
                  />
                  
                  {/* Quick view button */}
                  <button
                    onClick={(e) => handleQuickView(product, e)}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 bg-background/95 backdrop-blur-sm text-foreground px-4 py-2.5 text-[10px] md:text-xs font-medium flex items-center gap-2 hover:bg-background"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t("quickView")}
                  </button>
                </div>

                {/* Product info */}
                <div className="space-y-1.5">
                  <p className="text-[10px] md:text-xs font-medium text-foreground/50 uppercase tracking-wider">
                    {product.brand}
                  </p>
                  <h3 className="text-sm md:text-base font-light text-foreground line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-sm md:text-base font-light text-foreground">
                    {convertPrice(product.priceEUR)}
                  </p>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400 pt-0.5">
                    {t("preOrder")}
                  </p>
                </div>
              </Link>

              {/* Favorite button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite(product.id);
                }}
                aria-label={isFavorite(product.id) ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
                className="absolute top-3 right-3 p-2.5 bg-background/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-10"
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    isFavorite(product.id) ? "fill-red-500 text-red-500" : "text-foreground/70"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-8 md:hidden">
          <Link
            to="/category/all"
            className="inline-flex items-center gap-2 text-xs font-light text-foreground/70 hover:text-foreground transition-colors"
          >
            {t("viewAll")}
            <ArrowRight size={12} className={direction === 'rtl' ? 'rotate-180' : ''} />
          </Link>
        </div>
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal
          product={{
            id: quickViewProduct.id,
            name: quickViewProduct.name,
            brand: quickViewProduct.brand,
            price: quickViewProduct.priceEUR,
            description: quickViewProduct.description,
            images: quickViewProduct.images || [quickViewProduct.image],
            leadTime: quickViewProduct.leadTime,
          }}
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </section>
  );
};

export default BestSellersCarousel;
