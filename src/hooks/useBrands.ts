// Native brand hooks for jWleria catalog
import { brands, Brand, getBrandBySlug, getBrandById, getBrandByName, getBrandsByCategory } from '@/data/brands';

// Get all brands
export function useAllBrands() {
  return {
    brands,
    isLoading: false,
    error: null,
  };
}

// Get brand by slug
export function useBrandBySlug(slug: string) {
  const brand = getBrandBySlug(slug);
  
  return {
    brand: brand || null,
    isLoading: false,
    error: brand ? null : 'Brand not found',
  };
}

// Get brand by ID
export function useBrandById(id: string) {
  const brand = getBrandById(id);
  
  return {
    brand: brand || null,
    isLoading: false,
    error: brand ? null : 'Brand not found',
  };
}

// Get brand by name
export function useBrandByName(name: string) {
  const brand = getBrandByName(name);
  
  return {
    brand: brand || null,
    isLoading: false,
    error: brand ? null : 'Brand not found',
  };
}

// Get brands by category
export function useBrandsByCategory(category: Brand["category"]) {
  const filteredBrands = getBrandsByCategory(category);
  
  return {
    brands: filteredBrands,
    isLoading: false,
    error: null,
  };
}

// Get brands grouped by category
export function useBrandsGroupedByCategory() {
  const grouped = brands.reduce((acc, brand) => {
    if (!acc[brand.category]) {
      acc[brand.category] = [];
    }
    acc[brand.category].push(brand);
    return acc;
  }, {} as Record<Brand["category"], Brand[]>);
  
  return {
    groupedBrands: grouped,
    isLoading: false,
    error: null,
  };
}
