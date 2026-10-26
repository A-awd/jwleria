import { env } from 'node:process';
import type { ProductModel, ProductPage, ProductQuery, PublicProduct } from '../contracts/catalog';
import * as fixtures from './fixtures';
import { queryModels, readProductModel, listCollections, listPublishedBrands, readBrandModelsPage } from './supabase-catalog.mjs';
import { findDirectoryBrand } from './catalog-directory.mjs';

export function catalogMode(): 'preview' | 'live' | 'empty' {
  if ((env.CATALOG_MODE || import.meta.env.CATALOG_MODE) === 'preview') return 'preview';
  const url = env.SUPABASE_URL || import.meta.env.SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.SUPABASE_PUBLISHABLE_KEY;
  if (Boolean(url) !== Boolean(key)) throw new Error('Incomplete catalog connection configuration');
  return url && key ? 'live' : 'empty';
}

const config = () => ({
  url: env.SUPABASE_URL || import.meta.env.SUPABASE_URL,
  key: env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.SUPABASE_PUBLISHABLE_KEY,
});

let brandCache: {until:number;value:ReturnType<typeof listPublishedBrands>} | undefined;

// The editorial brand/category directory remains independent of source credentials.
function getDirectoryBrands() {
  return fixtures.getBrands().filter(b => catalogMode() === 'preview' || b.slug !== 'jwleria-edit').map(b => ({
    ...b,
    summary: b.slug === 'jwleria-edit' ? b.summary : {
      ar: `مختارات ${b.name}. التفاصيل والتوفر عبر واتساب.`,
      en: `${b.name} selections. Details and availability via WhatsApp.`,
    },
  }));
}
export async function getBrands() {
  const directory = getDirectoryBrands();
  if(catalogMode()!=='live')return directory;
  if(!brandCache || Date.now()>brandCache.until) {
    brandCache={until:Date.now()+60000,value:listPublishedBrands(config()).catch(error=>{brandCache=undefined;throw error;})};
  }
  const published=await brandCache.value;
  const merged=new Map(directory.map(b=>[b.slug,b]));
  for(const brand of published)merged.set(brand.slug,brand);
  return [...merged.values()];
}
export const getCategories = fixtures.getCategories;
export const getCategory = fixtures.getCategory;
export async function getBrand(slug: string) { return findDirectoryBrand(slug, getDirectoryBrands(), getBrands); }

export async function getBrandPage(slug: string, query: ProductQuery = {}) {
  const directory=getDirectoryBrands();
  const known=directory.find(b=>b.slug===slug);
  if(catalogMode()!=='live')return {brand:known,result:await getProducts({...query,brand:slug}),collections:[],directory};
  const page=await readBrandModelsPage(config(),slug,query);
  const merged=new Map(directory.map(b=>[b.slug,b]));
  for(const brand of page.brands)merged.set(brand.slug,brand);
  return {brand:known??page.brand,result:page.result,collections:page.collections,directory:[...merged.values()]};
}

export async function getProducts(query: ProductQuery = {}): Promise<ProductPage> {
  if (catalogMode() === 'preview') return fixtures.getProducts(query);
  if (catalogMode() === 'live') return queryModels(config(), query);
  return { items: [], total: 0, page: 1, pageSize: 12, pages: 0 };
}
/** The model of any variant slug, with that variant selected, in one catalog read. */
export async function getProductModel(slug: string): Promise<ProductModel | undefined> {
  if (catalogMode() === 'preview') return fixtures.getProductModel(slug);
  return catalogMode() === 'live' ? readProductModel(config(), slug) : undefined;
}
export async function getProduct(slug: string): Promise<PublicProduct | undefined> {
  return (await getProductModel(slug))?.selected;
}
export async function getCollections(brand: string) {
  return catalogMode() === 'live' ? listCollections(config(), brand) : [];
}
/** Other models of the same category; the model's own variants are never listed as related. */
export async function getRelatedProducts(product: PublicProduct, limit = 4, modelKey: string | null = null): Promise<PublicProduct[]> {
  if (catalogMode() === 'preview') return fixtures.getRelatedProducts(product, limit, modelKey);
  const page = await getProducts({ category: product.categorySlug, pageSize: Math.min(limit + 1, 48) });
  return page.items.filter(p => p.id !== product.id && (!modelKey || p.model?.key !== modelKey)).slice(0, limit);
}
export async function getLatestProducts(limit = 6) {
  return (await getProducts({ pageSize: limit })).items;
}
