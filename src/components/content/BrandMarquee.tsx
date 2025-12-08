import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { luxuryBrands } from "@/data/products";

const BrandMarquee = () => {
  const { t } = useLanguage();

  // Create brand handle from name
  const getBrandHandle = (brand: string) => {
    return brand.toLowerCase().replace(/[&\s]+/g, "-").replace(/\./g, "");
  };

  // Double the brands array for seamless infinite loop
  const duplicatedBrands = [...luxuryBrands, ...luxuryBrands];

  return (
    <section className="w-full py-12 md:py-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 mb-8">
        <h2 className="text-xs md:text-sm font-light text-foreground/60 uppercase tracking-widest text-center">
          {t("shopByBrand")}
        </h2>
      </div>

      {/* Marquee Container */}
      <div className="relative">
        <div className="flex animate-marquee hover:pause-animation">
          {duplicatedBrands.map((brand, index) => (
            <Link
              key={`${brand}-${index}`}
              to={`/brand/${getBrandHandle(brand)}`}
              className="flex-shrink-0 px-8 md:px-12 lg:px-16 group"
            >
              <span className="text-base md:text-lg lg:text-xl font-light text-foreground/30 hover:text-foreground/70 transition-colors duration-300 whitespace-nowrap tracking-wide">
                {brand}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandMarquee;
