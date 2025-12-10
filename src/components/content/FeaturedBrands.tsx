import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { ArrowRight } from "lucide-react";

const FeaturedBrands = () => {
  const { t, direction } = useLanguage();

  const brands = [
    { slug: "cartier", name: "Cartier", country: "France" },
    { slug: "bulgari", name: "Bulgari", country: "Italy" },
    { slug: "van-cleef-arpels", name: "Van Cleef & Arpels", country: "France" },
    { slug: "tiffany", name: "Tiffany & Co.", country: "USA" },
    { slug: "chopard", name: "Chopard", country: "Switzerland" },
    { slug: "rolex", name: "Rolex", country: "Switzerland" },
  ];

  return (
    <section className="w-full py-12 md:py-20 px-4 md:px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 md:mb-12">
          <div>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-foreground/50 mb-2">
              {t("curatedLuxury")}
            </p>
            <h2 className="text-xl md:text-3xl font-light text-foreground">
              {t("featuredBrands")}
            </h2>
          </div>
          <Link
            to="/brands"
            className="hidden md:inline-flex items-center gap-2 text-xs font-light text-foreground/70 hover:text-foreground transition-colors mt-4 md:mt-0"
          >
            {t("viewAllBrands")}
            <ArrowRight size={12} className={direction === 'rtl' ? 'rotate-180' : ''} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              to={`/brand/${brand.slug}`}
              className="group"
            >
              <div className="aspect-square border border-border/50 hover:border-foreground/30 flex flex-col items-center justify-center p-4 md:p-6 transition-all duration-300 bg-background">
                {/* Brand initial */}
                <span className="text-2xl md:text-3xl font-extralight tracking-widest text-foreground/70 group-hover:text-foreground transition-colors duration-300 mb-2">
                  {brand.name.charAt(0)}
                </span>
                <h3 className="text-[10px] md:text-xs font-medium text-foreground text-center tracking-wide">
                  {brand.name}
                </h3>
                <p className="text-[9px] md:text-[10px] text-foreground/40 uppercase tracking-wide mt-1">
                  {brand.country}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex justify-center mt-8 md:hidden">
          <Link
            to="/brands"
            className="inline-flex items-center gap-2 text-xs font-light text-foreground/70 hover:text-foreground transition-colors"
          >
            {t("viewAllBrands")}
            <ArrowRight size={12} className={direction === 'rtl' ? 'rotate-180' : ''} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedBrands;
