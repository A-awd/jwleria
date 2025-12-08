// Shopify Storefront API compatible types
// These types mirror Shopify's GraphQL Storefront API schema

export interface ShopifyMoney {
  amount: string;
  currencyCode: string;
}

export interface ShopifyImage {
  id: string;
  url: string;
  altText: string | null;
  width?: number;
  height?: number;
}

export interface ShopifyProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable?: number;
  sku?: string;
  price: ShopifyMoney;
  compareAtPrice?: ShopifyMoney | null;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
  image?: ShopifyImage;
}

export interface ShopifyMetafield {
  key: string;
  value: string;
  type: string;
  namespace: string;
}

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  vendor: string; // Brand name in Shopify
  productType: string; // Category
  tags: string[];
  availableForSale: boolean;
  priceRange: {
    minVariantPrice: ShopifyMoney;
    maxVariantPrice: ShopifyMoney;
  };
  compareAtPriceRange?: {
    minVariantPrice: ShopifyMoney;
    maxVariantPrice: ShopifyMoney;
  };
  images: {
    edges: Array<{
      node: ShopifyImage;
    }>;
  };
  variants: {
    edges: Array<{
      node: ShopifyProductVariant;
    }>;
  };
  metafields?: ShopifyMetafield[];
  // Custom fields for jWleria
  collections?: {
    edges: Array<{
      node: {
        id: string;
        handle: string;
        title: string;
      };
    }>;
  };
}

// Simplified product type for UI components (mapped from Shopify data)
export interface ProductData {
  id: string;
  handle: string;
  name: string;
  brand: string;
  category: string;
  categoryKey: string;
  description: string;
  descriptionHtml?: string;
  price: number;
  currencyCode: string;
  compareAtPrice?: number;
  images: string[];
  isAvailable: boolean;
  isReadyToShip?: boolean;
  isPreOrder?: boolean;
  sku?: string;
  material?: string;
  dimensions?: string;
  weight?: string;
  editorsNotes?: string;
  variants?: ProductVariant[];
  reviews?: ProductReview[];
  careInstructions?: string[];
  productDetails?: Record<string, string>;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  available: boolean;
  sku?: string;
  options: Record<string, string>;
  image?: string;
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  content: string;
  date: string;
  verified?: boolean;
}

// Cart types (Shopify-compatible)
export interface CartLineItem {
  id: string;
  variantId: string;
  productId: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  price: number;
  image?: string;
  handle: string;
}

export interface Cart {
  id: string;
  lines: CartLineItem[];
  totalQuantity: number;
  subtotal: ShopifyMoney;
  checkoutUrl?: string;
}

// Helper function to map legacy Product to ProductData
export function mapLegacyProduct(product: {
  id: number;
  name: string;
  brand: string;
  category: string;
  categoryKey: string;
  priceEUR: number;
  image: string;
  isNew?: boolean;
  isReadyToShip?: boolean;
  isPreOrder?: boolean;
  description?: string;
  sku?: string;
}): ProductData {
  return {
    id: String(product.id),
    handle: product.name.toLowerCase().replace(/\s+/g, '-'),
    name: product.name,
    brand: product.brand,
    category: product.category,
    categoryKey: product.categoryKey,
    description: product.description || '',
    price: product.priceEUR,
    currencyCode: 'EUR',
    images: [product.image],
    isAvailable: true,
    isReadyToShip: product.isReadyToShip,
    isPreOrder: product.isPreOrder,
    sku: product.sku,
  };
}

// Helper to map Shopify API response to ProductData
export function mapShopifyProduct(shopifyProduct: ShopifyProduct): ProductData {
  const images = shopifyProduct.images.edges.map(edge => edge.node.url);
  const firstVariant = shopifyProduct.variants.edges[0]?.node;
  
  // Extract custom metafields
  const getMetafield = (key: string): string | undefined => {
    return shopifyProduct.metafields?.find(m => m.key === key)?.value;
  };

  return {
    id: shopifyProduct.id,
    handle: shopifyProduct.handle,
    name: shopifyProduct.title,
    brand: shopifyProduct.vendor,
    category: shopifyProduct.productType,
    categoryKey: shopifyProduct.productType.toLowerCase().replace(/\s+/g, '-'),
    description: shopifyProduct.description,
    descriptionHtml: shopifyProduct.descriptionHtml,
    price: parseFloat(shopifyProduct.priceRange.minVariantPrice.amount),
    currencyCode: shopifyProduct.priceRange.minVariantPrice.currencyCode,
    compareAtPrice: shopifyProduct.compareAtPriceRange?.minVariantPrice 
      ? parseFloat(shopifyProduct.compareAtPriceRange.minVariantPrice.amount) 
      : undefined,
    images,
    isAvailable: shopifyProduct.availableForSale,
    isReadyToShip: shopifyProduct.tags.includes('ready-to-ship'),
    isPreOrder: shopifyProduct.tags.includes('pre-order'),
    sku: firstVariant?.sku,
    material: getMetafield('material'),
    dimensions: getMetafield('dimensions'),
    weight: getMetafield('weight'),
    editorsNotes: getMetafield('editors_notes'),
    variants: shopifyProduct.variants.edges.map(edge => ({
      id: edge.node.id,
      title: edge.node.title,
      price: parseFloat(edge.node.price.amount),
      compareAtPrice: edge.node.compareAtPrice 
        ? parseFloat(edge.node.compareAtPrice.amount) 
        : undefined,
      available: edge.node.availableForSale,
      sku: edge.node.sku,
      options: edge.node.selectedOptions.reduce((acc, opt) => {
        acc[opt.name] = opt.value;
        return acc;
      }, {} as Record<string, string>),
      image: edge.node.image?.url,
    })),
  };
}
