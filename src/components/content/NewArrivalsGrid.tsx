import { Link } from "react-router-dom";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart, ArrowRight } from "lucide-react";
import { allProducts, Product } from "@/data/products";

const NewArrivalsGrid = () => {
  const { convertPrice } = useCurrency();
  const { t, direction } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();

  // Get new arrivals
  const newArrivals = allProducts.filter(p => p.isNew).slice(0, 6);

  return (
    <section className="w-full py-12 md:py-20 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 md:mb-12">
          <div>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-foreground/50 mb-2">
              {t("justArrived")}
            </p>
            <h2 className="text-xl md:text-3xl font-light text-foreground">
              {t("newArrivals")}
            </h2>
          </div>
          <Link
            to="/category/all?filter=new"
            className="hidden md:inline-flex items-center gap-2 text-xs font-light text-foreground/70 hover:text-foreground transition-colors mt-4 md:mt-0"
          >
            {t("viewAll")}
            <ArrowRight size={12} className={direction === 'rtl' ? 'rotate-180' : ''} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
          {newArrivals.map((product) => (
            <div key={product.id} className="group relative">
              <Link to={`/product/${product.id}`}>
                {/* Image container */}
                <div className="aspect-square overflow-hidden bg-muted/10 relative mb-4">
                  <img
                    src={product.image || '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={400}
                  />
                  {/* New badge */}
                  <div className="absolute top-3 left-3">
                    <span className="text-[9px] md:text-[10px] uppercase tracking-widest bg-foreground text-background px-2 py-1">
                      {t("new")}
                    </span>
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                </div>

                {/* Product info */}
                <div className="space-y-1.5">
                  <p className="text-[10px] md:text-xs font-medium text-foreground/50 uppercase tracking-wider">
                    {product.brand}
                  </p>
                  <h3 className="text-sm md:text-base font-light text-foreground group-hover:text-foreground/80 transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <p className="text-xs md:text-sm text-foreground/70">
                      {product.category}
                    </p>
                    <p className="text-sm md:text-base font-light text-foreground">
                      {convertPrice(product.priceEUR)}
                    </p>
                  </div>
                  {/* Pre-order indicator */}
                  <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400 pt-1">
                    {t("preOrder")} — {product.leadTime}
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
            to="/category/all?filter=new"
            className="inline-flex items-center gap-2 text-xs font-light text-foreground/70 hover:text-foreground transition-colors"
          >
            {t("viewAll")}
            <ArrowRight size={12} className={direction === 'rtl' ? 'rotate-180' : ''} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NewArrivalsGrid;
