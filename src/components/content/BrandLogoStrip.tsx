import { Link } from "react-router-dom";
import { luxuryBrands } from "@/data/products";

interface BrandLogoStripProps {
  className?: string;
}

const BrandLogoStrip = ({ className = "" }: BrandLogoStripProps) => {
  // Create brand handle from name
  const getBrandHandle = (brand: string) => {
    return brand.toLowerCase().replace(/[&\s]+/g, "-").replace(/\./g, "");
  };

  // Triple the brands array for truly seamless infinite loop
  const duplicatedBrands = [...luxuryBrands, ...luxuryBrands, ...luxuryBrands];

  return (
    <div className={`w-full py-4 md:py-6 overflow-hidden ${className}`}>
      {/* Marquee Container - minimal version with just logos */}
      <div className="relative overflow-hidden">
        <div 
          className="flex items-center whitespace-nowrap animate-marquee-smooth hover:[animation-play-state:paused]"
          style={{ width: 'max-content' }}
        >
          {duplicatedBrands.map((brand, index) => (
            <Link
              key={`${brand}-${index}`}
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