import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import Pagination from "./Pagination";
import pantheonImage from "@/assets/pantheon.jpg";
import eclipseImage from "@/assets/eclipse.jpg";
import haloImage from "@/assets/halo.jpg";
import obliqueImage from "@/assets/oblique.jpg";
import lintelImage from "@/assets/lintel.jpg";
import shadowlineImage from "@/assets/shadowline.jpg";
import organicEarring from "@/assets/organic-earring.png";
import linkBracelet from "@/assets/link-bracelet.png";

interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  priceEUR: number;
  image: string;
  isNew?: boolean;
}

// Luxury brands for multi-brand personal shopper
const luxuryBrands = ["Cartier", "Bulgari", "Van Cleef & Arpels", "Tiffany & Co.", "Chopard", "Graff", "Harry Winston", "Piaget"];

// Extended product list for category page
const products: Product[] = [
  {
    id: 1,
    name: "Love Bracelet",
    brand: "Cartier",
    category: "Bracelets",
    priceEUR: 6850,
    image: pantheonImage,
    isNew: true,
  },
  {
    id: 2,
    name: "Serpenti Viper Ring",
    brand: "Bulgari",
    category: "Rings",
    priceEUR: 3200,
    image: eclipseImage,
  },
  {
    id: 3,
    name: "Alhambra Necklace",
    brand: "Van Cleef & Arpels",
    category: "Necklaces",
    priceEUR: 4950,
    image: haloImage,
    isNew: true,
  },
  {
    id: 4,
    name: "T Wire Bracelet",
    brand: "Tiffany & Co.",
    category: "Bracelets",
    priceEUR: 1650,
    image: obliqueImage,
  },
  {
    id: 5,
    name: "Happy Hearts Earrings",
    brand: "Chopard",
    category: "Earrings",
    priceEUR: 2250,
    image: lintelImage,
  },
  {
    id: 6,
    name: "Butterfly Ring",
    brand: "Graff",
    category: "Rings",
    priceEUR: 12950,
    image: shadowlineImage,
  },
  {
    id: 7,
    name: "Juste un Clou Ring",
    brand: "Cartier",
    category: "Rings",
    priceEUR: 2450,
    image: pantheonImage,
  },
  {
    id: 8,
    name: "B.zero1 Bracelet",
    brand: "Bulgari",
    category: "Bracelets",
    priceEUR: 2800,
    image: eclipseImage,
  },
  {
    id: 9,
    name: "Frivole Earrings",
    brand: "Van Cleef & Arpels",
    category: "Earrings",
    priceEUR: 5550,
    image: haloImage,
  },
  {
    id: 10,
    name: "Elsa Peretti Bean",
    brand: "Tiffany & Co.",
    category: "Necklaces",
    priceEUR: 1850,
    image: obliqueImage,
  },
  {
    id: 11,
    name: "Ice Cube Ring",
    brand: "Chopard",
    category: "Rings",
    priceEUR: 2050,
    image: lintelImage,
  },
  {
    id: 12,
    name: "Cluster Earrings",
    brand: "Harry Winston",
    category: "Earrings",
    priceEUR: 18650,
    image: shadowlineImage,
  },
  {
    id: 13,
    name: "Trinity Ring",
    brand: "Cartier",
    category: "Rings",
    priceEUR: 2150,
    image: pantheonImage,
  },
  {
    id: 14,
    name: "Divas' Dream",
    brand: "Bulgari",
    category: "Necklaces",
    priceEUR: 4950,
    image: eclipseImage,
  },
  {
    id: 15,
    name: "Perlée Bracelet",
    brand: "Van Cleef & Arpels",
    category: "Bracelets",
    priceEUR: 3750,
    image: haloImage,
  },
  {
    id: 16,
    name: "Return to Tiffany",
    brand: "Tiffany & Co.",
    category: "Necklaces",
    priceEUR: 850,
    image: obliqueImage,
  },
  {
    id: 17,
    name: "L'Heure du Diamant",
    brand: "Chopard",
    category: "Watches",
    priceEUR: 12350,
    image: lintelImage,
  },
  {
    id: 18,
    name: "Rose Ring",
    brand: "Piaget",
    category: "Rings",
    priceEUR: 3450,
    image: shadowlineImage,
  },
  {
    id: 19,
    name: "Panthère Ring",
    brand: "Cartier",
    category: "Rings",
    priceEUR: 8050,
    image: pantheonImage,
  },
  {
    id: 20,
    name: "Serpenti Bracelet",
    brand: "Bulgari",
    category: "Bracelets",
    priceEUR: 5150,
    image: eclipseImage,
  },
  {
    id: 21,
    name: "Magic Alhambra",
    brand: "Van Cleef & Arpels",
    category: "Earrings",
    priceEUR: 7650,
    image: haloImage,
  },
  {
    id: 22,
    name: "Bone Cuff",
    brand: "Tiffany & Co.",
    category: "Bracelets",
    priceEUR: 2950,
    image: obliqueImage,
  },
  {
    id: 23,
    name: "Possession Ring",
    brand: "Piaget",
    category: "Rings",
    priceEUR: 2250,
    image: lintelImage,
  },
  {
    id: 24,
    name: "Winston Cluster",
    brand: "Harry Winston",
    category: "Necklaces",
    priceEUR: 45750,
    image: shadowlineImage,
  },
];

const ProductGrid = () => {
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();

  return (
    <section className="w-full px-6 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <Link key={product.id} to={`/product/${product.id}`}>
              <Card 
                className="border-none shadow-none bg-transparent group cursor-pointer"
              >
                <CardContent className="p-0">
                  <div className="aspect-square mb-3 overflow-hidden bg-muted/10 relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-all duration-300 group-hover:opacity-0"
                    />
                    <img
                      src={product.category === "Earrings" ? organicEarring : linkBracelet}
                      alt={`${product.name} lifestyle`}
                      className="absolute inset-0 w-full h-full object-cover transition-all duration-300 opacity-0 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-black/[0.03]"></div>
                    {product.isNew && (
                      <div className="absolute top-2 left-2 px-2 py-1 text-xs font-medium text-black">
                        {t("newLabel")}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    {/* Brand name - prominent display */}
                    <p className="text-xs font-medium text-foreground/60 uppercase tracking-wide">
                      {product.brand}
                    </p>
                    <h3 className="text-sm font-medium text-foreground">
                      {product.name}
                    </h3>
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-light text-foreground/50">
                        {product.category}
                      </p>
                      <p className="text-sm font-light text-foreground">
                        {convertPrice(product.priceEUR)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      
      <Pagination />
    </section>
  );
};

export default ProductGrid;
