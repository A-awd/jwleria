import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-image.png";

const HeroSection = () => {
  const { t, direction } = useLanguage();

  return (
    <section className="w-full mb-6 md:mb-12">
      {/* Full-width hero with overlay text */}
      <div className="relative w-full h-[65vh] sm:h-[70vh] md:h-[85vh] overflow-hidden">
        <img
          src={heroImage}
          alt="JWleria luxury jewelry collection"
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        {/* Hero content */}
        <div className="absolute inset-0 flex flex-col justify-end px-4 sm:px-6 md:px-12 pb-8 sm:pb-12 md:pb-20">
          <div className="max-w-2xl">
            <p className="text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/70 mb-2 sm:mb-3 md:mb-4">
              {t("luxuryPersonalShopper")}
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-light text-white leading-tight mb-3 sm:mb-4 md:mb-6">
              {t("heroTitle")}
            </h1>
            <p className="text-xs sm:text-sm md:text-base font-light text-white/80 mb-5 sm:mb-6 md:mb-8 max-w-lg leading-relaxed">
              {t("heroSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 md:gap-4">
              <Link
                to="/category/all"
                className="inline-flex items-center justify-center gap-2 bg-white text-foreground px-5 sm:px-6 md:px-8 py-3 md:py-4 text-xs md:text-sm font-medium uppercase tracking-wide hover:bg-white/90 transition-colors duration-300"
              >
                {t("shopCollection")}
                <ArrowRight size={14} className={direction === 'rtl' ? 'rotate-180' : ''} />
              </Link>
              <Link
                to="/brands"
                className="inline-flex items-center justify-center gap-2 border border-white/50 text-white px-5 sm:px-6 md:px-8 py-3 md:py-4 text-xs md:text-sm font-light uppercase tracking-wide hover:bg-white/10 transition-colors duration-300"
              >
                {t("exploreBrands")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
