import { useState } from "react";
import { Link } from "react-router-dom";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart, Eye } from "lucide-react";
import { allProducts, Product } from "@/data/products";
import QuickViewModal from "@/components/product/QuickViewModal";

const CuratedPicks = () => {
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Get curated picks (higher-priced items as featured)
  const curatedPicks = [...allProducts]
    .sort((a, b) => b.priceEUR - a.priceEUR)
    .slice(0, 4);

  const handleQuickView = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewProduct(product);
  };

  return (
    <section className="w-full py-12 md:py-20 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-foreground/50 mb-2">
            {t("handpickedForYou")}
          </p>
          <h2 className="text-xl md:text-3xl font-light text-foreground">
            {t("editorsPicks")}
          </h2>
        </div>

        {/* Featured grid - 2x2 on mobile, 4 columns on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {curatedPicks.map((product, index) => (
            <div key={product.id} className="group relative">
              <Link to={`/product/${product.id}`}>
                {/* Image container */}
                <div className="aspect-[3/4] overflow-hidden bg-muted/10 relative mb-4">
                  <img
                    src={product.image || '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  {/* Limited edition badge */}
                  {product.isLimitedEdition && (
                    <div className="absolute top-3 left-3">
                      <span className="text-[9px] uppercase tracking-widest bg-amber-600 text-white px-2 py-1">
                        {t("limitedEdition")}
                      </span>
                    </div>
                  )}

                  {/* Quick view button */}
                  <button
                    onClick={(e) => handleQuickView(product, e)}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 bg-background/95 backdrop-blur-sm text-foreground px-4 py-2.5 text-xs font-medium flex items-center gap-2 hover:bg-background"
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

export default CuratedPicks;
