/* Jwleria — Direction B «الفهرس». Design preview only.
   Renders every page client-side from window.JWL (../shared/catalog-data.js + variants.js). */
(() => {
'use strict';
const J = window.JWL, D = J.data, A = J.AR, enc = encodeURIComponent;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
/* Latin run, always isolated */
const L = (s, c) => `<bdi lang="en" dir="ltr"${c ? ` class="${c}"` : ''}>${esc(s)}</bdi>`;
const V = s => /[A-Za-z]/.test(s) ? L(s) : esc(s);
const ISO = s => '⁨' + s + '⁩';
const CAT = {}; D.categories.forEach(c => { CAT[c.slug] = c; });
const page = document.body.dataset.page, P0 = J.params();
const cU = s => 'catalog.html?category=' + s, bU = b => 'catalog.html?brand=' + enc(b);
const AZ = 'العلامات من ' + L('A') + ' إلى ' + L('Z');
const NO = 'لا تتوفر صورة أصلية معتمدة لهذا المرجع حاليًا.';
const dt = D.meta.retrieved.split('-'), DATE = A(+dt[2]) + ' أكتوبر ' + A(dt[0]);

/* ——— icons ——— */
const sv = (d, w = 1.5, vb = 20) => `<svg viewBox="0 0 ${vb} ${vb}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const I = {
  search: sv('<circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/>'),
  menu: sv('<path d="M3 6.5h14M3 10h14M3 13.5h14"/>', 1.4),
  x: sv('<path d="m5 5 10 10m0-10L5 15"/>', 1.4),
  chev: sv('<path d="m6 8 4 4 4-4"/>', 1.4),
  arrow: sv('<path d="M16 10H4m4.5-4.5L4 10l4.5 4.5"/>', 1.3),
  filter: sv('<path d="M3 6h14M5.5 10h9M8 14h4"/>', 1.4)
};
const GL = {
  bag: '<path d="M14.5 18h19l2.2 22.5H12.3z"/><path d="M19 18v-3.2a5 5 0 0 1 10 0V18"/>',
  watch: '<circle cx="24" cy="24" r="9"/><path d="M19.6 16.2 20.6 7h6.8l1 9.2M19.6 31.8l1 9.2h6.8l1-9.2M24 20.2V24l2.6 1.6"/>',
  lug: '<rect x="14" y="14" width="20" height="26" rx="2.6"/><path d="M20 14V8.5h8V14M20 19.5v15M28 19.5v15"/>'
};
const glyph = m => sv(GL[m.category === 'watches' ? 'watch' : m.category === 'luggage' ? 'lug' : 'bag'], 1.1, 48);

/* ——— media: tinted stand-in or facts-only ——— */
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (h, p) => '#' + rgb(h).map(x => Math.round(x * p + 255 * (1 - p)).toString(16).padStart(2, '0')).join('');
const lum = h => rgb(h).reduce((s, x, i) => (x /= 255, s + [.2126, .7152, .0722][i] * (x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4)), 0);
const tint = (m, v) => { const t = J.toneOf(m, v), b = mix(t, .62); return { a: mix(t, .3), b, dk: lum(b) < .2 }; };
const axv = (m, v) => J.axesOf(m).map(x => J.valueOf(m, x.kind, v[x.kind])).filter(Boolean);
const phL = (m, v, w) => [m.name, ...axv(m, v).map(o => o.ar), w].filter(Boolean).join('، ') + ' — صورة مؤقتة';
const ph = (m, v, w) => {
  const t = tint(m, v);
  return `<div class="ph${t.dk ? ' dk' : ''}" role="img" aria-label="${esc(phL(m, v, w))}" style="--a:${t.a};--b:${t.b}">${glyph(m)}<span class="ph-l" aria-hidden="true"><span>مكان الصورة الأصلية${w ? ' · ' + w : ''}</span>${L(v.ref, 'ref')}</span></div>`;
};
const paint = (el, m, v, w) => {
  const t = tint(m, v);
  el.style.setProperty('--a', t.a); el.style.setProperty('--b', t.b); el.classList.toggle('dk', t.dk);
  el.setAttribute('aria-label', phL(m, v, w)); $('.ref', el).textContent = v.ref;
};
const fo = (m, v, lg) => {
  const d = v.dial && J.valueOf(m, 'dial', v.dial), h = lg ? '' : ' aria-hidden="true"';
  return `<div class="fo${lg ? ' fo--lg' : ''}"><p class="fo-b"${h}>${L(m.brand)}<i style="background:${J.toneOf(m, v)}"></i></p><p class="fo-n"${h}>${L(m.name)}</p>` +
    (lg && m.nameAr ? `<p class="fo-a">${esc(m.nameAr)}</p>` : '') + (lg && d ? `<p class="fo-a">الميناء: ${esc(d.ar)}</p>` : '') +
    `<div class="fo-f"><p class="fo-r"><span>المرجع</span>${L(v.ref, 'ref')}</p><p class="fo-s">${NO}</p></div></div>`;
};

/* ——— model card: one per model ——— */
function card(m) {
  const v = J.primary(m), s = J.summaryAr(m), x = J.axesOf(m).find(a => a.kind !== 'size' && a.values.length > 1);
  const dots = x ? `<span class="dots">${x.values.slice(0, 4).map(o => `<a href="${J.url(m, J.nearest(m, v, x.kind, o.id))}" style="--c:${o.tone}" aria-label="${esc(o.ar + '، ' + m.name)}" title="${esc(o.ar)}"><i></i></a>`).join('')}${x.values.length > 4 ? `<em aria-hidden="true">+${A(x.values.length - 4)}</em>` : ''}</span>` : '';
  return `<article class="card">${J.hasStandInImage(m) ? ph(m, v) : fo(m, v)}<div class="card-b"><p class="card-brand">${L(m.brand)}</p><h3 class="card-name"><a href="${J.url(m, v)}">${L(m.name)}</a></h3><p class="card-type">${esc(m.typeAr)}</p>` +
    (dots || s ? `<div class="card-v">${dots}${s ? `<span>${s}</span>` : ''}</div>` : '') + '</div></article>';
}

/* ——— brand A–Z ——— */
const LET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], GR = {};
D.brands.forEach(b => { const l = b[0].toUpperCase(); (GR[l] = GR[l] || []).push(b); });
const azL = (p, f) => {
  const it = LET.map(l => !GR[l] ? `<span lang="en" aria-hidden="true">${l}</span>` : f ? `<button type="button" lang="en" aria-pressed="false" data-l="${l}">${l}</button>` : `<a href="#${p}-${l}" lang="en">${l}</a>`).join('');
  return f ? `<div class="az-l" role="group" aria-label="تصفية العلامات حسب الحرف"><button type="button" class="all" aria-pressed="true" data-l="">الكل</button>${it}</div>` : `<nav class="az-l" aria-label="الانتقال إلى حرف">${it}</nav>`;
};
const azC = (p, t) => `<div class="az-c">${Object.keys(GR).sort().map(l => `<div class="az-g" id="${p}-${l}" data-l="${l}"><${t} class="az-h" lang="en">${l}</${t}><ul>${GR[l].map(b => {
  const n = D.brandCounts[b];
  return `<li><a href="${bU(b)}">${L(b)}${n ? `<span class="n"><span class="vh">، المراجع المنشورة: </span>${A(n)}</span>` : ''}</a></li>`;
}).join('')}</ul></div>`).join('')}</div>`;
const TOPS = Object.keys(D.brandCounts).sort((a, b) => D.brandCounts[b] - D.brandCounts[a]);
const catLis = () => D.categories.map(c => `<li><a href="${cU(c.slug)}">${c.ar}</a></li>`).join('');

/* ——— header / drawer / footer ——— */
function header() {
  const cats = P0.getAll('category'), cc = page === 'catalog' && cats.length === 1 && !P0.getAll('brand').length ? cats[0] : '';
  const cur = c => c ? ' aria-current="page"' : '', q = page === 'catalog' ? esc(P0.get('q') || '') : '';
  const sr = id => `<form class="srch" role="search" action="catalog.html"><label class="vh" for="${id}">البحث في الكتالوج</label><input id="${id}" name="q" type="search" placeholder="علامة، طراز أو مرجع" autocomplete="off" value="${q}">${I.search}</form>`;
  const dd = (id, t) => `<li><button type="button" class="dd" aria-expanded="false" aria-controls="${id}">${t}${I.chev}</button></li>`;
  const QC = ['watches', 'jewelry', 'handbags', 'leather-goods', 'luggage'];
  $('#hd').innerHTML = `<div class="wrap hd-row"><a class="wm" href="home.html"><bdi lang="en">Jwleria</bdi><span class="vh"> — الرئيسية</span></a>` +
    `<nav class="nav" aria-label="التنقل الرئيسي"><ul>${dd('p-brands', 'العلامات')}${QC.map(s => `<li class="q"><a href="${cU(s)}"${cur(cc === s)}>${CAT[s].ar}</a></li>`).join('')}${dd('p-cats', 'الفئات')}` +
    `<li><a href="catalog.html"${cur(page === 'catalog' && QC.indexOf(cc) < 0)}>الكتالوج</a></li><li><a href="#about">عن <bdi>Jwleria</bdi></a></li></ul></nav>` +
    `<div class="hd-end">${sr('q1')}<a class="lang" href="#" lang="en" hreflang="en" data-inert>English</a><button type="button" class="ib ib-s" aria-expanded="false" aria-controls="msrch" aria-label="البحث">${I.search}</button><button type="button" class="ib ib-m" aria-expanded="false" aria-controls="drawer" aria-label="القائمة">${I.menu}</button></div></div>` +
    `<div class="msrch" id="msrch" hidden><div class="wrap">${sr('q2')}</div></div>` +
    `<div class="mega" id="p-brands" hidden><div class="wrap mega-in"><div><div class="mega-hd"><p class="mega-t">${AZ} <span class="mega-m">· ${A(D.brands.length)} علامة في الدليل</span></p><a class="lnk" href="home.html#az">الفهرس الكامل</a></div>${azL('mb', 1)}${azC('mb', 'span')}</div>` +
    `<div class="mega-side"><p class="mega-t">مراجع منشورة</p><p class="mega-m">عدد المراجع لكل علامة في الكتالوج العام</p><ul class="tops">${TOPS.map(b => `<li><a href="${bU(b)}">${L(b)}<span class="n">${A(D.brandCounts[b])}</span></a></li>`).join('')}</ul></div></div></div>` +
    `<div class="mega" id="p-cats" hidden><div class="wrap mega-in solo"><div class="mega-hd"><p class="mega-t">الفئات <span class="mega-m">· ${A(D.categories.length)} فئات</span></p><a class="lnk" href="catalog.html">الكتالوج كاملًا</a></div><ul class="mega-cats">${D.categories.map(c => `<li><a href="${cU(c.slug)}"><span>${c.ar}</span><span class="c-en" lang="en">${c.en}</span></a></li>`).join('')}</ul></div></div>`;
  document.body.insertAdjacentHTML('beforeend', `<div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-t" hidden><div class="scrim" data-close></div><div class="drawer-p"><div class="drawer-hd"><h2 id="drawer-t">القائمة</h2><button type="button" class="x" data-close aria-label="إغلاق القائمة">${I.x}</button></div>` +
    `<div class="drawer-bd"><div class="d-sec d-links"><a href="catalog.html">الكتالوج${I.arrow}</a><a href="#about" data-close>عن <bdi>Jwleria</bdi></a><a href="#" lang="en" hreflang="en" data-inert>English</a></div>` +
    `<div class="d-sec"><h3 class="d-t">الفئات</h3><ul class="d-cats d-links">${catLis()}</ul></div><div class="d-sec"><h3 class="d-t">${AZ}</h3><div class="d-az">${azC('dz', 'span')}</div></div></div></div></div>`);
}

function footer() {
  $('#ft').innerHTML = `<div class="wrap"><div class="ft-g"><div class="ft-a" id="about"><h2>عن <bdi>Jwleria</bdi></h2><p>كتالوج مستقل يعرض قطعًا من علامات عالمية للاطلاع والاستفسار، مرتّبًا حسب العلامة والفئة والطراز.</p>` +
    `<p class="legal">أسماء العلامات التجارية ملك لأصحابها. <bdi>Jwleria</bdi> جهة مستقلة، غير تابعة لهذه العلامات ولا تمثلها.</p></div>` +
    `<div class="ft-c"><h2>الفئات</h2><ul>${catLis()}</ul></div>` +
    `<div><h2>العلامات</h2><ul>${TOPS.map(b => `<li><a href="${bU(b)}">${L(b)}</a></li>`).join('')}<li><a href="home.html#az">كل العلامات</a></li></ul></div>` +
    `<div><h2>الموقع</h2><ul><li><a href="catalog.html">الكتالوج</a></li><li><a href="home.html#categories">الفئات</a></li><li><a href="#" lang="en" hreflang="en" data-inert>English</a></li></ul></div></div>` +
    `<div class="ft-bot"><p>© ${A(dt[0])} <bdi>Jwleria</bdi></p><p>معاينة تصميم · بيانات المنتجات من الكتالوج العام بتاريخ ${DATE}</p></div></div>`;
}

/* ——— shared behaviour ——— */
let tt;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg || 'معاينة تصميم فقط'; t.classList.add('show');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400);
}
function modal(el, opener, onClose) {
  let last;
  const fx = () => $$('a[href],button:not([disabled]),input:not([disabled]),select', el).filter(x => x.getClientRects().length);
  const open = () => { last = document.activeElement; el.hidden = false; document.body.classList.add('lock'); opener.setAttribute('aria-expanded', 'true'); (fx()[0] || el).focus(); };
  const close = () => {
    if (el.hidden) return;
    el.hidden = true; document.body.classList.remove('lock'); opener.setAttribute('aria-expanded', 'false');
    if (onClose) onClose();
    (last && last.isConnected ? last : opener).focus();
  };
  el.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = fx(), a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });
  el.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  return { open, close };
}
const desk = fn => matchMedia('(min-width: 960px)').addEventListener('change', e => { if (e.matches) fn(); });
function wire() {
  document.addEventListener('click', e => { if (e.target.closest('[data-inert]')) { e.preventDefault(); toast(); } });
  const dds = $$('.dd'), hd = $('#hd');
  const shut = (b, f) => { b.setAttribute('aria-expanded', 'false'); $('#' + b.getAttribute('aria-controls')).hidden = true; if (f) b.focus(); };
  dds.forEach(b => b.addEventListener('click', () => {
    const was = b.getAttribute('aria-expanded') === 'true';
    dds.forEach(x => shut(x));
    if (!was) { b.setAttribute('aria-expanded', 'true'); $('#' + b.getAttribute('aria-controls')).hidden = false; }
  }));
  const sb = $('.ib-s'), ms = $('#msrch');
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    dds.forEach(b => { if (b.getAttribute('aria-expanded') === 'true') shut(b, 1); });
    if (!ms.hidden) { sb.click(); sb.focus(); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.dd, .mega')) dds.forEach(x => shut(x)); });
  hd.addEventListener('focusout', e => { if (e.relatedTarget && !hd.contains(e.relatedTarget)) dds.forEach(x => shut(x)); });
  const lb = $$('#p-brands .az-l button');
  lb.forEach(b => b.addEventListener('click', () => {
    const l = b.dataset.l;
    lb.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $$('#p-brands .az-g').forEach(g => { g.hidden = !!l && g.dataset.l !== l; });
  }));
  sb.addEventListener('click', () => { const o = ms.hidden; ms.hidden = !o; sb.setAttribute('aria-expanded', String(o)); if (o) $('input', ms).focus(); });
  const mb = $('.ib-m'), dw = modal($('#drawer'), mb);
  mb.addEventListener('click', dw.open);
  desk(() => { dw.close(); ms.hidden = true; sb.setAttribute('aria-expanded', 'false'); });
}
const secHd = (id, t, extra) => `<div class="sec-hd"><h2 id="${id}">${t}</h2>${extra || ''}</div>`;

/* ——— HOME ——— */
function home() {
  const feat = ['longchamp-le-pliage-one-handbag', 'rolex-datejust-41-126334', 'loewe-puzzle-large', 'audemars-piguet-royal-oak-15202or', 'longchamp-le-pliage-one-travel-bag'];
  const seen = {};
  const fact = (n, t, h, l) => `<li><a href="${h}"><b>${A(n)}</b><span class="t">${t}</span><span class="go">${l}${I.arrow}</span></a></li>`;
  $('#main').innerHTML = `<section class="hero" aria-labelledby="h1"><div class="wrap"><div class="hero-g"><h1 id="h1"><span>الفخامة،</span> <span>بكل تفاصيلها</span></h1>` +
    `<div class="hero-s"><p class="lead">مختارات من العلامات العالمية، والتفاصيل عبر واتساب.</p><div class="btns"><a class="btn" href="catalog.html">عرض الكتالوج${I.arrow}</a><a class="btn btn--ghost" href="#az">${AZ}</a></div></div></div>` +
    `<ul class="facts" aria-label="الكتالوج بالأرقام">${fact(D.brands.length, 'علامة', '#az', 'الفهرس')}${fact(D.categories.length, 'فئات', '#categories', 'الفئات')}${fact(D.meta.catalogReferences, 'مرجعًا', 'catalog.html', 'الكتالوج')}</ul>` +
    `<p class="src">أرقام الكتالوج العام بتاريخ ${DATE}</p></div></section>` +
    `<section class="sec" id="az" aria-labelledby="az-t"><div class="wrap">${secHd('az-t', AZ, `<p class="meta">${A(D.brands.length)} علامة في الدليل · الرقم بجانب الاسم عدد المراجع المنشورة</p>`)}${azL('az')}${azC('az', 'h3')}</div></section>` +
    `<section class="sec" id="categories" aria-labelledby="cat-t"><div class="wrap">${secHd('cat-t', 'الفئات', `<p class="meta">${A(D.categories.length)} فئات · الصور المصغّرة توضيحية وليست صور منتجات</p>`)}<ul class="cats">${D.categories.map((c, i) => {
      const alt = seen[c.img], src = '../shared/img/' + c.img; seen[c.img] = 1;
      return `<li><a class="cat" href="${cU(c.slug)}"><span class="cat-n">${A(String(i + 1).padStart(2, '0'))}</span><span class="cat-x"><span class="cat-ar">${c.ar}</span><span class="c-en" lang="en">${c.en}</span></span>` +
        `<figure class="cat-f${alt ? ' alt' : ''}"><img src="${src}-320.webp" srcset="${src}-320.webp 320w, ${src}-640.webp 640w" sizes="(max-width: 767px) 72px, 112px" width="320" height="320" alt="" loading="lazy" decoding="async"><figcaption>صورة توضيحية</figcaption></figure></a></li>`;
    }).join('')}</ul></div></section>` +
    `<section class="sec" id="featured" aria-labelledby="ft-t"><div class="wrap">${secHd('ft-t', 'مختارات', '<a class="lnk" href="catalog.html">الكتالوج كاملًا</a>')}<div class="grid grid--5">${feat.map(id => card(J.byId(id))).join('')}</div></div></section>`;
}

/* ——— CATALOG ——— */
function catalog() {
  const ms = D.models, ck = c => c.en.toLowerCase().replace(/\s+/g, '-'), COLS = [];
  ms.forEach(m => (m.colors || []).forEach(c => { if (!COLS.some(x => x.k === ck(c))) COLS.push({ k: ck(c), ar: c.ar, tone: c.tone }); }));
  const S = {
    brand: P0.getAll('brand'), category: P0.getAll('category').filter(s => CAT[s]), color: P0.getAll('color').filter(k => COLS.some(x => x.k === k)),
    q: (P0.get('q') || '').trim(), sort: P0.get('sort') === 'name' ? 'name' : 'new', page: Math.max(1, parseInt(P0.get('page'), 10) || 1)
  };
  const BR = [...new Set(ms.map(m => m.brand).concat(S.brand))].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  const hay = m => [m.brand, m.name, m.nameAr, m.typeAr, m.collection, CAT[m.category].ar, CAT[m.category].en, ...m.variants.map(x => x.ref), ...(m.colors || []).map(c => c.ar + ' ' + c.en)].join(' ').toLowerCase();
  const has = (m, f, v) => f === 'brand' ? m.brand === v : f === 'category' ? m.category === v : (m.colors || []).some(c => ck(c) === v);
  const ok = (m, skip) => ['brand', 'category', 'color'].every(f => f === skip || !S[f].length || S[f].some(v => has(m, f, v))) && (!S.q || S.q.toLowerCase().split(/\s+/).every(t => hay(m).includes(t)));
  const opt = (f, v, l) => `<li><label class="ck"><input type="checkbox" name="${f}" value="${esc(v)}"><span class="t">${l}</span><span class="n" data-n></span></label></li>`;
  const clr = '<button type="button" class="btn btn--ghost" data-clear>مسح عوامل التصفية</button>';
  $('#main').innerHTML = `<div class="wrap"><nav class="bc" aria-label="مسار التنقل"><ol id="bc"></ol></nav><div class="cl"><aside class="side" aria-labelledby="title"><h1 id="title">الكتالوج</h1><p class="note">طراز واحد لكل منتج، والألوان والمقاسات داخل صفحة المنتج.</p>` +
    `<div id="fslot"><form id="ff" aria-label="عوامل التصفية"><fieldset class="fg"><legend>العلامة</legend><ul>${BR.map(b => opt('brand', b, L(b))).join('')}</ul></fieldset>` +
    `<fieldset class="fg"><legend>الفئة</legend><ul>${D.categories.map(c => opt('category', c.slug, esc(c.ar))).join('')}</ul></fieldset>` +
    `<fieldset class="fg"><legend>اللون</legend><div class="sws">${COLS.map(c => `<label class="sw"><input type="checkbox" name="color" value="${c.k}"><i style="background:${c.tone}"></i>${esc(c.ar)}<span class="n" data-n></span></label>`).join('')}</div></fieldset></form></div></aside>` +
    `<div class="res"><div class="tb"><button type="button" class="fbtn" id="fbtn" aria-expanded="false" aria-controls="sheet">${I.filter}<span>تصفية</span><span id="fn"></span></button>` +
    `<p class="count" id="count" tabindex="-1" aria-live="polite"></p><ul class="act" id="act"></ul><div class="sort"><label class="k" for="sort">الترتيب</label><select id="sort"><option value="new">الأحدث</option><option value="name">الاسم</option></select></div></div>` +
    `<h2 class="vh">النتائج</h2><div class="grid" id="grid"></div><nav class="pg" id="pg" aria-label="ترقيم الصفحات"></nav></div></div></div>`;
  document.body.insertAdjacentHTML('beforeend', `<div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t" hidden><div class="scrim" data-close></div><div class="sheet-p"><div class="sheet-hd"><h2 id="sheet-t">التصفية</h2><button type="button" class="x" data-close aria-label="إغلاق">${I.x}</button></div>` +
    `<div class="sheet-bd" id="sslot"></div><div class="sheet-ft"><button type="button" class="btn btn--ghost" data-clear>مسح الكل</button><button type="button" class="btn" data-close id="sgo">عرض النتائج</button></div></div></div>`);
  $('#sort').value = S.sort;
  const clearQ = () => { S.q = ''; $$('.srch input').forEach(x => { x.value = ''; }); };

  function render() {
    let list = ms.filter(m => ok(m));
    if (S.sort === 'name') list = list.slice().sort((a, b) => a.name.localeCompare(b.name, 'en'));
    const per = 48, pages = Math.max(1, Math.ceil(list.length / per)), c = J.counts(list);
    S.page = Math.min(S.page, pages);
    $('#grid').innerHTML = list.length ? list.slice((S.page - 1) * per, S.page * per).map(card).join('') :
      `<div class="empty"><p class="empty-t">لا توجد طرازات مطابقة.</p><p>تضم هذه المعاينة ${J.countAr(ms.length, 'model')} من الكتالوج العام فقط.</p>${clr}</div>`;
    $('#count').innerHTML = list.length ? `<span>${c.label.replace(' · ', '</span><span class="sep">·</span><span>')}</span>` : 'لا نتائج';
    $('#sgo').textContent = list.length ? 'عرض ' + J.countAr(list.length, 'model') : 'لا نتائج';
    const nA = S.brand.length + S.category.length + S.color.length + (S.q ? 1 : 0);
    $('#fn').textContent = nA ? '(' + A(nA) + ')' : '';
    const oc = S.category.length === 1 && !S.brand.length ? CAT[S.category[0]] : null, ob = !oc && S.brand.length === 1 && !S.category.length ? S.brand[0] : '';
    const head = oc ? esc(oc.ar) : ob ? L(ob) : '';
    $('#title').innerHTML = head || 'الكتالوج';
    $('#bc').innerHTML = '<li><a href="home.html">الرئيسية</a></li>' + (head ? `<li><a href="catalog.html">الكتالوج</a></li><li><span aria-current="page">${head}</span></li>` : '<li><span aria-current="page">الكتالوج</span></li>');
    document.title = (oc ? oc.ar + ' — ' : ob ? ISO(ob) + ' — ' : '') + 'الكتالوج · ' + ISO('Jwleria');
    const chips = [...S.brand.map(b => ['brand', b, L(b)]), ...S.category.map(x => ['category', x, esc(CAT[x].ar)]), ...S.color.map(k => ['color', k, esc(COLS.find(x => x.k === k).ar)]), ...(S.q ? [['q', S.q, 'البحث: <bdi>' + esc(S.q) + '</bdi>']] : [])];
    $('#act').innerHTML = chips.map(x => `<li><button type="button" class="ac" data-f="${x[0]}" data-v="${esc(x[1])}"><span class="vh">إزالة عامل التصفية: </span>${x[2]}${I.x}</button></li>`).join('') + (chips.length > 1 ? '<li><button type="button" class="ac-x" data-clear>مسح الكل</button></li>' : '');
    const pb = (p, l, dis, cur, aria) => `<button type="button" data-p="${p}"${dis ? ' disabled' : ''}${cur ? ' aria-current="page"' : ''}${aria ? ` aria-label="${aria}"` : ''}>${l}</button>`;
    let nums = ''; for (let i = 1; i <= pages; i++) nums += '<li>' + pb(i, A(i), 0, i === S.page, 'الصفحة ' + A(i)) + '</li>';
    $('#pg').innerHTML = pb(S.page - 1, 'السابق', S.page <= 1) + `<ol>${nums}</ol>` + pb(S.page + 1, 'التالي', S.page >= pages) + `<p class="pg-i">الصفحة ${A(S.page)} من ${A(pages)} · حتى ${A(per)} طرازًا في الصفحة</p>`;
    const u = new URLSearchParams();
    ['brand', 'category', 'color'].forEach(f => S[f].forEach(x => u.append(f, x)));
    if (S.q) u.set('q', S.q); if (S.sort !== 'new') u.set('sort', S.sort); if (S.page > 1) u.set('page', S.page);
    history.replaceState(null, '', u.toString() ? '?' + u : 'catalog.html');
    $$('#ff input').forEach(i => {
      const f = i.name, n = ms.filter(m => ok(m, f) && has(m, f, i.value)).length;
      i.checked = S[f].includes(i.value); i.disabled = !n && !i.checked;
      $('[data-n]', i.closest('label')).textContent = A(n);
    });
  }
  $('#ff').addEventListener('change', e => { const i = e.target; if (!i.name) return; S[i.name] = $$(`#ff input[name="${i.name}"]:checked`).map(x => x.value); S.page = 1; render(); });
  $('#ff').addEventListener('submit', e => e.preventDefault());
  $('#sort').addEventListener('change', e => { S.sort = e.target.value; S.page = 1; render(); });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-clear]')) { S.brand = []; S.category = []; S.color = []; clearQ(); S.page = 1; render(); if (!e.target.closest('.sheet')) $('#count').focus(); return; }
    const a = e.target.closest('.ac');
    if (a) { const f = a.dataset.f; if (f === 'q') clearQ(); else S[f] = S[f].filter(x => x !== a.dataset.v); S.page = 1; render(); $('#count').focus(); return; }
    const p = e.target.closest('#pg [data-p]');
    if (p && !p.disabled) { S.page = +p.dataset.p; render(); $('#count').focus(); }
  });
  const sh = modal($('#sheet'), $('#fbtn'), () => $('#fslot').appendChild($('#ff')));
  $('#fbtn').addEventListener('click', () => { $('#sslot').appendChild($('#ff')); sh.open(); });
  desk(sh.close);
  render();
}

/* ——— PRODUCT ——— */
function product() {
  const m = J.byId(P0.get('model')), cat = CAT[m.category], st = J.hasStandInImage(m), VW = ['أمامي', 'جانبي', 'خلفي', 'تفاصيل'];
  let v = J.variantOf(m, P0.get('ref'));
  let cn = $('link[rel="canonical"]');
  if (!cn) { cn = document.createElement('link'); cn.rel = 'canonical'; document.head.appendChild(cn); }
  cn.setAttribute('href', J.url(m, J.primary(m)));
  const mates = D.models.filter(x => x.brand === m.brand && x.id !== m.id);
  const rel = (mates.length ? mates : D.models.filter(x => x.category === m.category && x.id !== m.id)).slice(0, 3);
  const rH = mates.length ? bU(m.brand) : cU(cat.slug), rA = mates.length ? 'كل طرازات ' + L(m.brand) : 'كل ' + cat.ar, n = D.brandCounts[m.brand], sum = J.summaryAr(m);
  $('#main').innerHTML = `<div class="wrap"><nav class="bc" aria-label="مسار التنقل"><ol><li><a href="catalog.html">الكتالوج</a></li><li><a href="${cU(cat.slug)}">${cat.ar}</a></li></ol></nav>` +
    `<div class="pdp"><div class="gal-w${st ? '' : ' is-fo'}" id="gw"></div><div class="info"><p class="pdp-brand"><a href="${bU(m.brand)}">${L(m.brand)}</a></p>` +
    `<h1><span class="pdp-name">${L(m.name)}</span><span class="pdp-type">${esc(m.typeAr)}${m.nameAr ? ' · ' + esc(m.nameAr) : ''}</span></h1>${sum ? `<p class="pdp-sum">${sum}</p>` : ''}<div id="opts"></div>` +
    `<div class="refrow"><span class="k">المرجع</span><bdi class="ref" id="ref" lang="en" dir="ltr"></bdi></div>` +
    `<div class="buy"><p class="buy-s" id="buys" aria-hidden="true"></p><button type="button" class="cta" data-inert>التواصل عبر واتساب لمعرفة السعر</button></div>` +
    `<table class="facts-t"><caption class="vh">المواصفات</caption><tbody id="facts"></tbody></table>` +
    `<details class="acc"><summary>التفاصيل</summary><div class="acc-b"><p>${m.variants.length > 1 ? `صفحة واحدة لهذا الطراز تضم ${J.countAr(m.variants.length, 'ref')}، ويتغيّر المرجع مع كل اختيار.` : 'طراز بمرجع واحد.'} ${st ? 'الصور المعروضة أماكن مؤقتة إلى حين اعتماد الصور الأصلية.' : NO}</p></div></details>` +
    `<details class="acc"><summary>عن العلامة</summary><div class="acc-b"><p>علامة ${L(m.brand)} مدرجة في دليل العلامات على <bdi>Jwleria</bdi>${n ? `، ولها ${A(n)} مرجعًا منشورًا في الكتالوج العام` : ''}. الإدراج في الدليل لا يعني ارتباطًا بالعلامة.</p><a class="lnk" href="${bU(m.brand)}">كل طرازات ${L(m.brand)} في الكتالوج</a></div></details></div></div>` +
    `<section class="sec rel" aria-labelledby="rel-t">${secHd('rel-t', mates.length ? 'قطع أخرى من ' + L(m.brand) : 'من الفئة نفسها', `<a class="lnk" href="${rH}">${rA}</a>`)}` +
    `<div class="grid">${rel.map(card).join('')}<a class="more-t" href="${rH}"><span>${rA}</span><span class="more-n">في الكتالوج</span>${I.arrow}</a></div></section></div>`;
  document.body.classList.add('has-buy');

  const dial = () => v.dial && J.valueOf(m, 'dial', v.dial);
  function opts() {
    let h = J.axesOf(m).map(x => {
      const k = x.kind, c = J.valueOf(m, k, v[k]), sz = k === 'size';
      const nm = c ? esc(c.ar) + ' ' + L(c.material || c.en, 'lt') : '';
      return `<div class="opt"><p class="opt-h" id="h-${k}"><span class="k">${x.label.ar}</span><span class="v">${nm}</span><span class="aux">${J.countAr(x.values.length, k)}</span></p>` +
        `<ul class="${sz ? 'seg' : 'chips' + (k === 'dial' ? ' chips--d' : '')}" data-axis="${k}" aria-labelledby="h-${k}">${x.values.map(o => {
          const on = o.id === v[k], t = J.nearest(m, v, k, o.id), note = on ? '' : J.changeNoteAr(m, v, k, o.id);
          return `<li><a href="${J.url(m, t)}" data-k="${k}" data-v="${esc(o.id)}"${on ? ' aria-current="true"' : ''}>${sz ? '' : `<i style="background:${o.tone}"></i>`}<span class="o">${esc(o.ar)}${sz ? ' ' + L(o.en, 'lt') : o.material ? L(o.material, 'lt') : ''}${note ? `<small>${note}</small>` : ''}</span></a></li>`;
        }).join('')}</ul></div>`;
    }).join('');
    const sib = J.siblings(m, v);
    if (sib.length > 1) h += `<div class="opt"><p class="opt-h" id="h-ref"><span class="k">${m.axes.includes('dial') ? 'مراجع بهذا الميناء' : 'مراجع بهذا الاختيار'}</span><span class="aux">${J.countAr(sib.length, 'ref')}</span></p>` +
      `<ul class="rchips" data-axis="ref" aria-labelledby="h-ref">${sib.map(x => `<li><a href="${J.url(m, x)}" data-k="ref" data-v="${esc(x.ref)}"${x.ref === v.ref ? ' aria-current="true"' : ''}>${L(x.ref, 'ref')}</a></li>`).join('')}</ul>` +
      '<p class="opt-n">مراجع تتشارك الخيارات المنشورة نفسها؛ الفرق بينها غير مذكور في البيانات العامة.</p></div>';
    $('#opts').innerHTML = h;
  }
  function facts() {
    const c = J.color(m, v.color), s = J.size(m, v.size), d = dial(), dims = (s && s.dims) || m.dims, r = [];
    if (m.collection) r.push(['المجموعة', L(m.collection)]);
    r.push(['الفئة', `<a href="${cU(cat.slug)}">${cat.ar}</a>`], ['النوع', esc(m.typeAr)]);
    if (c) r.push([m.colorLabel ? 'اللون' : 'اللون', esc(c.ar) + L(c.en, 'sub')]);
    if (d) r.push(['الميناء', esc(d.ar) + L(d.en, 'sub')]);
    if (s) r.push(['المقاس', esc(s.ar) + ' ' + L(s.en)]);
    if (dims) r.push(['الأبعاد', L(dims)]);
    if (m.material) r.push(['المادة', esc(m.material.ar) + L(m.material.en, 'sub')]);
    if (c && c.material) r.push(['الخامة', L(c.material)]);
    (m.facts || []).forEach(f => r.push([esc(f.ar), V(f.v)]));
    return r.map(x => `<tr><th scope="row">${x[0]}</th><td>${x[1]}</td></tr>`).join('');
  }
  function gal() {
    const g = $('#gw');
    if (!st) { g.innerHTML = fo(m, v, 1); return; }
    if ($('#gal')) { $$('#gal .ph').forEach((el, i) => paint(el, m, v, VW[i])); return; }
    g.innerHTML = `<div class="gal" id="gal" role="group" aria-label="صور مؤقتة للطراز">${VW.map(w => ph(m, v, w)).join('')}</div><div class="gal-dots" aria-hidden="true">${VW.map((w, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div>`;
    if (!('IntersectionObserver' in window)) return;
    const gl = $('#gal'), io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const i = [...gl.children].indexOf(e.target);
      $$('.gal-dots i').forEach((d, j) => d.classList.toggle('on', i === j));
    }), { root: gl, threshold: 0.6 });
    [...gl.children].forEach(c => io.observe(c));
  }
  function update() {
    const names = axv(m, v).map(o => o.ar);
    opts(); gal();
    $('#ref').textContent = v.ref;
    $('#facts').innerHTML = facts();
    $('#buys').innerHTML = L(v.ref, 'ref') + names.map(x => `<span>·</span><span>${esc(x)}</span>`).join('');
    document.title = [ISO(m.name), ...names, ISO(v.ref)].join(' · ') + ' — ' + ISO('Jwleria');
  }
  $('#opts').addEventListener('click', e => {
    const a = e.target.closest('a[data-k]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const k = a.dataset.k, val = a.dataset.v, href = a.getAttribute('href');
    v = J.variantOf(m, new URLSearchParams(href.split('?')[1]).get('ref'));
    history.replaceState(null, '', href);
    update();
    const f = $(`#opts a[data-k="${k}"][data-v="${CSS.escape(k === 'ref' ? v.ref : val)}"]`) || $(`#opts [data-axis="${k}"] [aria-current]`);
    if (f) f.focus({ preventScroll: true });
  });
  update();
}

header(); footer(); wire();
({ home, catalog, product })[page]();
})();
