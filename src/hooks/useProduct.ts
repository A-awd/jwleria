import { useQuery } from '@tanstack/react-query';
import { shopifyClient } from '@/lib/shopify';
import { ProductData, mapLegacyProduct } from '@/types/shopify';
import { allProducts } from '@/data/products';

interface UseProductOptions {
  // Fetch by handle (URL slug) or by Shopify ID
  handle?: string;
  id?: string;
  // Legacy product ID for fallback
  legacyId?: number;
  // Whether to use legacy data as fallback when Shopify is not configured
  useLegacyFallback?: boolean;
  // React Query options
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

interface UseProductResult {
  product: ProductData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isFromLegacy: boolean;
}

export function useProduct({
  handle,
  id,
  legacyId,
  useLegacyFallback = true,
  enabled = true,
  staleTime = 1000 * 60 * 5, // 5 minutes
  cacheTime = 1000 * 60 * 30, // 30 minutes
}: UseProductOptions): UseProductResult {
  const isShopifyConfigured = shopifyClient.isConfigured();
  const shouldFetchFromShopify = isShopifyConfigured && (handle || id);

  // Query for Shopify data
  const shopifyQuery = useQuery({
    queryKey: ['shopify-product', handle, id],
    queryFn: async (): Promise<ProductData | null> => {
      if (handle) {
        return shopifyClient.getProductByHandle(handle);
      }
      if (id) {
        return shopifyClient.getProductById(id);
      }
      return null;
    },
    enabled: Boolean(enabled && shouldFetchFromShopify),
    staleTime,
    gcTime: cacheTime,
    retry: 2,
  });

  // If Shopify is not configured or we need fallback, use legacy data
  const getLegacyProduct = (): ProductData | null => {
    if (!useLegacyFallback) return null;

    let legacyProduct = null;

    // Try to find by legacy ID first
    if (legacyId) {
      legacyProduct = allProducts.find(p => p.id === legacyId);
    }

    // Try to find by handle (converted from name)
    if (!legacyProduct && handle) {
      legacyProduct = allProducts.find(
        p => p.name.toLowerCase().replace(/\s+/g, '-') === handle
      );
    }

    if (legacyProduct) {
      return mapLegacyProduct(legacyProduct);
    }

    return null;
  };

  // Determine final product data
  const isFromLegacy = !shouldFetchFromShopify || (shopifyQuery.isError && useLegacyFallback);
  const product = isFromLegacy ? getLegacyProduct() : shopifyQuery.data ?? null;

  return {
    product,
    isLoading: shouldFetchFromShopify ? shopifyQuery.isLoading : false,
    isError: shouldFetchFromShopify ? shopifyQuery.isError : false,
    error: shopifyQuery.error as Error | null,
    refetch: shopifyQuery.refetch,
    isFromLegacy,
  };
}

// Hook for fetching multiple products
interface UseProductsOptions {
  query?: string;
  first?: number;
  collectionHandle?: string;
  useLegacyFallback?: boolean;
  enabled?: boolean;
}

interface UseProductsResult {
  products: ProductData[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFromLegacy: boolean;
}

export function useProducts({
  query,
  first = 20,
  collectionHandle,
  useLegacyFallback = true,
  enabled = true,
}: UseProductsOptions = {}): UseProductsResult {
  const isShopifyConfigured = shopifyClient.isConfigured();

  const shopifyQuery = useQuery({
    queryKey: ['shopify-products', query, first, collectionHandle],
    queryFn: async (): Promise<{ products: ProductData[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } | null> => {
      if (collectionHandle) {
        const result = await shopifyClient.getCollectionProducts(collectionHandle, { first });
        return result ? { products: result.products, pageInfo: result.pageInfo } : null;
      }
      return shopifyClient.getProducts({ first, query });
    },
    enabled: Boolean(enabled && isShopifyConfigured),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  // Fallback to legacy products
  const getLegacyProducts = (): ProductData[] => {
    if (!useLegacyFallback) return [];

    let filtered = [...allProducts];

    // Filter by query (search in name, brand, category)
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.brand.toLowerCase().includes(lowerQuery) ||
          p.category.toLowerCase().includes(lowerQuery)
      );
    }

    return filtered.slice(0, first).map(mapLegacyProduct);
  };

  const isFromLegacy = !isShopifyConfigured || (shopifyQuery.isError && useLegacyFallback);
  const products = isFromLegacy
    ? getLegacyProducts()
    : shopifyQuery.data?.products ?? [];

  return {
    products,
    isLoading: isShopifyConfigured ? shopifyQuery.isLoading : false,
    isError: isShopifyConfigured ? shopifyQuery.isError : false,
    error: shopifyQuery.error as Error | null,
    hasNextPage: shopifyQuery.data?.pageInfo?.hasNextPage ?? false,
    fetchNextPage: () => {
      // TODO: Implement pagination with cursor
      shopifyQuery.refetch();
    },
    isFromLegacy,
  };
}

export default useProduct;
