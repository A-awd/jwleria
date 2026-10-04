import { env as runtime } from 'node:process';
import type { Locale, PublicProduct, BrandTier as Tier } from '../contracts/catalog';
import { href, t } from '../i18n/ui';

export const OWN_COLLECTION = 'jwleria-edit';
export const TIERS: Tier[] = ['luxury', 'accessible', 'contemporary'];

/** Art direction for the single shared synthetic still life only; real photography is never cropped or zoomed. */
const SHARED_STILL = /catalog-still-life/;
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export function artClass(src: string, group: string, variant = '') {
  if (!SHARED_STILL.test(src)) return 'art';
  return `art art--${(hash(group) + (hash(variant) % 3) * 3) % 9}`;
}

/**
 * The single production switch for inquiries. It stays in preview until the owning configuration
 * supplies PUBLIC_INQUIRY_MODE=live and a verified PUBLIC_WHATSAPP_E164. No number is ever assumed here.
 */
export function inquiryChannel(): { live: false } | { live: true; e164: string } {
  const env = import.meta.env;
  const num = String(runtime.PUBLIC_WHATSAPP_E164 || env.PUBLIC_WHATSAPP_E164 || '').trim().replace(/^\+/, '').replace(/[ ()-]/g, '');
  return (runtime.PUBLIC_INQUIRY_MODE || env.PUBLIC_INQUIRY_MODE) === 'live' && /^[1-9]\d{7,14}$/.test(num) ? { live: true, e164: num } : { live: false };
}

export interface InquiryLink { href: string; attrs: Record<string, string> }

/** Builds the CTA target: a real WhatsApp link only in live mode, otherwise a no-JS fallback plus dialog data. */
export function inquiryLink(l: Locale, message: string, fallback: string, ref = '', subject = ''): InquiryLink {
  const ch = inquiryChannel();
  if (ch.live) {
    return { href: `https://wa.me/${ch.e164}?text=${encodeURIComponent(message)}`, attrs: { target: '_blank', rel: 'noopener' } };
  }
  return { href: href(l, fallback), attrs: { 'data-inquiry': '', 'aria-controls': 'inquiry-dialog', 'aria-haspopup': 'dialog', 'data-inq-message': message, 'data-inq-ref': ref, 'data-inq-subject': subject } };
}

export function productInquiry(l: Locale, p: PublicProduct) {
  if (!p.isPreview && !inquiryChannel().live) return undefined;
  return inquiryLink(l, t(l).dialog.product(p.name[l], p.reference), `/products/${p.slug}/#inquiry`, p.reference, p.name[l]);
}
