import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useCurrency } from "@/i18n/CurrencyContext";
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
  category: string;
  priceEUR: number;
  image: string;
  isNew?: boolean;
}

// Extended product list for category page
const products: Product[] = [
  {
    id: 1,
    name: "Pantheon",
    category: "Earrings",
    priceEUR: 2850,
    image: pantheonImage,
    isNew: true,
  },
  {
    id: 2,
    name: "Eclipse",
    category: "Bracelets",
    priceEUR: 3200,
    image: eclipseImage,
  },
  {
    id: 3,
    name: "Halo",
    category: "Earrings",
    priceEUR: 1950,
    image: haloImage,
    isNew: true,
  },
  {
    id: 4,
    name: "Oblique",
    category: "Earrings",
    priceEUR: 1650,
    image: obliqueImage,
  },
  {
    id: 5,
    name: "Lintel",
    category: "Earrings",
    priceEUR: 2250,
    image: lintelImage,
  },
  {
    id: 6,
    name: "Shadowline",
    category: "Bracelets",
    priceEUR: 3950,
    image: shadowlineImage,
  },
  {
    id: 7,
    name: "Meridian",
    category: "Earrings",
    priceEUR: 2450,
    image: pantheonImage,
  },
  {
    id: 8,
    name: "Vertex",
    category: "Bracelets",
    priceEUR: 2800,
    image: eclipseImage,
  },
  {
    id: 9,
    name: "Apex",
    category: "Earrings",
    priceEUR: 1550,
    image: haloImage,
  },
  {
    id: 10,
    name: "Zenith",
    category: "Earrings",
    priceEUR: 1850,
    image: obliqueImage,
  },
  {
    id: 11,
    name: "Prism",
    category: "Earrings",
    priceEUR: 2050,
    image: lintelImage,
  },
  {
    id: 12,
    name: "Radiant",
    category: "Bracelets",
    priceEUR: 3650,
    image: shadowlineImage,
  },
  {
    id: 13,
    name: "Stellar",
    category: "Earrings",
    priceEUR: 2150,
    image: pantheonImage,
  },
  {
    id: 14,
    name: "Cosmos",
    category: "Bracelets",
    priceEUR: 2950,
    image: eclipseImage,
  },
  {
    id: 15,
    name: "Aurora",
    category: "Earrings",
    priceEUR: 1750,
    image: haloImage,
  },
  {
    id: 16,
    name: "Nebula",
    category: "Earrings",
    priceEUR: 1850,
    image: obliqueImage,
  },
  {
    id: 17,
    name: "Orbit",
    category: "Earrings",
    priceEUR: 2350,
    image: lintelImage,
  },
  {
    id: 18,
    name: "Galaxy",
    category: "Bracelets",
    priceEUR: 3450,
    image: shadowlineImage,
  },
  {
    id: 19,
    name: "Lunar",
    category: "Earrings",
    priceEUR: 2050,
    image: pantheonImage,
  },
  {
    id: 20,
    name: "Solar",
    category: "Bracelets",
    priceEUR: 3150,
    image: eclipseImage,
  },
  {
    id: 21,
    name: "Astral",
    category: "Earrings",
    priceEUR: 1650,
    image: haloImage,
  },
  {
    id: 22,
    name: "Cosmic",
    category: "Earrings",
    priceEUR: 1950,
    image: obliqueImage,
  },
  {
    id: 23,
    name: "Celestial",
    category: "Earrings",
    priceEUR: 2250,
    image: lintelImage,
  },
  {
    id: 24,
    name: "Ethereal",
    category: "Bracelets",
    priceEUR: 3750,
    image: shadowlineImage,
  },
];

const ProductGrid = () => {
  const { convertPrice } = useCurrency();

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
                        NEW
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-light text-foreground">
                      {product.category}
                    </p>
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-foreground">
                        {product.name}
                      </h3>
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
