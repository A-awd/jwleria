import { useLanguage } from "@/i18n/LanguageContext";
import { luxuryBrands } from "@/data/products";

const BrandLogosStrip = () => {
  const { t } = useLanguage();

  // Display top 8 brands
  const displayBrands = luxuryBrands.slice(0, 8);

  return (
    <section className="w-full py-10 md:py-14 px-4 md:px-6 border-y border-border/20">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xs md:text-sm font-light text-foreground/60 uppercase tracking-widest text-center mb-8 md:mb-10">
          {t("selectedBrands")}
        </h2>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16">
          {displayBrands.map((brand) => (
            <div
              key={brand}
              className="text-sm md:text-base lg:text-lg font-light text-foreground/40 hover:text-foreground/70 transition-colors duration-300 tracking-wide"
            >
              {brand}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandLogosStrip;
