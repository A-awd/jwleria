import earringsCollection from "@/assets/earrings-collection.png";
import linkBracelet from "@/assets/link-bracelet.png";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const FiftyFiftySection = () => {
  const { t } = useLanguage();
  
  return (
    <section className="w-full mb-10 md:mb-16 px-4 md:px-6">
      <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-6">
        <div>
          <Link to="/category/earrings" className="block">
            <div className="w-full aspect-square mb-2 md:mb-3 overflow-hidden">
              <img 
                src={earringsCollection} 
                alt="Cartier Collection" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          </Link>
          <div className="">
            <h3 className="text-xs md:text-sm font-normal text-foreground mb-0.5 md:mb-1">
              {t("organicForms")}
            </h3>
            <p className="text-xs md:text-sm font-light text-foreground/70 line-clamp-2">
              {t("organicFormsDesc")}
            </p>
          </div>
        </div>

        <div>
          <Link to="/category/bracelets" className="block">
            <div className="w-full aspect-square mb-2 md:mb-3 overflow-hidden">
              <img 
                src={linkBracelet} 
                alt="Bulgari Serpenti" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          </Link>
          <div className="">
            <h3 className="text-xs md:text-sm font-normal text-foreground mb-0.5 md:mb-1">
              {t("chainCollection")}
            </h3>
            <p className="text-xs md:text-sm font-light text-foreground/70 line-clamp-2">
              {t("chainCollectionDesc")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FiftyFiftySection;
