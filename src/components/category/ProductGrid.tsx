import { Link } from "react-router-dom";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart, Eye } from "lucide-react";
import { useState } from "react";
import Pagination from "./Pagination";
import { allProducts, Product, mergeProducts } from "@/data/products";
import QuickViewModal from "@/components/product/QuickViewModal";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";

interface ProductGridProps {
  searchQuery?: string;
  selectedBrands?: string[];
  selectedCategories?: string[];
  sortBy?: string;
  priceRange?: [number, number];
  leadTimeFilter?: string;
}

const ProductGrid = ({ 
  searchQuery = "", 
  selectedBrands = [], 
  selectedCategories = [],
  sortBy = "featured",
  priceRange,
  leadTimeFilter
}: ProductGridProps) => {
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const { data: supabaseProducts = [] } = useSupabaseProducts();
  
  // Use merged products data
  let filteredProducts = [...mergeProducts(supabaseProducts)];

  // Search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );
  }

  // Brand filter
  if (selectedBrands.length > 0) {
    filteredProducts = filteredProducts.filter(product => 
      selectedBrands.includes(product.brand)
    );
  }

  // Category filter
  if (selectedCategories.length > 0) {
    filteredProducts = filteredProducts.filter(product => 
      selectedCategories.includes(product.category) || 
      selectedCategories.includes(product.categoryKey)
    );
  }

  // Price range filter
  if (priceRange) {
    filteredProducts = filteredProducts.filter(product => 
      product.priceEUR >= priceRange[0] && product.priceEUR <= priceRange[1]
    );
  }

  // Lead time filter
  if (leadTimeFilter) {
    filteredProducts = filteredProducts.filter(product => 
      product.leadTime === leadTimeFilter
    );
  }

  // Sort products
  switch (sortBy) {
    case "price-low":
      filteredProducts.sort((a, b) => a.priceEUR - b.priceEUR);
      break;
    case "price-high":
      filteredProducts.sort((a, b) => b.priceEUR - a.priceEUR);
      break;
    case "newest":
      // Keep original order
      break;
    default:
      // Featured - keep original order
      break;
  }

  const handleQuickView = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewProduct(product);
  };

  return (
    <section className="w-full px-4 md:px-6 mb-16">
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-foreground/60 text-sm">{t("noProductsFound")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
          {filteredProducts.map((product) => (
            <div key={product.id} className="group relative">
              <Link to={`/product/${product.id}`}>
                {/* Image container */}
                <div className="aspect-[3/4] mb-4 overflow-hidden bg-muted/5 relative">
                  <img
                    src={product.image || '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                    width={300}
                    height={400}
                  />
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    {product.isNew && (
                      <span className="text-[9px] md:text-[10px] uppercase tracking-widest bg-foreground text-background px-2 py-1">
                        {t("new")}
                      </span>
                    )}
                    {product.isLimitedEdition && (
                      <span className="text-[9px] md:text-[10px] uppercase tracking-widest bg-amber-600 text-white px-2 py-1">
                        {t("limitedEdition")}
                      </span>
                    )}
                  </div>
                  
                  {/* Quick view button */}
                  <button
                    onClick={(e) => handleQuickView(product, e)}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 bg-background/95 backdrop-blur-sm text-foreground px-4 py-2.5 text-[10px] md:text-xs font-medium flex items-center gap-2 hover:bg-background"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t("quickView")}
                  </button>
                  
                  {/* Subtle overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" />
                </div>

                {/* Product info */}
                <div className="space-y-1.5">
                  <p className="text-[10px] md:text-xs font-medium text-foreground/50 uppercase tracking-wider">
                    {product.brand}
                  </p>
                  <h3 className="text-sm md:text-base font-light text-foreground group-hover:text-foreground/80 transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] md:text-xs text-foreground/50">
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
              
              {/* Favorite Button */}
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
      )}
      
      <Pagination />

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

export default ProductGrid;
