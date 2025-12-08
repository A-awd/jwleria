import { useState, useRef } from "react";
import ImageZoom from "./ImageZoom";

interface ProductImageGalleryProps {
  images: string[];
  productName?: string;
}

const ProductImageGalleryNew = ({ images, productName = "Product" }: ProductImageGalleryProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomInitialIndex, setZoomInitialIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Fallback if no images provided
  const displayImages = images.length > 0 ? images : ["/placeholder.svg"];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  const handleImageClick = (index: number) => {
    setZoomInitialIndex(index);
    setIsZoomOpen(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const difference = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(difference) > minSwipeDistance) {
      if (difference > 0) {
        nextImage();
      } else {
        prevImage();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div className="w-full">
      {/* Desktop: Vertical scrolling gallery */}
      <div className="hidden lg:block">
        <div className="space-y-4">
          {displayImages.map((image, index) => (
            <div 
              key={index} 
              className="w-full aspect-square overflow-hidden cursor-pointer group"
              onClick={() => handleImageClick(index)}
            >
              <img
                src={image}
                alt={`${productName} - View ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: Image slider */}
      <div className="lg:hidden">
        <div className="relative">
          <div 
            className="w-full aspect-square overflow-hidden cursor-pointer group touch-pan-y"
            onClick={() => handleImageClick(currentImageIndex)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={displayImages[currentImageIndex]}
              alt={`${productName} - View ${currentImageIndex + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 select-none"
            />
          </div>
          
          {/* Dots indicator */}
          {displayImages.length > 1 && (
            <div className="flex justify-center mt-4 gap-2">
              {displayImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentImageIndex ? 'bg-foreground' : 'bg-muted'
                  }`}
                  aria-label={`View image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Zoom Modal */}
      <ImageZoom
        images={displayImages}
        initialIndex={zoomInitialIndex}
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
      />
    </div>
  );
};

export default ProductImageGalleryNew;
