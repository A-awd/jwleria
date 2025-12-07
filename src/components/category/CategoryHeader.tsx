import { Link } from "react-router-dom";
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
      'new-in': t('newIn'),
      'shop': t('shop'),
    };
    return categoryMap[slug.toLowerCase()] || slug.charAt(0).toUpperCase() + slug.slice(1);
  };

  const categoryName = getCategoryName(category);
  
  return (
    <section className="w-full px-6 mb-8">
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">{t('home')}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{categoryName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        
        <div>
          <h1 className="text-3xl md:text-4xl font-light text-foreground">
            {categoryName}
          </h1>
        </div>
    </section>
  );
};

export default CategoryHeader;
