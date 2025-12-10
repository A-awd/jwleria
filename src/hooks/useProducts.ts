// Native product hooks for jWleria catalog
import { allProducts, Product, getProductById, getProductsByBrand, getProductsByBrandSlug, getProductsByCategory, getBestSellers, getNewArrivals, getFeaturedProducts, searchProducts, categories, STANDARD_LEAD_TIME } from '@/data/products';

// Get all products
export function useAllProducts() {
  return {
    products: allProducts,
    isLoading: false,
    error: null,
  };
}

// Get product by ID
export function useProductById(id: number | string) {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const product = getProductById(numericId);
  
  return {
    product: product || null,
    isLoading: false,
    error: product ? null : 'Product not found',
  };
}

// Get products by brand slug
export function useProductsByBrandSlug(slug: string) {
  const products = getProductsByBrandSlug(slug);
  
  return {
    products,
    isLoading: false,
    error: null,
  };
}

// Get products by brand name
export function useProductsByBrand(brandName: string) {
  const products = getProductsByBrand(brandName);
  
  return {
    products,
    isLoading: false,
    error: null,
  };
}

// Get products by category key
export function useProductsByCategory(categoryKey: string) {
  const products = getProductsByCategory(categoryKey);
  
  return {
    products,
    isLoading: false,
    error: null,
  };
}

// Get best sellers
export function useBestSellers(count: number = 8) {
  const products = getBestSellers(count);
  
  return {
    products,
    isLoading: false,
    error: null,
  };
}

// Get new arrivals
export function useNewArrivals(count: number = 4) {
  const products = getNewArrivals(count);
  
  return {
    products,
    isLoading: false,
    error: null,
  };
}

// Get featured/editor's picks
export function useFeaturedProducts(count: number = 12) {
  const products = getFeaturedProducts(count);
  
  return {
    products,
    isLoading: false,
    error: null,
  };
}

// Search products
export function useSearchProducts(query: string) {
  const products = query ? searchProducts(query) : allProducts;
  
  return {
    products,
    isLoading: false,
    error: null,
  };
}

// Get all categories
export function useCategories() {
  return {
    categories,
    isLoading: false,
    error: null,
  };
}

// Get standard lead time
export function useLeadTime() {
  return {
    leadTime: STANDARD_LEAD_TIME,
    isLoading: false,
    error: null,
  };
}

// Filter products with multiple criteria
interface FilterOptions {
  brandSlug?: string;
  categoryKey?: string;
  minPrice?: number;
  maxPrice?: number;
  leadTime?: string;
  searchQuery?: string;
}

export function useFilteredProducts(options: FilterOptions) {
  let filteredProducts = [...allProducts];
  
  if (options.brandSlug) {
    filteredProducts = filteredProducts.filter(p => 
      p.brand.toLowerCase().replace(/\s+/g, '-').replace(/[&']/g, '') === options.brandSlug
    );
  }
  
  if (options.categoryKey && options.categoryKey !== 'shop' && options.categoryKey !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.categoryKey === options.categoryKey);
  }
  
  if (options.minPrice !== undefined) {
    filteredProducts = filteredProducts.filter(p => p.priceSAR >= options.minPrice!);
  }
  
  if (options.maxPrice !== undefined) {
    filteredProducts = filteredProducts.filter(p => p.priceSAR <= options.maxPrice!);
  }
  
  if (options.leadTime) {
    filteredProducts = filteredProducts.filter(p => p.leadTime === options.leadTime);
  }
  
  if (options.searchQuery) {
    const query = options.searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }
  
  return {
    products: filteredProducts,
    isLoading: false,
    error: null,
  };
}
