// Shopify Storefront API Client
// Configure with your store's domain and Storefront API access token

import { ShopifyProduct, mapShopifyProduct, ProductData } from '@/types/shopify';

interface ShopifyConfig {
  storeDomain: string;
  storefrontAccessToken: string;
  apiVersion?: string;
}

// Default config - replace with your actual Shopify store credentials
const defaultConfig: ShopifyConfig = {
  storeDomain: import.meta.env.VITE_SHOPIFY_STORE_DOMAIN || '',
  storefrontAccessToken: import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN || '',
  apiVersion: '2024-01',
};

// GraphQL Fragments
const PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    descriptionHtml
    vendor
    productType
    tags
    availableForSale
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 10) {
      edges {
        node {
          id
          url
          altText
          width
          height
        }
      }
    }
    variants(first: 100) {
      edges {
        node {
          id
          title
          availableForSale
          sku
          price {
            amount
            currencyCode
          }
          compareAtPrice {
            amount
            currencyCode
          }
          selectedOptions {
            name
            value
          }
          image {
            id
            url
            altText
            width
            height
          }
        }
      }
    }
    metafields(identifiers: [
      { namespace: "custom", key: "material" },
      { namespace: "custom", key: "dimensions" },
      { namespace: "custom", key: "weight" },
      { namespace: "custom", key: "editors_notes" },
      { namespace: "custom", key: "care_instructions" }
    ]) {
      key
      value
      type
      namespace
    }
    collections(first: 5) {
      edges {
        node {
          id
          handle
          title
        }
      }
    }
  }
`;

// GraphQL Queries
const PRODUCT_BY_HANDLE_QUERY = `
  ${PRODUCT_FRAGMENT}
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      ...ProductFields
    }
  }
`;

const PRODUCT_BY_ID_QUERY = `
  ${PRODUCT_FRAGMENT}
  query ProductById($id: ID!) {
    product(id: $id) {
      ...ProductFields
    }
  }
`;

const PRODUCTS_QUERY = `
  ${PRODUCT_FRAGMENT}
  query Products($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          ...ProductFields
        }
      }
    }
  }
`;

const COLLECTION_PRODUCTS_QUERY = `
  ${PRODUCT_FRAGMENT}
  query CollectionProducts($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            ...ProductFields
          }
        }
      }
    }
  }
`;

// API Response Types
interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface ProductByHandleResponse {
  product: ShopifyProduct | null;
}

interface ProductByIdResponse {
  product: ShopifyProduct | null;
}

interface ProductsResponse {
  products: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    edges: Array<{ node: ShopifyProduct }>;
  };
}

interface CollectionProductsResponse {
  collection: {
    id: string;
    handle: string;
    title: string;
    description: string;
    products: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      edges: Array<{ node: ShopifyProduct }>;
    };
  } | null;
}

// Shopify Client Class
class ShopifyClient {
  private config: ShopifyConfig;

  constructor(config: ShopifyConfig = defaultConfig) {
    this.config = config;
  }

  private get endpoint(): string {
    return `https://${this.config.storeDomain}/api/${this.config.apiVersion}/graphql.json`;
  }

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': this.config.storefrontAccessToken,
    };
  }

  async query<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    if (!this.config.storeDomain || !this.config.storefrontAccessToken) {
      throw new Error('Shopify store domain and Storefront API token are required');
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const json: GraphQLResponse<T> = await response.json();

    // Only throw if there are errors AND no data was returned
    // Shopify sometimes returns partial data with non-critical errors
    if (json.errors && json.errors.length > 0 && !json.data) {
      throw new Error(`Shopify GraphQL error: ${json.errors.map(e => e.message).join(', ')}`);
    }

    if (!json.data) {
      throw new Error('No data returned from Shopify API');
    }

    return json.data;
  }

  // Fetch single product by handle (URL slug)
  async getProductByHandle(handle: string): Promise<ProductData | null> {
    const data = await this.query<ProductByHandleResponse>(PRODUCT_BY_HANDLE_QUERY, { handle });
    return data.product ? mapShopifyProduct(data.product) : null;
  }

  // Fetch single product by Shopify ID
  async getProductById(id: string): Promise<ProductData | null> {
    const data = await this.query<ProductByIdResponse>(PRODUCT_BY_ID_QUERY, { id });
    return data.product ? mapShopifyProduct(data.product) : null;
  }

  // Fetch multiple products with optional search query
  async getProducts(options: {
    first?: number;
    after?: string;
    query?: string;
  } = {}): Promise<{
    products: ProductData[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  }> {
    const { first = 20, after, query } = options;
    const data = await this.query<ProductsResponse>(PRODUCTS_QUERY, { first, after, query });
    
    return {
      products: data.products.edges.map(edge => mapShopifyProduct(edge.node)),
      pageInfo: data.products.pageInfo,
    };
  }

  // Fetch products from a collection by handle
  async getCollectionProducts(
    collectionHandle: string,
    options: { first?: number; after?: string } = {}
  ): Promise<{
    collection: { id: string; handle: string; title: string; description: string } | null;
    products: ProductData[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  } | null> {
    const { first = 20, after } = options;
    const data = await this.query<CollectionProductsResponse>(COLLECTION_PRODUCTS_QUERY, {
      handle: collectionHandle,
      first,
      after,
    });

    if (!data.collection) {
      return null;
    }

    return {
      collection: {
        id: data.collection.id,
        handle: data.collection.handle,
        title: data.collection.title,
        description: data.collection.description,
      },
      products: data.collection.products.edges.map(edge => mapShopifyProduct(edge.node)),
      pageInfo: data.collection.products.pageInfo,
    };
  }

  // Check if client is configured
  isConfigured(): boolean {
    return Boolean(this.config.storeDomain && this.config.storefrontAccessToken);
  }
}

// Create and export singleton instance
export const shopifyClient = new ShopifyClient();

// Export class for custom instances
export { ShopifyClient };

// Export queries for advanced usage
export const queries = {
  PRODUCT_BY_HANDLE_QUERY,
  PRODUCT_BY_ID_QUERY,
  PRODUCTS_QUERY,
  COLLECTION_PRODUCTS_QUERY,
  PRODUCT_FRAGMENT,
};
