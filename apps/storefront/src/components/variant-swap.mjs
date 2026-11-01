// In-place variant changes on the product page (decision 0019). Pure control flow, so it is tested without a
// browser:
// - the latest choice wins, so a slower earlier response is never shown;
// - each variant's block is fetched once and shared by an intent prefetch and the choice that follows it;
// - the cache stays bounded;
// - each shown choice is one history entry, so Back and Forward step through the variants a visitor chose, and a
//   restored address is shown without writing another entry.

const PRODUCT = /^\/(ar|en)\/products\/([a-z0-9]+(?:-[a-z0-9]+)*)\/$/;

/** The locale and slug of a product page path, or undefined. @param {string} pathname */
export function variantPath(pathname) {
  const match = PRODUCT.exec(pathname);
  return match ? {locale: match[1], slug: match[2]} : undefined;
}

/** The path that renders only a variant's product block: about half a page, without the layout or related pieces. */
export const fragmentPath = pathname => `${pathname.replace(/\/?$/, '/')}variant/`;

/**
 * @template T
 * @param {{
 *   load: (path: string) => Promise<string>,
 *   prepare: (html: string, path: string, choice: object) => Promise<T> | T,
 *   show: (prepared: T, path: string, choice: object) => void,
 *   pending?: (path: string, choice: object) => void,
 *   fail: (path: string, choice: object) => void,
 *   history?: {push: (path: string) => void},
 *   limit?: number,
 * }} io
 */
export function variantSwapper({load, prepare, show, pending = () => {}, fail, history, limit = 24}) {
  /** @type {Map<string, Promise<string>>} path -> the block's HTML, most recently used last */
  const cache = new Map();
  let latest = 0;
  const get = path => {
    let entry = cache.get(path);
    if (entry) cache.delete(path);
    else entry = load(path).catch(error => { if (cache.get(path) === entry) cache.delete(path); throw error; });
    cache.set(path, entry);
    for (const key of cache.keys()) { if (cache.size <= limit) break; cache.delete(key); }
    return entry;
  };
  return {
    /** Keeps a block the page already holds, such as the one it opened on, so returning to it needs no request. */
    seed(path, html) { cache.delete(path); cache.set(path, Promise.resolve(html)); },
    /** Starts loading a likely next variant; the choice that follows reuses the same request. */
    prefetch(path) { get(path).catch(() => {}); },
    /**
     * Shows a variant unless a later choice was made meanwhile, then records it as a history entry. A choice with
     * `history: true` is the address Back or Forward restored, so it is shown without a new entry.
     * Resolves to 'shown', 'stale' or 'failed'.
     */
    async choose(path, choice = {}) {
      const id = ++latest;
      pending(path, choice);
      let prepared;
      try { prepared = await prepare(await get(path), path, choice); }
      catch { if (id === latest) fail(path, choice); return 'failed'; }
      if (id !== latest) return 'stale';
      show(prepared, path, choice);
      if (!choice.history) history?.push(path);
      return 'shown';
    },
    has: path => cache.has(path),
    get size() { return cache.size; },
  };
}
