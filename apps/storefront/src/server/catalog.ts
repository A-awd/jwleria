import { env } from 'node:process';
import type { ProductPage, ProductQuery, PublicProduct } from '../contracts/catalog';
import * as fixtures from './fixtures';
import { queryCatalog, readProduct, listCollections, listPublishedBrands } from './supabase-catalog.mjs';

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
export async function getBrands() {
  const directory = fixtures.getBrands().filter(b => catalogMode() === 'preview' || b.slug !== 'jwleria-edit').map(b => ({
    ...b,
    summary: b.slug === 'jwleria-edit' ? b.summary : {
      ar: `مختارات ${b.name}. التفاصيل والتوفر عبر واتساب.`,
      en: `${b.name} selections. Details and availability via WhatsApp.`,
    },
  }));
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
export async function getBrand(slug: string) { return (await getBrands()).find(b => b.slug === slug); }

export async function getProducts(query: ProductQuery = {}): Promise<ProductPage> {
  if (catalogMode() === 'preview') return fixtures.getProducts(query);
  if (catalogMode() === 'live') return queryCatalog(config(), query);
  return { items: [], total: 0, page: 1, pageSize: 12, pages: 0 };
}
export async function getProduct(slug: string): Promise<PublicProduct | undefined> {
  if (catalogMode() === 'preview') return fixtures.getProduct(slug);
  return catalogMode() === 'live' ? readProduct(config(), slug) : undefined;
}
export async function getCollections(brand: string) {
  return catalogMode() === 'live' ? listCollections(config(), brand) : [];
}
export async function getRelatedProducts(product: PublicProduct, limit = 4): Promise<PublicProduct[]> {
  if (catalogMode() === 'preview') return fixtures.getRelatedProducts(product, limit);
  const page = await getProducts({ category: product.categorySlug, pageSize: Math.min(limit + 1, 48) });
  return page.items.filter(p => p.id !== product.id).slice(0, limit);
}
export async function getLatestProducts(limit = 6) {
  return (await getProducts({ pageSize: limit })).items;
}
