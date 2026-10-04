import type { APIRoute } from 'astro';
import { env } from 'node:process';
import { catalogMode } from '../server/catalog';
import { inquiryChannel } from '../components/view';
export const GET: APIRoute = () => {
  const origin = env.PUBLIC_SITE_ORIGIN || import.meta.env.PUBLIC_SITE_ORIGIN;
  const configured = (env.PUBLIC_RELEASE || import.meta.env.PUBLIC_RELEASE) === 'live' && catalogMode() === 'live' && inquiryChannel().live && origin;
  if (configured) {
    const site = new URL(origin);
    if (site.protocol !== 'https:' || site.username || site.password || site.pathname !== '/' || site.search || site.hash) throw new Error('Invalid site origin');
  }
  return new Response(configured ? 'User-agent: *\nAllow: /\nDisallow: /ar/font-preview/\nDisallow: /en/font-preview/\nDisallow: /api/\n' : 'User-agent: *\nDisallow: /\n', {headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
};
