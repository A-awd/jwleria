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
const V = s => /[A-Za-z]/.test(s) ? L(s) : esc(s);
const ISO = s => '⁨' + s + '⁩';
const CAT = {}; D.categories.forEach(c => { CAT[c.slug] = c; });
const page = document.body.dataset.page, P0 = J.params();
const cU = s => 'catalog.html?category=' + s, bU = b => 'catalog.html?brand=' + enc(b);
const NO = 'لا تتوفر صورة أصلية معتمدة لهذا المرجع حاليًا.';
const dt = D.meta.retrieved.split('-');
const sv = (d, w, vb) => `<svg viewBox="0 0 ${vb || 20} ${vb || 20}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
const IX = sv('<path d="m5 5 10 10m0-10L5 15"/>', 1.4), IA = sv('<path d="M16 10H4m4.5-4.5L4 10l4.5 4.5"/>', 1.3);
const GL = {
  bag: '<path d="M14.5 18h19l2.2 22.5H12.3z"/><path d="M19 18v-3.2a5 5 0 0 1 10 0V18"/>',
  watches: '<circle cx="24" cy="24" r="9"/><path d="M19.6 16.2 20.6 7h6.8l1 9.2M19.6 31.8l1 9.2h6.8l1-9.2M24 20.2V24l2.6 1.6"/>',
  luggage: '<rect x="14" y="14" width="20" height="26" rx="2.6"/><path d="M20 14V8.5h8V14M20 19.5v15M28 19.5v15"/>'
};

/* ——— media: tinted stand-in (approved-photo slot) or facts-only ——— */
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (h, p) => '#' + rgb(h).map(x => Math.round(x * p + 255 * (1 - p)).toString(16).padStart(2, '0')).join('');
const lum = h => rgb(h).reduce((s, x, i) => (x /= 255, s + [.2126, .7152, .0722][i] * (x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4)), 0);
const tint = (m, v) => { const t = J.toneOf(m, v), b = mix(t, .62); return { a: mix(t, .3), b, dk: lum(b) < .2 }; };
const axv = (m, v) => J.axesOf(m).map(x => J.valueOf(m, x.kind, v[x.kind])).filter(Boolean);
const phL = (m, v, w) => [m.name, ...axv(m, v).map(o => o.ar), w].filter(Boolean).join('، ') + ' — صورة مؤقتة';
const ph = (m, v, w) => {
  const t = tint(m, v);
  return `<div class="ph${t.dk ? ' dk' : ''}" role="img" aria-label="${esc(phL(m, v, w))}" style="--a:${t.a};--b:${t.b}">${sv(GL[m.category] || GL.bag, 1.1, 48)}<span class="ph-l" aria-hidden="true"><span>مكان الصورة الأصلية${w ? ' · ' + w : ''}</span>${L(v.ref, 'ref')}</span></div>`;
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
const GR = {};
D.brands.forEach(b => { const l = b[0].toUpperCase(); (GR[l] = GR[l] || []).push(b); });
const azL = (p, f) => {
  const it = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(l => !GR[l] ? `<span lang="en" aria-hidden="true">${l}</span>` : f ? `<button type="button" lang="en" aria-pressed="false" data-l="${l}">${l}</button>` : `<a href="#${p}-${l}" lang="en">${l}</a>`).join('');
  return f ? `<div class="az-l" role="group" aria-label="تصفية العلامات حسب الحرف"><button type="button" class="all" aria-pressed="true" data-l="">الكل</button>${it}</div>` : `<nav class="az-l" aria-label="الانتقال إلى حرف">${it}</nav>`;
};
const azC = (p, t) => `<div class="az-c">${Object.keys(GR).sort().map(l => `<div class="az-g" id="${p}-${l}" data-l="${l}"><${t} class="az-h" lang="en">${l}</${t}><ul>${GR[l].map(b => {
  const n = D.brandCounts[b];
  return `<li><a href="${bU(b)}">${L(b)}${n ? `<span class="n"><span class="vh">، المراجع المنشورة: </span>${A(n)}</span>` : ''}</a></li>`;
}).join('')}</ul></div>`).join('')}</div>`;
const TOPS = Object.keys(D.brandCounts).sort((a, b) => D.brandCounts[b] - D.brandCounts[a]);
const seen = {};
const FILL = {
  'az-mb': () => azL('mb', 1) + azC('mb', 'span'),
  'az-dz': () => azC('dz', 'span'),
  'az-az': () => azL('az') + azC('az', 'h3'),
  tops: () => TOPS.map(b => `<li><a href="${bU(b)}">${L(b)}<span class="n">${A(D.brandCounts[b])}</span></a></li>`).join(''),
  ftb: () => TOPS.map(b => `<li><a href="${bU(b)}">${L(b)}</a></li>`).join('') + '<li><a href="home.html#az">كل العلامات</a></li>',
  mcats: () => D.categories.map(c => `<li><a href="${cU(c.slug)}"><span>${c.ar}</span><span class="c-en" lang="en">${c.en}</span></a></li>`).join(''),
  cats: () => D.categories.map(c => `<li><a href="${cU(c.slug)}">${c.ar}</a></li>`).join(''),
  hcats: () => D.categories.map((c, i) => {
    const alt = seen[c.img], src = '../shared/img/' + c.img; seen[c.img] = 1;
    return `<li><a class="cat" href="${cU(c.slug)}"><span class="cat-n">${A(String(i + 1).padStart(2, '0'))}</span><span class="cat-x"><span class="cat-ar">${c.ar}</span><span class="c-en" lang="en">${c.en}</span></span>` +
      `<figure class="cat-f${alt ? ' alt' : ''}"><img src="${src}-320.webp" srcset="${src}-320.webp 320w, ${src}-640.webp 640w" sizes="(max-width: 767px) 72px, 112px" width="320" height="320" alt="" loading="lazy" decoding="async"><figcaption>صورة توضيحية</figcaption></figure></a></li>`;
  }).join(''),
  feat: () => ['longchamp-le-pliage-one-handbag', 'rolex-datejust-41-126334', 'loewe-puzzle-large', 'audemars-piguet-royal-oak-15202or', 'longchamp-le-pliage-one-travel-bag'].map(id => card(J.byId(id))).join(''),
  nb: () => A(D.brands.length), nc: () => A(D.categories.length), nr: () => A(D.meta.catalogReferences),
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
  sb.addEventListener('click', () => { const o = ms.hidden; ms.hidden = !o; sb.setAttribute('aria-expanded', String(o)); if (o) $('input', ms).focus(); });
  const mb = $('.ib-m'), dw = modal($('#drawer'), mb);
  mb.addEventListener('click', dw.open);
  desk(() => { dw.close(); ms.hidden = true; sb.setAttribute('aria-expanded', 'false'); });
}

/* ——— CATALOG ——— */
function catalog() {
  const ms = D.models, ck = c => c.en.toLowerCase().replace(/\s+/g, '-'), COLS = [];
  ms.forEach(m => (m.colors || []).forEach(c => { if (!COLS.some(x => x.k === ck(c))) COLS.push({ k: ck(c), ar: c.ar, tone: c.tone }); }));
  const S = {
    brand: P0.getAll('brand'), category: P0.getAll('category').filter(s => CAT[s]), color: P0.getAll('color').filter(k => COLS.some(x => x.k === k)),
    q: (P0.get('q') || '').trim(), sort: P0.get('sort') === 'name' ? 'name' : 'new', page: Math.max(1, parseInt(P0.get('page'), 10) || 1)
  };
  const hay = m => [m.brand, m.name, m.nameAr, m.typeAr, m.collection, CAT[m.category].ar, CAT[m.category].en, ...m.variants.map(x => x.ref), ...(m.colors || []).map(c => c.ar + ' ' + c.en)].join(' ').toLowerCase();
  const has = (m, f, v) => f === 'brand' ? m.brand === v : f === 'category' ? m.category === v : (m.colors || []).some(c => ck(c) === v);
  const ok = (m, skip) => ['brand', 'category', 'color'].every(f => f === skip || !S[f].length || S[f].some(v => has(m, f, v))) && (!S.q || S.q.toLowerCase().split(/\s+/).every(t => hay(m).includes(t)));
  const opt = (f, v, l) => `<li><label class="ck"><input type="checkbox" name="${f}" value="${esc(v)}"><span class="t">${l}</span><span class="n" data-n></span></label></li>`;
  H('#f-brand', [...new Set(ms.map(m => m.brand).concat(S.brand))].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).map(b => opt('brand', b, L(b))).join(''));
  H('#f-category', D.categories.map(c => opt('category', c.slug, esc(c.ar))).join(''));
  H('#f-color', COLS.map(c => `<label class="sw"><input type="checkbox" name="color" value="${c.k}"><i style="background:${c.tone}"></i>${esc(c.ar)}<span class="n" data-n></span></label>`).join(''));
  $('#sort').value = S.sort;
  const clearQ = () => { S.q = ''; $$('.srch input').forEach(x => { x.value = ''; }); };

  function render() {
    let list = ms.filter(m => ok(m));
    if (S.sort === 'name') list = list.slice().sort((a, b) => a.name.localeCompare(b.name, 'en'));
    const per = 48, pages = Math.max(1, Math.ceil(list.length / per)), c = J.counts(list);
    S.page = Math.min(S.page, pages);
    H('#grid', list.length ? list.slice((S.page - 1) * per, S.page * per).map(card).join('') :
      `<div class="empty"><p class="empty-t">لا توجد طرازات مطابقة.</p><p>تضم هذه المعاينة ${J.countAr(ms.length, 'model')} من الكتالوج العام فقط.</p><button type="button" class="btn btn--ghost" data-clear>مسح عوامل التصفية</button></div>`);
    H('#count', list.length ? c.label.replace(' · ', '<span class="sep"> · </span>') : 'لا نتائج');
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
    H('#pg', pb(S.page - 1, 'السابق', S.page <= 1) + `<ol>${nums}</ol>` + pb(S.page + 1, 'التالي', S.page >= pages) + `<p class="pg-i">الصفحة ${A(S.page)} من ${A(pages)} · حتى ${A(per)} طرازًا في الصفحة</p>`);
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

/* ——— PRODUCT: options are links to real variants (foundation contract) ——— */
function product() {
  const m = J.byId(P0.get('model')), cat = CAT[m.category], st = J.hasStandInImage(m), VW = ['أمامي', 'جانبي', 'خلفي', 'تفاصيل'];
  let v = J.variantOf(m, P0.get('ref'));
  $('link[rel="canonical"]').setAttribute('href', J.url(m, J.primary(m)));
  const mates = D.models.filter(x => x.brand === m.brand && x.id !== m.id);
  const rel = (mates.length ? mates : D.models.filter(x => x.category === m.category && x.id !== m.id)).slice(0, 3);
  const rH = mates.length ? bU(m.brand) : cU(cat.slug), rA = mates.length ? 'كل طرازات ' + L(m.brand) : 'كل ' + cat.ar, n = D.brandCounts[m.brand];
  const bc = H('#bcc', cat.ar); bc.href = cU(cat.slug);
  H('#pb', L(m.brand)).href = bU(m.brand);
  H('#pn', L(m.name));
  H('#pt', esc(m.typeAr) + (m.nameAr ? ' · ' + esc(m.nameAr) : ''));
  H('#ps', J.summaryAr(m));
  H('#acc1', `<p>${m.variants.length > 1 ? `صفحة واحدة لهذا الطراز تضم ${J.countAr(m.variants.length, 'ref')}، ويتغيّر المرجع مع كل اختيار.` : 'طراز بمرجع واحد.'} ${st ? 'الصور المعروضة أماكن مؤقتة إلى حين اعتماد الصور الأصلية.' : NO}</p>`);
  H('#acc2', `<p>علامة ${L(m.brand)} مدرجة في دليل العلامات على <bdi>Jwleria</bdi>${n ? `، ولها ${A(n)} مرجعًا منشورًا في الكتالوج العام` : ''}. الإدراج في الدليل لا يعني ارتباطًا بالعلامة.</p><a class="lnk" href="${bU(m.brand)}">كل طرازات ${L(m.brand)} في الكتالوج</a>`);
  H('#rel-t', mates.length ? 'قطع أخرى من ' + L(m.brand) : 'من الفئة نفسها');
  H('#rel-a', rA).href = rH;
  H('#rel-g', rel.map(card).join('') + `<a class="more-t" href="${rH}"><span>${rA}</span><span class="more-n">في الكتالوج</span>${IA}</a>`);
  $('#gw').classList.toggle('is-fo', !st);
  document.body.classList.add('has-buy');

  function opts() {
    let h = J.axesOf(m).map(x => {
      const k = x.kind, c = J.valueOf(m, k, v[k]), sz = k === 'size';
      return `<div class="opt"><p class="opt-h" id="h-${k}"><span class="k">${x.label.ar}</span><span class="v">${c ? esc(c.ar) + ' ' + L(c.material || c.en, 'lt') : ''}</span><span class="aux">${J.countAr(x.values.length, k)}</span></p>` +
        `<ul class="${sz ? 'seg' : 'chips' + (k === 'dial' ? ' chips--d' : '')}" data-axis="${k}" aria-labelledby="h-${k}">${x.values.map(o => {
          const on = o.id === v[k], note = on ? '' : J.changeNoteAr(m, v, k, o.id);
          return `<li><a href="${J.url(m, J.nearest(m, v, k, o.id))}" data-k="${k}" data-v="${esc(o.id)}"${on ? ' aria-current="true"' : ''}>${sz ? '' : `<i style="background:${o.tone}"></i>`}<span class="o">${esc(o.ar)}${sz ? ' ' + L(o.en, 'lt') : o.material ? L(o.material, 'lt') : ''}${note ? `<small>${note}</small>` : ''}</span></a></li>`;
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
    if (c && c.material) r.push(['الخامة', L(c.material)]);
    (m.facts || []).forEach(f => r.push([esc(f.ar), V(f.v)]));
    return r.map(x => `<tr><th scope="row">${x[0]}</th><td>${x[1]}</td></tr>`).join('');
  }
  function gal() {
    if (!st) return H('#gw', fo(m, v, 1));
    if ($('#gal')) return $$('#gal .ph').forEach((el, i) => paint(el, m, v, VW[i]));
    H('#gw', `<div class="gal" id="gal" role="group" aria-label="صور مؤقتة للطراز">${VW.map(w => ph(m, v, w)).join('')}</div><div class="gal-dots" aria-hidden="true">${VW.map((w, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div>`);
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
