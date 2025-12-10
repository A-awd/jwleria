import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    <div className="w-full lg:w-[55%]">
      {/* Desktop: Large vertical scrolling gallery */}
      <div className="hidden lg:block">
        <div className="space-y-2">
          {displayImages.map((image, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="w-full aspect-[4/5] overflow-hidden cursor-pointer group"
              onClick={() => handleImageClick(index)}
            >
              <motion.img
                src={image}
                alt={`${productName} - View ${index + 1}`}
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mobile: Image slider with smooth transitions */}
      <div className="lg:hidden">
        <div className="relative">
          <div 
            className="w-full aspect-square overflow-hidden cursor-pointer group touch-pan-y"
            onClick={() => handleImageClick(currentImageIndex)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImageIndex}
                src={displayImages[currentImageIndex]}
                alt={`${productName} - View ${currentImageIndex + 1}`}
                className="w-full h-full object-cover select-none"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              />
            </AnimatePresence>
          </div>
          
          {/* Thumbnail strip */}
          {displayImages.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2 px-1">
              {displayImages.map((image, index) => (
                <motion.button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 overflow-hidden border-2 transition-colors ${
                    index === currentImageIndex 
                      ? 'border-foreground' 
                      : 'border-transparent hover:border-muted-foreground/50'
                  }`}
                  whileTap={{ scale: 0.95 }}
                  aria-label={`View image ${index + 1}`}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </motion.button>
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
