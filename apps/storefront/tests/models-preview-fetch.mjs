// Private local preview only (tests/models-integration.test.mjs loads it with `node --import`).
// The built storefront accepts only an https *.supabase.co catalog URL, so this preload sends exactly
// that origin's requests to the local mock PostgREST on 127.0.0.1 and refuses every other non-loopback
// destination: nothing in the preview can reach the network.
const mock = new URL(process.env.JWL_MOCK_POSTGREST ?? '');
const catalog = new URL(process.env.SUPABASE_URL ?? '');
if (mock.protocol !== 'http:' || mock.hostname !== '127.0.0.1' || mock.pathname !== '/') throw new Error('The mock PostgREST must be a 127.0.0.1 origin');
if (catalog.protocol !== 'https:' || !catalog.hostname.endsWith('.supabase.co')) throw new Error('The preview catalog origin must look like the configured one');

const original = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.origin === catalog.origin) return original(new URL(url.pathname + url.search, mock), init);
  if (url.hostname === '127.0.0.1') return original(input, init);
  return Promise.reject(new Error(`The private local preview has no network access (${url.origin})`));
};
