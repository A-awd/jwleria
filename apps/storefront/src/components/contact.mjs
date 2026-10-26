// Pure contact contract. Configuration is read by view.ts; no number is ever assumed here.

// Optional leading +, then digit runs or (digit) groups. One space or hyphen may separate groups;
// digits may follow a closing parenthesis directly. The shape is unambiguous, so matching stays linear.
const FORMATTED = /^\+?(?:\d+|\(\d+\))(?:[ -]?\(\d+\)|[ -]\d+|(?<=\))\d+)*$/;

/**
 * Canonical +E.164 form of a configured business number, or undefined when the value is anything
 * other than an unambiguous number: letters, extensions, 00 or trunk "(0)" prefixes, other separators.
 * @param {unknown} value
 * @returns {string | undefined}
 */
export function normalizeE164(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (raw.length > 32 || !FORMATTED.test(raw) || /\(0+\)/.test(raw)) return undefined;
  const digits = raw.replace(/\D/g, '');
  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : undefined;
}

/**
 * Live only with the explicit live mode and a valid number; everything else is the honest pending state.
 * @param {unknown} mode
 * @param {unknown} number
 * @returns {{ live: false } | { live: true; e164: string }}
 */
export function contactChannel(mode, number) {
  const e164 = mode === 'live' ? normalizeE164(number) : undefined;
  return e164 ? { live: true, e164 } : { live: false };
}

/**
 * Direct wa.me link. wa.me takes digits only; the text is UTF-8 percent-encoded, newlines included.
 * @param {string} number
 * @param {string} [message]
 */
export function whatsappHref(number, message = '') {
  const e164 = normalizeE164(number);
  if (!e164 || typeof message !== 'string') throw new Error('Invalid WhatsApp destination');
  return `https://wa.me/${e164.slice(1)}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
