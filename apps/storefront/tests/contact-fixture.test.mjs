import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {existsSync} from 'node:fs';
import {createServer} from 'node:net';
import {isAbsolute, join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Isolated contact fixture, opt-in so the normal suite stays fast. Nothing is ever sent.
//   JWL_CONTACT_FIXTURE_DIR=/absolute/empty/temp/dir node --test tests/contact-fixture.test.mjs
// builds the storefront twice with the Node adapter and CATALOG_MODE=preview (never PUBLIC_RELEASE=live):
// once with live contact on the fictional Ofcom drama-range number, once unconfigured. Each build is served
// on 127.0.0.1 only, and every contact control on a set of pages is checked. JWL_CONTACT_FIXTURE_REUSE=1
// serves existing builds from that directory instead of rebuilding.
const DIR = process.env.JWL_CONTACT_FIXTURE_DIR;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FICTIONAL = '+44 7700 900123';
const WA = 'https://wa.me/447700900123';
const PAGES = ['/ar/', '/en/', '/ar/about/', '/en/about/', '/en/catalog/', '/ar/brands/jwleria-edit/', '/en/brands/omega/', '/ar/products/watch-study-01/', '/en/products/handbag-study-02/', '/ar/font-preview/'];
// The caller's catalog/contact variables are dropped; these explicit (often empty) values also take precedence
// over any local .env file, so only this fixture's configuration reaches the builds and servers.
const ISOLATED = {CATALOG_MODE: 'preview', ASTRO_TELEMETRY_DISABLED: '1', PUBLIC_INQUIRY_MODE: '', PUBLIC_WHATSAPP_E164: '', PUBLIC_RELEASE: '', PUBLIC_SITE_ORIGIN: '', SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: ''};
const environment = extra => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(?:PUBLIC_|SUPABASE_|CATALOG_MODE$|JWL_DEPLOY_TARGET$|HOST$|PORT$)/.test(key)));
  return {...env, ...ISOLATED, ...extra};
};

const decode = (value = '') => value.replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
  .replace(/&(amp|lt|gt|quot|apos);/g, (_, n) => ({amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"})[n]);
const attributes = source => Object.fromEntries([...source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)].map(m => [m[1].toLowerCase(), decode(m[2] ?? m[3] ?? m[4] ?? '')]));
const elements = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>([^]*?)</${tag}>`, 'gi'))].map(m => ({tag, attrs: attributes(m[1]), inner: m[2]}));
const textOf = html => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const classes = el => (el.attrs.class ?? '').split(/\s+/);
const isContact = el => classes(el).some(c => c === 'cta' || c === 'whatsapp-contact') || 'data-inquiry' in el.attrs || /wa\.me|whatsapp/i.test(el.attrs.href ?? '');
const sent = el => {
  try { const u = new URL(el.attrs.href); return `${u.origin}${u.pathname}` === WA && [...u.searchParams.keys()].join() === 'text' ? u.searchParams.get('text') : undefined; } catch { return undefined; }
};

function run(args, env, label) {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, args, {cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe']});
    let log = '';
    child.stdout.on('data', d => { log += d; });
    child.stderr.on('data', d => { log += d; });
    child.on('error', fail);
    child.on('exit', code => code === 0 ? done() : fail(new Error(`${label} failed (${code})\n${log.slice(-4000)}`)));
  });
}
async function build(name, extra) {
  const out = join(DIR, name);
  if (process.env.JWL_CONTACT_FIXTURE_REUSE === '1' && existsSync(join(out, 'server/entry.mjs'))) return out;
  await run([join(ROOT, 'node_modules/astro/bin/astro.mjs'), 'build', '--outDir', out], environment(extra), `${name} build`);
  return out;
}
const freePort = () => new Promise((done, fail) => {
  const probe = createServer().once('error', fail).listen(0, '127.0.0.1', () => { const {port} = probe.address(); probe.close(() => done(port)); });
});
async function serve(out, extra, check) {
  const port = await freePort();
  const child = spawn(process.execPath, [join(out, 'server/entry.mjs')], {env: environment({...extra, HOST: '127.0.0.1', PORT: String(port)}), stdio: ['ignore', 'pipe', 'pipe']});
  let log = '';
  child.stdout.on('data', d => { log += d; });
  child.stderr.on('data', d => { log += d; });
  const base = `http://127.0.0.1:${port}`;
  const get = async path => {
    const response = await fetch(new URL(path, base), {redirect: 'manual', signal: AbortSignal.timeout(10000)});
    const raw = await response.text();
    return {status: response.status, raw, body: raw.replace(/<script\b[^>]*>[^]*?<\/script>/gi, '')};
  };
  try {
    for (let i = 0; ; i++) {
      try { if ((await get('/ar/')).status === 200) break; } catch {}
      if (i > 100 || child.exitCode !== null) throw new Error(`fixture server did not start\n${log.slice(-4000)}`);
      await new Promise(r => setTimeout(r, 200));
    }
    await check(get);
  } finally { if (child.exitCode === null) { child.kill(); await once(child, 'exit'); } }
}

async function expectations() {
  const [{t}, fixtures] = await Promise.all([import('../src/i18n/ui.ts'), import('../src/server/fixtures.ts')]);
  const brand = fixtures.getBrand('jwleria-edit').name;
  const product = (l, slug) => { const p = fixtures.getProduct(slug); return t(l).dialog.product(p.name[l], p.reference, brand); };
  return {t, product, brandMessage: (l, slug) => t(l).dialog.brand(fixtures.getBrand(slug).name)};
}

// Every control opens the fictional destination with exactly the message its page composes.
async function assertLive(get, x) {
  for (const path of PAGES) {
    const {status, body} = await get(path);
    assert.equal(status, 200, path);
    const l = path.slice(1, 3);
    assert.doesNotMatch(body, /data-inquiry|whatsapp-contact--pending|id="inquiry-dialog"|<button[^>]*class="cta/, `${path}: no pending or copy-only state when live`);
    assert.deepEqual([...new Set([...body.matchAll(/wa\.me\/([^?"&#]*)/g)].map(m => m[1]))], ['447700900123'], `${path}: one destination only`);
    const controls = [...elements(body, 'a'), ...elements(body, 'button')].filter(isContact);
    assert.ok(controls.length >= (path.includes('font-preview') ? 1 : 2), `${path}: contact controls rendered`);
    const allowed = new Set([x.t(l).dialog.general, ...(path.includes('/brands/omega/') ? [x.brandMessage(l, 'omega')] : [])]);
    for (const card of elements(body, 'article').filter(el => classes(el).includes('card'))) {
      const slug = card.inner.match(/href="\/(?:ar|en)\/products\/([a-z0-9-]+)\/"/)[1];
      const cta = elements(card.inner, 'a').find(el => classes(el).includes('cta'));
      assert.equal(sent(cta), x.product(l, slug), `${path}: card ${slug}`);
      allowed.add(x.product(l, slug));
    }
    if (path.includes('/products/')) {
      const slug = path.split('/')[3];
      const cta = elements(body, 'a').find(el => classes(el).includes('cta--solid'));
      assert.equal(sent(cta), x.product(l, slug), `${path}: product CTA`);
      assert.equal(textOf(elements(body, 'blockquote')[0].inner), x.product(l, slug), `${path}: the quoted text is the sent text`);
      allowed.add(x.product(l, slug));
    }
    for (const el of controls) {
      assert.equal(el.tag, 'a', `${path}: ${el.attrs.class}`);
      assert.ok(allowed.has(sent(el)), `${path}: unexpected message ${el.attrs.href}`);
      assert.equal(el.attrs.target, '_blank');assert.equal(el.attrs.rel, 'noopener');
    }
  }
  const robots = await get('/robots.txt');
  assert.equal(robots.body, 'User-agent: *\nDisallow: /\n', 'live contact alone never opens indexing');
}

// Honest pending state: no destination anywhere; preview fixtures keep their copy dialog.
async function assertPending(get, x) {
  for (const path of PAGES) {
    const {status, raw, body} = await get(path);
    assert.equal(status, 200, path);
    const l = path.slice(1, 3);
    assert.doesNotMatch(raw, /wa\.me|api\.whatsapp|whatsapp:\/\/|447700900123|7700 900123/, `${path}: no destination or number`);
    const general = [...elements(body, 'a'), ...elements(body, 'button')].filter(el => classes(el).includes('whatsapp-contact'));
    assert.ok(general.length >= (path.includes('font-preview') ? 1 : 2), path);
    for (const el of general) {
      assert.equal(el.tag, 'button', path);assert.ok('disabled' in el.attrs && classes(el).includes('whatsapp-contact--pending'), path);
      assert.match(textOf(el.inner) + (el.attrs['aria-label'] ?? ''), new RegExp(x.t(l).whatsapp.pending), path);
    }
    const ctas = elements(body, 'a').filter(el => classes(el).includes('cta'));
    if (/\/(?:catalog|products|brands\/jwleria-edit)\/|^\/(?:ar|en)\/$/.test(path)) assert.ok(ctas.length, `${path}: preview product CTAs`);
    for (const el of ctas) {
      const slug = el.attrs.href.match(/^\/(?:ar|en)\/products\/([a-z0-9-]+)\/#inquiry$/)[1];
      assert.equal(el.attrs['aria-controls'], 'inquiry-dialog');assert.ok('data-inquiry' in el.attrs);
      assert.equal(el.attrs['data-inq-message'], x.product(l, slug), `${path}: ${slug}`);
    }
    if (ctas.length) assert.match(body, /<dialog id="inquiry-dialog"/, `${path}: copy dialog`);
    if (path.includes('/products/')) assert.equal(textOf(elements(body, 'blockquote')[0].inner), x.product(l, path.split('/')[3]), `${path}: quoted text`);
  }
  const robots = await get('/robots.txt');
  assert.equal(robots.body, 'User-agent: *\nDisallow: /\n');
}

test('contact fixture: fictional live destination and honest pending state in real builds', {skip: DIR ? false : 'set JWL_CONTACT_FIXTURE_DIR=<absolute empty temp dir> to build and serve the fixture', timeout: 900000}, async t => {
  assert.ok(isAbsolute(DIR), 'JWL_CONTACT_FIXTURE_DIR must be absolute');
  const x = await expectations();
  const live = await build('jwl-contact-live', {PUBLIC_INQUIRY_MODE: 'live', PUBLIC_WHATSAPP_E164: FICTIONAL});
  const pending = await build('jwl-contact-pending', {});
  await t.test('build-time live configuration opens the fictional destination everywhere', () => serve(live, {}, get => assertLive(get, x)));
  await t.test('an unconfigured build shows the pending state', () => serve(pending, {}, get => assertPending(get, x)));
  await t.test('runtime live mode with an invalid number stays pending', () => serve(pending, {PUBLIC_INQUIRY_MODE: 'live', PUBLIC_WHATSAPP_E164: '0044 7700 900123'}, get => assertPending(get, x)));
  await t.test('runtime configuration of the same build opens the fictional destination', () => serve(pending, {PUBLIC_INQUIRY_MODE: 'live', PUBLIC_WHATSAPP_E164: FICTIONAL}, get => assertLive(get, x)));
});
