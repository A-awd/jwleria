import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { Heart, MessageCircle } from "lucide-react";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { toast } from "@/hooks/use-toast";
import { getWhatsAppLink, STORE_CONFIG } from "@/config/store";

interface ProductInfoProps {
  product: {
    id: string | number;
    name: string;
    brand: string;
    price: number;
    compareAtPrice?: number;
    categoryKey: string;
    material?: string;
    dimensions?: string;
    weight?: string;
    editorsNotes?: string;
    leadTime?: string;
    isPreOrder?: boolean;
    isLimitedEdition?: boolean;
  };
  showBreadcrumb?: boolean;
}

const ProductInfoNew = ({ product, showBreadcrumb = true }: ProductInfoProps) => {
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
  
  // Convert string ID to number for legacy favorites compatibility
  const numericId = typeof product.id === 'string' ? parseInt(product.id, 10) || 0 : product.id;
  const productIsFavorite = isFavorite(numericId);

  const handleWhatsAppClick = () => {
    const whatsappLink = getWhatsAppLink(product.brand, product.name, product.id);
    window.open(whatsappLink, '_blank');
  };

  const handleToggleFavorite = () => {
    if (productIsFavorite) {
      removeFromFavorites(numericId);
      toast({
        title: t("removedFromFav"),
        description: product.name,
      });
    } else {
      addToFavorites(numericId);
      toast({
        title: t("addedToFav"),
        description: product.name,
      });
    }
  };

  const getCategoryTranslation = (categoryKey: string) => {
    const categoryMap: Record<string, string> = {
      rings: t("rings"),
      necklaces: t("necklaces"),
      earrings: t("earrings"),
      bracelets: t("bracelets"),
      watches: t("watches"),
      bags: t("bags"),
      sunglasses: t("sunglasses"),
      brooches: t("brooches"),
    };
    return categoryMap[categoryKey] || categoryKey;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Breadcrumb - Desktop only */}
      {showBreadcrumb && (
        <div className="hidden lg:block">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">{t("home")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/category/${product.categoryKey}`}>
                    {getCategoryTranslation(product.categoryKey)}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{product.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}

      {/* Product title and price */}
      <div className="space-y-1 md:space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <Link 
              to={`/brand/${encodeURIComponent(product.brand)}`}
              className="text-xs md:text-sm font-light text-primary hover:underline mb-0.5 md:mb-1 block"
            >
              {product.brand}
            </Link>
            <p className="text-xs md:text-sm font-light text-muted-foreground mb-0.5 md:mb-1">
              {getCategoryTranslation(product.categoryKey)}
            </p>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-light text-foreground">
              {product.name}
            </h1>
          </div>
          <div className="text-right">
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <p className="text-sm font-light text-muted-foreground line-through">
                {convertPrice(product.compareAtPrice)}
              </p>
            )}
            <p className="text-lg md:text-xl font-light text-foreground">
              {convertPrice(product.price)}
            </p>
          </div>
        </div>
      </div>

      {/* Product details */}
      <div className="space-y-3 md:space-y-4 py-3 md:py-4 border-b border-border">
        {/* Pre-order Status - Always shown since all products are pre-order */}
        <div className="flex items-center gap-2 py-2 px-3 bg-amber-50 dark:bg-amber-950/30 rounded-sm">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-xs md:text-sm font-medium text-amber-700 dark:text-amber-400">
            {t("preOrder")}
            <span className="font-normal ml-1">— {t("usuallyShipsIn")} {product.leadTime || STORE_CONFIG.defaultLeadTime}</span>
          </span>
        </div>
        
        {product.isLimitedEdition && (
          <div className="flex items-center gap-2 py-2 px-3 bg-rose-50 dark:bg-rose-950/30 rounded-sm">
            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            <span className="text-xs md:text-sm font-medium text-rose-700 dark:text-rose-400">
              {t("limitedEdition")}
            </span>
          </div>
        )}
        
        {product.material && (
          <div className="space-y-1 md:space-y-2">
            <h3 className="text-xs md:text-sm font-light text-foreground">{t("material")}</h3>
            <p className="text-xs md:text-sm font-light text-muted-foreground">{product.material}</p>
          </div>
        )}
        
        {product.dimensions && (
          <div className="space-y-1 md:space-y-2">
            <h3 className="text-xs md:text-sm font-light text-foreground">{t("dimensions")}</h3>
            <p className="text-xs md:text-sm font-light text-muted-foreground">{product.dimensions}</p>
          </div>
        )}
        
        {product.weight && (
          <div className="space-y-1 md:space-y-2">
            <h3 className="text-xs md:text-sm font-light text-foreground">{t("weight")}</h3>
            <p className="text-xs md:text-sm font-light text-muted-foreground">{product.weight}</p>
          </div>
        )}
        
        {product.editorsNotes && (
          <div className="space-y-1 md:space-y-2">
            <h3 className="text-xs md:text-sm font-light text-foreground">{t("editorsNotes")}</h3>
            <p className="text-xs md:text-sm font-light text-muted-foreground italic">
              "{product.editorsNotes}"
            </p>
          </div>
        )}
      </div>

      {/* WhatsApp Contact and Favorites */}
      <div className="space-y-3 md:space-y-4">
        <div className="flex gap-3">
          <Button 
            className="flex-1 h-11 md:h-12 bg-[#25D366] hover:bg-[#128C7E] text-white font-light rounded-none text-sm md:text-base"
            onClick={handleWhatsAppClick}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {t("orderOnWhatsApp")}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-11 md:h-12 w-11 md:w-12 rounded-none border-border"
            onClick={handleToggleFavorite}
          >
            <Heart 
              className={`h-5 w-5 ${productIsFavorite ? 'fill-red-500 text-red-500' : ''}`} 
            />
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          {t("whatsappOrderNote")}
        </p>
      </div>
    </div>
  );
};

export default ProductInfoNew;
