import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { luxuryBrands } from "@/data/products";

const BrandMarquee = () => {
  const { t } = useLanguage();

  const getBrandHandle = (brand: string) => {
    return brand.toLowerCase().replace(/[&\s]+/g, "-").replace(/\./g, "");
  };

  return (
    <section className="w-full py-6 md:py-8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 mb-6">
        <h2 className="text-xs md:text-sm font-light text-foreground/60 uppercase tracking-widest text-center">
          {t("shopByBrand")}
        </h2>
      </div>

      <div className="relative overflow-hidden group">
        {/* Scrolling container with duplicated content */}
        <div className="flex items-center animate-marquee group-hover:[animation-play-state:paused]">
          {luxuryBrands.map((brand, index) => (
            <Link
              key={`brand-a-${index}`}
              to={`/brand/${getBrandHandle(brand)}`}
              className="flex-shrink-0 px-6 md:px-10 lg:px-14"
            >
              <span className="text-sm md:text-base lg:text-lg font-light text-foreground/30 hover:text-foreground/70 transition-colors duration-300 whitespace-nowrap tracking-wide">
                {brand}
              </span>
            </Link>
          ))}
          {/* Duplicate for seamless loop */}
          {luxuryBrands.map((brand, index) => (
            <Link
              key={`brand-b-${index}`}
              to={`/brand/${getBrandHandle(brand)}`}
              className="flex-shrink-0 px-6 md:px-10 lg:px-14"
            >
              <span className="text-sm md:text-base lg:text-lg font-light text-foreground/30 hover:text-foreground/70 transition-colors duration-300 whitespace-nowrap tracking-wide">
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
