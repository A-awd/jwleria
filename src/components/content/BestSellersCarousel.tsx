import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { getBestSellers, Product } from "@/data/products";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

const BestSellersCarousel = () => {
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();
  const products = getBestSellers(8);
  const apiRef = useRef<CarouselApi>();

  // Auto-scroll effect
  useEffect(() => {
    if (!apiRef.current) return;

    const interval = setInterval(() => {
      if (apiRef.current?.canScrollNext()) {
        apiRef.current.scrollNext();
      } else {
        apiRef.current?.scrollTo(0);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="w-full py-12 md:py-16 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="mb-8 md:mb-10">
          <h2 className="text-lg md:text-xl font-medium text-foreground tracking-wide">
            {t("bestSellers")}
          </h2>
          <p className="text-xs md:text-sm font-light text-foreground/50 mt-1" dir="rtl">
            {t("bestSellersAr")}
          </p>
        </div>

        {/* Carousel */}
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          setApi={(api) => {
            apiRef.current = api;
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-3 md:-ml-4">
            {products.map((product) => (
              <CarouselItem
                key={product.id}
                className="pl-3 md:pl-4 basis-[48%] md:basis-1/3 lg:basis-1/4"
              >
                <ProductCard product={product} convertPrice={convertPrice} t={t} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
};

interface ProductCardProps {
  product: Product;
  convertPrice: (price: number) => string;
  t: (key: any) => string;
}

const ProductCard = ({ product, convertPrice, t }: ProductCardProps) => {
  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="space-y-2 md:space-y-3 transition-transform duration-300 group-hover:-translate-y-1">
        {/* Image */}
        <div className="aspect-square overflow-hidden bg-muted/5 relative">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.02] transition-colors duration-300" />
        </div>

        {/* Info */}
        <div className="space-y-1">
          <p className="text-[10px] md:text-xs font-medium text-foreground/50 uppercase tracking-wide group-hover:text-foreground/70 transition-colors">
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
          className="w-full text-[10px] md:text-xs h-7 md:h-8 border-foreground/15 hover:bg-foreground hover:text-background transition-all duration-300 group-hover:border-foreground/30"
        >
          {t("viewDetails")}
        </Button>
      </div>
    </Link>
  );
};

export default BestSellersCarousel;
