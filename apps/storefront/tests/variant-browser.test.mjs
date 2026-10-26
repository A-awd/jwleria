import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';

// Opt-in browser check of variant selection on a local preview server (synthetic fixtures only):
//   CATALOG_MODE=preview pnpm build && CATALOG_MODE=preview HOST=127.0.0.1 PORT=4391 node dist/server/entry.mjs
//   JWL_BROWSER_BASE_URL=http://127.0.0.1:4391 [JWL_SCREENSHOT_DIR=/absolute/dir] node --test tests/variant-browser.test.mjs
// Without JWL_BROWSER_BASE_URL, or without a resolvable Playwright, the test skips.
const BASE = process.env.JWL_BROWSER_BASE_URL;
const SHOTS = process.env.JWL_SCREENSHOT_DIR;
let playwright;
try { playwright = createRequire(import.meta.url)('playwright'); } catch {}
const skip = !BASE ? 'set JWL_BROWSER_BASE_URL to a local CATALOG_MODE=preview server' : !playwright ? 'playwright is not installed' : false;
const MOBILE = {viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true};

test('variant selection swaps to real variants by keyboard and tap, in Arabic and English', {skip, timeout: 180000}, async () => {
  const base = new URL(BASE);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'browser checks stay on the local preview');
  const fixtures = await import('../src/server/fixtures.ts');
  const model = fixtures.getProductModel('preview-watch-ivory-three-link');
  const ref = slug => model.variants.find(v => v.slug === slug).reference;
  if (SHOTS) mkdirSync(SHOTS, {recursive: true});
  const browser = await playwright.chromium.launch();
  try {
    for (const locale of ['ar', 'en']) {
      const context = await browser.newContext({...MOBILE, locale: locale === 'ar' ? 'ar-SA' : 'en-GB'});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const shot = async name => { if (SHOTS) await page.screenshot({path: join(SHOTS, `${locale}-${name}.png`), fullPage: true}); };
      const state = () => page.evaluate(() => ({
        path: location.pathname,
        reference: document.querySelector('[data-variant-reference]')?.textContent,
        gallery: document.querySelector('[data-gallery]')?.getAttribute('data-gallery') ?? null,
        images: [...document.querySelectorAll('.pdp__gallery img')].map(i => new URL(i.currentSrc || i.src).pathname),
        loading: [...document.querySelectorAll('.pdp__gallery img')].map(i => [i.loading, i.getAttribute('fetchpriority'), Number(i.getAttribute('width')) > 0 && Number(i.getAttribute('height')) > 0]),
        specs: document.querySelector('[data-variant-specs]')?.textContent ?? '',
        current: [...document.querySelectorAll('a[data-variant-link][aria-current="true"]')].map(a => `${a.dataset.optionKind}=${a.dataset.optionKey}`),
        active: document.activeElement?.matches('a[data-variant-link]') ? `${document.activeElement.dataset.optionKind}=${document.activeElement.dataset.optionKey}` : null,
        language: document.querySelector('a.lang')?.getAttribute('href'),
        inquiry: document.querySelector('.pdp__cta [data-inq-ref]')?.getAttribute('data-inq-ref'),
        marker: window.__variantMarker,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        status: document.querySelector('[data-variant-status]')?.textContent ?? '',
      }));
      const shown = async reference => page.waitForFunction(r => document.querySelector('[data-variant-reference]')?.textContent === r, reference, {timeout: 10000});
      const link = (kind, key) => page.locator(`a[data-variant-link][data-option-kind="${kind}"][data-option-key="${key}"]`);
      const spec = (slug, kind) => model.variants.find(v => v.slug === slug).options.find(o => o.kind === kind).value[locale];

      await page.goto(new URL(`/${locale}/catalog/`, base).href);
      const card = page.locator('article.card', {has: page.locator('a[href$="/products/preview-watch-ivory-three-link/"]')});
      assert.equal(await card.locator('.card__name').textContent(), model.name[locale]);
      assert.equal(await card.locator('.variant-count').textContent(), locale === 'ar' ? '3 ألوان ميناء · 3 أساور' : '3 dials · 3 bracelets');
      assert.ok((await state()).overflow <= 0, 'catalog has no horizontal overflow at 390px');
      await shot('0-catalog');

      await page.goto(new URL(`/${locale}/products/preview-watch-ivory-three-link/`, base).href);
      await page.evaluate(() => { window.__variantMarker = 'same-document'; });
      let s = await state();
      assert.equal(await page.locator('h1').textContent(), model.name[locale]);
      assert.deepEqual([s.reference, s.gallery, s.inquiry], [ref('preview-watch-ivory-three-link'), ref('preview-watch-ivory-three-link'), ref('preview-watch-ivory-three-link')]);
      assert.deepEqual(s.current, ['dial=ivory', 'bracelet=three-link']);
      assert.ok(s.overflow <= 0, `${locale}: no horizontal overflow`);
      for (const box of await page.locator('a[data-variant-link]').evaluateAll(as => as.map(a => a.getBoundingClientRect()).map(r => [r.width, r.height]))) {
        assert.ok(box[0] >= 44 && box[1] >= 44, `targets are at least 44px (${box})`);
      }
      assert.match(await page.locator('.variant-option legend').first().textContent(), locale === 'ar' ? /^لون الميناء: / : /^Dial: /);
      await shot('1-initial');

      // Keyboard: Tab to the slate dial, then Enter. The focus ring is visible and focus survives the swap.
      let reached = false;
      for (let i = 0; i < 80 && !reached; i++) { await page.keyboard.press('Tab'); reached = (await state()).active === 'dial=slate'; }
      assert.ok(reached, 'the dial values are reachable by keyboard');
      assert.notEqual(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), 'none', 'visible focus ring');
      await shot('2-focus');
      await page.keyboard.press('Enter');
      await shown(ref('preview-watch-slate-three-link'));
      s = await state();
      assert.equal(s.path, `/${locale}/products/preview-watch-slate-three-link/`);
      assert.equal(s.marker, 'same-document', 'swapped without a reload');
      assert.deepEqual(s.current, ['dial=slate', 'bracelet=three-link']);
      assert.equal(s.active, 'dial=slate', 'focus stays on the chosen value');
      assert.equal(s.gallery, ref('preview-watch-slate-three-link'));assert.deepEqual(s.images, ['/images/catalog-still-life.webp']);
      assert.ok(s.specs.includes(spec('preview-watch-slate-three-link', 'dial')), 'specs follow the variant');
      assert.equal(s.inquiry, ref('preview-watch-slate-three-link'));assert.match(s.status, new RegExp(ref('preview-watch-slate-three-link')));
      assert.equal(s.language, `/${locale === 'ar' ? 'en' : 'ar'}/products/preview-watch-slate-three-link/`);
      assert.match(await page.title(), new RegExp(ref('preview-watch-slate-three-link')));
      await shot('3-keyboard-slate');

      // Tap: the bracelet changes while the dial is kept.
      await link('bracelet', 'five-link').tap();
      await shown(ref('preview-watch-slate-five-link'));
      s = await state();
      assert.deepEqual([s.path, s.marker, s.current], [`/${locale}/products/preview-watch-slate-five-link/`, 'same-document', ['dial=slate', 'bracelet=five-link']]);
      assert.deepEqual(s.images, ['/images/catalog-still-life.webp', '/images/watch.webp']);
      assert.deepEqual(s.loading, [['eager', 'high', true], ['lazy', null, true]], 'only the first image is eager and high priority; all have explicit dimensions');
      assert.ok(s.specs.includes(spec('preview-watch-slate-five-link', 'bracelet')));
      await shot('4-tap-five-link');

      // Green exists only on leather: the value says so and moves to that real variant, which has no photo.
      const green = link('dial', 'green');
      const note = page.locator(`[id="${await green.getAttribute('aria-describedby')}"]`);
      assert.ok((await note.textContent()).includes(spec('preview-watch-green-leather', 'bracelet')), 'the value names the bracelet it changes to');
      await green.tap();
      await shown(ref('preview-watch-green-leather'));
      s = await state();
      assert.deepEqual([s.path, s.current, s.gallery, s.images], [`/${locale}/products/preview-watch-green-leather/`, ['dial=green', 'bracelet=leather'], null, []]);
      assert.equal(await page.locator('.pdp--facts').count(), 1, 'honest facts-only state, no borrowed photo');
      assert.ok(s.overflow <= 0);
      await shot('5-tap-green-leather');

      // The inquiry carries the selected reference.
      await page.locator('.pdp__cta .cta').tap();
      await page.waitForSelector('#inquiry-dialog[open]');
      assert.equal(await page.locator('#inquiry-dialog [data-ref]').textContent(), ref('preview-watch-green-leather'));
      assert.match(await page.locator('#inquiry-dialog textarea').inputValue(), new RegExp(ref('preview-watch-green-leather')));
      await shot('6-inquiry');
      await page.keyboard.press('Escape');

      // Keyboard again on the other option: back to the closest real variant with the ivory dial.
      await link('dial', 'ivory').focus();
      await page.keyboard.press('Enter');
      await shown(ref('preview-watch-ivory-three-link'));
      s = await state();
      assert.deepEqual([s.path, s.current, s.marker], [`/${locale}/products/preview-watch-ivory-three-link/`, ['dial=ivory', 'bracelet=three-link'], 'same-document']);
      assert.deepEqual(errors, [], 'no page errors');

      // A colour-only model.
      await page.goto(new URL(`/${locale}/products/preview-handbag-black/`, base).href);
      await link('colour', 'beige').tap();
      await shown(fixtures.getProductModel('preview-handbag-beige').selected.reference);
      assert.deepEqual((await state()).images, ['/images/leather-goods.webp']);
      await shot('7-handbag-beige');
      await context.close();

      // Without JavaScript every value is still a working link to the real variant page.
      const plain = await browser.newContext({...MOBILE, javaScriptEnabled: false});
      const noScript = await plain.newPage();
      await noScript.goto(new URL(`/${locale}/products/preview-watch-ivory-three-link/`, base).href);
      await Promise.all([noScript.waitForURL(`**/${locale}/products/preview-watch-ivory-five-link/`), noScript.locator('a[data-variant-link][data-option-key="five-link"]').click()]);
      assert.equal(await noScript.locator('[data-variant-reference]').textContent(), ref('preview-watch-ivory-five-link'));
      assert.equal(await noScript.locator('a[data-variant-link][aria-current="true"][data-option-key="five-link"]').count(), 1);
      // A non-primary variant page names the model's primary variant as its canonical twin.
      const primary = `/${locale}/products/${model.primary.slug}/`;
      assert.ok((await noScript.locator(`link[rel="alternate"][hreflang="${locale}"]`).getAttribute('href')).endsWith(primary));
      for (const canonical of await noScript.locator('link[rel="canonical"]').evaluateAll(ls => ls.map(l => l.getAttribute('href')))) assert.ok(canonical.endsWith(primary));
      await plain.close();
    }
  } finally { await browser.close(); }
});
