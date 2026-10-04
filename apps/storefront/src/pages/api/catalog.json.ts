import type { APIRoute } from 'astro';
import {getProducts} from '../../server/catalog';

export const GET: APIRoute = async ({url}) => {
  try {
    const params=url.searchParams;
    const page=await getProducts({brand:params.get('brand')??undefined,category:params.get('category')??undefined,collection:params.get('collection')??undefined,search:params.get('q')??undefined,page:Number(params.get('page')),pageSize:Number(params.get('pageSize'))});
    return new Response(JSON.stringify(page),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
  } catch {
    return new Response(JSON.stringify({error:'catalog_unavailable'}),{status:503,headers:{'Content-Type':'application/json; charset=utf-8','Retry-After':'60','Cache-Control':'no-store'}});
  }
};
