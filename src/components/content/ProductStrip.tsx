import { Link } from "react-router-dom";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { ProductData } from "@/types/shopify";
import { Button } from "@/components/ui/button";

interface ProductStripProps {
  title: string;
  titleAr?: string;
  products: ProductData[];
}

const ProductStrip = ({ title, titleAr, products }: ProductStripProps) => {
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-6 md:py-10 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="mb-4 md:mb-6">
          <h2 className="text-base md:text-lg font-medium text-foreground tracking-wide">
            {title}
          </h2>
          {titleAr && (
            <p className="text-xs md:text-sm font-light text-foreground/50 mt-1" dir="rtl">
              {titleAr}
            </p>
          )}
        </div>

        {/* Product Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.slice(0, 4).map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.handle || product.id}`}
              className="group"
            >
              <div className="space-y-2 md:space-y-3 transition-transform duration-300 group-hover:-translate-y-1">
                {/* Image */}
                <div className="aspect-square overflow-hidden bg-muted/10 relative">
                  <img
                    src={product.images[0] || '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.03] transition-colors duration-300" />
                </div>

                {/* Info */}
                <div className="space-y-1 transition-opacity duration-300">
                  <p className="text-[10px] md:text-xs font-medium text-foreground/50 uppercase tracking-wide group-hover:text-foreground/70 transition-colors duration-300">
                    {product.brand}
                  </p>
                  <h3 className="text-xs md:text-sm font-medium text-foreground line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-xs md:text-sm font-light text-foreground/80">
                    {convertPrice(product.price)}
                  </p>
                  {/* Availability indicator */}
                  {(product.isReadyToShip || product.isPreOrder) && (
                    <div className="pt-0.5">
                      {product.isReadyToShip && (
                        <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-foreground/40 border-b border-transparent hover:border-foreground/30 hover:text-foreground/60 pb-0.5 transition-all duration-300 cursor-default">
                          {t("readyToShip")}
                        </span>
                      )}
                      {product.isPreOrder && (
                        <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-foreground/40 border-b border-transparent hover:border-foreground/30 hover:text-foreground/60 pb-0.5 transition-all duration-300 cursor-default">
                          {t("preOrder")}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8 md:h-9 border-foreground/20 hover:bg-foreground hover:text-background transition-all duration-300 group-hover:border-foreground/40"
                >
                  {t("viewDetails")}
                </Button>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductStrip;
