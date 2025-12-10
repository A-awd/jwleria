import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart, MessageCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { getWhatsAppLink, STORE_CONFIG } from "@/config/store";

interface ProductData {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  description?: string;
  images: string[];
  handle?: string;
  leadTime?: string;
}

interface QuickViewModalProps {
  product: ProductData | null;
  isOpen: boolean;
  onClose: () => void;
}

const QuickViewModal = ({ product, isOpen, onClose }: QuickViewModalProps) => {
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();

  if (!product) return null;

  const numericId = typeof product.id === 'string' 
    ? parseInt(product.id.replace(/\D/g, '')) || 0 
    : product.id;

  const handleWhatsAppClick = () => {
    const whatsappLink = getWhatsAppLink(product.brand, product.name, product.id);
    window.open(whatsappLink, '_blank');
    onClose();
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
            <p className="text-lg md:text-xl font-light text-foreground/80 mb-4">
              {convertPrice(product.price)}
            </p>

            {/* Pre-order indicator */}
            <div className="flex items-center gap-2 py-2 px-3 bg-amber-50 dark:bg-amber-950/30 rounded-sm mb-4">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {t("preOrder")} — {product.leadTime || STORE_CONFIG.defaultLeadTime}
              </span>
            </div>

            {product.description && (
              <p className="text-sm font-light text-foreground/70 mb-6 line-clamp-3">
                {product.description}
              </p>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleWhatsAppClick}
                className="w-full h-11 bg-[#25D366] hover:bg-[#128C7E] text-white transition-colors"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {t("orderOnWhatsApp")}
              </Button>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleToggleFavorite}
                  aria-label={isFavorite(numericId) ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
                  className="flex-1 h-11 border-foreground/20 hover:bg-foreground/5"
                >
                  <Heart
                    className={`h-4 w-4 mr-2 ${isFavorite(numericId) ? "fill-current text-red-500" : ""}`}
                  />
                  {t("favorites")}
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
