import {createRequire} from 'node:module';
// The n8n bundle inlines this same library; locally it loads from the storefront's dependencies.
const require=createRequire(new URL('../../apps/storefront/package.json',import.meta.url));
export const robotsParser=require('robots-parser');
