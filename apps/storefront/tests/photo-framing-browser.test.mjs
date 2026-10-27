import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

// Approved product photographs (the only images with a srcset) are shown whole and never zoom on hover; editorial
// and preview art keep cover and the hover zoom. The markup below mirrors ProductCard and ProductGallery, and the
// static guard keeps that mirror honest. The browser part needs a resolvable Playwright and skips without one.
const css = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const card = await readFile(new URL('../src/components/ProductCard.astro', import.meta.url), 'utf8');
const gallery = await readFile(new URL('../src/components/ProductGallery.astro', import.meta.url), 'utf8');
const credit = await readFile(new URL('../src/components/ImageCredit.astro', import.meta.url), 'utf8');
let playwright;
try { playwright = createRequire(import.meta.url)('playwright'); } catch {}

test('the mirrored markup matches the components: the card link is the .media element, the gallery .media is a div', () => {
  assert.match(card, /<a class="media" href=\{url\}[^>]*>\s*<img class=\{artClass\(/, 'ProductCard: <a class="media"> directly wraps the image');
  assert.match(gallery, /<div class="media">\s*<img class=\{/, 'ProductGallery: <div class="media"> directly wraps the image');
  assert.match(credit, /<a href=\{credit\.licenseUrl\} rel="license nofollow"><bdi>\{credit\.license\}<\/bdi><\/a>/, 'ImageCredit: the licence link');
});

const page = dir => `<!doctype html><html lang="${dir === 'rtl' ? 'ar' : 'en'}" dir="${dir}"><head><meta charset="utf-8">
<style>${css}</style><style>*,*::before,*::after{transition:none!important}</style></head><body>
<div style="width:1000px">
  <article class="card" id="photo"><a class="media" href="#p"><img class="art" srcset="/p-640.webp 640w, /p-960.webp 960w" sizes="300px" src="/p-960.webp" width="960" height="720" alt=""></a></article>
  <article class="card" id="editorial"><a class="media" href="#e"><img class="art art--1" src="/images/watch.webp" width="800" height="1000" alt=""></a></article>
  <div class="pdp__gallery" id="gallery"><div class="media"><img class="art" srcset="/g-640.webp 640w, /g-960.webp 960w" sizes="600px" src="/g-960.webp" width="960" height="720" alt=""></div></div>
</div>
<article class="card" style="width:160px" id="narrow"><p class="gallery-credit gallery-credit--card">${dir === 'rtl' ? 'الصورة' : 'Photo'}: ${dir === 'rtl' ? '«' : '“'}<bdi>Rolex Datejust 36 - Up High</bdi>${dir === 'rtl' ? '»' : '”'} — <bdi>ajay_suresh</bdi> · <a href="https://creativecommons.org/licenses/by/2.0/" rel="license nofollow"><bdi>CC BY 2.0</bdi></a> · <a href="#s" rel="nofollow">${dir === 'rtl' ? 'المصدر' : 'Source'}</a></p></article>
</body></html>`;

test('on a hover-capable desktop, approved photos stay whole and unzoomed on hover; editorial art still zooms', {skip: playwright ? false : 'playwright is not installed', timeout: 60000}, async () => {
  const browser = await playwright.chromium.launch();
  try {
    const context = await browser.newContext({viewport: {width: 1280, height: 900}, hasTouch: false, isMobile: false});
    const p = await context.newPage();
    await p.setContent(page('ltr'));
    assert.equal(await p.evaluate(() => matchMedia('(hover: hover)').matches), true, 'the context is hover-capable');
    const look = id => p.evaluate(id => { const i = document.querySelector(`#${id} img`); const s = getComputedStyle(i); return {fit: s.objectFit, transform: s.transform}; }, id);
    assert.deepEqual(await look('photo'), {fit: 'contain', transform: 'none'});
    assert.deepEqual(await look('gallery'), {fit: 'contain', transform: 'none'});
    assert.equal((await look('editorial')).fit, 'cover', 'editorial art keeps cover');

    await p.hover('#editorial a.media');
    assert.match((await look('editorial')).transform, /^matrix\(1\.035, 0, 0, 1\.035, 0, 0\)$/, 'the hover zoom still applies to editorial art, so the probe is live');
    await p.hover('#photo a.media');
    assert.equal(await p.evaluate(() => document.querySelector('#photo a.media').matches(':hover')), true);
    assert.deepEqual(await look('photo'), {fit: 'contain', transform: 'none'}, 'a hovered card photo is not zoomed or cropped');
    await p.hover('#gallery .media');
    assert.deepEqual(await look('gallery'), {fit: 'contain', transform: 'none'});
  } finally { await browser.close(); }
});

test('in a narrow card credit the licence name stays on one line, in Arabic and English', {skip: playwright ? false : 'playwright is not installed', timeout: 60000}, async () => {
  const browser = await playwright.chromium.launch();
  try {
    const context = await browser.newContext({viewport: {width: 360, height: 800}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
    const p = await context.newPage();
    for (const dir of ['rtl', 'ltr']) {
      await p.setContent(page(dir));
      // Every card width from 110 to 240 px: "CC BY 2.0" never splits, however the rest of the credit wraps.
      const result = await p.evaluate(() => {
        const article = document.querySelector('#narrow');
        const credit = article.querySelector('.gallery-credit');
        const licence = credit.querySelector('a[rel~="license"] bdi');
        const out = {split: [], wrapped: 0, overflow: 0};
        for (let w = 110; w <= 240; w++) {
          article.style.width = `${w}px`;
          const range = document.createRange(); range.selectNodeContents(licence);
          const lines = new Set([...range.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top)));
          if (lines.size !== 1) out.split.push(w);
          if (credit.getBoundingClientRect().height > 2 * licence.getBoundingClientRect().height) out.wrapped++;
          out.overflow = Math.max(out.overflow, credit.scrollWidth - credit.clientWidth);
        }
        return out;
      });
      assert.deepEqual(result.split, [], `${dir}: "CC BY 2.0" is never split across lines`);
      assert.ok(result.wrapped > 0, `${dir}: the credit itself still wraps in a narrow card`);
      assert.ok(result.overflow <= 0, `${dir}: no sideways overflow`);
    }
  } finally { await browser.close(); }
});
