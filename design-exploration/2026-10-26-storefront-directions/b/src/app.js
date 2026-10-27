/* Jwleria — Direction B «الفهرس». Design preview only.
   Static chrome lives in the HTML; this fills it from window.JWL (../shared/catalog-data.js + variants.js). */
(() => {
'use strict';
const J = window.JWL, D = J.data, A = J.AR, enc = encodeURIComponent;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const H = (s, h) => { const e = $(s); if (e) e.innerHTML = h; return e; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
/* Latin run, always isolated */
const L = (s, c) => `<bdi lang="en" dir="ltr"${c ? ` class="${c}"` : ''}>${esc(s)}</bdi>`;
/* References never break: one unbroken run. `--w` is its width in em (Inter 500, tabular figures),
   so CSS can fit the size to the slot instead of wrapping inside the code. */
const RW = s => [...String(s)].reduce((w, c) => w + (c === '.' ? .29 : /[mw]/i.test(c) ? .91 : /[A-Z]/.test(c) ? .79 : .67), 0).toFixed(2);
const RF = s => `<bdi lang="en" dir="ltr" class="ref" style="--w:${RW(s)}">${esc(s)}</bdi>`;
/* A fact the shared fixture gives only in Latin is shown as that official value, isolated; no local gloss */
const V = s => /[A-Za-z]/.test(s) ? L(s) : esc(s);
/* Arabic-Indic digits with the Arabic thousands separator: ٤٬٠٩٧ */
const AN = n => A(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '٬'));
const ISO = s => '⁨' + s + '⁩';
const CAT = {}; D.categories.forEach(c => { CAT[c.slug] = c; });
const page = document.body.dataset.page, P0 = J.params();
const cU = s => 'catalog.html?category=' + s, bU = b => 'catalog.html?brand=' + enc(b);
const NO = 'لا تتوفر صورة أصلية معتمدة لهذا المرجع حاليًا.';
const dt = D.meta.retrieved.split('-');
const sv = (d, w, vb) => `<svg viewBox="0 0 ${vb || 20} ${vb || 20}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const IX = sv('<path d="m5 5 10 10m0-10L5 15"/>', 1.4);
const GL = {
  bag: '<path d="M14.5 18h19l2.2 22.5H12.3z"/><path d="M19 18v-3.2a5 5 0 0 1 10 0V18"/>',
  watches: '<circle cx="24" cy="24" r="9"/><path d="M19.6 16.2 20.6 7h6.8l1 9.2M19.6 31.8l1 9.2h6.8l1-9.2M24 20.2V24l2.6 1.6"/>',
  luggage: '<rect x="14" y="14" width="20" height="26" rx="2.6"/><path d="M20 14V8.5h8V14M20 19.5v15M28 19.5v15"/>'
};
const dm = o => o && /diamond/i.test(o.en || '') ? 'dm' : '';

/* ——— media: tinted stand-in (approved-photo slot) or facts-only ——— */
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (h, p) => '#' + rgb(h).map(x => Math.round(x * p + 255 * (1 - p)).toString(16).padStart(2, '0')).join('');
const lum = h => rgb(h).reduce((s, x, i) => (x /= 255, s + [.2126, .7152, .0722][i] * (x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4)), 0);
/* keep the real tone at the edges (black stays near-black); lift the light spot by luminance */
const tint = (m, v) => { const t = J.toneOf(m, v), l = lum(t) > .4; return { a: mix(t, l ? .5 : .74), b: mix(t, l ? .9 : .97), dk: lum(mix(t, l ? .7 : .85)) < .2 }; };
const axv = (m, v) => J.axesOf(m).map(x => J.valueOf(m, x.kind, v[x.kind])).filter(Boolean);
const phL = (m, v, w) => [m.name, ...axv(m, v).map(o => o.ar), w].filter(Boolean).join('، ') + ' — مكان الصورة الأصلية للمرجع ' + ISO(v.ref) + '، صورة مؤقتة';
const ph = (m, v, w, i) => {
  const t = tint(m, v);
  return `<div class="ph${t.dk ? ' dk' : ''}${w ? ' v' + i : ''}" role="img" aria-label="${esc(phL(m, v, w))}" style="--a:${t.a};--b:${t.b}">` +
    (w ? `<span class="ph-w" aria-hidden="true">${A('0' + (i + 1))} · ${w}</span>` : '') + sv(GL[m.category] || GL.bag, 1.1, 48) +
    `<span class="ph-l" aria-hidden="true"><span>مكان الصورة الأصلية</span>${RF(v.ref)}</span></div>`;
};
const paint = (el, m, v, w) => {
  const t = tint(m, v);
  el.style.setProperty('--a', t.a); el.style.setProperty('--b', t.b); el.classList.toggle('dk', t.dk);
  el.setAttribute('aria-label', phL(m, v, w));
  const r = $('.ref', el); r.textContent = v.ref; r.style.setProperty('--w', RW(v.ref));
};
/* facts-only: card face is reference-first (brand and model sit in the caption below) */
const fo = (m, v) => `<div class="fo"><p class="fo-k">المرجع</p><p class="fo-r">${RF(v.ref)}</p><p class="fo-s">${NO}</p></div>`;
const foL = (m, v) => {
  const d = v.dial && J.valueOf(m, 'dial', v.dial);
  return `<div class="fo fo--lg"><p class="fo-b">${L(m.brand)}</p><p class="fo-n">${L(m.name)}</p>${m.nameAr ? `<p class="fo-a">${esc(A(m.nameAr))}</p>` : ''}` +
    `<dl class="fo-d"><div><dt>المرجع</dt><dd>${RF(v.ref)}</dd></div>${d ? `<div><dt>الميناء</dt><dd><i class="${dm(d)}" style="background:${d.tone}"></i>${esc(d.ar)}</dd></div>` : ''}</dl><p class="fo-s">${NO}</p></div>`;
};

/* ——— model card: one per model; `v` is the variant shown (defaults to the primary) ——— */
function card(m, v) {
  v = v || J.primary(m);
  const s = J.summaryAr(m), x = J.axesOf(m).find(a => a.kind !== 'size' && a.values.length > 1), k = x && x.kind;
  const ds = x ? x.values.slice().sort((a, b) => (b.id === v[k]) - (a.id === v[k])) : [];
  const dots = x ? `<span class="dots">${ds.slice(0, 4).map(o => `<a href="${J.url(m, J.nearest(m, v, k, o.id))}" tabindex="-1"${o.id === v[k] ? ' class="on"' : ''} style="--c:${o.tone}" aria-label="${esc(o.ar + '، ' + m.name)}" title="${esc(o.ar)}"><i class="${dm(o)}"></i></a>`).join('')}${ds.length > 4 ? `<em aria-hidden="true">+${A(ds.length - 4)}</em>` : ''}</span>` : '';
  return `<article class="card">${J.hasStandInImage(m) ? ph(m, v) : fo(m, v)}<div class="card-b"><p class="card-brand">${L(m.brand)}</p><h3 class="card-name"><a href="${J.url(m, v)}">${L(m.name)}</a></h3><p class="card-type">${esc(m.typeAr)}</p>` +
    (dots || s ? `<div class="card-v">${dots}${s ? `<span>${s}</span>` : ''}</div>` : '') + '</div></article>';
}

/* ——— brand A–Z ——— */
const GR = {};
D.brands.forEach(b => { const l = b[0].toUpperCase(); (GR[l] = GR[l] || []).push(b); });
const azL = (p, f) => {
  const it = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(l => !GR[l] ? `<span lang="en" aria-hidden="true">${l}</span>` : f ? `<button type="button" lang="en" aria-pressed="false" data-l="${l}">${l}</button>` : `<a href="#${p}-${l}" lang="en">${l}</a>`).join('');
  return f ? `<div class="az-l" role="group" aria-label="تصفية العلامات حسب الحرف"><button type="button" class="all" aria-pressed="true" data-l="">الكل</button>${it}</div>` : `<nav class="az-l" aria-label="الانتقال إلى حرف">${it}</nav>`;
};
/* `cut`: on phones, groups after the first ~10 names stay folded behind a button */
const azC = (p, t, cut) => {
  let n = 0;
  return `<div class="az-c${cut ? ' clip' : ''}" id="${p}-list">${Object.keys(GR).sort().map(l => {
    const x = cut && n >= cut; n += GR[l].length;
    return `<div class="az-g${x ? ' zf' : ''}" id="${p}-${l}" data-l="${l}"><${t} class="az-h" lang="en">${l}</${t}><ul>${GR[l].map(b => {
      const c = D.brandCounts[b];
      return `<li><a href="${bU(b)}">${L(b)}${c ? `<span class="n"><span class="vh">، المراجع المنشورة: </span>${A(c)}</span>` : ''}</a></li>`;
    }).join('')}</ul></div>`;
  }).join('')}</div>`;
};
const TOPS = Object.keys(D.brandCounts).sort((a, b) => D.brandCounts[b] - D.brandCounts[a]);
/* footer lists only brands that have a model in this preview, so no link opens an empty catalog */
const PB = [...new Set(D.models.map(m => m.brand))].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
const FEAT = [['longchamp-le-pliage-one-handbag', 'L1621979163'], ['rolex-datejust-41-126334'], ['loewe-puzzle-large', 'B510PNLX05-0018'], ['audemars-piguet-royal-oak-15202or'], ['longchamp-le-pliage-one-backpack', '10284979105']];
const FILL = {
  'az-mb': () => azL('mb', 1) + azC('mb', 'span'),
  'az-dz': () => azC('dz', 'span'),
  'az-az': () => azL('az') + azC('az', 'h3', 10) + `<button type="button" class="az-more" aria-expanded="false" aria-controls="az-list">عرض كل العلامات (${A(D.brands.length)})</button>`,
  tops: () => TOPS.map(b => `<li><a href="${bU(b)}">${L(b)}<span class="n">${A(D.brandCounts[b])}</span></a></li>`).join(''),
  ftb: () => PB.map(b => `<li><a href="${bU(b)}">${L(b)}</a></li>`).join('') + '<li><a href="home.html#az">كل العلامات</a></li>',
  mcats: () => D.categories.map(c => `<li><a href="${cU(c.slug)}"><span>${c.ar}</span><span class="c-en" lang="en">${c.en}</span></a></li>`).join(''),
  cats: () => D.categories.map(c => `<li><a href="${cU(c.slug)}">${c.ar}</a></li>`).join(''),
  /* jewellery uses a crop of the still-life (its own photo), so no tile repeats the bracelet image */
  hcats: () => D.categories.map((c, i) => {
    const alt = c.slug === 'jewelry', src = '../shared/img/' + (alt ? 'catalog-still-life' : c.img), w = alt ? [600, 1200] : [320, 640];
    return `<li><a class="cat" href="${cU(c.slug)}"><span class="cat-n">${A(String(i + 1).padStart(2, '0'))}</span><span class="cat-x"><span class="cat-ar">${c.ar}</span><span class="c-en" lang="en">${c.en}</span></span>` +
      `<figure class="cat-f${alt ? ' alt' : ''}"><img src="${src}-${w[0]}.webp" srcset="${src}-${w[0]}.webp ${w[0]}w, ${src}-${w[1]}.webp ${w[1]}w" sizes="${alt ? '240px' : '(max-width: 767px) 64px, 112px'}" width="${w[0]}" height="${alt ? 400 : 320}" alt="" loading="lazy" decoding="async"><figcaption>صورة توضيحية</figcaption></figure></a></li>`;
  }).join(''),
  feat: () => FEAT.map(([id, r]) => { const m = J.byId(id); return card(m, r && J.variantOf(m, r)); }).join(''),
  nb: () => A(D.brands.length), nc: () => A(D.categories.length), nr: () => AN(D.meta.catalogReferences),
  date: () => A(+dt[2]) + ' أكتوبر ' + A(dt[0]), year: () => A(dt[0])
};

/* ——— shared behaviour ——— */
let tt;
function toast() {
  const t = $('#toast'); t.textContent = 'معاينة تصميم فقط'; t.classList.add('show');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400);
}
function modal(el, opener, onClose) {
  let last;
  const fx = () => $$('a[href]:not([tabindex="-1"]),button:not([disabled]),input:not([disabled]),select', el).filter(x => x.getClientRects().length);
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
function shell() {
  $$('[data-fill]').forEach(e => { e.innerHTML = FILL[e.dataset.fill](); });
  if (page === 'catalog') {
    const c = P0.getAll('category'), cc = c.length === 1 && !P0.getAll('brand').length ? c[0] : '';
    ($(`.nav a[href="${cU(cc)}"]`) || $('.nav a[href="catalog.html"]')).setAttribute('aria-current', 'page');
    $$('.srch input').forEach(i => { i.value = P0.get('q') || ''; });
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-inert]')) { e.preventDefault(); toast(); } });
  const dds = $$('.dd'), hd = $('#hd'), sb = $('.ib-s'), ms = $('#msrch');
  const shut = (b, f) => { b.setAttribute('aria-expanded', 'false'); $('#' + b.getAttribute('aria-controls')).hidden = true; if (f) b.focus(); };
  dds.forEach(b => b.addEventListener('click', () => {
    const was = b.getAttribute('aria-expanded') === 'true';
    dds.forEach(x => shut(x));
    if (!was) { b.setAttribute('aria-expanded', 'true'); $('#' + b.getAttribute('aria-controls')).hidden = false; }
  }));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    dds.forEach(b => { if (b.getAttribute('aria-expanded') === 'true') shut(b, 1); });
    if (!ms.hidden) { sb.click(); sb.focus(); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.dd, .mega')) dds.forEach(x => shut(x)); });
  hd.addEventListener('focusout', e => { if (e.relatedTarget && !hd.contains(e.relatedTarget)) dds.forEach(x => shut(x)); });
  const lb = $$('#p-brands .az-l button');
  lb.forEach(b => b.addEventListener('click', () => {
    lb.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $$('#p-brands .az-g').forEach(g => { g.hidden = !!b.dataset.l && g.dataset.l !== b.dataset.l; });
  }));
  /* letter rows that scroll sideways on phones fade at the end edge until the end is reached */
  $$('.az-l').forEach(r => { const f = () => r.classList.toggle('end', Math.abs(r.scrollLeft) + r.clientWidth >= r.scrollWidth - 4); r.addEventListener('scroll', f, { passive: true }); addEventListener('resize', f); f(); });
  const am = $('.az-more');
  if (am) {
    const c = $('#az-list'), ex = () => { c.classList.remove('clip'); am.setAttribute('aria-expanded', 'true'); am.hidden = true; };
    am.addEventListener('click', () => { ex(); $('.az-g.zf a', c).focus(); });
    $$('#az .az-l a').forEach(a => a.addEventListener('click', ex));
  }
  sb.addEventListener('click', () => { const o = ms.hidden; ms.hidden = !o; sb.setAttribute('aria-expanded', String(o)); if (o) $('input', ms).focus(); });
  const mb = $('.ib-m'), dw = modal($('#drawer'), mb);
  mb.addEventListener('click', dw.open);
  desk(() => { dw.close(); ms.hidden = true; sb.setAttribute('aria-expanded', 'false'); });
}

/* ——— CATALOG ——— */
function catalog() {
  const ms = D.models, ck = c => c.en.toLowerCase().replace(/\s+/g, '-'), COLS = [];
  ms.forEach(m => (m.colors || []).forEach(c => { if (!COLS.some(x => x.k === ck(c))) COLS.push({ k: ck(c), ar: c.ar, tone: c.tone }); }));
  const EMP = D.categories.filter(c => !ms.some(m => m.category === c.slug)).map(c => c.slug);
  const S = {
    brand: P0.getAll('brand'), category: P0.getAll('category').filter(s => CAT[s]), color: P0.getAll('color').filter(k => COLS.some(x => x.k === k)),
    q: (P0.get('q') || '').trim(), sort: P0.get('sort') === 'name' ? 'name' : 'default', page: Math.max(1, parseInt(P0.get('page'), 10) || 1)
  };
  const hay = m => [m.brand, m.name, m.nameAr, m.typeAr, m.collection, CAT[m.category].ar, CAT[m.category].en, ...m.variants.map(x => x.ref), ...(m.colors || []).map(c => c.ar + ' ' + c.en)].join(' ').toLowerCase();
  const has = (m, f, v) => f === 'brand' ? m.brand === v : f === 'category' ? m.category === v : (m.colors || []).some(c => ck(c) === v);
  const ok = (m, skip) => ['brand', 'category', 'color'].every(f => f === skip || !S[f].length || S[f].some(v => has(m, f, v))) && (!S.q || S.q.toLowerCase().split(/\s+/).every(t => hay(m).includes(t)));
  /* the card shows the variant that matched: a searched reference, a searched or filtered colour */
  const pick = m => {
    const q = S.q.toLowerCase(), cs = m.colors || [], P = J.primary(m), near = c => J.nearest(m, P, 'color', c.id);
    if (q) {
      const r = m.variants.find(x => x.ref.toLowerCase() === q) || (q.length > 4 && m.variants.find(x => x.ref.toLowerCase().includes(q)));
      if (r) return r;
      const c = cs.find(c => q.split(/\s+/).some(t => t === c.ar || t === c.en.toLowerCase()));
      if (c) return near(c);
    }
    const c = S.color.map(k => cs.find(x => ck(x) === k)).find(Boolean);
    return c ? near(c) : P;
  };
  const opt = (f, v, l) => `<li><label class="ck"><input type="checkbox" name="${f}" value="${esc(v)}"><span class="t">${l}</span><span class="n" data-n></span></label></li>`;
  H('#f-brand', [...new Set(ms.map(m => m.brand).concat(S.brand))].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).map(b => opt('brand', b, L(b))).join(''));
  H('#f-category', D.categories.map(c => opt('category', c.slug, esc(c.ar))).join(''));
  H('#f-color', COLS.map(c => `<label class="sw"><input type="checkbox" name="color" value="${c.k}"><i style="background:${c.tone}"></i>${esc(c.ar)}<span class="n" data-n></span></label>`).join(''));
  const fc = $('#f-category'), fmT = `عرض كل الفئات (${A(D.categories.length)})`;
  fc.insertAdjacentHTML('afterend', `<button type="button" class="fmore" aria-expanded="false" aria-controls="f-category">${fmT}</button>`);
  const fm = $('.fmore'), side = $('.side');
  /* sticky sidebar that never hides its own bottom: when taller than the viewport it sticks by its bottom edge */
  const fit = () => {
    const h = side.offsetHeight, ih = innerHeight, hd = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr')) || 64;
    side.style.top = h > ih - hd - 32 ? (ih - h - 24) + 'px' : '';
  };
  addEventListener('resize', fit);
  fm.addEventListener('click', () => { const o = !fc.classList.contains('all'); fc.classList.toggle('all', o); fm.setAttribute('aria-expanded', String(o)); fm.textContent = o ? 'عرض أقل' : fmT; fit(); });
  $('#sort').value = S.sort;
  const clearQ = () => { S.q = ''; $$('.srch input').forEach(x => { x.value = ''; }); };

  function render() {
    let list = ms.filter(m => ok(m));
    if (S.sort === 'name') list = list.slice().sort((a, b) => a.name.localeCompare(b.name, 'en'));
    const per = 48, pages = Math.max(1, Math.ceil(list.length / per)), c = J.counts(list);
    S.page = Math.min(S.page, pages);
    H('#grid', list.length ? list.slice((S.page - 1) * per, S.page * per).map(m => card(m, pick(m))).join('') :
      `<div class="empty"><p class="empty-t">لا توجد طرازات مطابقة.</p><p>تضم هذه المعاينة ${J.countAr(ms.length, 'model')} من الكتالوج العام فقط.</p><button type="button" class="btn btn--ghost" data-clear>مسح عوامل التصفية</button></div>`);
    H('#count', list.length ? c.label.replace(' · ', '<span class="sep"> · </span>') : 'لا نتائج');
    const nc = S.color.length ? list.reduce((n, m) => n + m.variants.filter(x => x.color && S.color.includes(ck(J.color(m, x.color)))).length, 0) : 0;
    H('#count-s', nc ? `منها ${J.countAr(nc, 'ref')} ${S.color.length > 1 ? 'بالألوان المختارة' : 'باللون المختار'}` : '');
    $('#sgo').textContent = list.length ? 'عرض ' + J.countAr(list.length, 'model') : 'لا نتائج';
    const nA = S.brand.length + S.category.length + S.color.length + (S.q ? 1 : 0);
    $('#fn').textContent = nA ? '(' + A(nA) + ')' : '';
    const oc = S.category.length === 1 && !S.brand.length ? CAT[S.category[0]] : null, ob = !oc && S.brand.length === 1 && !S.category.length ? S.brand[0] : '';
    const head = oc ? esc(oc.ar) : ob ? L(ob) : '';
    H('#title', head || 'الكتالوج');
    H('#bc', '<li><a href="home.html">الرئيسية</a></li>' + (head ? `<li><a href="catalog.html">الكتالوج</a></li><li><span aria-current="page">${head}</span></li>` : '<li><span aria-current="page">الكتالوج</span></li>'));
    document.title = (oc ? oc.ar + ' — ' : ob ? ISO(ob) + ' — ' : '') + 'الكتالوج · ' + ISO('Jwleria');
    const chips = [...S.brand.map(b => ['brand', b, L(b)]), ...S.category.map(x => ['category', x, esc(CAT[x].ar)]), ...S.color.map(k => ['color', k, esc(COLS.find(x => x.k === k).ar)]), ...(S.q ? [['q', S.q, 'البحث: <bdi>' + esc(S.q) + '</bdi>']] : [])];
    H('#act', chips.map(x => `<li><button type="button" class="ac" data-f="${x[0]}" data-v="${esc(x[1])}"><span class="vh">إزالة عامل التصفية: </span>${x[2]}${IX}</button></li>`).join('') + (chips.length > 1 ? '<li><button type="button" class="ac-x" data-clear>مسح الكل</button></li>' : ''));
    const pb = (p, l, dis, cur, aria) => `<button type="button" data-p="${p}"${dis ? ' disabled' : ''}${cur ? ' aria-current="page"' : ''}${aria ? ` aria-label="${aria}"` : ''}>${l}</button>`;
    let nums = ''; for (let i = 1; i <= pages; i++) nums += '<li>' + pb(i, A(i), 0, i === S.page, 'الصفحة ' + A(i)) + '</li>';
    /* no results, no pager */
    $('#pg').hidden = !list.length;
    H('#pg', !list.length ? '' : pb(S.page - 1, 'السابق', S.page <= 1) + `<ol>${nums}</ol>` + pb(S.page + 1, 'التالي', S.page >= pages) + `<p class="pg-i">الصفحة ${A(S.page)} من ${A(pages)} · حتى ${A(per)} طرازًا في الصفحة</p>`);
    const u = new URLSearchParams();
    ['brand', 'category', 'color'].forEach(f => S[f].forEach(x => u.append(f, x)));
    if (S.q) u.set('q', S.q); if (S.sort !== 'default') u.set('sort', S.sort); if (S.page > 1) u.set('page', S.page);
    history.replaceState(null, '', u.toString() ? '?' + u : 'catalog.html');
    $$('#ff input').forEach(i => {
      const f = i.name, n = ms.filter(m => ok(m, f) && has(m, f, i.value)).length;
      i.checked = S[f].includes(i.value); i.disabled = !n && !i.checked;
      $('[data-n]', i.closest('label')).textContent = A(n);
      if (f === 'category') i.closest('li').classList.toggle('ce', EMP.includes(i.value) && !i.checked);
    });
    fit();
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
  const sh = modal($('#sheet'), $('#fbtn'), () => { $('#fslot').appendChild($('#ff')); fit(); });
  $('#fbtn').addEventListener('click', () => { $('#sslot').appendChild($('#ff')); sh.open(); });
  desk(sh.close);
  render();
}

/* ——— PRODUCT: options are links to real variants (foundation contract) ——— */
/* Arabic agreement by the last two digits: ٣ مراجع منشورة، ٤٠٧ مراجع، ٨٥١ مرجعًا */
const pub = n => { const r = n % 100; return n === 1 ? 'مرجع واحد منشور' : n === 2 ? 'مرجعان منشوران' : A(n) + (r >= 3 && r <= 10 ? ' مراجع منشورة' : r > 10 ? ' مرجعًا منشورًا' : ' مرجع منشور'); };
function product() {
  const m = J.byId(P0.get('model')), cat = CAT[m.category], st = J.hasStandInImage(m), VW = ['أمامي', 'جانبي', 'خلفي', 'تفاصيل'];
  let v = J.variantOf(m, P0.get('ref'));
  /* canonical is set per model (primary variant), not hard-coded in the HTML */
  let cn = $('link[rel="canonical"]');
  if (!cn) { cn = document.createElement('link'); cn.rel = 'canonical'; document.head.appendChild(cn); }
  cn.setAttribute('href', J.url(m, J.primary(m)));
  const mates = D.models.filter(x => x.brand === m.brand && x.id !== m.id);
  const rel = (mates.length ? mates : D.models.filter(x => x.category === m.category && x.id !== m.id)).slice(0, 4);
  const n = D.brandCounts[m.brand];
  const bc = H('#bcc', cat.ar); bc.href = cU(cat.slug);
  H('#pb', L(m.brand)).href = bU(m.brand);
  H('#pn', L(m.name));
  H('#pt', esc(m.typeAr) + (m.nameAr ? ' · ' + esc(A(m.nameAr)) : ''));
  H('#ps', J.summaryAr(m));
  H('#acc1', `<p>${m.variants.length > 1 ? `صفحة واحدة لهذا الطراز تضم ${J.countAr(m.variants.length, 'ref')}، ويتغيّر المرجع مع كل اختيار.` : 'طراز بمرجع واحد.'} ${st ? 'الصور المعروضة أماكن مؤقتة إلى حين اعتماد الصور الأصلية.' : NO}</p>`);
  H('#acc2', `<p>علامة ${L(m.brand)} مدرجة في دليل العلامات على ${L('Jwleria')}${n ? `، ولها ${pub(n)} في الكتالوج العام` : ''}. الإدراج في الدليل لا يعني ارتباطًا بالعلامة.</p><a class="lnk" href="${bU(m.brand)}">كل طرازات ${L(m.brand)} في الكتالوج</a>`);
  H('#rel-t', mates.length ? 'قطع أخرى من ' + L(m.brand) : 'من الفئة نفسها');
  H('#rel-a', mates.length ? 'كل طرازات ' + L(m.brand) : 'كل ' + cat.ar).href = mates.length ? bU(m.brand) : cU(cat.slug);
  H('#rel-g', rel.map(x => card(x)).join(''));
  $('#gw').classList.toggle('is-fo', !st);
  document.body.classList.add('has-buy');

  function opts() {
    let h = J.axesOf(m).map(x => {
      const k = x.kind, c = J.valueOf(m, k, v[k]), sz = k === 'size';
      return `<div class="opt"><p class="opt-h" id="h-${k}"><span class="k">${x.label.ar}</span><span class="v">${c && c.tone ? `<i class="osw ${dm(c)}" style="background:${c.tone}"></i>` : ''}${c ? esc(c.ar) + ' ' + L(c.material || c.en, 'lt') : ''}</span><span class="aux">${J.countAr(x.values.length, k)}</span></p>` +
        `<ul class="${sz ? 'seg' : 'chips' + (k === 'dial' ? ' chips--d' : '')}" data-axis="${k}" aria-labelledby="h-${k}">${x.values.map(o => {
          const on = o.id === v[k], note = on ? '' : J.changeNoteAr(m, v, k, o.id);
          return `<li><a href="${J.url(m, J.nearest(m, v, k, o.id))}" data-k="${k}" data-v="${esc(o.id)}"${on ? ' aria-current="true"' : ''}>${sz ? '' : `<i class="${dm(o)}" style="background:${o.tone}"></i>`}<span class="o">${esc(o.ar)}${sz ? ' ' + L(o.en, 'lt') : o.material ? L(o.material, 'lt') : ''}${note ? `<small>${note}</small>` : ''}</span></a></li>`;
        }).join('')}</ul></div>`;
    }).join('');
    const sib = J.siblings(m, v);
    if (sib.length > 1) h += `<div class="opt"><p class="opt-h" id="h-ref"><span class="k">${m.axes.includes('dial') ? 'مراجع بهذا الميناء' : 'مراجع بهذا الاختيار'}</span><span class="aux">${J.countAr(sib.length, 'ref')}</span></p>` +
      `<ul class="rchips" data-axis="ref" aria-labelledby="h-ref">${sib.map(x => `<li><a href="${J.url(m, x)}" data-k="ref" data-v="${esc(x.ref)}"${x.ref === v.ref ? ' aria-current="true"' : ''}>${L(x.ref, 'ref')}</a></li>`).join('')}</ul>` +
      '<p class="opt-n">مراجع تتشارك الخيارات المنشورة نفسها؛ الفرق بينها غير مذكور في البيانات العامة.</p></div>';
    H('#opts', h);
  }
  function facts() {
    const c = J.color(m, v.color), s = J.size(m, v.size), d = v.dial && J.valueOf(m, 'dial', v.dial), dims = (s && s.dims) || m.dims, r = [];
    if (m.collection) r.push(['المجموعة', L(m.collection)]);
    r.push(['الفئة', `<a href="${cU(cat.slug)}">${cat.ar}</a>`], ['النوع', esc(m.typeAr)]);
    if (c) r.push(['اللون', esc(c.ar) + L(c.en, 'sub')]);
    if (d) r.push(['الميناء', esc(d.ar) + L(d.en, 'sub')]);
    if (s) r.push(['المقاس', esc(s.ar) + ' ' + L(s.en)]);
    if (dims) r.push(['الأبعاد', L(dims)]);
    if (m.material) r.push(['المادة', esc(m.material.ar) + L(m.material.en, 'sub')]);
    if (c && c.material) r.push(['الخامة', V(c.material)]);
    (m.facts || []).forEach(f => r.push([esc(f.ar), V(f.v)]));
    return r.map(x => `<tr><th scope="row">${x[0]}</th><td>${x[1]}</td></tr>`).join('');
  }
  function gal() {
    if (!st) return H('#gw', foL(m, v));
    if ($('#gal')) return $$('#gal .ph').forEach((el, i) => paint(el, m, v, VW[i]));
    H('#gw', `<div class="gal" id="gal" role="group" aria-label="صور مؤقتة للطراز">${VW.map((w, i) => ph(m, v, w, i)).join('')}</div><div class="gal-dots" aria-hidden="true">${VW.map((w, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div>`);
    const gl = $('#gal'), io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) $$('.gal-dots i').forEach((d, j) => d.classList.toggle('on', [...gl.children].indexOf(e.target) === j));
    }), { root: gl, threshold: 0.6 });
    [...gl.children].forEach(c => io.observe(c));
  }
  function update() {
    const names = axv(m, v).map(o => o.ar);
    opts(); gal();
    $('#ref').textContent = v.ref;
    H('#facts', facts());
    H('#buys', L(v.ref, 'ref') + names.map(x => `<span>·</span><span>${esc(x)}</span>`).join(''));
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
    const f = $(`#opts a[data-k="${k}"][data-v="${CSS.escape(val)}"]`) || $(`#opts [data-axis="${k}"] [aria-current]`);
    if (f) f.focus({ preventScroll: true });
  });
  update();
}

shell();
if (page === 'catalog') catalog();
if (page === 'product') product();
})();
