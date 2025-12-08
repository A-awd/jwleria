import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductData } from "@/types/shopify";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useShopifyCart } from "@/hooks/useShopifyCart";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart, ShoppingBag, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface QuickViewModalProps {
  product: ProductData | null;
  isOpen: boolean;
  onClose: () => void;
}

const QuickViewModal = ({ product, isOpen, onClose }: QuickViewModalProps) => {
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();
  const { addToCart } = useShopifyCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  if (!product) return null;

  const numericId = parseInt(product.id.replace(/\D/g, '')) || 0;
  const variantId = product.variants?.[0]?.id;

  const handleAddToCart = async () => {
    if (variantId) {
      try {
        await addToCart(variantId, 1);
        toast.success(t("itemAdded"));
        onClose();
      } catch (error) {
        toast.error("Failed to add to cart");
      }
    } else {
      toast.error("No variant available");
    }
  };

  const handleToggleFavorite = () => {
    toggleFavorite(numericId);
    toast.success(isFavorite(numericId) ? t("removedFromFav") : t("addedToFav"));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background border-border/20">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="grid md:grid-cols-2 gap-0">
          {/* Product Image */}
          <div className="aspect-square bg-muted/10 overflow-hidden">
            <img
              src={product.images[0] || '/placeholder.svg'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Product Info */}
          <div className="p-6 md:p-8 flex flex-col justify-center">
            <p className="text-xs font-medium text-foreground/50 uppercase tracking-wider mb-2">
              {product.brand}
            </p>
            <h2 className="text-xl md:text-2xl font-light text-foreground mb-2">
              {product.name}
            </h2>
            <p className="text-lg md:text-xl font-light text-foreground/80 mb-6">
              {convertPrice(product.price)}
            </p>

            {product.description && (
              <p className="text-sm font-light text-foreground/70 mb-6 line-clamp-3">
                {product.description}
              </p>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                disabled={!variantId}
                className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                {t("addToBag")}
              </Button>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleToggleFavorite}
                  className="flex-1 h-11 border-foreground/20 hover:bg-foreground/5"
                >
                  <Heart
                    className={`h-4 w-4 mr-2 ${isFavorite(numericId) ? "fill-current text-red-500" : ""}`}
                  />
                  {isFavorite(numericId) ? t("favorites") : t("favorites")}
                </Button>

                <Link to={`/product/${product.handle || product.id}`} className="flex-1">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="w-full h-11 border-foreground/20 hover:bg-foreground/5"
                  >
                    {t("viewDetails")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickViewModal;
