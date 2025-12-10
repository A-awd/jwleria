import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface CategoryHeaderProps {
  category: string;
}

// Category hero images - using gradients as fallback
const categoryImages: Record<string, string> = {
  rings: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1920&q=80",
  necklaces: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1920&q=80",
  earrings: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1920&q=80",
  bracelets: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1920&q=80",
  watches: "https://images.unsplash.com/photo-1587836374828-a05ac9c0b488?w=1920&q=80",
  bags: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1920&q=80",
  sunglasses: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=1920&q=80",
};

const CategoryHeader = ({ category }: CategoryHeaderProps) => {
  const { t } = useLanguage();
  
  // Map URL slugs to translation keys
  const getCategoryName = (slug: string) => {
    const categoryMap: Record<string, string> = {
      'rings': t('rings'),
      'necklaces': t('necklaces'),
      'earrings': t('earrings'),
      'bracelets': t('bracelets'),
      'watches': t('watches'),
      'bags': t('bags'),
      'sunglasses': t('sunglasses'),
      'new-in': t('newIn'),
      'shop': t('shop'),
    };
    return categoryMap[slug.toLowerCase()] || slug.charAt(0).toUpperCase() + slug.slice(1);
  };

  const categoryName = getCategoryName(category);
  const heroImage = categoryImages[category.toLowerCase()];
  
  return (
    <section className="w-full mb-8">
      {/* Hero Banner */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative w-full h-48 md:h-64 lg:h-80 overflow-hidden bg-gradient-to-br from-muted to-muted/50"
      >
        {heroImage && (
          <motion.img
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            src={heroImage}
            alt={categoryName}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Breadcrumb */}
            <Breadcrumb className="mb-3 md:mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/" className="text-foreground/70 hover:text-foreground text-sm">
                      {t('home')}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-foreground/50" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-foreground text-sm">{categoryName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            
            {/* Category Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-foreground tracking-wide">
              {categoryName}
            </h1>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default CategoryHeader;
