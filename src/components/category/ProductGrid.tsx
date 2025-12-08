import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import Pagination from "./Pagination";
import { allProducts } from "@/data/products";
import organicEarring from "@/assets/organic-earring.png";
import linkBracelet from "@/assets/link-bracelet.png";

const ProductGrid = () => {
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();

  return (
    <section className="w-full px-6 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {allProducts.map((product) => (
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