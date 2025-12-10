import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { Heart, MessageCircle, Truck, Shield, Clock } from "lucide-react";
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
    description?: string;
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <motion.div 
      className="space-y-5 md:space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb - Desktop only */}
      {showBreadcrumb && (
        <motion.div variants={itemVariants} className="hidden lg:block">
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
        </motion.div>
      )}

      {/* Brand & Category */}
      <motion.div variants={itemVariants} className="space-y-1">
        <Link 
          to={`/brand/${encodeURIComponent(product.brand)}`}
          className="text-sm font-medium text-primary hover:underline block uppercase tracking-wider"
        >
          {product.brand}
        </Link>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          {getCategoryTranslation(product.categoryKey)}
        </p>
      </motion.div>

      {/* Product Name */}
      <motion.h1 
        variants={itemVariants}
        className="text-2xl md:text-3xl lg:text-4xl font-light text-foreground leading-tight"
      >
        {product.name}
      </motion.h1>

      {/* Price */}
      <motion.div variants={itemVariants} className="flex items-baseline gap-3">
        <p className="text-xl md:text-2xl font-light text-foreground">
          {convertPrice(product.price)}
        </p>
        {product.compareAtPrice && product.compareAtPrice > product.price && (
          <p className="text-base font-light text-muted-foreground line-through">
            {convertPrice(product.compareAtPrice)}
          </p>
        )}
      </motion.div>

      {/* Pre-order & Limited Edition Status */}
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex items-center gap-2 py-3 px-4 bg-amber-50 dark:bg-amber-950/30 rounded-sm border border-amber-200/50 dark:border-amber-800/30">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {t("preOrder")}
            </span>
            <span className="text-sm text-amber-600/80 dark:text-amber-400/80 ml-2">
              {t("usuallyShipsIn")} {product.leadTime || STORE_CONFIG.defaultLeadTime}
            </span>
          </div>
        </div>
        
        {product.isLimitedEdition && (
          <div className="flex items-center gap-2 py-3 px-4 bg-rose-50 dark:bg-rose-950/30 rounded-sm border border-rose-200/50 dark:border-rose-800/30">
            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-rose-700 dark:text-rose-400">
              {t("limitedEdition")}
            </span>
          </div>
        )}
      </motion.div>

      {/* WhatsApp CTA Section */}
      <motion.div 
        variants={itemVariants}
        className="bg-gradient-to-r from-[#25D366]/10 to-[#128C7E]/10 dark:from-[#25D366]/5 dark:to-[#128C7E]/5 p-5 md:p-6 rounded-sm border border-[#25D366]/20"
      >
        <div className="flex gap-3 mb-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1"
          >
            <Button 
              className="w-full h-12 md:h-14 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium rounded-sm text-base md:text-lg shadow-lg shadow-[#25D366]/20"
              onClick={handleWhatsAppClick}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              {t("orderOnWhatsApp")}
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="icon"
              className="h-12 md:h-14 w-12 md:w-14 rounded-sm border-border/50 hover:border-foreground/30"
              onClick={handleToggleFavorite}
              aria-label={productIsFavorite ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
            >
              <Heart 
                className={`h-5 w-5 transition-colors ${productIsFavorite ? 'fill-red-500 text-red-500' : ''}`} 
              />
            </Button>
          </motion.div>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          {t("whatsappOrderNote")}
        </p>
      </motion.div>

      {/* Product Details */}
      <motion.div variants={itemVariants} className="space-y-4 py-5 border-t border-border/50">
        {product.material && (
          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">{t("material")}</span>
            <span className="text-sm text-foreground text-right max-w-[60%]">{product.material}</span>
          </div>
        )}
        
        {product.dimensions && (
          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">{t("dimensions")}</span>
            <span className="text-sm text-foreground text-right max-w-[60%]">{product.dimensions}</span>
          </div>
        )}
        
        {product.weight && (
          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">{t("weight")}</span>
            <span className="text-sm text-foreground text-right max-w-[60%]">{product.weight}</span>
          </div>
        )}
      </motion.div>

      {/* Trust badges */}
      <motion.div 
        variants={itemVariants}
        className="flex flex-wrap gap-4 py-4 border-t border-border/50 text-xs text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>{t("authenticGuaranteed")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4" />
          <span>{t("worldwideShipping")}</span>
        </div>
      </motion.div>

      {/* Editor's Notes */}
      {product.editorsNotes && (
        <motion.div variants={itemVariants} className="py-4 border-t border-border/50">
          <h3 className="text-sm font-medium text-foreground mb-2">{t("editorsNotes")}</h3>
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            "{product.editorsNotes}"
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ProductInfoNew;
