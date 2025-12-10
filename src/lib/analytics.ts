// Analytics tracking for jWleria
// Supports GA4, Meta Pixel, TikTok Pixel, and Snapchat Pixel

import { STORE_CONFIG } from '@/config/store';

// Declare global types for analytics libraries
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: {
      track: (...args: unknown[]) => void;
      page: () => void;
    };
    snaptr?: (...args: unknown[]) => void;
  }
}

// Check if analytics IDs are configured
const hasGA4 = () => Boolean(STORE_CONFIG.analytics.googleAnalyticsId);
const hasMetaPixel = () => Boolean(STORE_CONFIG.analytics.metaPixelId);
const hasTikTokPixel = () => Boolean(STORE_CONFIG.analytics.tiktokPixelId);
const hasSnapchatPixel = () => Boolean(STORE_CONFIG.analytics.snapchatPixelId);

// Track page view
export function trackPageView(pagePath?: string) {
  const path = pagePath || window.location.pathname;
  
  // GA4
  if (hasGA4() && window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: document.title,
    });
  }
  
  // Meta Pixel
  if (hasMetaPixel() && window.fbq) {
    window.fbq('track', 'PageView');
  }
  
  // TikTok Pixel
  if (hasTikTokPixel() && window.ttq) {
    window.ttq.page();
  }
  
  // Snapchat Pixel
  if (hasSnapchatPixel() && window.snaptr) {
    window.snaptr('track', 'PAGE_VIEW');
  }
  
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log('[Analytics] jw_page_view', { path });
  }
}

// Track product view
export function trackProductView(product: {
  id: number | string;
  name: string;
  brand: string;
  category: string;
  price: number;
}) {
  // GA4
  if (hasGA4() && window.gtag) {
    window.gtag('event', 'view_item', {
      currency: 'SAR',
      value: product.price,
      items: [{
        item_id: String(product.id),
        item_name: product.name,
        item_brand: product.brand,
        item_category: product.category,
        price: product.price,
      }],
    });
  }
  
  // Meta Pixel
  if (hasMetaPixel() && window.fbq) {
    window.fbq('track', 'ViewContent', {
      content_ids: [String(product.id)],
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'SAR',
    });
  }
  
  // TikTok Pixel
  if (hasTikTokPixel() && window.ttq) {
    window.ttq.track('ViewContent', {
      content_id: String(product.id),
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'SAR',
    });
  }
  
  // Snapchat Pixel
  if (hasSnapchatPixel() && window.snaptr) {
    window.snaptr('track', 'VIEW_CONTENT', {
      item_ids: [String(product.id)],
      price: product.price,
      currency: 'SAR',
    });
  }
  
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log('[Analytics] jw_product_view', product);
  }
}

// Track brand page view
export function trackBrandView(brand: {
  id: string;
  name: string;
  category: string;
}) {
  // GA4
  if (hasGA4() && window.gtag) {
    window.gtag('event', 'jw_brand_view', {
      brand_id: brand.id,
      brand_name: brand.name,
      brand_category: brand.category,
    });
  }
  
  // Meta Pixel
  if (hasMetaPixel() && window.fbq) {
    window.fbq('trackCustom', 'BrandView', {
      brand_id: brand.id,
      brand_name: brand.name,
    });
  }
  
  // TikTok Pixel
  if (hasTikTokPixel() && window.ttq) {
    window.ttq.track('BrandView', {
      brand_id: brand.id,
      brand_name: brand.name,
    });
  }
  
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log('[Analytics] jw_brand_view', brand);
  }
}

// Track WhatsApp click (most important event)
export function trackWhatsAppClick(context: {
  type: 'product' | 'brand' | 'general';
  productId?: number | string;
  productName?: string;
  brandName?: string;
  price?: number;
}) {
  // GA4
  if (hasGA4() && window.gtag) {
    window.gtag('event', 'jw_whatsapp_click', {
      click_type: context.type,
      product_id: context.productId,
      product_name: context.productName,
      brand_name: context.brandName,
      value: context.price,
      currency: 'SAR',
    });
  }
  
  // Meta Pixel - Contact event
  if (hasMetaPixel() && window.fbq) {
    window.fbq('track', 'Contact', {
      content_name: context.productName || context.brandName || 'General Inquiry',
      content_category: context.type,
      value: context.price,
      currency: 'SAR',
    });
  }
  
  // TikTok Pixel
  if (hasTikTokPixel() && window.ttq) {
    window.ttq.track('Contact', {
      content_id: context.productId ? String(context.productId) : undefined,
      content_name: context.productName,
      value: context.price,
      currency: 'SAR',
    });
  }
  
  // Snapchat Pixel
  if (hasSnapchatPixel() && window.snaptr) {
    window.snaptr('track', 'START_CHECKOUT', {
      item_ids: context.productId ? [String(context.productId)] : [],
      price: context.price,
      currency: 'SAR',
    });
  }
  
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log('[Analytics] jw_whatsapp_click', context);
  }
}

// Track product list view (for category pages)
export function trackProductListView(products: Array<{
  id: number | string;
  name: string;
  brand: string;
  price: number;
}>, listName: string) {
  // GA4
  if (hasGA4() && window.gtag) {
    window.gtag('event', 'view_item_list', {
      item_list_name: listName,
      items: products.map((p, index) => ({
        item_id: String(p.id),
        item_name: p.name,
        item_brand: p.brand,
        price: p.price,
        index,
      })),
    });
  }
  
  // Meta Pixel
  if (hasMetaPixel() && window.fbq) {
    window.fbq('track', 'ViewContent', {
      content_ids: products.map(p => String(p.id)),
      content_type: 'product_group',
    });
  }
  
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log('[Analytics] jw_product_list_view', { listName, count: products.length });
  }
}

// Track search
export function trackSearch(query: string, resultsCount: number) {
  // GA4
  if (hasGA4() && window.gtag) {
    window.gtag('event', 'search', {
      search_term: query,
      results_count: resultsCount,
    });
  }
  
  // Meta Pixel
  if (hasMetaPixel() && window.fbq) {
    window.fbq('track', 'Search', {
      search_string: query,
    });
  }
  
  // TikTok Pixel
  if (hasTikTokPixel() && window.ttq) {
    window.ttq.track('Search', {
      query,
    });
  }
  
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log('[Analytics] jw_search', { query, resultsCount });
  }
}
