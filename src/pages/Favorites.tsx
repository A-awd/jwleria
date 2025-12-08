import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { allProducts } from "@/data/products";
import organicEarring from "@/assets/organic-earring.png";
import linkBracelet from "@/assets/link-bracelet.png";

const Favorites = () => {
  const { t, direction } = useLanguage();
  const { convertPrice } = useCurrency();
  const { favorites, removeFromFavorites, isFavorite, toggleFavorite } = useFavorites();

  // Get favorite products
  const favoriteProducts = allProducts.filter(product => favorites.includes(product.id));

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />
      
      <main className="pt-6 md:pt-10">
        {/* Page Header */}
        <section className="px-4 md:px-6 mb-10 md:mb-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-2xl md:text-4xl font-light text-foreground mb-4">
              {t("yourFavorites")}
            </h1>
            {favoriteProducts.length > 0 && (
              <p className="text-sm text-foreground/60">
                {favoriteProducts.length} {t("products")}
              </p>
            )}
          </div>
        </section>

        {/* Favorites Grid */}
        <section className="w-full px-6 mb-16">
          {favoriteProducts.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="w-16 h-16 text-foreground/20 mx-auto mb-6" />
              <p className="text-foreground/60 max-w-md mx-auto mb-8">
                {t("noFavoritesYet")}
              </p>
              <Link to="/brands">
                <Button variant="outline" className="font-light">
                  {t("shopByBrand")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {favoriteProducts.map((product) => (
                <div key={product.id} className="relative group">
                  <Link to={`/product/${product.id}`}>
                    <Card className="border-none shadow-none bg-transparent cursor-pointer">
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
                          {product.isNew && (
                            <div className="absolute top-2 left-2 px-2 py-1 text-xs font-medium text-black">
                              {t("newLabel")}
                            </div>
                          )}
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
                  {/* Remove from Favorites Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeFromFavorites(product.id);
                    }}
                    className="absolute top-2 right-2 p-2 bg-background/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                  >
                    <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Favorites;
