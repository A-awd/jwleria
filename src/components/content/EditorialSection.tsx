import founders from "@/assets/founders.png";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const EditorialSection = () => {
  const { t, direction } = useLanguage();
  
  return (
    <section className="w-full mb-10 md:mb-16 px-4 md:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-center">
        <div className="space-y-3 md:space-y-4 max-w-[630px] order-last md:order-first">
          <h2 className="text-lg md:text-2xl font-normal text-foreground leading-tight">
            {t("jewelryDrawnFrom")}
          </h2>
          <p className="text-xs md:text-sm font-light text-foreground/80 leading-relaxed">
            {t("lineaStoryDesc")}
          </p>
          <Link to="/about/our-story" className="inline-flex items-center gap-1 text-xs md:text-sm font-light text-foreground hover:text-foreground/80 transition-colors duration-200">
            <span>{t("readFullStory")}</span>
            <ArrowRight size={12} className={direction === 'rtl' ? 'rotate-180' : ''} />
          </Link>
        </div>
        
        <div className="order-first md:order-last">
          <div className="w-full aspect-[4/3] md:aspect-square overflow-hidden">
            <img src={founders} alt="Linea founders - two women in minimalist jewelry" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default EditorialSection;
