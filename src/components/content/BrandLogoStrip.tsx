import { Link } from "react-router-dom";
import { luxuryBrands } from "@/data/products";

interface BrandLogoStripProps {
  className?: string;
}

const BrandLogoStrip = ({ className = "" }: BrandLogoStripProps) => {
  const getBrandHandle = (brand: string) => {
    return brand.toLowerCase().replace(/[&\s]+/g, "-").replace(/\./g, "");
  };

  // Repeat brands 8 times for a very long seamless loop
  const repeatedBrands = [
    ...luxuryBrands, ...luxuryBrands, ...luxuryBrands, ...luxuryBrands,
    ...luxuryBrands, ...luxuryBrands, ...luxuryBrands, ...luxuryBrands,
  ];

  return (
    <div className={`w-full py-4 md:py-6 overflow-hidden ${className}`}>
      <div className="relative overflow-hidden group">
        <div className="flex items-center animate-marquee-slow group-hover:[animation-play-state:paused]">
          {repeatedBrands.map((brand, index) => (
            <Link
              key={`brand-${index}`}
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
