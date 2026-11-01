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
  /** The work's title as its author supplied it, shown untranslated; absent when none was supplied. */
  title?: string;
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

/** One existing catalog row of a model as a link: enough to offer its options without loading it. */
export interface VariantLink {
  id: string;
  slug: string;
  reference: string;
  options: VariantOption[];
  position: number;
  isPrimary: boolean;
  /** Whether this variant has an approved photograph of its own. */
  hasImage?: boolean;
}

/** An existing catalog row inside its model. */
export interface ProductVariant extends PublicProduct, VariantLink {
  specs: VariantSpec[];
}

/** One real size of a model: its option, how many variants exist at it, and the facts that differ by size. */
export interface ModelSize {
  key: string;
  option: VariantOption;
  variantCount: number;
  facts: VariantSpec[];
  /** Distinct real values of the model's other options at this size. */
  options: {kind: string; count: number}[];
}

/** Another variant's approved photograph, shown only with its own reference and size named. */
export interface RepresentativeImage {
  slug: string;
  reference: string;
  images: string[];
  imageVariants?: ResponsiveProductImage[];
  sizeOption?: VariantOption;
  /** Whether it was photographed at the selected variant's size. */
  sameSize: boolean;
}

/** A model with every real variant and the variant addressed by the URL. */
export interface ProductModel {
  key: string | null;
  name: LocalizedText;
  variants: VariantLink[];
  selected: ProductVariant;
  primary: VariantLink;
  /** All variants the model has; more than the listed variants only when a read was bounded. */
  variantCount?: number;
  sizes?: ModelSize[];
  representative?: RepresentativeImage;
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
