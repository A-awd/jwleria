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

// Default reviews for demo purposes
const defaultReviews: ProductReview[] = [
  {
    id: "1",
    author: "Sarah M.",
    rating: 5,
    content: "Absolutely stunning! The quality is exceptional and I get compliments every time I wear it.",
    date: "2024-01-15",
    verified: true,
  },
  {
    id: "2", 
    author: "Emma T.",
    rating: 4,
    content: "Beautiful craftsmanship and comfortable to wear all day. Highly recommend!",
    date: "2024-01-10",
    verified: true,
  },
  {
    id: "3",
    author: "Jessica R.",
    rating: 5,
    content: "A work of art. The minimalist design is elegant and sophisticated. Perfect packaging too.",
    date: "2024-01-05",
    verified: true,
  },
];

// Default care instructions
const defaultCareInstructions = [
  "Clean with a soft, dry cloth after each wear",
  "Avoid contact with perfumes, lotions, and cleaning products",
  "Store in the provided jewelry pouch when not wearing",
  "Remove before swimming, exercising, or showering",
];

const ProductDescriptionNew = ({ product }: ProductDescriptionProps) => {
  const { t } = useLanguage();
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCareOpen, setIsCareOpen] = useState(false);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);

  const reviews = defaultReviews;
  const careInstructions = defaultCareInstructions;
  const productDetails = {
    SKU: `JWL-${String(product.id).slice(-6).toUpperCase()}`,
    Collection: "Signature Collection",
    Material: product.material || "Premium Materials",
    Brand: product.brand,
  };

  // Calculate average rating
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 4.8;

  return (
    <div className="space-y-0 mt-8 border-t border-border">
      {/* Description */}
      <div className="border-b border-border">
        <Button
          variant="ghost"
          onClick={() => setIsDescriptionOpen(!isDescriptionOpen)}
          className="w-full h-14 px-0 justify-between hover:bg-transparent font-light rounded-none"
        >
          <span>Description</span>
          {isDescriptionOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        {isDescriptionOpen && (
          <div className="pb-6 space-y-4">
            <p className="text-sm font-light text-muted-foreground leading-relaxed">
              {product.description || `The ${product.name} by ${product.brand} embodies timeless elegance with exceptional craftsmanship. A perfect addition to any luxury collection.`}
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
          <span>Product Details</span>
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
              For professional cleaning, visit your local jeweler or contact our customer service team.
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
            <span>Customer Reviews</span>
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
            
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <CustomStar
                          key={star}
                          filled={star <= review.rating}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-light text-muted-foreground">
                      {review.author}
                      {review.verified && (
                        <span className="ml-1 text-emerald-600 dark:text-emerald-400">✓</span>
                      )}
                    </span>
                  </div>
                  <p className="text-sm font-light text-muted-foreground leading-relaxed">
                    "{review.content}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDescriptionNew;