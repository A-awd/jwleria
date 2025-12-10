import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import earringsCollection from "@/assets/earrings-collection.png";
import linkBracelet from "@/assets/link-bracelet.png";
import ringsCollection from "@/assets/rings-collection.png";

const CategoryShowcase = () => {
  const { t, direction } = useLanguage();

  const categories = [
    {
      key: "rings",
      image: ringsCollection,
      label: t("rings"),
    },
    {
      key: "necklaces",
      image: earringsCollection,
      label: t("necklaces"),
    },
    {
      key: "bracelets",
      image: linkBracelet,
      label: t("bracelets"),
    },
    {
      key: "earrings",
      image: earringsCollection,
      label: t("earrings"),
    },
    {
      key: "watches",
      image: linkBracelet,
      label: t("watches"),
    },
  ];

  return (
    <section className="w-full py-10 md:py-16 px-4 md:px-6">
      <div className="text-center mb-8 md:mb-12">
        <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-foreground/50 mb-2">
          {t("discoverOurCollection")}
        </p>
        <h2 className="text-xl md:text-3xl font-light text-foreground">
          {t("shopByCategory")}
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {categories.map((category, index) => (
          <Link
            key={category.key}
            to={`/category/${category.key}`}
            className={`group relative overflow-hidden ${
              index === 0 ? 'col-span-2 md:col-span-1' : ''
            }`}
          >
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src={category.image}
                alt={category.label}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-end p-4 md:p-6">
                <h3 className="text-sm md:text-base font-light text-white tracking-wide text-center">
                  {category.label}
                </h3>
                <div className="h-px w-8 bg-white/50 mt-2 group-hover:w-12 transition-all duration-300" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryShowcase;
