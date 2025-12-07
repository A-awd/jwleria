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
import { Minus, Plus } from "lucide-react";
import { useCurrency } from "@/i18n/CurrencyContext";
import { useLanguage } from "@/i18n/LanguageContext";

const ProductInfo = () => {
  const [quantity, setQuantity] = useState(1);
  const { convertPrice } = useCurrency();
  const { t } = useLanguage();
  
  const productPriceEUR = 2850;

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Breadcrumb - Show only on desktop */}
      <div className="hidden lg:block">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/category/earrings">{t("earrings")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Pantheon</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Product title and price */}
      <div className="space-y-1 md:space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs md:text-sm font-light text-muted-foreground mb-0.5 md:mb-1">{t("earrings")}</p>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-light text-foreground">Pantheon</h1>
          </div>
          <div className="text-right">
            <p className="text-lg md:text-xl font-light text-foreground">{convertPrice(productPriceEUR)}</p>
          </div>
        </div>
      </div>

      {/* Product details */}
      <div className="space-y-3 md:space-y-4 py-3 md:py-4 border-b border-border">
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
          <p className="text-xs md:text-sm font-light text-muted-foreground">4.2g per earring</p>
        </div>
        
        <div className="space-y-1 md:space-y-2">
          <h3 className="text-xs md:text-sm font-light text-foreground">{t("editorsNotes")}</h3>
          <p className="text-xs md:text-sm font-light text-muted-foreground italic">"A modern interpretation of classical architecture, these earrings bridge timeless elegance with contemporary minimalism."</p>
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

        <Button 
          className="w-full h-11 md:h-12 bg-foreground text-background hover:bg-foreground/90 font-light rounded-none text-sm md:text-base"
        >
          {t("addToBag")}
        </Button>
      </div>
    </div>
  );
};

export default ProductInfo;
