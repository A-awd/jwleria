import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

interface Brand {
  id: string;
  name: string;
  description: string;
  country: string;
  founded: string;
  specialty: string;
  productCount: number;
}

const brands: Brand[] = [
  {
    id: "cartier",
    name: "Cartier",
    description: "The legendary French maison known for timeless elegance and iconic designs like the Love Bracelet and Panthère collection.",
    country: "France",
    founded: "1847",
    specialty: "Fine Jewelry & Watches",
    productCount: 156,
  },
  {
    id: "bulgari",
    name: "Bulgari",
    description: "Italian luxury house celebrated for bold Roman-inspired designs and the iconic Serpenti collection.",
    country: "Italy",
    founded: "1884",
    specialty: "Jewelry & Accessories",
    productCount: 142,
  },
  {
    id: "van-cleef-arpels",
    name: "Van Cleef & Arpels",
    description: "Parisian high jewelry maison renowned for poetic creations and the beloved Alhambra motif.",
    country: "France",
    founded: "1906",
    specialty: "High Jewelry",
    productCount: 98,
  },
  {
    id: "tiffany",
    name: "Tiffany & Co.",
    description: "American luxury jeweler famous for the iconic Tiffany Blue and timeless designs since 1837.",
    country: "USA",
    founded: "1837",
    specialty: "Jewelry & Diamonds",
    productCount: 234,
  },
  {
    id: "chopard",
    name: "Chopard",
    description: "Swiss luxury brand known for Happy Diamonds and exceptional watchmaking craftsmanship.",
    country: "Switzerland",
    founded: "1860",
    specialty: "Jewelry & Watches",
    productCount: 87,
  },
  {
    id: "graff",
    name: "Graff",
    description: "British jeweler renowned for acquiring and crafting the world's most exceptional diamonds.",
    country: "UK",
    founded: "1960",
    specialty: "Rare Diamonds",
    productCount: 45,
  },
  {
    id: "harry-winston",
    name: "Harry Winston",
    description: "The 'King of Diamonds' known for acquiring legendary gems and adorning Hollywood royalty.",
    country: "USA",
    founded: "1932",
    specialty: "High Jewelry & Diamonds",
    productCount: 62,
  },
  {
    id: "piaget",
    name: "Piaget",
    description: "Swiss maison celebrated for ultra-thin watches and colorful high jewelry masterpieces.",
    country: "Switzerland",
    founded: "1874",
    specialty: "Watches & Jewelry",
    productCount: 78,
  },
  {
    id: "rolex",
    name: "Rolex",
    description: "The crown of Swiss watchmaking, synonymous with precision, prestige, and timeless design.",
    country: "Switzerland",
    founded: "1905",
    specialty: "Luxury Watches",
    productCount: 112,
  },
  {
    id: "patek-philippe",
    name: "Patek Philippe",
    description: "The pinnacle of haute horlogerie, creating the world's most coveted timepieces since 1839.",
    country: "Switzerland",
    founded: "1839",
    specialty: "Haute Horlogerie",
    productCount: 54,
  },
  {
    id: "boucheron",
    name: "Boucheron",
    description: "First jeweler to open on Place Vendôme, known for avant-garde designs and Serpent Bohème.",
    country: "France",
    founded: "1858",
    specialty: "High Jewelry",
    productCount: 67,
  },
  {
    id: "chaumet",
    name: "Chaumet",
    description: "Parisian jeweler to royalty, famous for exquisite tiaras and the Joséphine collection.",
    country: "France",
    founded: "1780",
    specialty: "Bridal & High Jewelry",
    productCount: 89,
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
                <div className="border border-border/50 p-6 md:p-8 hover:border-foreground/30 transition-all duration-300 h-full">
                  {/* Brand Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg md:text-xl font-medium text-foreground mb-1 group-hover:text-foreground/80 transition-colors">
                        {brand.name}
                      </h2>
                      <p className="text-xs text-foreground/50 uppercase tracking-wide">
                        {brand.country} · Est. {brand.founded}
                      </p>
                    </div>
                    <span className="text-xs text-foreground/40 font-light">
                      {brand.productCount} {t("products")}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm font-light text-foreground/70 leading-relaxed mb-4">
                    {brand.description}
                  </p>

                  {/* Specialty Tag */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/50 border border-border px-2 py-1">
                      {brand.specialty}
                    </span>
                    <span className="text-xs text-foreground group-hover:underline transition-all">
                      {t("shop")} →
                    </span>
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
