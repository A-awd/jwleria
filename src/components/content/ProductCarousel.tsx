import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFeaturedProducts } from "@/hooks/useShopifyProducts";
import { Loader2 } from "lucide-react";
import organicEarring from "@/assets/organic-earring.png";
import linkBracelet from "@/assets/link-bracelet.png";

const ProductCarousel = () => {
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();
  const { data, isLoading } = useFeaturedProducts(12);
  const products = data?.products || [];

  const getCategoryName = (categoryKey: string) => {
    return t(categoryKey as any);
  };

  if (isLoading) {
    return (
      <section className="w-full mb-6 md:mb-10 px-4 md:px-6 flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-foreground/50" />
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="w-full mb-6 md:mb-10 px-4 md:px-6">
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
                 <Link to={`/product/${product.handle || product.id}`}>
                  <Card className="border-none shadow-none bg-transparent group">
                    <CardContent className="p-0 transition-transform duration-300 group-hover:-translate-y-1">
                      <div className="aspect-square mb-2 md:mb-3 overflow-hidden bg-muted/10 relative">
                        <img
                          src={product.images[0] || '/placeholder.svg'}
                          alt={product.name}
                          className="w-full h-full object-cover transition-all duration-500 group-hover:opacity-0 group-hover:scale-105"
                        />
                        <img
                          src={product.categoryKey === "earrings" ? organicEarring : linkBracelet}
                          alt={`${product.name} lifestyle`}
                          className="absolute inset-0 w-full h-full object-cover transition-all duration-500 opacity-0 group-hover:opacity-100 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.03] transition-colors duration-300"></div>
                      </div>
                     <div className="space-y-0.5 md:space-y-1">
                       {/* Brand name - prominent display */}
                       <p className="text-[10px] md:text-xs font-medium text-foreground/60 uppercase tracking-wide group-hover:text-foreground/80 transition-colors duration-300">
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
                           {convertPrice(product.price)}
                         </p>
                       </div>
                       {/* Availability indicator */}
                       {(product.isReadyToShip || product.isAvailable) && (
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
