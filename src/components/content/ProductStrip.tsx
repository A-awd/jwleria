import { Link } from "react-router-dom";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Product } from "@/data/products";
import { Button } from "@/components/ui/button";

interface ProductStripProps {
  title: string;
  titleAr?: string;
  products: Product[];
}

const ProductStrip = ({ title, titleAr, products }: ProductStripProps) => {
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();

  return (
    <section className="w-full py-10 md:py-14 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="mb-6 md:mb-8">
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
              to={`/product/${product.id}`}
              className="group"
            >
              <div className="space-y-2 md:space-y-3">
                {/* Image */}
                <div className="aspect-square overflow-hidden bg-muted/10 relative">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/[0.02] group-hover:bg-black/[0.05] transition-colors" />
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <p className="text-[10px] md:text-xs font-medium text-foreground/50 uppercase tracking-wide">
                    {product.brand}
                  </p>
                  <h3 className="text-xs md:text-sm font-medium text-foreground line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-xs md:text-sm font-light text-foreground/80">
                    {convertPrice(product.priceEUR)}
                  </p>
                </div>

                {/* Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8 md:h-9 border-foreground/20 hover:bg-foreground hover:text-background transition-colors"
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
