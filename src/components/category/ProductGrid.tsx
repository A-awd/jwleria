import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart } from "lucide-react";
import Pagination from "./Pagination";
import { allProducts, luxuryBrands, categories, Product } from "@/data/products";
import organicEarring from "@/assets/organic-earring.png";
import linkBracelet from "@/assets/link-bracelet.png";

interface ProductGridProps {
  searchQuery?: string;
  selectedBrands?: string[];
  selectedCategories?: string[];
  sortBy?: string;
  readyToShipOnly?: boolean;
}

const ProductGrid = ({ 
  searchQuery = "", 
  selectedBrands = [], 
  selectedCategories = [],
  sortBy = "featured",
  readyToShipOnly = false
}: ProductGridProps) => {
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();

  // Filter products
  let filteredProducts = [...allProducts];

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
      selectedCategories.includes(product.category)
    );
  }

  // Ready to ship filter
  if (readyToShipOnly) {
    filteredProducts = filteredProducts.filter(product => product.isReadyToShip);
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
      filteredProducts = filteredProducts.filter(p => p.isNew).concat(
        filteredProducts.filter(p => !p.isNew)
      );
      break;
    default:
      // Featured - keep original order
      break;
  }

  return (
    <section className="w-full px-6 mb-16">
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-foreground/60">{t("noProductsFound")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="relative group">
              <Link to={`/product/${product.id}`}>
                <Card 
                  className="border-none shadow-none bg-transparent cursor-pointer"
                >
                  <CardContent className="p-0">
                    <div className="aspect-square mb-3 overflow-hidden bg-muted/10 relative">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-all duration-300 group-hover:opacity-0"
                      />
                      <img
                        src={product.category === "Earrings" ? organicEarring : linkBracelet}
                        alt={`${product.name} lifestyle`}
                        className="absolute inset-0 w-full h-full object-cover transition-all duration-300 opacity-0 group-hover:opacity-100"
                      />
                      <div className="absolute inset-0 bg-black/[0.03]"></div>
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {product.isNew && (
                          <span className="px-2 py-1 text-xs font-medium text-black bg-background/80 backdrop-blur-sm">
                            {t("newLabel")}
                          </span>
                        )}
                        {product.isReadyToShip && (
                          <span className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50/90 backdrop-blur-sm">
                            {t("readyToShip")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground/60 uppercase tracking-wide">
                        {product.brand}
                      </p>
                      <h3 className="text-sm font-medium text-foreground">
                        {product.name}
                      </h3>
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-light text-foreground/50">
                          {product.category}
                        </p>
                        <p className="text-sm font-light text-foreground">
                          {convertPrice(product.priceEUR)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              {/* Favorite Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite(product.id);
                }}
                className="absolute top-2 right-2 p-2 bg-background/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
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
    </section>
  );
};

export default ProductGrid;
