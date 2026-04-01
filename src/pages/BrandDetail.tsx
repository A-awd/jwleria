import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import { Link, useParams } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getProductsByBrand, luxuryBrands, mergeProducts } from "@/data/products";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import organicEarring from "@/assets/organic-earring.png";
import linkBracelet from "@/assets/link-bracelet.png";

// Brand metadata for display
const brandMetadata: Record<string, { nameKey: string; descriptionKey: string; initials: string; accentColor: string }> = {
  "Cartier": { nameKey: "brandCartier", descriptionKey: "brandCartierDesc", initials: "C", accentColor: "from-red-900/20 to-red-800/10" },
  "Bulgari": { nameKey: "brandBulgari", descriptionKey: "brandBulgariDesc", initials: "B", accentColor: "from-amber-900/20 to-amber-800/10" },
  "Van Cleef & Arpels": { nameKey: "brandVanCleef", descriptionKey: "brandVanCleefDesc", initials: "VCA", accentColor: "from-emerald-900/20 to-emerald-800/10" },
  "Tiffany & Co.": { nameKey: "brandTiffany", descriptionKey: "brandTiffanyDesc", initials: "T", accentColor: "from-cyan-700/20 to-cyan-600/10" },
  "Chopard": { nameKey: "brandChopard", descriptionKey: "brandChopardDesc", initials: "CH", accentColor: "from-rose-900/20 to-rose-800/10" },
  "Graff": { nameKey: "brandGraff", descriptionKey: "brandGraffDesc", initials: "G", accentColor: "from-slate-800/20 to-slate-700/10" },
  "Harry Winston": { nameKey: "brandHarryWinston", descriptionKey: "brandHarryWinstonDesc", initials: "HW", accentColor: "from-blue-900/20 to-blue-800/10" },
  "Piaget": { nameKey: "brandPiaget", descriptionKey: "brandPiagetDesc", initials: "P", accentColor: "from-violet-900/20 to-violet-800/10" },
  "Dior": { nameKey: "brandDior", descriptionKey: "brandDiorDesc", initials: "D", accentColor: "from-gray-800/20 to-gray-700/10" },
  "Givenchy": { nameKey: "brandGivenchy", descriptionKey: "brandGivenchyDesc", initials: "GV", accentColor: "from-neutral-800/20 to-neutral-700/10" },
  "Rolex": { nameKey: "brandRolex", descriptionKey: "brandRolexDesc", initials: "R", accentColor: "from-green-900/20 to-green-800/10" },
  "Patek Philippe": { nameKey: "brandPatekPhilippe", descriptionKey: "brandPatekPhilippeDesc", initials: "PP", accentColor: "from-amber-800/20 to-amber-700/10" },
};

const BrandDetail = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const { t, direction } = useLanguage();
  const { convertPrice } = useCurrency();
  const { toggleFavorite, isFavorite } = useFavorites();

  // Convert URL brandId to brand name
  const brandNameMap: Record<string, string> = {
    "cartier": "Cartier",
    "bulgari": "Bulgari",
    "van-cleef-arpels": "Van Cleef & Arpels",
    "tiffany": "Tiffany & Co.",
    "chopard": "Chopard",
    "graff": "Graff",
    "harry-winston": "Harry Winston",
    "piaget": "Piaget",
    "dior": "Dior",
    "givenchy": "Givenchy",
    "rolex": "Rolex",
    "patek-philippe": "Patek Philippe",
  };

  const brandName = brandNameMap[brandId || ""] || "";
  const products = getProductsByBrand(brandName);
  const metadata = brandMetadata[brandName];

  if (!brandName || !metadata) {
    return (
      <div className="min-h-screen bg-background" dir={direction}>
        <Header />
        <main className="pt-20 text-center">
          <h1 className="text-2xl font-light">{t("brandNotFound")}</h1>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />
      
      <main className="pt-6 md:pt-10">
        {/* Brand Hero */}
        <section className={`px-4 md:px-6 mb-10 md:mb-16`}>
          <div className={`bg-gradient-to-br ${metadata.accentColor} py-12 md:py-20 relative overflow-hidden`}>
            {/* Decorative elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 border border-foreground/20 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 border border-foreground/20 rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            
            <div className="text-center relative z-10">
              <span className="text-6xl md:text-8xl font-extralight tracking-[0.3em] text-foreground/60 mb-6 block">
                {metadata.initials}
              </span>
              <h1 className="text-2xl md:text-4xl font-light text-foreground mb-4">
                {t(metadata.nameKey as any)}
              </h1>
              <p className="text-sm md:text-base font-light text-foreground/70 max-w-2xl mx-auto px-4">
                {t(metadata.descriptionKey as any)}
              </p>
              <p className="text-sm text-foreground/50 mt-4">
                {products.length} {t("products")}
              </p>
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="w-full px-6 mb-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
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
                {/* Favorite Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(product.id);
                  }}
                  aria-label={isFavorite(product.id) ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
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
        </section>

        {/* Back to Brands */}
        <section className="px-4 md:px-6 mb-16 text-center">
          <Link 
            to="/brands"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            {t("shopByBrand")}
          </Link>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default BrandDetail;
