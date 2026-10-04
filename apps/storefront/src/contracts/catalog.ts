/** Public catalog fields only. Internal source and operational data never belong here. */
export type Locale = 'ar' | 'en';

export type LocalizedText = Record<Locale, string>;

export type BrandTier = 'luxury' | 'accessible' | 'contemporary';

export interface Brand {
  id: string;
  slug: string;
  name: string;
  tier: BrandTier;
  summary: LocalizedText;
}

export interface Category {
  id: string;
  slug: string;
  name: LocalizedText;
  image: string;
}

export interface PublicProduct {
  id: string;
  slug: string;
  reference: string;
  brandSlug: string;
  categorySlug: string;
  name: LocalizedText;
  summary: LocalizedText;
  image: string;
  collection: LocalizedText;
  collectionSlug: string;
  images: string[];
  mediaKind: 'synthetic-preview' | 'verified-product';
  isPreview: boolean;
  addedAt: string;
}

export interface ProductQuery {
  brand?: string;
  category?: string;
  collection?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductPage {
  items: PublicProduct[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}
