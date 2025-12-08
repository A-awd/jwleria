import { X, Minus, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useShopifyCart } from "@/hooks/useShopifyCart";

interface ShoppingBagProps {
  isOpen: boolean;
  onClose: () => void;
  onViewFavorites?: () => void;
}

const ShoppingBag = ({ isOpen, onClose, onViewFavorites }: ShoppingBagProps) => {
  const { convertPrice } = useCurrency();
  const { t, direction } = useLanguage();
  const { 
    cart, 
    isLoading, 
    updateLineItem, 
    removeFromCart, 
    goToCheckout,
    isConfigured 
  } = useShopifyCart();
  
  const cartItems = cart?.lines || [];
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart?.subtotal ? parseFloat(cart.subtotal.amount) : 0;
  
  if (!isOpen) return null;

  const handleCheckout = () => {
    if (cart?.checkoutUrl) {
      goToCheckout();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 h-screen">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 h-screen"
        onClick={onClose}
      />
      
      {/* Off-canvas panel */}
      <div className={`absolute ${direction === 'rtl' ? 'left-0' : 'right-0'} top-0 h-screen w-full max-w-md bg-background border-${direction === 'rtl' ? 'r' : 'l'} border-border animate-slide-in-right flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-light text-foreground">{t("shoppingBag")}</h2>
            {totalItems > 0 && (
              <span className="text-sm text-muted-foreground">({totalItems})</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-foreground hover:text-muted-foreground transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile favorites toggle - only show on mobile */}
          {onViewFavorites && (
            <div className="md:hidden p-4 border-b border-border">
              <button
                onClick={onViewFavorites}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-border rounded-lg text-nav-foreground hover:text-nav-hover hover:border-nav-hover transition-colors duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
                <span className="text-sm font-light">{t("yourFavorites")}</span>
              </button>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-4" />
              <p className="text-muted-foreground text-sm">{t("subtotal")}</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-16 h-16 text-muted-foreground/30 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <p className="text-muted-foreground text-sm text-center mb-4">
                {t("emptyBag")}
              </p>
              <Button 
                variant="outline" 
                className="rounded-none" 
                onClick={onClose}
                asChild
              >
                <Link to="/category/shop">
                  {t("continueShopping")}
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Cart items */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className={`flex gap-4 ${direction === 'rtl' ? 'flex-row-reverse' : ''} pb-4 border-b border-border last:border-0`}>
                    <Link 
                      to={`/product/${item.variantId}`}
                      onClick={onClose}
                      className="w-24 h-24 bg-muted/10 rounded-lg overflow-hidden flex-shrink-0"
                    >
                      <img 
                        src={item.image || "/placeholder.svg"} 
                        alt={item.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className={`flex justify-between items-start gap-2 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <div className="min-w-0">
                          <Link 
                            to={`/product/${item.variantId}`}
                            onClick={onClose}
                            className="text-sm font-medium text-foreground hover:underline truncate block"
                          >
                            {item.title}
                          </Link>
                          {item.variantTitle && item.variantTitle !== "Default Title" && (
                            <p className="text-xs font-light text-muted-foreground">{item.variantTitle}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                          aria-label="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className={`flex items-center justify-between mt-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        <div className="flex items-center border border-border">
                          <button 
                            onClick={() => updateLineItem(item.id, item.quantity - 1)}
                            className="p-1.5 hover:bg-muted/50 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="px-3 py-1.5 text-sm font-light min-w-[36px] text-center">
                            {item.quantity}
                          </span>
                          <button 
                            onClick={() => updateLineItem(item.id, item.quantity + 1)}
                            className="p-1.5 hover:bg-muted/50 transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <p className="text-sm font-medium text-foreground">{convertPrice(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Subtotal and checkout */}
              <div className="border-t border-border p-6 space-y-4 bg-background">
                <div className={`flex justify-between items-center ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm font-light text-foreground">{t("subtotal")}</span>
                  <span className="text-lg font-medium text-foreground">{convertPrice(totalPrice)}</span>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  {t("shippingTaxes")}
                </p>
                
                {isConfigured && cart?.checkoutUrl ? (
                  <Button 
                    className="w-full rounded-none" 
                    size="lg"
                    onClick={handleCheckout}
                  >
                    {t("checkout")}
                  </Button>
                ) : (
                  <Button 
                    asChild 
                    className="w-full rounded-none" 
                    size="lg"
                    onClick={onClose}
                  >
                    <Link to="/cart">
                      {t("checkout")}
                    </Link>
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  className="w-full rounded-none" 
                  size="lg"
                  onClick={onClose}
                  asChild
                >
                  <Link to="/cart">
                    {t("viewBag")}
                  </Link>
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full rounded-none text-muted-foreground hover:text-foreground" 
                  size="lg"
                  onClick={onClose}
                  asChild
                >
                  <Link to="/category/all">
                    {t("continueShopping")}
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShoppingBag;
