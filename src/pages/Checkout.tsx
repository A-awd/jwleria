import { useState } from "react";
import { Minus, Plus, CreditCard, Check } from "lucide-react";
import CheckoutHeader from "../components/header/CheckoutHeader";
import Footer from "../components/footer/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/i18n/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import pantheonImage from "@/assets/pantheon.jpg";
import eclipseImage from "@/assets/eclipse.jpg";

const Checkout = () => {
  const { t, direction } = useLanguage();
  const { currency } = useCurrency();
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: ""
  });
  const [shippingAddress, setShippingAddress] = useState({
    address: "",
    city: "",
    postalCode: "",
    country: ""
  });
  const [hasSeparateBilling, setHasSeparateBilling] = useState(false);
  const [billingDetails, setBillingDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: ""
  });
  const [shippingOption, setShippingOption] = useState("standard");
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: ""
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  
  // Mock cart data - in a real app this would come from state management
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: "Pantheon Ring",
      price: "€2,450",
      quantity: 1,
      image: pantheonImage,
      size: "54 EU / 7 US"
    },
    {
      id: 2,
      name: "Eclipse Earrings", 
      price: "€1,850",
      quantity: 1,
      image: eclipseImage
    }
  ]);

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCartItems(items => items.filter(item => item.id !== id));
    } else {
      setCartItems(items => 
        items.map(item => 
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const subtotal = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price.replace('€', '').replace(',', ''));
    return sum + (price * item.quantity);
  }, 0);

  const getShippingCost = () => {
    switch (shippingOption) {
      case "express":
        return 15;
      case "overnight":
        return 35;
      default:
        return 0; // Standard shipping is free
    }
  };
  
  const shipping = getShippingCost();
  const total = subtotal + shipping;

  const handleDiscountSubmit = () => {
    // Handle discount code submission
    console.log("Discount code submitted:", discountCode);
    setShowDiscountInput(false);
  };

  const handleCustomerDetailsChange = (field: string, value: string) => {
    setCustomerDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleShippingAddressChange = (field: string, value: string) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleBillingDetailsChange = (field: string, value: string) => {
    setBillingDetails(prev => ({ ...prev, [field]: value }));
  };

  const handlePaymentDetailsChange = (field: string, value: string) => {
    setPaymentDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleCompleteOrder = async () => {
    setIsProcessing(true);
    setOrderError(null);
    
    try {
      // Prepare order data
      const orderData = {
        customer_email: customerDetails.email.trim(),
        customer_name: `${customerDetails.firstName.trim()} ${customerDetails.lastName.trim()}`,
        customer_phone: customerDetails.phone || undefined,
        shipping_address: shippingAddress.address.trim(),
        shipping_city: shippingAddress.city.trim(),
        shipping_postal_code: shippingAddress.postalCode || undefined,
        shipping_country: shippingAddress.country.trim(),
        currency: currency,
        total_amount: total,
        items: cartItems.map(item => ({
          product_id: item.id,
          product_name: item.name,
          product_brand: "jWleria", // Default brand for mock data
          product_image: typeof item.image === 'string' ? item.image : undefined,
          unit_price: parseFloat(item.price.replace('€', '').replace(',', '')),
          quantity: item.quantity,
        })),
      };

      // Call the secure Edge Function
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: orderData,
      });

      if (error) {
        console.error('Order creation failed:', error);
        setOrderError(error.message || 'Failed to create order');
        toast.error('Order failed. Please try again.');
        return;
      }

      if (data?.error) {
        console.error('Order validation failed:', data.error, data.details);
        setOrderError(data.details?.join(', ') || data.error);
        toast.error(data.error);
        return;
      }

      // Success
      setOrderNumber(data.order_number);
      setPaymentComplete(true);
      toast.success(t("orderComplete") || 'Order placed successfully!');
      
    } catch (err) {
      console.error('Unexpected error:', err);
      setOrderError('An unexpected error occurred');
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <CheckoutHeader />
      
      <main className="pt-6 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Order Summary - First on mobile, last on desktop */}
            <div className="lg:col-span-1 lg:order-2">
              <div className="bg-muted/20 p-8 rounded-none sticky top-6">
                <h2 className="text-lg font-light text-foreground mb-6">{t("orderSummary")}</h2>
                
                <div className="space-y-6">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-20 h-20 bg-muted rounded-none overflow-hidden">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-light text-foreground">{item.name}</h3>
                        {item.size && (
                          <p className="text-sm text-muted-foreground">{t("size")}: {item.size}</p>
                        )}
                        
                        {/* Quantity controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-8 w-8 p-0 rounded-none border-muted-foreground/20"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium text-foreground min-w-[2ch] text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-8 w-8 p-0 rounded-none border-muted-foreground/20"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-foreground font-medium">
                        {item.price}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Discount Code Section */}
                <div className="mt-8 pt-6 border-t border-muted-foreground/20">
                  {!showDiscountInput ? (
                    <button 
                      onClick={() => setShowDiscountInput(true)}
                      className="text-sm text-foreground underline hover:no-underline transition-all"
                    >
                      {t("discountCode")}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value)}
                          placeholder={t("enterDiscountCode")}
                          className="flex-1 rounded-none"
                        />
                        <button 
                          onClick={handleDiscountSubmit}
                          className="text-sm text-foreground underline hover:no-underline transition-all px-2"
                        >
                          {t("apply")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-muted-foreground/20 mt-4 pt-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("subtotal")}</span>
                    <span className="text-foreground">€{subtotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Left Column - Forms */}
            <div className="lg:col-span-2 lg:order-1 space-y-8">

              {/* Customer Details Form */}
              <div className="bg-muted/20 p-8 rounded-none">
                <h2 className="text-lg font-light text-foreground mb-6">{t("customerDetails")}</h2>
                
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="email" className="text-sm font-light text-foreground">
                      {t("emailAddress")} *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerDetails.email}
                      onChange={(e) => handleCustomerDetailsChange("email", e.target.value)}
                      className="mt-2 rounded-none"
                      placeholder={t("enterEmail")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-sm font-light text-foreground">
                        {t("firstName")} *
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={customerDetails.firstName}
                        onChange={(e) => handleCustomerDetailsChange("firstName", e.target.value)}
                        className="mt-2 rounded-none"
                        placeholder={t("firstName")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-sm font-light text-foreground">
                        {t("lastName")} *
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={customerDetails.lastName}
                        onChange={(e) => handleCustomerDetailsChange("lastName", e.target.value)}
                        className="mt-2 rounded-none"
                        placeholder={t("lastName")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm font-light text-foreground">
                      {t("phoneNumber")}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={customerDetails.phone}
                      onChange={(e) => handleCustomerDetailsChange("phone", e.target.value)}
                      className="mt-2 rounded-none"
                      placeholder={t("enterPhone")}
                    />
                  </div>

                  {/* Shipping Address */}
                  <div className="border-t border-muted-foreground/20 pt-6 mt-8">
                    <h3 className="text-base font-light text-foreground mb-4">{t("shippingAddress")}</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="shippingAddress" className="text-sm font-light text-foreground">
                          {t("address")} *
                        </Label>
                        <Input
                          id="shippingAddress"
                          type="text"
                          value={shippingAddress.address}
                          onChange={(e) => handleShippingAddressChange("address", e.target.value)}
                          className="mt-2 rounded-none"
                          placeholder={t("streetAddress")}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="shippingCity" className="text-sm font-light text-foreground">
                            {t("city")} *
                          </Label>
                          <Input
                            id="shippingCity"
                            type="text"
                            value={shippingAddress.city}
                            onChange={(e) => handleShippingAddressChange("city", e.target.value)}
                            className="mt-2 rounded-none"
                            placeholder={t("city")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="shippingPostalCode" className="text-sm font-light text-foreground">
                            {t("postalCode")} *
                          </Label>
                          <Input
                            id="shippingPostalCode"
                            type="text"
                            value={shippingAddress.postalCode}
                            onChange={(e) => handleShippingAddressChange("postalCode", e.target.value)}
                            className="mt-2 rounded-none"
                            placeholder={t("postalCode")}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="shippingCountry" className="text-sm font-light text-foreground">
                          {t("country")} *
                        </Label>
                        <Input
                          id="shippingCountry"
                          type="text"
                          value={shippingAddress.country}
                          onChange={(e) => handleShippingAddressChange("country", e.target.value)}
                          className="mt-2 rounded-none"
                          placeholder={t("country")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Billing Address Checkbox */}
                  <div className="border-t border-muted-foreground/20 pt-6 mt-8">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="separateBilling"
                        checked={hasSeparateBilling}
                        onCheckedChange={(checked) => setHasSeparateBilling(checked === true)}
                      />
                      <Label 
                        htmlFor="separateBilling" 
                        className="text-sm font-light text-foreground cursor-pointer"
                      >
                        {t("otherBillingAddress")}
                      </Label>
                    </div>
                  </div>

                  {/* Billing Details - shown when checkbox is checked */}
                  {hasSeparateBilling && (
                    <div className="space-y-6 pt-4">
                      <h3 className="text-base font-light text-foreground">{t("billingDetails")}</h3>
                      
                      <div>
                        <Label htmlFor="billingEmail" className="text-sm font-light text-foreground">
                          {t("emailAddress")} *
                        </Label>
                        <Input
                          id="billingEmail"
                          type="email"
                          value={billingDetails.email}
                          onChange={(e) => handleBillingDetailsChange("email", e.target.value)}
                          className="mt-2 rounded-none"
                          placeholder={t("enterBillingEmail")}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="billingFirstName" className="text-sm font-light text-foreground">
                            {t("firstName")} *
                          </Label>
                          <Input
                            id="billingFirstName"
                            type="text"
                            value={billingDetails.firstName}
                            onChange={(e) => handleBillingDetailsChange("firstName", e.target.value)}
                            className="mt-2 rounded-none"
                            placeholder={t("firstName")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="billingLastName" className="text-sm font-light text-foreground">
                            {t("lastName")} *
                          </Label>
                          <Input
                            id="billingLastName"
                            type="text"
                            value={billingDetails.lastName}
                            onChange={(e) => handleBillingDetailsChange("lastName", e.target.value)}
                            className="mt-2 rounded-none"
                            placeholder={t("lastName")}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="billingPhone" className="text-sm font-light text-foreground">
                          {t("phoneNumber")}
                        </Label>
                        <Input
                          id="billingPhone"
                          type="tel"
                          value={billingDetails.phone}
                          onChange={(e) => handleBillingDetailsChange("phone", e.target.value)}
                          className="mt-2 rounded-none"
                          placeholder={t("enterPhone")}
                        />
                      </div>

                      <div>
                        <Label htmlFor="billingAddress" className="text-sm font-light text-foreground">
                          {t("address")} *
                        </Label>
                        <Input
                          id="billingAddress"
                          type="text"
                          value={billingDetails.address}
                          onChange={(e) => handleBillingDetailsChange("address", e.target.value)}
                          className="mt-2 rounded-none"
                          placeholder={t("streetAddress")}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="billingCity" className="text-sm font-light text-foreground">
                            {t("city")} *
                          </Label>
                          <Input
                            id="billingCity"
                            type="text"
                            value={billingDetails.city}
                            onChange={(e) => handleBillingDetailsChange("city", e.target.value)}
                            className="mt-2 rounded-none"
                            placeholder={t("city")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="billingPostalCode" className="text-sm font-light text-foreground">
                            {t("postalCode")} *
                          </Label>
                          <Input
                            id="billingPostalCode"
                            type="text"
                            value={billingDetails.postalCode}
                            onChange={(e) => handleBillingDetailsChange("postalCode", e.target.value)}
                            className="mt-2 rounded-none"
                            placeholder={t("postalCode")}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="billingCountry" className="text-sm font-light text-foreground">
                          {t("country")} *
                        </Label>
                        <Input
                          id="billingCountry"
                          type="text"
                          value={billingDetails.country}
                          onChange={(e) => handleBillingDetailsChange("country", e.target.value)}
                          className="mt-2 rounded-none"
                          placeholder={t("country")}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

            {/* Shipping Options */}
            <div className="bg-muted/20 p-8 rounded-none">
              <h2 className="text-lg font-light text-foreground mb-6">{t("shippingMethod")}</h2>
              
              <RadioGroup 
                value={shippingOption} 
                onValueChange={setShippingOption}
                className="space-y-4"
              >
                <div className="flex items-center justify-between p-4 border border-muted-foreground/20 rounded-none">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="standard" id="standard" />
                    <Label htmlFor="standard" className="font-light text-foreground">
                      {t("standardShipping")}
                    </Label>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("standardShippingDesc")}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-muted-foreground/20 rounded-none">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="express" id="express" />
                    <Label htmlFor="express" className="font-light text-foreground">
                      {t("expressShipping")}
                    </Label>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("expressShippingDesc")}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-muted-foreground/20 rounded-none">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="overnight" id="overnight" />
                    <Label htmlFor="overnight" className="font-light text-foreground">
                      {t("overnightShipping")}
                    </Label>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("overnightShippingDesc")}
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Payment Section */}
            <div className="bg-muted/20 p-8 rounded-none">
              <h2 className="text-lg font-light text-foreground mb-6">{t("paymentMethod")}</h2>
              
              {!paymentComplete ? (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="cardholderName" className="text-sm font-light text-foreground">
                      {t("cardholderName")} *
                    </Label>
                    <Input
                      id="cardholderName"
                      type="text"
                      value={paymentDetails.cardholderName}
                      onChange={(e) => handlePaymentDetailsChange("cardholderName", e.target.value)}
                      className="mt-2 rounded-none"
                      placeholder={t("cardholderName")}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cardNumber" className="text-sm font-light text-foreground">
                      {t("cardNumber")} *
                    </Label>
                    <div className="relative mt-2">
                      <Input
                        id="cardNumber"
                        type="text"
                        value={paymentDetails.cardNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
                          if (value.length <= 19) {
                            handlePaymentDetailsChange("cardNumber", value);
                          }
                        }}
                        className="rounded-none pl-10"
                        placeholder="4242 4242 4242 4242"
                        maxLength={19}
                      />
                      <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiryDate" className="text-sm font-light text-foreground">
                        {t("expiryDate")} *
                      </Label>
                      <Input
                        id="expiryDate"
                        type="text"
                        value={paymentDetails.expiryDate}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d{2})/, '$1/$2');
                          if (value.length <= 5) {
                            handlePaymentDetailsChange("expiryDate", value);
                          }
                        }}
                        className="mt-2 rounded-none"
                        placeholder="MM/YY"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv" className="text-sm font-light text-foreground">
                        {t("cvv")} *
                      </Label>
                      <Input
                        id="cvv"
                        type="text"
                        value={paymentDetails.cvv}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 3) {
                            handlePaymentDetailsChange("cvv", value);
                          }
                        }}
                        className="mt-2 rounded-none"
                        placeholder="123"
                        maxLength={3}
                      />
                    </div>
                  </div>

                  {/* Order Total Summary */}
                  <div className="bg-muted/10 p-6 rounded-none border border-muted-foreground/20 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("subtotal")}</span>
                      <span className="text-foreground">€{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("shipping")}</span>
                      <span className="text-foreground">
                        {shipping === 0 ? t("free") : `€${shipping}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-medium border-t border-muted-foreground/20 pt-3">
                      <span className="text-foreground">{t("total")}</span>
                      <span className="text-foreground">€{total.toLocaleString()}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleCompleteOrder}
                    disabled={isProcessing || !paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv || !paymentDetails.cardholderName}
                    className="w-full rounded-none h-12 text-base"
                  >
                    {isProcessing ? t("processing") : `${t("completeOrder")} • €${total.toLocaleString()}`}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-light text-foreground mb-2">{t("orderComplete")}</h3>
                  <p className="text-muted-foreground">{t("orderConfirmation")}</p>
                  {orderNumber && (
                    <p className="text-foreground font-medium mt-4">
                      {t("orderNumber") || "Order Number"}: {orderNumber}
                    </p>
                  )}
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

export default Checkout;
