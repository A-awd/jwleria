import { useState } from "react";
import { Search, Package, Truck, CheckCircle, Clock, AlertCircle } from "lucide-react";
import Header from "@/components/header/Header";
import Footer from "@/components/footer/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/i18n/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  product_name: string;
  product_brand: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
}

interface StatusHistory {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  total_amount: number;
  currency: string;
  tracking_number: string | null;
  estimated_delivery: string | null;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  shipping_address: string;
  shipping_city: string;
  shipping_country: string;
}

const OrderTracking = () => {
  const { t, direction } = useLanguage();
  const { convertPrice } = useCurrency();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!orderNumber.trim() || !email.trim()) {
      toast.error(t("enterOrderNumberAndEmail"));
      return;
    }

    setIsLoading(true);
    setSearched(true);

    try {
      // Use secure RPC function that requires both order number AND email
      const { data: orderData, error: orderError } = await supabase
        .rpc("lookup_order_by_credentials", {
          p_order_number: orderNumber.trim(),
          p_email: email.trim()
        });

      if (orderError) throw orderError;

      if (!orderData || orderData.length === 0) {
        setOrder(null);
        setOrderItems([]);
        setStatusHistory([]);
        return;
      }

      const foundOrder = orderData[0] as Order;
      setOrder(foundOrder);

      // Fetch order items using secure RPC function
      const { data: items, error: itemsError } = await supabase
        .rpc("lookup_order_items_by_credentials", {
          p_order_number: orderNumber.trim(),
          p_email: email.trim()
        });

      if (itemsError) throw itemsError;
      setOrderItems((items as OrderItem[]) || []);

      // Fetch status history using secure RPC function
      const { data: history, error: historyError } = await supabase
        .rpc("lookup_order_history_by_credentials", {
          p_order_number: orderNumber.trim(),
          p_email: email.trim()
        });

      if (historyError) throw historyError;
      // Sort by created_at descending
      const sortedHistory = ((history as StatusHistory[]) || []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setStatusHistory(sortedHistory);

    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error(t("errorFetchingOrder"));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-6 h-6" />;
      case "processing":
        return <Package className="w-6 h-6" />;
      case "shipped":
        return <Truck className="w-6 h-6" />;
      case "delivered":
        return <CheckCircle className="w-6 h-6" />;
      case "cancelled":
        return <AlertCircle className="w-6 h-6" />;
      default:
        return <Clock className="w-6 h-6" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-500 bg-yellow-500/10";
      case "processing":
        return "text-blue-500 bg-blue-500/10";
      case "shipped":
        return "text-purple-500 bg-purple-500/10";
      case "delivered":
        return "text-green-500 bg-green-500/10";
      case "cancelled":
        return "text-red-500 bg-red-500/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const statusSteps = ["pending", "processing", "shipped", "delivered"];
  const currentStepIndex = order ? statusSteps.indexOf(order.status) : -1;

  // Mask sensitive data for display
  const maskEmail = (emailStr: string) => {
    const [local, domain] = emailStr.split("@");
    if (!domain) return emailStr;
    const maskedLocal = local.length > 2 
      ? local[0] + "***" + local[local.length - 1]
      : "***";
    return `${maskedLocal}@${domain}`;
  };

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <Header />
      <main className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-light text-foreground text-center mb-4">
            {t("trackYourOrder")}
          </h1>
          <p className="text-muted-foreground text-center mb-10">
            {t("trackOrderDescriptionSecure")}
          </p>

          {/* Search Form - Now requires both order number AND email */}
          <div className="max-w-xl mx-auto mb-12 space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{t("orderNumber")}</label>
              <Input
                placeholder={t("enterOrderNumber")}
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="rounded-none h-12"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{t("email")}</label>
              <Input
                type="email"
                placeholder={t("enterEmail")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="rounded-none h-12"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              className="rounded-none h-12 w-full"
              disabled={isLoading}
            >
              <Search className="w-5 h-5 mr-2" />
              {t("trackOrder")}
            </Button>
          </div>

          {/* Results */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground mt-4">{t("searching")}...</p>
            </div>
          )}

          {!isLoading && searched && !order && (
            <div className="text-center py-12 bg-muted/20 border border-border/30">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-xl font-light text-foreground mb-2">{t("orderNotFound")}</h3>
              <p className="text-muted-foreground">{t("orderNotFoundDescSecure")}</p>
            </div>
          )}

          {!isLoading && order && (
            <div className="space-y-8">
              {/* Order Header */}
              <div className="bg-muted/20 border border-border/30 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("orderNumber")}</p>
                    <h2 className="text-xl font-medium text-foreground">{order.order_number}</h2>
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="font-medium capitalize">{t(order.status as any)}</span>
                  </div>
                </div>

                {/* Status Progress */}
                {order.status !== "cancelled" && (
                  <div className="relative">
                    <div className="flex justify-between mb-2">
                      {statusSteps.map((step, index) => (
                        <div 
                          key={step} 
                          className={`flex flex-col items-center flex-1 ${
                            index <= currentStepIndex ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            index <= currentStepIndex 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {getStatusIcon(step)}
                          </div>
                          <span className="text-xs mt-2 text-center">{t(step as any)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-10">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Order Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Order Info */}
                <div className="bg-muted/20 border border-border/30 p-6">
                  <h3 className="text-lg font-light text-foreground mb-4">{t("orderDetails")}</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("orderDate")}</span>
                      <span className="text-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("total")}</span>
                      <span className="text-foreground font-medium">{convertPrice(order.total_amount)}</span>
                    </div>
                    {order.tracking_number && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("trackingNumber")}</span>
                        <span className="text-foreground">{order.tracking_number}</span>
                      </div>
                    )}
                    {order.estimated_delivery && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("estimatedDelivery")}</span>
                        <span className="text-foreground">{new Date(order.estimated_delivery).toLocaleDateString()}</span>
                      </div>
                    )}
                    {order.shipped_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("shippedDate")}</span>
                        <span className="text-foreground">{new Date(order.shipped_at).toLocaleDateString()}</span>
                      </div>
                    )}
                    {order.delivered_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("deliveredDate")}</span>
                        <span className="text-foreground">{new Date(order.delivered_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping Address - with masked email for security */}
                <div className="bg-muted/20 border border-border/30 p-6">
                  <h3 className="text-lg font-light text-foreground mb-4">{t("shippingAddress")}</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="text-foreground font-medium">{order.customer_name}</p>
                    <p>{order.shipping_address}</p>
                    <p>{order.shipping_city}, {order.shipping_country}</p>
                    <p>{maskEmail(order.customer_email)}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-muted/20 border border-border/30 p-6">
                <h3 className="text-lg font-light text-foreground mb-4">{t("orderItems")}</h3>
                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b border-border/30 last:border-0 last:pb-0">
                      {item.product_image && (
                        <div className="w-20 h-20 bg-muted overflow-hidden shrink-0">
                          <img 
                            src={item.product_image} 
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{item.product_name}</h4>
                        <p className="text-sm text-muted-foreground">{item.product_brand}</p>
                        <p className="text-sm text-muted-foreground">{t("quantity")}: {item.quantity}</p>
                      </div>
                      <div className="text-foreground font-medium">
                        {convertPrice(item.unit_price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status History */}
              {statusHistory.length > 0 && (
                <div className="bg-muted/20 border border-border/30 p-6">
                  <h3 className="text-lg font-light text-foreground mb-4">{t("statusHistory")}</h3>
                  <div className="space-y-4">
                    {statusHistory.map((history) => (
                      <div key={history.id} className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${getStatusColor(history.status)}`}>
                          {getStatusIcon(history.status)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground capitalize">{t(history.status as any)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(history.created_at).toLocaleString()}
                          </p>
                          {history.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{history.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderTracking;