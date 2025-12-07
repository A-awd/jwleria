import { useState, useEffect } from "react";
import { ShoppingBag } from "lucide-react";

interface FloatingCartButtonProps {
  itemCount: number;
  onClick: () => void;
}

const FloatingCartButton = ({ itemCount, onClick }: FloatingCartButtonProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling 200px
      setIsVisible(window.scrollY > 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <button
      onClick={onClick}
      className="lg:hidden fixed bottom-6 right-4 z-40 bg-foreground text-background p-3.5 rounded-full shadow-lg animate-fade-in transition-all duration-300 hover:scale-105 active:scale-95"
      aria-label="Shopping bag"
    >
      <ShoppingBag className="w-5 h-5" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-semibold w-5 h-5 rounded-full flex items-center justify-center">
          {itemCount}
        </span>
      )}
    </button>
  );
};

export default FloatingCartButton;
