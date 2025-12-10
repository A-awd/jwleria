import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { luxuryBrands } from "@/data/products";

const BrandMarquee = () => {
  const { t } = useLanguage();

  const getBrandHandle = (brand: string) => {
    return brand.toLowerCase().replace(/[&\s]+/g, "-").replace(/\./g, "");
  };

  // Shuffle brands randomly and repeat for seamless loop
  const repeatedBrands = useMemo(() => {
    const shuffled = [...luxuryBrands].sort(() => Math.random() - 0.5);
    return [...shuffled, ...shuffled, ...shuffled, ...shuffled,
            ...shuffled, ...shuffled, ...shuffled, ...shuffled];
  }, []);

  // Pause animation when a link is focused for keyboard navigation
  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    e.currentTarget.style.animationPlayState = 'paused';
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    e.currentTarget.style.animationPlayState = 'running';
  };

  return (
    <section className="w-full py-6 md:py-8 overflow-hidden" aria-label={t("shopByBrand")}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 mb-6">
        <h2 className="text-xs md:text-sm font-light text-foreground/60 uppercase tracking-widest text-center">
          {t("shopByBrand")}
        </h2>
      </div>

      <div className="relative overflow-hidden group" role="region" aria-label="Brand carousel">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        <div 
          className="flex items-center animate-marquee-slow group-hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]"
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          {repeatedBrands.map((brand, index) => (
            <Link
              key={`brand-${index}`}
              to={`/brand/${getBrandHandle(brand)}`}
              className="flex-shrink-0 px-6 md:px-10 lg:px-14 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:ring-offset-2 rounded"
              aria-label={`Shop ${brand} products`}
            >
              <span className="text-sm md:text-base lg:text-lg font-light text-foreground/60 hover:text-foreground transition-colors duration-300 whitespace-nowrap tracking-wide">
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
