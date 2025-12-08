import { Link } from "react-router-dom";
import { useMemo, useRef, useEffect, useState } from "react";
import { luxuryBrands } from "@/data/products";

const BrandMarquee = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const animationRef = useRef<number | null>(null);
  const positionRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  const getBrandHandle = (brand: string) => {
    return brand.toLowerCase().replace(/[&\s]+/g, "-").replace(/\./g, "");
  };

  // Shuffle brands randomly on mount (using Fisher-Yates)
  const shuffledBrands = useMemo(() => {
    const arr = [...luxuryBrands];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  // Duplicate the shuffled array to create seamless loop
  const displayBrands = useMemo(() => {
    return [...shuffledBrands, ...shuffledBrands];
  }, [shuffledBrands]);

  // Animate with requestAnimationFrame for smooth infinite scroll
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const speed = 50; // pixels per second

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      if (!isPaused) {
        const delta = timestamp - lastTimeRef.current;
        positionRef.current += (speed * delta) / 1000;

        // Get the width of the first half (one set of brands)
        const halfWidth = track.scrollWidth / 2;

        // Reset position seamlessly when first half scrolls out
        if (positionRef.current >= halfWidth) {
          positionRef.current = positionRef.current - halfWidth;
        }

        track.style.transform = `translateX(-${positionRef.current}px)`;
      }

      lastTimeRef.current = timestamp;
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
      <div 
        ref={containerRef}
        className="relative overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        <div 
          ref={trackRef}
          className="flex items-center will-change-transform"
          style={{ transform: 'translateX(0)' }}
        >
          {displayBrands.map((brand, index) => (
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