import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReviewProduct from "./ReviewProduct";
import { useLanguage } from "@/i18n/LanguageContext";
import { Product } from "@/data/products";

interface ProductReview {
  id: string;
  author: string;
  rating: number;
  content: string;
  date: string;
  verified: boolean;
}

interface ProductDescriptionProps {
  product: Product;
}

const CustomStar = ({ filled, className }: { filled: boolean; className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 20 20" 
    fill="currentColor" 
    className={`w-3 h-3 ${filled ? 'text-foreground' : 'text-muted-foreground/30'} ${className}`}
  >
    <path 
      fillRule="evenodd" 
      d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" 
      clipRule="evenodd" 
    />
  </svg>
);

// Reviews and care instructions are provided via translation keys

const ProductDescriptionNew = ({ product }: ProductDescriptionProps) => {
  const { t } = useLanguage();
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCareOpen, setIsCareOpen] = useState(false);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);

  // Care instructions from translations
  const careInstructions = [
    t("careInstruction1"),
    t("careInstruction2"),
    t("careInstruction3"),
    t("careInstruction4"),
  ];

  const productDetails = {
    [t("sku")]: `JWL-${String(product.id).slice(-6).toUpperCase()}`,
    [t("collection")]: t("signatureCollection"),
    [t("material")]: product.material || t("premiumMaterials"),
    [t("brand")]: product.brand,
  };

  // Average rating (static for now)
  const averageRating = 4.8;

  return (
    <div className="space-y-0 mt-8 border-t border-border">
      {/* Description */}
      <div className="border-b border-border">
        <Button
          variant="ghost"
          onClick={() => setIsDescriptionOpen(!isDescriptionOpen)}
          className="w-full h-14 px-0 justify-between hover:bg-transparent font-light rounded-none"
        >
          <span>{t("productDescription")}</span>
          {isDescriptionOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        {isDescriptionOpen && (
          <div className="pb-6 space-y-4">
            <p className="text-sm font-light text-muted-foreground leading-relaxed">
              {product.description || t("defaultProductDescription")}
            </p>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="border-b border-border">
        <Button
          variant="ghost"
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="w-full h-14 px-0 justify-between hover:bg-transparent font-light rounded-none"
        >
          <span>{t("productDetails")}</span>
          {isDetailsOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        {isDetailsOpen && (
          <div className="pb-6 space-y-3">
            {Object.entries(productDetails).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-sm font-light text-muted-foreground">{key}</span>
                <span className="text-sm font-light text-foreground">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Care Instructions */}
      <div className="border-b border-border">
        <Button
          variant="ghost"
          onClick={() => setIsCareOpen(!isCareOpen)}
          className="w-full h-14 px-0 justify-between hover:bg-transparent font-light rounded-none"
        >
          <span>{t("careInstructions") || "Care & Cleaning"}</span>
          {isCareOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        {isCareOpen && (
          <div className="pb-6 space-y-4">
            <ul className="space-y-2">
              {careInstructions.map((instruction, index) => (
                <li key={index} className="text-sm font-light text-muted-foreground">
                  • {instruction}
                </li>
              ))}
            </ul>
            <p className="text-sm font-light text-muted-foreground">
              {t("careContactService")}
            </p>
          </div>
        )}
      </div>

      {/* Customer Reviews */}
      <div className="border-b border-border lg:mb-16">
        <Button
          variant="ghost"
          onClick={() => setIsReviewsOpen(!isReviewsOpen)}
          className="w-full h-14 px-0 justify-between hover:bg-transparent font-light rounded-none"
        >
          <div className="flex items-center gap-3">
            <span>{t("customerReviews")}</span>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <CustomStar
                  key={star}
                  filled={star <= Math.round(averageRating)}
                />
              ))}
              <span className="text-sm font-light text-muted-foreground ml-1">
                {averageRating.toFixed(1)}
              </span>
            </div>
          </div>
          {isReviewsOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        {isReviewsOpen && (
          <div className="pb-6 space-y-6">
            <ReviewProduct />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDescriptionNew;