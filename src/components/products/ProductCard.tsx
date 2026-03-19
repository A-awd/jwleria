import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  image: string;
  title: string;
  category: string;
  onClick: () => void;
}

const ProductCard = ({ image, title, category, onClick }: ProductCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      className="group text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
    >
      <div className="aspect-[3/4] overflow-hidden bg-secondary mb-3">
        <img
          src={image}
          alt={title}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={cn(
            "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
      <h3 className="text-sm font-medium text-foreground leading-tight line-clamp-2 mb-1">
        {title}
      </h3>
      {category && (
        <p className="text-xs text-muted-foreground">{category}</p>
      )}
    </button>
  );
};

export default ProductCard;
