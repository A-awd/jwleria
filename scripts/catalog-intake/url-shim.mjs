import {UrlLite} from './url-lite.mjs';
// Injected into the n8n bundle: the platform URL where it exists (Node), otherwise the tested subset.
export const URL=typeof globalThis.URL==='function'?globalThis.URL:UrlLite;
