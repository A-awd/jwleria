import { useQuery } from '@tanstack/react-query';
import { shopifyClient } from '@/lib/shopify';
import { ProductData, mapLegacyProduct } from '@/types/shopify';
import { allProducts, getBestSellers, getNewArrivals, getFeaturedProducts } from '@/data/products';

// Hook for fetching all products from Shopify
export function useShopifyProducts(options?: {
  first?: number;
  query?: string;
  enabled?: boolean;
}) {
  const { first = 50, query, enabled = true } = options || {};
  const isConfigured = shopifyClient.isConfigured();

  return useQuery({
    queryKey: ['shopify-products', first, query],
    queryFn: async () => {
      if (!isConfigured) {
        // Fallback to local data
        return {
          products: allProducts.map(mapLegacyProduct),
          pageInfo: { hasNextPage: false, endCursor: null },
          isFromShopify: false,
        };
      }

      try {
        const result = await shopifyClient.getProducts({ first, query });
        return {
          products: result.products,
          pageInfo: result.pageInfo,
          isFromShopify: true,
        };
      } catch (error) {
        console.error('Failed to fetch from Shopify, using fallback:', error);
        return {
          products: allProducts.map(mapLegacyProduct),
          pageInfo: { hasNextPage: false, endCursor: null },
          isFromShopify: false,
        };
      }
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Hook for fetching collection products from Shopify
export function useShopifyCollection(collectionHandle: string, options?: {
  first?: number;
  enabled?: boolean;
}) {
  const { first = 50, enabled = true } = options || {};
  const isConfigured = shopifyClient.isConfigured();

  return useQuery({
    queryKey: ['shopify-collection', collectionHandle, first],
    queryFn: async () => {
      if (!isConfigured) {
        // Fallback to local data filtered by category-like logic
        return {
          collection: null,
          products: allProducts.map(mapLegacyProduct),
          pageInfo: { hasNextPage: false, endCursor: null },
          isFromShopify: false,
        };
      }

      try {
        const result = await shopifyClient.getCollectionProducts(collectionHandle, { first });
        if (!result) {
          return {
            collection: null,
            products: allProducts.map(mapLegacyProduct),
            pageInfo: { hasNextPage: false, endCursor: null },
            isFromShopify: false,
          };
        }
        return {
          collection: result.collection,
          products: result.products,
          pageInfo: result.pageInfo,
          isFromShopify: true,
        };
      } catch (error) {
        console.error('Failed to fetch collection from Shopify:', error);
        return {
          collection: null,
          products: allProducts.map(mapLegacyProduct),
          pageInfo: { hasNextPage: false, endCursor: null },
          isFromShopify: false,
        };
      }
    },
    enabled: enabled && Boolean(collectionHandle),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

// Hook for best sellers (uses collection or tag-based query)
export function useBestSellers(count: number = 8) {
  const isConfigured = shopifyClient.isConfigured();

  return useQuery({
    queryKey: ['shopify-best-sellers', count],
    queryFn: async () => {
      if (!isConfigured) {
        return {
          products: getBestSellers(count).map(mapLegacyProduct),
          isFromShopify: false,
        };
      }

      try {
        // Try to get from "best-sellers" collection first
        const collectionResult = await shopifyClient.getCollectionProducts('best-sellers', { first: count });
        if (collectionResult && collectionResult.products.length > 0) {
          return {
            products: collectionResult.products,
            isFromShopify: true,
          };
        }

        // Fallback: get regular products
        const result = await shopifyClient.getProducts({ first: count });
        return {
          products: result.products,
          isFromShopify: true,
        };
      } catch (error) {
        console.error('Failed to fetch best sellers:', error);
        return {
          products: getBestSellers(count).map(mapLegacyProduct),
          isFromShopify: false,
        };
      }
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

// Hook for new arrivals
export function useNewArrivals(count: number = 4) {
  const isConfigured = shopifyClient.isConfigured();

  return useQuery({
    queryKey: ['shopify-new-arrivals', count],
    queryFn: async () => {
      if (!isConfigured) {
        return {
          products: getNewArrivals(count).map(mapLegacyProduct),
          isFromShopify: false,
        };
      }

      try {
        // Try to get from "new-arrivals" collection
        const collectionResult = await shopifyClient.getCollectionProducts('new-arrivals', { first: count });
        if (collectionResult && collectionResult.products.length > 0) {
          return {
            products: collectionResult.products,
            isFromShopify: true,
          };
        }

        // Fallback: get products sorted by created date (newest)
        const result = await shopifyClient.getProducts({ first: count, query: 'available_for_sale:true' });
        return {
          products: result.products,
          isFromShopify: true,
        };
      } catch (error) {
        console.error('Failed to fetch new arrivals:', error);
        return {
          products: getNewArrivals(count).map(mapLegacyProduct),
          isFromShopify: false,
        };
      }
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

// Hook for featured/editors picks
export function useFeaturedProducts(count: number = 12) {
  const isConfigured = shopifyClient.isConfigured();

  return useQuery({
    queryKey: ['shopify-featured', count],
    queryFn: async () => {
      if (!isConfigured) {
        return {
          products: getFeaturedProducts(count).map(mapLegacyProduct),
          isFromShopify: false,
        };
      }

      try {
        // Try "featured" collection first
        const collectionResult = await shopifyClient.getCollectionProducts('featured', { first: count });
        if (collectionResult && collectionResult.products.length > 0) {
          return {
            products: collectionResult.products,
            isFromShopify: true,
          };
        }

        // Fallback to general products
        const result = await shopifyClient.getProducts({ first: count });
        return {
          products: result.products,
          isFromShopify: true,
        };
      } catch (error) {
        console.error('Failed to fetch featured products:', error);
        return {
          products: getFeaturedProducts(count).map(mapLegacyProduct),
          isFromShopify: false,
        };
      }
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

// Check if Shopify is configured
export function useShopifyStatus() {
  return {
    isConfigured: shopifyClient.isConfigured(),
    storeDomain: import.meta.env.VITE_SHOPIFY_STORE_DOMAIN || '',
  };
}
