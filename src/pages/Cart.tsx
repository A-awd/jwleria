import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import { Button } from "@/components/ui/button";
import { useShopifyCart } from "@/hooks/useShopifyCart";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/i18n/CurrencyContext";

const Cart = () => {
  const { t, direction } = useLanguage();
  const { convertPrice } = useCurrency();
  const { 
    cart, 
    isLoading, 
    updateLineItem, 
    removeFromCart, 
    clearCart, 
    goToCheckout,
    isConfigured 
  } = useShopifyCart();

  const cartItems = cart?.lines || [];
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart?.subtotal ? parseFloat(cart.subtotal.amount) : 0;

  const handleCheckout = () => {
    if (cart?.checkoutUrl) {
      goToCheckout();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir={direction}>
        <Header />
        <main className="pt-32 pb-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <Loader2 className="w-12 h-12 mx-auto text-muted-foreground animate-spin mb-4" />
            <p className="text-muted-foreground">{t("subtotal")}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background" dir={direction}>
        <Header />
        <main className="pt-32 pb-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <ShoppingBag className="w-20 h-20 mx-auto text-muted-foreground/40 mb-6" />
            <h1 className="text-3xl font-light text-foreground mb-4">{t("emptyBag")}</h1>
            <p className="text-muted-foreground mb-8">{t("continueShopping")}</p>
            <Link to="/category/all">
              <Button className="rounded-none px-8 py-6">
                {t("continueShopping")}
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />
      <main className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-light text-foreground mb-8">{t("yourBag")}</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {cartItems.map((item) => {
                const itemTotal = item.price * item.quantity;
                
                return (
                  <div key={item.id} className="flex gap-6 p-6 bg-muted/20 border border-border/30">
                    <Link to={`/product/${item.handle}`} className="shrink-0">
                      <div className="w-28 h-28 md:w-36 md:h-36 bg-muted overflow-hidden">
                        <img 
                          src={item.image || "/placeholder.svg"} 
                          alt={item.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </Link>
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-foreground">
                          {item.title}
                        </h3>
                        {item.variantTitle && item.variantTitle !== "Default Title" && (
                          <p className="text-sm text-muted-foreground mt-1">{item.variantTitle}</p>
                        )}
                        <p className="text-foreground font-medium mt-2">
                          {convertPrice(item.price)}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateLineItem(item.id, item.quantity - 1)}
                            className="h-9 w-9 p-0 rounded-none border-border"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="text-foreground font-medium min-w-[2ch] text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateLineItem(item.id, item.quantity + 1)}
                            className="h-9 w-9 p-0 rounded-none border-border"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Item Total & Remove */}
                        <div className="flex items-center gap-4">
                          <span className="text-foreground font-semibold">
                            {convertPrice(itemTotal)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                            className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Clear Cart */}
              <div className="flex justify-between items-center pt-4">
                <Link to="/category/all" className="text-sm text-muted-foreground hover:text-foreground transition-colors underline">
                  {t("continueShopping")}
                </Link>
                <Button
                  variant="ghost"
                  onClick={clearCart}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("clearAll")}
                </Button>
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-muted/20 border border-border/30 p-8 sticky top-28">
                <h2 className="text-xl font-light text-foreground mb-6">{t("orderSummary")}</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("subtotal")} ({totalItems} {t("products")})</span>
                    <span className="text-foreground">{convertPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("shipping")}</span>
                    <span className="text-foreground">{t("free")}</span>
                  </div>
                </div>
                
                <div className="border-t border-border pt-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-lg font-medium text-foreground">{t("total")}</span>
                    <span className="text-lg font-semibold text-foreground">
                      {convertPrice(totalPrice)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{t("shippingTaxes")}</p>
                </div>
                
                {isConfigured ? (
                  <Button 
                    className="w-full rounded-none py-6 text-base group"
                    onClick={handleCheckout}
                    disabled={!cart?.checkoutUrl}
                  >
                    {t("checkout")}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("shippingTaxes")}
                    </p>
                    <Button className="w-full rounded-none py-6 text-base" disabled>
                      {t("checkout")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
