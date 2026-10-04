import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

const cloudflareTarget = process.env.JWL_DEPLOY_TARGET === 'cloudflare';
const adapter = cloudflareTarget
  ? (await import('@astrojs/cloudflare')).default({ imageService: 'passthrough' })
  : node({ mode: 'standalone' });

export default defineConfig({
  output: 'server',
  adapter,
  ...(cloudflareTarget ? { outDir: './dist-cloudflare/' } : {}),
  session: false,
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1', port: 4321 },
});
