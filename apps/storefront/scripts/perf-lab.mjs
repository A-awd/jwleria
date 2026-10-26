// Local lab only, never visitor performance. Cloudflare builds of the storefront run under wrangler's local
// workerd (no login, deploy or remote bindings) against a fictional PostgREST mock on 127.0.0.1 that delays every
// request. Each Worker fetch is intercepted: only the mock is reachable and anything else is refused and counted.
// Usage: pnpm build:cloudflare && node scripts/perf-lab.mjs [--base <other storefront dir>] [--latency 250] [--runs 5] [--stale] [--browser] [--out report.json]
// --browser needs a locally installed Playwright with Chromium (resolved like any CommonJS module); it is not a dependency.
import http from 'node:http';
import { createRequire } from 'node:module';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { unstable_startWorker } from 'wrangler';

const { values: args } = parseArgs({ options: { base: { type: 'string' }, latency: { type: 'string', default: '250' }, runs: { type: 'string', default: '5' }, stale: { type: 'boolean' }, browser: { type: 'boolean' }, out: { type: 'string' } } });
const LATENCY = Number(args.latency), RUNS = Number(args.runs), FRESH_MS = 61000;
const LAB_ORIGIN = 'https://lab-mock.supabase.co'; // never resolved: the outbound handler below answers for it
const builds = { ...(args.base ? { base: resolve(args.base) } : {}), change: resolve(import.meta.dirname, '..') };
const pages = { home: '/ar/', catalog: '/ar/catalog/', category: '/ar/categories/watches/', brand: '/ar/brands/lab-atelier/', product: '/ar/products/lab-fixture-piece-01/' };
const PROBE = '/en/catalog/?page=2'; // primed once, then refreshed while the mock fails
const refused = [];
let unbounded = 0; // every storefront read must name its own row bound (limit or page size)
const sleep = ms => new Promise(done => setTimeout(done, ms));

// Fictional facts-only rows shaped like the public projection; no real product, brand or image appears here.
const BRAND = { brand_slug: 'lab-atelier', brand_name: 'Lab Atelier', brand_tier: 'luxury' };
const rows = Array.from({ length: 60 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0'), line = (i % 2) + 1;
  return { id: `lab-${n}`, slug: `lab-fixture-piece-${n}`, reference: `LAB-00${n}`, brand_slug: BRAND.brand_slug, category_slug: 'watches', collection_slug: `lab-line-${line}`, collection_kind: 'collection', collection_ar: `خط اختبار ${line}`, collection_en: `Lab line ${line}`, name_ar: `قطعة اختبار ${n}`, name_en: `Lab fixture piece ${n}`, description_ar: 'وصف اختبار محلي.', description_en: 'Local lab description.', images: [], image_variants: [], media_state: 'facts_only', published_at: new Date(Date.UTC(2026, 9, 1) - i * 36e5).toISOString() };
});
const collections = brand => [...new Map(rows.filter(r => r.brand_slug === brand).map(r => [r.collection_slug, { collection_slug: r.collection_slug, collection_ar: r.collection_ar, collection_en: r.collection_en }])).values()];

function mock() {
  const state = { log: [], failing: false };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1'), q = url.searchParams, eq = field => q.get(field)?.replace(/^eq\./, '');
    state.log.push({ path: url.pathname, at: performance.now() });
    if (!q.has('limit') && !q.has('p_page_size')) unbounded++;
    await sleep(LATENCY);
    const json = (body, status = 200, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(body)); };
    if (state.failing) return json({ message: 'lab outage' }, 503);
    if (url.pathname === '/rest/v1/jwl_brands') return json([BRAND]);
    if (url.pathname === '/rest/v1/jwl_collections') return json(collections(eq('brand_slug')));
    if (url.pathname === '/rest/v1/rpc/jwl_brand_page') {
      const brand = q.get('p_brand'), size = Math.min(48, Number(q.get('p_page_size')) || 12), items = rows.filter(r => r.brand_slug === brand), pages = Math.ceil(items.length / size);
      const page = Math.min(Math.max(1, Number(q.get('p_page')) || 1), Math.max(1, pages));
      return json({ items: items.slice((page - 1) * size, page * size), total: items.length, page, pageSize: size, pages, collections: collections(brand), brands: [BRAND], brand: brand === BRAND.brand_slug ? BRAND : null });
    }
    if (url.pathname === '/rest/v1/jwl_catalog') {
      const match = rows.filter(r => ['brand_slug', 'category_slug', 'collection_slug', 'collection_kind', 'slug'].every(f => !q.has(f) || r[f] === eq(f)));
      const limit = Number(q.get('limit') ?? match.length), offset = Number(q.get('offset') ?? 0), slice = match.slice(offset, offset + limit);
      if (offset && offset >= match.length) return json([], 416, { 'Content-Range': `*/${match.length}` });
      return json(slice, 200, { 'Content-Range': slice.length ? `${offset}-${offset + slice.length - 1}/${match.length}` : `*/${match.length}` });
    }
    json({ message: 'not served by the lab mock' }, 404);
  });
  return new Promise(done => server.listen(0, '127.0.0.1', () => done(Object.assign(state, { server, port: server.address().port }))));
}

async function start(dir, upstream) {
  const persist = await mkdtemp(join(tmpdir(), 'jwl-perf-lab-'));
  const worker = await unstable_startWorker({
    config: join(dir, 'dist-cloudflare/server/wrangler.json'),
    bindings: { SUPABASE_URL: { type: 'plain_text', value: LAB_ORIGIN }, SUPABASE_PUBLISHABLE_KEY: { type: 'plain_text', value: 'sb_publishable_LAB' } },
    dev: {
      server: { hostname: '127.0.0.1', port: 0 }, inspector: false, watch: false, persist, logLevel: 'error',
      outboundService: async request => {
        const url = new URL(request.url);
        if (url.origin !== LAB_ORIGIN) { refused.push(url.href); return new Response('refused by the local lab', { status: 502 }); }
        const response = await fetch(`http://127.0.0.1:${upstream.port}${url.pathname}${url.search}`, { headers: request.headers });
        return new Response(response.body, response);
      },
    },
  });
  await worker.ready;
  return { url: await worker.url, dispose: async () => { await worker.dispose(); await rm(persist, { recursive: true, force: true }); } };
}

async function visit(origin, path, log) {
  const from = log.length, t0 = performance.now();
  const response = await fetch(new URL(path, origin), { redirect: 'manual' });
  const ttfb = performance.now() - t0;
  const bytes = (await response.arrayBuffer()).byteLength;
  return { state: response.headers.get('X-JWL-Cache') ?? 'none', status: response.status, ttfb, total: performance.now() - t0, bytes, age: response.headers.get('Age'), timing: response.headers.get('Server-Timing'), t0, from };
}
// Requests arriving within half the injected delay of each other form one round trip of the waterfall.
function upstream(log, from) {
  const entries = log.slice(from);
  let waves = 0, last = -Infinity;
  for (const e of entries) { if (e.at - last > LATENCY / 2) waves++; last = e.at; }
  return { requests: entries.length, waves, paths: entries.map(e => e.path.replace('/rest/v1/', '')) };
}
const median = values => { const s = [...values].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const ms = n => Math.round(n);
const settle = () => sleep(LATENCY * 6); // long enough for any background refresh waterfall to finish
const brief = v => ({ state: v.state, status: v.status, ttfb: ms(v.ttfb), htmlComplete: ms(v.total), age: v.age });

async function coldMisses() {
  const results = {};
  for (const [build, dir] of Object.entries(builds)) for (const [page, path] of Object.entries(pages)) {
    const samples = [];
    for (let run = 0; run < RUNS; run++) {
      const m = await mock(), w = await start(dir, m);
      try {
        const warm = await visit(w.url, '/ar/about/', m.log); // loads the Worker modules without any catalog read
        if (upstream(m.log, warm.from).requests) throw new Error('the warm-up page unexpectedly read the catalog');
        const cold = await visit(w.url, path, m.log); await sleep(LATENCY * 2);
        const sample = { ...cold, ...upstream(m.log, cold.from) };
        if (page === 'product') { const next = await visit(w.url, '/ar/products/lab-fixture-piece-02/', m.log); await sleep(LATENCY * 2); sample.warm = { ...next, ...upstream(m.log, next.from) }; }
        samples.push(sample);
      } finally { await w.dispose(); m.server.close(); }
    }
    results[`${build} ${page}`] = { state: samples[0].state, status: samples[0].status, bytes: samples[0].bytes, ttfb: ms(median(samples.map(s => s.ttfb))), ttfbRange: [ms(Math.min(...samples.map(s => s.ttfb))), ms(Math.max(...samples.map(s => s.ttfb)))], htmlComplete: ms(median(samples.map(s => s.total))), requests: samples[0].requests, waves: samples[0].waves, paths: samples[0].paths,
      ...(samples[0].warm ? { secondProductSameIsolate: { ttfb: ms(median(samples.map(s => s.warm.ttfb))), htmlComplete: ms(median(samples.map(s => s.warm.total))), requests: samples[0].warm.requests, waves: samples[0].warm.waves } } : {}) };
  }
  return results;
}

// Prime each page, let the fresh minute pass, then compare what the next visitor waits for. The probe page is then
// refreshed while every upstream read fails, to show what a visitor receives during an outage inside the window.
async function staleVisits() {
  const running = [];
  for (const [build, dir] of Object.entries(builds)) { const m = await mock(); running.push({ build, m, w: await start(dir, m) }); }
  const results = {};
  try {
    for (const { build, m, w } of running) {
      for (const [page, path] of Object.entries(pages)) {
        await visit(w.url, path, m.log); await sleep(LATENCY * 2);
        const hit = await visit(w.url, path, m.log);
        results[`${build} ${page}`] = { hit: { ...brief(hit), requests: upstream(m.log, hit.from).requests } };
      }
      await visit(w.url, PROBE, m.log); await sleep(LATENCY * 2);
    }
    await sleep(FRESH_MS);
    for (const { build, m, w } of running) {
      for (const [page, path] of Object.entries(pages)) {
        const after = await visit(w.url, path, m.log); await settle();
        const caused = upstream(m.log, after.from), next = await visit(w.url, path, m.log);
        Object.assign(results[`${build} ${page}`], { after61s: { ...brief(after), timing: after.timing, upstreamRequests: caused.requests }, following: brief(next) });
      }
      m.failing = true;
      const outage = await visit(w.url, PROBE, m.log); await settle();
      const again = await visit(w.url, PROBE, m.log); await settle();
      const attempted = upstream(m.log, outage.from).requests;
      m.failing = false;
      const recovered = await visit(w.url, PROBE, m.log); await settle();
      const next = await visit(w.url, PROBE, m.log);
      results[`${build} outage probe`] = { duringOutage: brief(outage), secondDuringOutage: brief(again), failedUpstreamRequests: attempted, afterRecovery: brief(recovered), following: brief(next) };
    }
  } finally { for (const { m, w } of running) { await w.dispose(); m.server.close(); } }
  return results;
}

// One Chromium mobile run: Pixel 7 profile, 4x CPU slowdown and a 150 ms RTT / 1.6 Mbit/s link (Lighthouse-like values).
async function browserRun(dir) {
  const { chromium, devices } = createRequire(import.meta.url)('playwright');
  const m = await mock(), w = await start(dir, m), browser = await chromium.launch(), results = {}, external = [];
  let primed = 0;
  try {
    await visit(w.url, '/ar/about/', m.log);
    const plan = [['home miss', '/ar/', '[data-brand-motion]'], ['home hit', '/ar/', '[data-brand-motion]'], ['product miss', '/ar/products/lab-fixture-piece-03/', 'summary.icon-btn'], ['home stale', '/ar/', '[data-brand-motion]']];
    for (const [label, path, tap] of plan) {
      if (label === 'home stale') await sleep(Math.max(0, primed + FRESH_MS - performance.now()));
      if (label === 'home miss') primed = performance.now();
      const context = await browser.newContext({ ...devices['Pixel 7'], locale: 'ar' });
      await context.route(url => !url.href.startsWith(w.url.origin), route => { external.push(route.request().url()); return route.abort(); });
      await context.addInitScript(() => {
        const lab = window.__lab = { lcp: 0, lcpTag: '', cls: 0, long: [], events: [], first: null };
        const watch = (type, fn, extra = {}) => new PerformanceObserver(list => list.getEntries().forEach(fn)).observe({ type, buffered: true, ...extra });
        watch('largest-contentful-paint', e => { lab.lcp = e.startTime; lab.lcpTag = e.element?.tagName ?? ''; });
        watch('layout-shift', e => { if (!e.hadRecentInput) lab.cls += e.value; });
        watch('longtask', e => lab.long.push(e.duration));
        watch('event', e => { if (e.interactionId) lab.events.push(e.duration); }, { durationThreshold: 16 });
        watch('first-input', e => { lab.first = e.duration; });
      });
      const page = await context.newPage(), cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const response = await page.goto(new URL(path, w.url).href, { waitUntil: 'load' });
      await page.waitForTimeout(1500);
      let tapped = false;
      try { await page.tap(tap, { timeout: 3000 }); tapped = true; await page.waitForTimeout(800); } catch {}
      const lab = await page.evaluate(() => ({ ...window.__lab, ttfb: performance.getEntriesByType('navigation')[0].responseStart, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime }));
      results[label] = { cache: response.headers()['x-jwl-cache'], ttfb: ms(lab.ttfb), fcp: ms(lab.fcp), lcp: ms(lab.lcp), lcpElement: lab.lcpTag, cls: Number(lab.cls.toFixed(4)), tbt: ms(lab.long.reduce((sum, d) => sum + Math.max(0, d - 50), 0)),
        inpProxy: !tapped ? 'not measured' : lab.events.length ? { tap, maxEventMs: ms(Math.max(...lab.events)) } : { tap, maxEventMs: '<16', firstInputMs: ms(lab.first ?? 0) } };
      await context.close();
      if (label === 'home stale') await settle();
    }
  } finally { await browser.close(); await w.dispose(); m.server.close(); }
  return { profile: 'Pixel 7, 4x CPU, 150 ms RTT, 1.6 Mbit/s down, 750 kbit/s up', results, externalRequestsBlocked: external.length };
}

const report = { assumptions: { injectedDelayPerUpstreamRequestMs: LATENCY, runsPerColdMiss: RUNS, runtime: 'wrangler local workerd, Cloudflare build, fresh isolate per cold sample', data: '60 fictional facts-only rows, one fictional published brand outside the curated directory' }, coldMiss: await coldMisses() };
if (args.stale) report.stale = await staleVisits();
if (args.browser) report.browser = await browserRun(builds.change);
report.refusedOutbound = refused.length;
report.unboundedReads = unbounded;
// wrangler writes its own log lines to stdout, so --out keeps the report separate from them.
if (args.out) await writeFile(args.out, JSON.stringify(report, null, 2) + '\n'); else console.log(JSON.stringify(report, null, 2));
