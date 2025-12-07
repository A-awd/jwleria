import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const CheckoutHeader = () => {
  return (
    <header className="w-full bg-background border-b border-muted-foreground/20">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="relative flex items-center justify-between">
          {/* Left side - Continue Shopping */}
          <Link 
            to="/" 
            className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm font-light hidden sm:inline">Continue Shopping</span>
          </Link>

          {/* Center - Logo - Absolutely positioned to ensure perfect centering */}
          <Link to="/" className="absolute left-1/2 transform -translate-x-1/2">
            <img 
              src="/LINEA-1.svg" 
              alt="Linea Jewelry Inc" 
              className="h-6 w-auto"
            />
          </Link>

          {/* Right side - Support */}
          <div className="text-sm font-light text-foreground">
            Support
          </div>
        </div>
      </div>
    </header>
  );
};

export default CheckoutHeader;