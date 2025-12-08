import { Link } from "react-router-dom";
import { luxuryBrands } from "@/data/products";

interface BrandLogoStripProps {
  className?: string;
}

const BrandLogoStrip = ({ className = "" }: BrandLogoStripProps) => {
  const getBrandHandle = (brand: string) => {
    return brand.toLowerCase().replace(/[&\s]+/g, "-").replace(/\./g, "");
  };

  // Create two identical sets for seamless infinite loop
  const brandsSet = [...luxuryBrands];

  return (
    <div className={`w-full py-4 md:py-6 overflow-hidden ${className}`}>
      <div className="relative overflow-hidden">
        <div 
          className="flex items-center animate-marquee-infinite hover:[animation-play-state:paused]"
        >
          {/* First set */}
          {brandsSet.map((brand, index) => (
            <Link
              key={`set1-${brand}-${index}`}
              to={`/brand/${getBrandHandle(brand)}`}
              className="flex-shrink-0 px-5 md:px-8 lg:px-12"
            >
              <span className="text-xs md:text-sm lg:text-base font-light text-foreground/25 hover:text-foreground/60 transition-colors duration-300 whitespace-nowrap tracking-wide">
                {brand}
              </span>
            </Link>
          ))}
          {/* Second set (duplicate for seamless loop) */}
          {brandsSet.map((brand, index) => (
            <Link
              key={`set2-${brand}-${index}`}
              to={`/brand/${getBrandHandle(brand)}`}
              className="flex-shrink-0 px-5 md:px-8 lg:px-12"
            >
              <span className="text-xs md:text-sm lg:text-base font-light text-foreground/25 hover:text-foreground/60 transition-colors duration-300 whitespace-nowrap tracking-wide">
                {brand}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BrandLogoStrip;