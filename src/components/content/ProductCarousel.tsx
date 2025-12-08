import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { getFeaturedProducts } from "@/data/products";
import organicEarring from "@/assets/organic-earring.png";
import linkBracelet from "@/assets/link-bracelet.png";

const ProductCarousel = () => {
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();
  
  // Get featured products from all brands
  const products = getFeaturedProducts(12);

  const getCategoryName = (categoryKey: string) => {
    return t(categoryKey as any);
  };

  return (
    <section className="w-full mb-10 md:mb-16 px-4 md:px-6">
      <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="">
            {products.map((product) => (
               <CarouselItem
                 key={product.id}
                 className="basis-[45%] md:basis-1/3 lg:basis-1/4 pr-2 md:pr-4"
               >
                 <Link to={`/product/${product.id}`}>
                  <Card className="border-none shadow-none bg-transparent group">
                    <CardContent className="p-0">
                      <div className="aspect-square mb-2 md:mb-3 overflow-hidden bg-muted/10 relative">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover transition-all duration-300 group-hover:opacity-0"
                        />
                        <img
                          src={product.categoryKey === "earrings" ? organicEarring : linkBracelet}
                          alt={`${product.name} lifestyle`}
                          className="absolute inset-0 w-full h-full object-cover transition-all duration-300 opacity-0 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-black/[0.03]"></div>
                        {product.isNew && (
                          <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs font-medium text-black">
                            {t("newLabel")}
                          </div>
                        )}
                      </div>
                     <div className="space-y-0.5 md:space-y-1">
                       {/* Brand name - prominent display */}
                       <p className="text-[10px] md:text-xs font-medium text-foreground/60 uppercase tracking-wide">
                         {product.brand}
                       </p>
                       <h3 className="text-xs md:text-sm font-medium text-foreground">
                         {product.name}
                       </h3>
                       <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-0.5">
                         <p className="text-[10px] md:text-xs font-light text-foreground/50">
                           {getCategoryName(product.categoryKey)}
                         </p>
                         <p className="text-xs md:text-sm font-light text-foreground">
                           {convertPrice(product.priceEUR)}
                         </p>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
                 </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
    </section>
  );
};

export default ProductCarousel;