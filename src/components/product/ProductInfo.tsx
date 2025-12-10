import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { Minus, Plus, Heart, Check } from "lucide-react";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { getProductById } from "@/data/products";
import { toast } from "@/hooks/use-toast";

const ProductInfo = () => {
  const { productId } = useParams();
  const [quantity, setQuantity] = useState(1);
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();
  const { addToCart, isInCart } = useCart();
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
  
  const product = getProductById(Number(productId));
  
  if (!product) {
    return <div className="p-4">{t("noProductsFound")}</div>;
  }

  const productInCart = isInCart(product.id);
  const productIsFavorite = isFavorite(product.id);

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  const handleAddToCart = () => {
    addToCart(product, quantity);
    toast({
      title: t("itemAdded"),
      description: `${product.name} x${quantity}`,
    });
  };

  const handleToggleFavorite = () => {
    if (productIsFavorite) {
      removeFromFavorites(product.id);
      toast({
        title: t("removedFromFav"),
        description: product.name,
      });
    } else {
      addToFavorites(product.id);
      toast({
        title: t("addedToFav"),
        description: product.name,
      });
    }
  };

  // Get translated category name with fallback
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
      {/* Breadcrumb - Show only on desktop */}
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
                <Link to={`/category/${product.categoryKey}`}>{getCategoryTranslation(product.categoryKey)}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

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
            <p className="text-xs md:text-sm font-light text-muted-foreground mb-0.5 md:mb-1">{getCategoryTranslation(product.categoryKey)}</p>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-light text-foreground">{product.name}</h1>
          </div>
          <div className="text-right">
            <p className="text-lg md:text-xl font-light text-foreground">{convertPrice(product.priceEUR)}</p>
          </div>
        </div>
      </div>

      {/* Product details */}
      <div className="space-y-3 md:space-y-4 py-3 md:py-4 border-b border-border">
        {/* All products are pre-order with 5-7 days delivery */}
        <div className="flex items-center gap-2 py-2 px-3 bg-amber-50 dark:bg-amber-950/30 rounded-sm">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-xs md:text-sm font-medium text-amber-700 dark:text-amber-400">
            {t("preOrder")} — {t("shipsIn5to7Days")}
          </span>
        </div>
        )}
        
        <div className="space-y-1 md:space-y-2">
          <h3 className="text-xs md:text-sm font-light text-foreground">{t("material")}</h3>
          <p className="text-xs md:text-sm font-light text-muted-foreground">18k Gold Plated Sterling Silver</p>
        </div>
        
        <div className="space-y-1 md:space-y-2">
          <h3 className="text-xs md:text-sm font-light text-foreground">{t("dimensions")}</h3>
          <p className="text-xs md:text-sm font-light text-muted-foreground">2.5cm x 1.2cm</p>
        </div>
        
        <div className="space-y-1 md:space-y-2">
          <h3 className="text-xs md:text-sm font-light text-foreground">{t("weight")}</h3>
          <p className="text-xs md:text-sm font-light text-muted-foreground">4.2g per piece</p>
        </div>
        
        <div className="space-y-1 md:space-y-2">
          <h3 className="text-xs md:text-sm font-light text-foreground">{t("editorsNotes")}</h3>
          <p className="text-xs md:text-sm font-light text-muted-foreground italic">"A modern interpretation of classical architecture, bridging timeless elegance with contemporary minimalism."</p>
        </div>
      </div>

      {/* Quantity and Add to Cart */}
      <div className="space-y-3 md:space-y-4">
        <div className="flex items-center gap-3 md:gap-4">
          <span className="text-xs md:text-sm font-light text-foreground">{t("quantity")}</span>
          <div className="flex items-center border border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={decrementQuantity}
              className="h-9 md:h-10 w-9 md:w-10 p-0 hover:bg-transparent hover:opacity-50 rounded-none border-none"
            >
              <Minus className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
            <span className="h-9 md:h-10 flex items-center px-3 md:px-4 text-xs md:text-sm font-light min-w-10 md:min-w-12 justify-center border-l border-r border-border">
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={incrementQuantity}
              className="h-9 md:h-10 w-9 md:w-10 p-0 hover:bg-transparent hover:opacity-50 rounded-none border-none"
            >
              <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            className="flex-1 h-11 md:h-12 bg-foreground text-background hover:bg-foreground/90 font-light rounded-none text-sm md:text-base"
            onClick={handleAddToCart}
          >
            {productInCart ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                {t("addToBag")}
              </>
            ) : (
              t("addToBag")
            )}
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
      </div>
    </div>
  );
};

export default ProductInfo;
