import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { luxuryBrands } from "@/data/products";

const BrandMarquee = () => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollPositionRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  const getBrandHandle = (brand: string) => {
    return brand.toLowerCase().replace(/[&\s]+/g, "-").replace(/\./g, "");
  };

  // Quadruple the brands for extra seamless looping
  const allBrands = [...luxuryBrands, ...luxuryBrands, ...luxuryBrands, ...luxuryBrands];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollSpeed = 0.5; // pixels per frame
    
    const animate = () => {
      if (!isPaused && container) {
        scrollPositionRef.current += scrollSpeed;
        
        // Get the width of one set of brands (1/4 of total since we quadrupled)
        const singleSetWidth = container.scrollWidth / 4;
        
        // When we've scrolled past one complete set, reset to create infinite loop
        if (scrollPositionRef.current >= singleSetWidth) {
          scrollPositionRef.current = 0;
        }
        
        container.style.transform = `translateX(-${scrollPositionRef.current}px)`;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused]);

  return (
    <section className="w-full py-6 md:py-8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 mb-6">
        <h2 className="text-xs md:text-sm font-light text-foreground/60 uppercase tracking-widest text-center">
          {t("shopByBrand")}
        </h2>
      </div>

      <div 
        className="relative overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div 
          ref={containerRef}
          className="flex items-center will-change-transform"
          style={{ transition: isPaused ? 'none' : 'none' }}
        >
          {allBrands.map((brand, index) => (
            <Link
              key={`brand-${index}`}
              to={`/brand/${getBrandHandle(brand)}`}
              className="flex-shrink-0 px-6 md:px-10 lg:px-14"
            >
              <span className="text-sm md:text-base lg:text-lg font-light text-foreground/30 hover:text-foreground/70 transition-colors duration-300 whitespace-nowrap tracking-wide">
                {brand}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandMarquee;