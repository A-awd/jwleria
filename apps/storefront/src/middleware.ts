import { defineMiddleware } from 'astro:middleware';
import { publicPageResponse } from './server/public-cache.mjs';

declare const __JWL_CACHE_BUILD__: string;

export const onRequest = defineMiddleware(async (context, next) => {
  if (!import.meta.env.PROD) return next();
  const storage = globalThis as typeof globalThis & { caches?: CacheStorage & { default?: Cache } };
  const execution = context.locals as { cfContext?: { waitUntil(promise: Promise<unknown>): void } };
  return publicPageResponse(context.request, next, {
    cache: storage.caches?.default,
    waitUntil: execution.cfContext?.waitUntil.bind(execution.cfContext),
    build: __JWL_CACHE_BUILD__,
    // Astro's error render of this request reuses these locals, so that pass bypasses the shared cache.
    scope: context.locals,
  });
});
