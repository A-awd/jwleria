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

/** Visible credit for an approved open-licence image; absent for owner/permission grants. */
export interface ImageAttribution {
  creator: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  changes?: string;
}

export interface ResponsiveProductImage {
  src: string;
  width: number;
  height: number;
  variants: {src:string; width:number; height:number; bytes:number}[];
  attribution?: ImageAttribution;
}

/** A listed model (one card) summarised from its primary variant row. */
export interface ModelSummary {
  key: string;
  name: LocalizedText;
  variantCount: number;
  /** Distinct real values per option kind, in display order. */
  options: {kind: string; count: number}[];
}

export interface PublicProduct {
  id: string;
  slug: string;
  reference: string;
  brandSlug: string;
  categorySlug: string;
  name: LocalizedText;
  summary: LocalizedText;
  image: string | null;
  collection: LocalizedText;
  collectionSlug: string;
  /** Source category groupings are not manufacturer collection names. */
  collectionKind?: 'collection' | 'source-group';
  images: string[];
  imageVariants?: ResponsiveProductImage[];
  mediaKind: 'synthetic-preview' | 'verified-product' | 'facts-only';
  isPreview: boolean;
  addedAt: string;
  /** Present on listing rows read from the model projection. */
  model?: ModelSummary;
}

/** One real option value of a variant (for example its dial colour); valueLang as on VariantSpec. */
export interface VariantOption {
  kind: string;
  key: string;
  label: LocalizedText;
  value: LocalizedText;
  valueLang?: 'en';
}

/** A translated fact; valueLang 'en' marks a value that keeps its English source text. */
export interface VariantSpec {
  kind: string;
  label: LocalizedText;
  value: LocalizedText;
  valueLang?: 'en';
}

/** An existing catalog row inside its model. */
export interface ProductVariant extends PublicProduct {
  options: VariantOption[];
  specs: VariantSpec[];
  position: number;
  isPrimary: boolean;
}

/** A model with every real variant (bounded) and the variant addressed by the URL. */
export interface ProductModel {
  key: string | null;
  name: LocalizedText;
  variants: ProductVariant[];
  selected: ProductVariant;
  primary: ProductVariant;
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
  /** What total counts: displayed models, or catalog rows when the model projection is unavailable. */
  unit?: 'models' | 'products';
}
