// Bundle-time stand-in for robots.mjs: the same library, resolved by esbuild instead of createRequire.
// A require() of a CommonJS module bundles to its plain module.exports, without the ESM interop helpers
// that rely on Object.defineProperty, which the n8n Code-node sandbox replaces with a no-op.
export const robotsParser=require('robots-parser');
