import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

interface Brand {
  id: string;
  nameKey: string;
  initials: string;
  descriptionKey: string;
  countryKey: string;
  founded: string;
  specialtyKey: string;
  productCount: number;
  accentColor: string;
}

const brands: Brand[] = [
  {
    id: "cartier",
    nameKey: "brandCartier",
    initials: "C",
    descriptionKey: "brandCartierDesc",
    countryKey: "countryFrance",
    founded: "1847",
    specialtyKey: "specialtyFineJewelryWatches",
    productCount: 156,
    accentColor: "from-red-900/20 to-red-800/10",
  },
  {
    id: "bulgari",
    nameKey: "brandBulgari",
    initials: "B",
    descriptionKey: "brandBulgariDesc",
    countryKey: "countryItaly",
    founded: "1884",
    specialtyKey: "specialtyJewelryAccessories",
    productCount: 142,
    accentColor: "from-amber-900/20 to-amber-800/10",
  },
  {
    id: "van-cleef-arpels",
    nameKey: "brandVanCleef",
    initials: "VCA",
    descriptionKey: "brandVanCleefDesc",
    countryKey: "countryFrance",
    founded: "1906",
    specialtyKey: "specialtyHighJewelry",
    productCount: 98,
    accentColor: "from-emerald-900/20 to-emerald-800/10",
  },
  {
    id: "tiffany",
    nameKey: "brandTiffany",
    initials: "T",
    descriptionKey: "brandTiffanyDesc",
    countryKey: "countryUSA",
    founded: "1837",
    specialtyKey: "specialtyJewelryDiamonds",
    productCount: 234,
    accentColor: "from-cyan-700/20 to-cyan-600/10",
  },
  {
    id: "chopard",
    nameKey: "brandChopard",
    initials: "CH",
    descriptionKey: "brandChopardDesc",
    countryKey: "countrySwitzerland",
    founded: "1860",
    specialtyKey: "specialtyJewelryWatches",
    productCount: 87,
    accentColor: "from-rose-900/20 to-rose-800/10",
  },
  {
    id: "graff",
    nameKey: "brandGraff",
    initials: "G",
    descriptionKey: "brandGraffDesc",
    countryKey: "countryUK",
    founded: "1960",
    specialtyKey: "specialtyRareDiamonds",
    productCount: 45,
    accentColor: "from-slate-800/20 to-slate-700/10",
  },
  {
    id: "harry-winston",
    nameKey: "brandHarryWinston",
    initials: "HW",
    descriptionKey: "brandHarryWinstonDesc",
    countryKey: "countryUSA",
    founded: "1932",
    specialtyKey: "specialtyHighJewelryDiamonds",
    productCount: 62,
    accentColor: "from-blue-900/20 to-blue-800/10",
  },
  {
    id: "piaget",
    nameKey: "brandPiaget",
    initials: "P",
    descriptionKey: "brandPiagetDesc",
    countryKey: "countrySwitzerland",
    founded: "1874",
    specialtyKey: "specialtyWatchesJewelry",
    productCount: 78,
    accentColor: "from-violet-900/20 to-violet-800/10",
  },
  {
    id: "rolex",
    nameKey: "brandRolex",
    initials: "R",
    descriptionKey: "brandRolexDesc",
    countryKey: "countrySwitzerland",
    founded: "1905",
    specialtyKey: "specialtyLuxuryWatches",
    productCount: 112,
    accentColor: "from-green-900/20 to-green-800/10",
  },
  {
    id: "patek-philippe",
    nameKey: "brandPatekPhilippe",
    initials: "PP",
    descriptionKey: "brandPatekPhilippeDesc",
    countryKey: "countrySwitzerland",
    founded: "1839",
    specialtyKey: "specialtyHauteHorlogerie",
    productCount: 54,
    accentColor: "from-amber-800/20 to-amber-700/10",
  },
  {
    id: "boucheron",
    nameKey: "brandBoucheron",
    initials: "BO",
    descriptionKey: "brandBoucheronDesc",
    countryKey: "countryFrance",
    founded: "1858",
    specialtyKey: "specialtyHighJewelry",
    productCount: 67,
    accentColor: "from-indigo-900/20 to-indigo-800/10",
  },
  {
    id: "chaumet",
    nameKey: "brandChaumet",
    initials: "CM",
    descriptionKey: "brandChaumetDesc",
    countryKey: "countryFrance",
    founded: "1780",
    specialtyKey: "specialtyBridalHighJewelry",
    productCount: 89,
    accentColor: "from-pink-900/20 to-pink-800/10",
  },
];

const ShopByBrand = () => {
  const { t, direction } = useLanguage();

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />
      
      <main className="pt-6 md:pt-10">
        {/* Hero Section */}
        <section className="px-4 md:px-6 mb-10 md:mb-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-2xl md:text-4xl font-light text-foreground mb-4">
              {t("shopByBrand")}
            </h1>
            <p className="text-sm md:text-base font-light text-foreground/70 leading-relaxed">
              {t("conciergeDescription")}
            </p>
          </div>
        </section>

        {/* Brands Grid */}
        <section className="px-4 md:px-6 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                to={`/category/brand/${brand.id}`}
                className="group block"
              >
                <div className="border border-border/50 hover:border-foreground/30 transition-all duration-300 h-full overflow-hidden">
                  {/* Brand Logo/Image Area */}
                  <div className={`aspect-[16/9] bg-gradient-to-br ${brand.accentColor} flex items-center justify-center relative overflow-hidden`}>
                    {/* Decorative elements */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 right-0 w-32 h-32 border border-foreground/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 border border-foreground/20 rounded-full translate-y-1/2 -translate-x-1/2" />
                    </div>
                    
                    {/* Brand Initials */}
                    <span className="text-4xl md:text-5xl font-extralight tracking-[0.3em] text-foreground/80 group-hover:scale-110 transition-transform duration-500">
                      {brand.initials}
                    </span>
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Brand Info */}
                  <div className="p-5 md:p-6">
                    {/* Brand Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h2 className="text-base md:text-lg font-medium text-foreground mb-0.5 group-hover:text-foreground/80 transition-colors">
                          {t(brand.nameKey as any)}
                        </h2>
                        <p className="text-[10px] text-foreground/50 uppercase tracking-wider">
                          {t(brand.countryKey as any)} · {t("established")} {brand.founded}
                        </p>
                      </div>
                      <span className="text-[10px] text-foreground/40 font-light whitespace-nowrap">
                        {brand.productCount} {t("products")}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs font-light text-foreground/60 leading-relaxed mb-4 line-clamp-2">
                      {t(brand.descriptionKey as any)}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                      <span className="text-[10px] text-foreground/50 uppercase tracking-wide">
                        {t(brand.specialtyKey as any)}
                      </span>
                      <span className="text-xs text-foreground group-hover:translate-x-1 transition-transform duration-300 flex items-center gap-1">
                        {t("shop")} 
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 md:px-6 mb-16">
          <div className="bg-muted/20 p-8 md:p-12 text-center">
            <h3 className="text-lg md:text-xl font-light text-foreground mb-3">
              {t("whyChooseUs")}
            </h3>
            <p className="text-sm font-light text-foreground/70 max-w-2xl mx-auto mb-6">
              {t("conciergeDescription")}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-light text-foreground mb-1">12+</p>
                <p className="text-xs text-foreground/60">{t("luxuryBrands")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-light text-foreground mb-1">1,200+</p>
                <p className="text-xs text-foreground/60">{t("products")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-light text-foreground mb-1">100%</p>
                <p className="text-xs text-foreground/60">{t("authenticityGuarantee")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-light text-foreground mb-1">24/7</p>
                <p className="text-xs text-foreground/60">{t("conciergeService")}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default ShopByBrand;