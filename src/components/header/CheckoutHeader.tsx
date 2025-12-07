import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const CheckoutHeader = () => {
  const { t, direction } = useLanguage();
  const ChevronIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;
  
  return (
    <header className="w-full bg-background border-b border-muted-foreground/20" dir={direction}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="relative flex items-center justify-between">
          {/* Left side - Continue Shopping */}
          <Link 
            to="/" 
            className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors"
          >
            <ChevronIcon className="h-4 w-4" />
            <span className="text-sm font-light hidden sm:inline">{t("continueShopping")}</span>
          </Link>

          {/* Center - Logo - Absolutely positioned to ensure perfect centering */}
          <Link to="/" className="absolute left-1/2 transform -translate-x-1/2">
            <span className="text-xl font-light tracking-widest text-foreground">jWleria</span>
          </Link>

          {/* Right side - Support */}
          <div className="text-sm font-light text-foreground">
            {t("footerSupport")}
          </div>
        </div>
      </div>
    </header>
  );
};

export default CheckoutHeader;
