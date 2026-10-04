import assert from 'node:assert/strict';
import test from 'node:test';

// Black-box acceptance checks: consume visitor HTML, not fixture/component internals.
// Run against the local Astro server: node --test tests/public-boundary.mjs
const base = new URL(process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4321');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname),
  'Acceptance requests must stay on the local preview, without contacting business channels.');
const documents = new Map();
const discovered = new Set();
const DEMO = /\bdemo\b|preview|synthetic|illustrat|concept|تجريب|معاينة|توضيحي|تصوّر/i;
const CURRENCY = /(?:\b(?:SAR|AED|USD|EUR|GBP|QAR|KWD|BHD|OMR|JPY|CNY|CHF)\b|[$€£¥₹﷼]|ر\s*\.\s*س\s*\.?|\b(?:riyals?|dirhams?|dollars?|euros?)\b|ريال|ريالات|درهم|دولار|يورو)/iu;
const AMOUNT = /(?:\b(?:price|cost|amount|total)\s*(?:[:=]\s*)?[\d٠-٩۰-۹]|(?:السعر|الثمن|المبلغ|التكلفة|الإجمالي)\s*(?:[:=]\s*)?[\d٠-٩۰-۹])/iu;
const PRIVATE_FIELDS = /["'](?:price|priceCurrency|lowPrice|highPrice|amount|cost|margin|currency|supplier_quote|unit_price|sale_price)["']\s*:/i;
const FORBIDDEN_PATH = /\/(?:login|log-in|signin|sign-in|signup|sign-up|register|account|accounts|cart|checkout|admin|dashboard|portal)(?:\/|$)/i;
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function decode(value = '') {
  return value.replace(/&#(x[\da-f]+|\d+);?/gi, (_, n) => {
    const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  }).replace(/&(amp|lt|gt|quot|apos|nbsp|dollar|euro|pound|yen);/gi,
    (_, n) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', dollar: '$', euro: '€', pound: '£', yen: '¥' })[n.toLowerCase()]);
}

function attributes(source) {
  const out = {};
  for (const m of source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

function parse(source) {
  const root = { tag: '#document', attrs: {}, children: [], parent: null };
  const stack = [root];
  const cleaned = source.replace(/<!--[^]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi, '');
  for (const token of cleaned.match(/<![^>]*>|<\/?[a-z][^>]*>|[^<]+/gi) || []) {
    if (token.startsWith('<!')) continue;
    if (token.startsWith('</')) {
      const tag = token.match(/^<\/([\w:-]+)/)[1].toLowerCase();
      const index = stack.findLastIndex(n => n.tag === tag);
      if (index > 0) stack.length = index;
    } else if (token.startsWith('<')) {
      const m = token.match(/^<([\w:-]+)([^]*)>$/);
      if (!m) continue;
      const node = { tag: m[1].toLowerCase(), attrs: attributes(m[2]), children: [], parent: stack.at(-1) };
      stack.at(-1).children.push(node);
      if (!VOID.has(node.tag) && !token.endsWith('/>')) stack.push(node);
    } else {
      stack.at(-1).children.push(decode(token));
    }
  }
  return root;
}

function nodes(root) {
  return [root, ...root.children.filter(n => typeof n !== 'string').flatMap(nodes)];
}
function text(root) {
  return root.children.map(n => typeof n === 'string' ? n : text(n)).join(' ').replace(/\s+/g, ' ').trim();
}
function main(doc) {
  const element = nodes(doc.root).find(n => n.tag === 'main');
  assert.ok(element, `${doc.url.pathname}: server HTML must contain a main landmark.`);
  return element;
}
function urls(root, from) {
  return nodes(root).filter(n => n.tag === 'a' && n.attrs.href).flatMap(n => {
    try {
      const u = new URL(n.attrs.href, from);
      if (u.origin !== base.origin || !/^https?:$/.test(u.protocol)) return [];
      u.hash = '';
      return [u];
    } catch { return []; }
  });
}
function kind(url) {
  const parts = url.pathname.split('/').filter(Boolean);
  if (!['ar', 'en'].includes(parts[0])) return null;
  const section = parts[1];
  if (parts.length === 1) return 'home';
  if (/^products?$/.test(section) && parts.length === 3) return 'product';
  if (/^brands?$/.test(section)) return parts.length === 3 ? 'brand' : 'index';
  if (/^categor(?:y|ies)$/.test(section)) return parts.length === 3 ? 'category' : 'index';
  if (/^(catalog|collections|search|products?)$/.test(section) && parts.length === 2) return 'catalog';
  return null;
}
function productPaths(doc) {
  return new Set(urls(main(doc), doc.url).filter(u => kind(u) === 'product').map(u => u.pathname));
}

async function request(url) {
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { 'Cache-Control': 'no-store' } });
  return { response, html: await response.text() };
}
async function page(url) {
  const u = new URL(url, base);
  assert.equal(u.origin, base.origin, 'Never follow an external destination.');
  if (documents.has(u.href)) return documents.get(u.href);
  const { response, html } = await request(u);
  assert.equal(response.status, 200, `${u.pathname}${u.search}: expected crawlable HTTP 200 HTML.`);
  assert.match(response.headers.get('content-type') || '', /text\/html/i, `${u.pathname}: expected HTML.`);
  const doc = { url: u, html, root: parse(html) };
  documents.set(u.href, doc);
  return doc;
}

async function discoverLocale(locale) {
  const queue = [new URL(`/${locale}/`, base)];
  const queued = new Set(queue.map(u => u.href));
  const details = new Set();
  let fetched = 0;
  while (queue.length) {
    assert.ok(++fetched <= 80, `${locale}: discovery limit reached; acceptance cannot claim complete product coverage.`);
    const doc = await page(queue.shift());
    for (const u of urls(doc.root, doc.url)) {
      if (!u.pathname.startsWith(`/${locale}/`) || !kind(u)) continue;
      discovered.add(u.href);
      // Crawl pagination, all product detail pages, and one detail route per taxonomy.
      if ([...u.searchParams.keys()].some(k => k !== 'page')) continue;
      const routeKind = kind(u);
      if (['brand', 'category'].includes(routeKind)) {
        if (details.has(routeKind)) continue;
        details.add(routeKind);
      }
      if (!queued.has(u.href)) { queued.add(u.href); queue.push(u); }
    }
  }
  for (const required of ['brand', 'category', 'product', 'catalog']) {
    assert.ok([...documents.values()].some(d => d.url.pathname.startsWith(`/${locale}/`) && kind(d.url) === required),
      `${locale}: discoverable ${required} routes are required, including an HTML catalog.`);
  }
}

function assertBoundary(doc) {
  const body = nodes(doc.root).find(n => n.tag === 'body') || doc.root;
  const visible = text(body);
  assert.doesNotMatch(visible, CURRENCY, `${doc.url.pathname}: public currency marker.`);
  assert.doesNotMatch(visible, AMOUNT, `${doc.url.pathname}: public monetary value.`);
  assert.doesNotMatch(doc.html, PRIVATE_FIELDS, `${doc.url.pathname}: monetary/private fields serialized into visitor HTML.`);
  assert.doesNotMatch(decode(doc.html), /(?:wa\.me\/[+\d]|api\.whatsapp\.com\/send|whatsapp:\/\/send)/i,
    `${doc.url.pathname}: unverified messaging destination embedded in the preview.`);
  assert.ok(text(main(doc)).length > 60, `${doc.url.pathname}: empty application shell is not rendered catalog content.`);
  const html = nodes(doc.root).find(n => n.tag === 'html');
  const locale = doc.url.pathname.split('/')[1];
  assert.equal(html?.attrs.lang, locale, `${doc.url.pathname}: document locale.`);
  assert.equal(html?.attrs.dir, locale === 'ar' ? 'rtl' : 'ltr', `${doc.url.pathname}: document direction.`);
  assert.ok(nodes(doc.root).some(n => n.tag === 'h1' && text(n)), `${doc.url.pathname}: meaningful server-rendered heading.`);
  for (const n of nodes(body)) {
    const accessibleText = [n.attrs['aria-label'], n.attrs.alt, n.attrs.title].filter(Boolean).join(' ');
    assert.doesNotMatch(accessibleText, CURRENCY, `${doc.url.pathname}: public currency in accessible text.`);
    assert.doesNotMatch(accessibleText, AMOUNT, `${doc.url.pathname}: public amount in accessible text.`);
    assert.ok(!Object.keys(n.attrs).some(key => /^data-(?:price|amount|currency|cost|margin)$/.test(key)),
      `${doc.url.pathname}: private monetary data attribute.`);
    assert.doesNotMatch(n.attrs.itemprop || '', /^(?:price|priceCurrency|lowPrice|highPrice)$/i,
      `${doc.url.pathname}: public monetary metadata.`);
    if (n.attrs.href || n.attrs.action) {
      const destination = new URL(n.attrs.href || n.attrs.action, doc.url);
      assert.doesNotMatch(destination.pathname, FORBIDDEN_PATH, `${doc.url.pathname}: account/commerce/admin entry.`);
      assert.doesNotMatch(destination.href, /(?:wa\.me\/|api\.whatsapp\.com\/send|whatsapp:\/\/send)/i,
        `${doc.url.pathname}: no unverified business WhatsApp destination may be fabricated.`);
    }
    assert.notEqual(n.attrs.type, 'password', `${doc.url.pathname}: public login form.`);
    if (['select', 'input', 'button'].includes(n.tag)) {
      const label = nodes(body).find(candidate => candidate.tag === 'label' && n.attrs.id && candidate.attrs.for === n.attrs.id);
      const description = [n.attrs.name, n.attrs.id, n.attrs['aria-label'], n.attrs.title,
        label && text(label), n.tag === 'button' && text(n)].filter(Boolean).join(' ');
      assert.doesNotMatch(description, /country|currency|market|region|(?:اختيار|اختر|تحديد)\s*(?:الدولة|البلد|العملة)/i,
        `${doc.url.pathname}: public country/currency selector.`);
    }
    if (['a', 'button'].includes(n.tag)) {
      assert.doesNotMatch(text(n), /تسجيل الدخول|إنشاء حساب|سلة التسوق|عربة التسوق|لوحة الإدارة|\b(?:log in|sign in|sign up|my account|shopping cart|checkout|admin|dashboard)\b/i,
        `${doc.url.pathname}: account/commerce/admin control.`);
    }
  }
}

function assertDemoProduct(doc) {
  const content = main(doc);
  const title = nodes(content).find(n => n.tag === 'h1');
  let headingGroup = title;
  let explicitlyLabeled = false;
  while (headingGroup && headingGroup.tag !== 'main') {
    if (DEMO.test(text(headingGroup))) { explicitlyLabeled = true; break; }
    headingGroup = headingGroup.parent;
  }
  assert.ok(explicitlyLabeled, `${doc.url.pathname}: the product heading/content group must explicitly identify the synthetic preview.`);
  let productSection = title;
  while (productSection.parent && !['article', 'section', 'main'].includes(productSection.tag)) productSection = productSection.parent;
  assert.match(text(productSection), /(?:المرجع|مرجع|رقم القطعة|رقم المنتج|رمز المنتج|reference|product code)\s*[:#：-]?\s*[a-z\d][a-z\d-]{3,}/i,
    `${doc.url.pathname}: visible product reference is required for a reviewable inquiry.`);
  const controls = nodes(productSection).filter(n => ['a', 'button'].includes(n.tag) && /واتساب|whatsapp/i.test(text(n)));
  assert.ok(controls.length, `${doc.url.pathname}: product inquiry control is missing.`);
  if (doc.url.pathname.startsWith('/ar/')) {
    assert.ok(controls.some(n => text(n) === 'التواصل عبر واتساب لمعرفة السعر'), `${doc.url.pathname}: exact Arabic inquiry CTA.`);
  }
  const actionable = controls.some(n => {
    if (n.tag === 'a' && n.attrs.href && n.attrs.href !== '#') {
      const u = new URL(n.attrs.href, doc.url);
      if (u.origin !== base.origin) return false;
      if (u.hash) return nodes(doc.root).some(target => target.attrs.id === decodeURIComponent(u.hash.slice(1)) && DEMO.test(text(target)));
      return /inquiry|preview|استفسار/.test(u.pathname) && [...u.searchParams.values()].some(Boolean);
    }
    const targetId = n.attrs.popovertarget || n.attrs['aria-controls'];
    return targetId && nodes(doc.root).some(target => target.attrs.id === targetId && DEMO.test(text(target)));
  });
  assert.ok(actionable, `${doc.url.pathname}: CTA needs an identifiable local preview target; an inert button/# link is insufficient.`);
  for (const img of nodes(content).filter(n => n.tag === 'img')) {
    if (/logo|شعار/i.test(img.attrs.alt || '')) continue;
    let ancestor = img;
    let decorative = false;
    while (ancestor && ancestor.tag !== 'main') {
      if (ancestor.attrs['aria-hidden'] === 'true') decorative = true;
      ancestor = ancestor.parent;
    }
    assert.ok(Object.hasOwn(img.attrs, 'alt') && (img.attrs.alt || decorative),
      `${doc.url.pathname}: informative catalog media needs alternative text; duplicate decorative thumbnails must be explicitly hidden.`);
    const media = new URL(img.attrs.src || '', doc.url);
    assert.equal(media.origin, base.origin, `${doc.url.pathname}: product preview media must be a local synthetic asset.`);
    assert.ok(DEMO.test(img.attrs.alt) || DEMO.test(text(img.parent)),
      `${doc.url.pathname}: product media must be explicitly identified as illustrative preview media.`);
    for (const item of (img.attrs.srcset || '').split(',').filter(Boolean)) {
      assert.equal(new URL(item.trim().split(/\s+/)[0], doc.url).origin, base.origin, `${doc.url.pathname}: remote product srcset.`);
    }
  }
}

function assertDemoCards(doc) {
  for (const anchor of nodes(main(doc)).filter(n => n.tag === 'a' && n.attrs.href && kind(new URL(n.attrs.href, doc.url)) === 'product')) {
    let card = anchor;
    let explicitlyLabeled = false;
    while (card && card.tag !== 'main') {
      const peers = urls(card, doc.url).filter(u => kind(u) === 'product');
      if (new Set(peers.map(u => u.pathname)).size > 1) break;
      if (DEMO.test(text(card))) { explicitlyLabeled = true; break; }
      card = card.parent;
    }
    assert.ok(explicitlyLabeled, `${doc.url.pathname}: product card ${anchor.attrs.href} needs its own demo label.`);
  }
}

function forms(doc) { return nodes(main(doc)).filter(n => n.tag === 'form'); }
function filterMetadata(doc) {
  const cards = new Map();
  for (const anchor of nodes(main(doc)).filter(n => n.tag === 'a' && n.attrs.href && kind(new URL(n.attrs.href, doc.url)) === 'product')) {
    const path = new URL(anchor.attrs.href, doc.url).pathname;
    let element = anchor;
    const metadata = {};
    while (element && element.tag !== 'main') {
      const peers = new Set(urls(element, doc.url).filter(u => kind(u) === 'product').map(u => u.pathname));
      if (peers.size > 1) break;
      for (const [attribute, value] of Object.entries(element.attrs)) {
        if (/^data-(?:product-)?brand(?:-slug)?$/.test(attribute)) metadata.brand = value;
        if (/^data-(?:product-)?category(?:-slug)?$/.test(attribute)) metadata.category = value;
      }
      element = element.parent;
    }
    if (metadata.brand || metadata.category) cards.set(path, metadata);
  }
  return cards;
}
function queryUrl(doc, form, override) {
  assert.equal((form.attrs.method || 'get').toLowerCase(), 'get', `${doc.url.pathname}: catalog controls must expose GET navigation.`);
  const url = new URL(form.attrs.action || doc.url.pathname, doc.url);
  assert.equal(url.origin, base.origin);
  for (const control of nodes(form).filter(n => n.attrs.name)) {
    if (control.tag === 'input' && !['submit', 'button', 'reset'].includes(control.attrs.type)) {
      if (control.attrs.value) url.searchParams.set(control.attrs.name, control.attrs.value);
    } else if (control.tag === 'select') {
      const options = nodes(control).filter(n => n.tag === 'option');
      const selected = options.find(n => Object.hasOwn(n.attrs, 'selected')) || options[0];
      if (selected?.attrs.value) url.searchParams.set(control.attrs.name, selected.attrs.value);
    }
  }
  for (const [key, value] of Object.entries(override)) url.searchParams.set(key, value);
  return url;
}

test('Jwleria public preview acceptance', { timeout: 120000 }, async t => {
  await discoverLocale('ar');
  await discoverLocale('en');

  await t.test('Visitor HTML has no public monetary, account, commerce or admin boundary', () => {
    for (const doc of documents.values()) { assertBoundary(doc); assertDemoCards(doc); }
  });

  await t.test('Every discovered synthetic product is labeled, referenced and has a preview inquiry action', () => {
    const products = [...documents.values()].filter(d => kind(d.url) === 'product');
    assert.ok(products.length >= 2, 'Both locales need product pages.');
    for (const doc of products) assertDemoProduct(doc);
  });

  await t.test('Local product preview images actually load', async () => {
    const mediaURLs = new Set();
    for (const doc of documents.values()) {
      if (kind(doc.url) !== 'product') continue;
      for (const img of nodes(main(doc)).filter(n => n.tag === 'img' && !/logo|شعار/i.test(n.attrs.alt || ''))) {
        mediaURLs.add(new URL(img.attrs.src, doc.url).href);
      }
    }
    assert.ok(mediaURLs.size, 'Synthetic products need served illustrative media.');
    for (const url of mediaURLs) {
      assert.equal(new URL(url).origin, base.origin);
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
      assert.equal(response.status, 200, `${new URL(url).pathname}: product media is missing.`);
      assert.match(response.headers.get('content-type') || '', /^image\//i, `${new URL(url).pathname}: expected served image.`);
      assert.ok((await response.arrayBuffer()).byteLength > 0, `${new URL(url).pathname}: empty product image.`);
    }
  });

  for (const locale of ['ar', 'en']) {
    await t.test(`${locale}: server catalog applies search, taxonomy filters and bounded pagination`, async () => {
      const catalog = [...documents.values()].find(d => kind(d.url) === 'catalog' && d.url.pathname.startsWith(`/${locale}/`) && !d.url.search);
      assert.ok(catalog, `${locale}: catalog index missing.`);
      const searchForm = forms(catalog).find(f => nodes(f).some(n => n.tag === 'input' && (n.attrs.type === 'search' || /^(q|search|query)$/.test(n.attrs.name || ''))));
      assert.ok(searchForm, `${locale}: native search form missing.`);
      const searchInput = nodes(searchForm).find(n => n.tag === 'input' && (n.attrs.type === 'search' || /^(q|search|query)$/.test(n.attrs.name || '')));
      assert.ok(searchInput.attrs.name, `${locale}: search field needs a name.`);
      const product = [...documents.values()].find(d => kind(d.url) === 'product' && d.url.pathname.startsWith(`/${locale}/`));
      const productTitle = text(nodes(main(product)).find(n => n.tag === 'h1'));
      const term = productTitle.split(/\s+/).find(word => /[\p{L}]{3}/u.test(word) && !DEMO.test(word)) || productTitle.split(/\s+/)[0];
      const positive = await page(queryUrl(catalog, searchForm, { [searchInput.attrs.name]: term }));
      assertBoundary(positive);
      assert.ok(productPaths(positive).size, `${locale}: search query must retain a crawlable catalog shell.`);
      const empty = await page(queryUrl(catalog, searchForm, { [searchInput.attrs.name]: 'jwleria-acceptance-no-match-7f63b2' }));
      assertBoundary(empty);
      assert.equal(productPaths(empty).size, 0, `${locale}: a no-match query must render no product cards.`);
      const metadata = filterMetadata(catalog);
      assert.equal(metadata.size, productPaths(catalog).size, `${locale}: every catalog card must expose its browser-filter taxonomy metadata.`);
      for (const [path, values] of metadata) {
        assert.ok(values.brand && values.category, `${path}: both brand and category filter metadata are required.`);
      }

      for (const taxonomy of ['brand', 'category']) {
        const form = forms(catalog).find(f => nodes(f).some(n => n.tag === 'select' && n.attrs.name === taxonomy));
        // Category is a GET control; brand selection may use the crawlable
        // directory/detail navigation instead of duplicating a catalog dropdown.
        assert.ok(form || taxonomy === 'brand', `${locale}: native ${taxonomy} filter missing.`);
        const select = form && nodes(form).find(n => n.tag === 'select' && n.attrs.name === taxonomy);
        const option = select && nodes(select).find(n => n.tag === 'option' && n.attrs.value && !/^(all|any|\*)$/.test(n.attrs.value));
        const selectedValue = option?.attrs.value || (taxonomy === 'brand' && [...metadata.values()][0]?.brand);
        assert.ok(selectedValue, `${locale}: ${taxonomy} selection needs a real value.`);
        const taxonomyURL = [...discovered].map(u => new URL(u)).find(u => kind(u) === taxonomy && u.pathname.startsWith(`/${locale}/`) && u.pathname.split('/').filter(Boolean).at(-1) === selectedValue);
        assert.ok(taxonomyURL, `${locale}: selection needs a crawlable ${taxonomy} route.`);
        const taxonomyPage = await page(taxonomyURL);
        assertBoundary(taxonomyPage);
        assertDemoCards(taxonomyPage);
        const expected = productPaths(taxonomyPage);
        if (form) {
          const filtered = await page(queryUrl(catalog, form, { [taxonomy]: selectedValue }));
          assertBoundary(filtered);
          assertDemoCards(filtered);
        }
        assert.ok(expected.size, `${locale}: selected ${taxonomy} should identify synthetic products.`);
        if (form) {
          const filtered = await page(queryUrl(catalog, form, { [taxonomy]: selectedValue }));
          const entries = [...filterMetadata(filtered).values()];
          assert.ok(entries.length > 0 && entries.length <= 12);
          assert.ok(entries.every(values => values[taxonomy] === selectedValue), `${locale}: server must apply the selected taxonomy.`);
        }
        assert.ok(productPaths(catalog).size <= 12, `${locale}: catalog must not load every product into visitor HTML.`);
      }
    });
  }

  await t.test('Removed public capabilities have no routable account, commerce or admin page', async () => {
    for (const route of ['login', 'register', 'account', 'cart', 'checkout', 'admin']) {
      for (const prefix of ['', '/ar', '/en']) {
        const { response } = await request(new URL(`${prefix}/${route}/`, base));
        assert.ok([404, 410].includes(response.status), `${prefix}/${route}/ must not exist in the public site (received ${response.status}).`);
      }
    }
  });

  t.diagnostic(`Reviewed ${documents.size} HTTP HTML responses. This HTTP suite checks server filters and pagination. Inquiry-dialogue interaction remains a browser concern.`);
});
