/* Jwleria — design preview, direction A "الدار". Renders pages from window.JWL (fixture + shared variant helpers). Not production code. */
(() => {
  'use strict';
  const J = window.JWL, D = J.data, doc = document, ar = J.AR;
  const $ = (s, r) => (r || doc).querySelector(s);
  const $$ = (s, r) => [...(r || doc).querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lat = (s) => `<bdi dir="ltr" lang="en">${esc(s)}</bdi>`;
  const refH = (r, attr = '') => `<bdi class="ref" dir="ltr"${attr}>${esc(r)}</bdi>`;
  const ISO = (s) => `⁨${s}⁩`;
  const val = (s) => (/[A-Za-z0-9]/.test(s) && !/[؀-ۿ]/.test(s) ? lat(s) : esc(s));
  const catOf = (slug) => D.categories.find((c) => c.slug === slug);
  const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const SEP = '<span class="sep" aria-hidden="true">·</span>';
  const ARROW = '<svg class="arr" viewBox="0 0 22 10" width="22" height="10" aria-hidden="true" focusable="false"><path d="M21 5H1.5M5.5 1 1.5 5l4 4"/></svg>';
  const FO_NOTE = 'لا تتوفر صورة أصلية معتمدة لهذا المرجع حاليًا.';

  /* ---------- Stand-in for an approved photo: soft tint of the variant tone ---------- */
  const rgb = (h) => [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16));
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return A.map((v, i) => Math.round(v * (1 - t) + B[i] * t)); };
  const lum = (c) => c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const css = (c, a = 1) => `rgba(${c},${a})`;
  function phVars(tone) {
    // A studio "sweep": light falls from above, the variant tone settles towards the floor. Never a flat slab.
    const dark = lum(rgb(tone)) < 0.12, P = '#faf7f2';
    const top = mix(tone, P, dark ? 0.78 : 0.66), mid = mix(tone, P, dark ? 0.56 : 0.42), bot = mix(tone, P, dark ? 0.34 : 0.22);
    return `--ph-bg:radial-gradient(70% 45% at 50% 30%,rgba(255,255,255,.5),rgba(255,255,255,0)),radial-gradient(140% 100% at 50% 40%,transparent 62%,rgba(27,25,21,.08)),linear-gradient(180deg,${css(top)},${css(mid)} 60%,${css(bot)});` +
      (lum(mid) >= 0.3 ? '--ph-ink:rgba(27,25,21,.32);--ph-line:rgba(27,25,21,.12)' : '--ph-ink:rgba(255,255,255,.66);--ph-line:rgba(255,255,255,.34)');
  }
  const ICONS = {
    bag: '<ellipse class="ph-floor" cx="60" cy="100" rx="40" ry="2.4"/><path d="M44 47c0-15 32-15 32 0"/><path d="M30 47h60l6 50H24z"/><path d="M30 58h60" opacity=".5"/>',
    watch: '<ellipse class="ph-floor" cx="60" cy="106" rx="22" ry="2"/><path d="M49 17h22l-2 19H51zM51 84h18l2 19H49z"/><circle cx="60" cy="60" r="25"/><circle cx="60" cy="60" r="20" opacity=".55"/><path d="M60 60V47M60 60l8 5"/>',
    luggage: '<ellipse class="ph-floor" cx="60" cy="106" rx="34" ry="2.4"/><rect x="34" y="34" width="52" height="64" rx="6"/><path d="M50 34V23h20v11M48 44v44M72 44v44"/><circle cx="43" cy="102" r="3"/><circle cx="77" cy="102" r="3"/>',
  };
  const iconFor = (m) => ICONS[m.category === 'watches' ? 'watch' : m.category === 'luggage' ? 'luggage' : 'bag'];
  const pickOf = (m, v) => (v.color ? J.valueOf(m, 'color', v.color) : v.dial ? J.valueOf(m, 'dial', v.dial) : null);
  const phLabel = (m, v, view) => { const c = pickOf(m, v); return `${m.name}${c ? '، ' + c.ar : ''}${view ? '، منظر ' + view : ''}، صورة مؤقتة، المرجع ${v.ref}`; };
  const ph = (m, v, view, mod) => `<div class="ph${mod ? ' ph--' + mod : ''}" role="img" aria-label="${esc(phLabel(m, v, view))}" style="${phVars(J.toneOf(m, v))}">` +
    `<svg class="ph-icon" viewBox="0 0 120 120" aria-hidden="true" focusable="false">${iconFor(m)}</svg>` +
    `<span class="ph-chip" aria-hidden="true"><span>مكان الصورة الأصلية${view ? ' · ' + view : ''}</span>${refH(v.ref, ' data-ref')}</span></div>`;
  /* Facts-only state: no approved photograph for this reference */
  function fo(m, v, big) {
    const d = big && v.dial && J.valueOf(m, 'dial', v.dial);
    return `<div class="fo${big ? ' fo--pdp" data-fo' : '"'}><div class="fo-in"><p class="fo-brand" aria-hidden="true">${lat(m.brand)}</p><p class="fo-name" aria-hidden="true">${lat(m.name)}</p>` +
      `<span class="fo-rule" aria-hidden="true"></span>${d ? `<p class="fo-sel">الميناء: ${esc(d.ar)}</p>` : ''}<p class="fo-ref"><span class="sr-only">المرجع </span>${refH(v.ref, ' data-ref')}</p></div><p class="fo-note">${FO_NOTE}</p></div>`;
  }

  /* ---------- Model card: one per model ---------- */
  function card(m, v) {
    const P = J.primary(m), sw = J.axesOf(m).find((a) => a.kind !== 'size' && a.values.length > 1), MAX = 6, sum = J.summaryAr(m);
    v = v || P;
    const dots = sw ? `<span class="dots">${sw.values.slice(0, MAX).map((x) =>
      `<a class="dot" href="${esc(J.url(m, J.nearest(m, P, sw.kind, x.id)))}" style="--c:${x.tone}" aria-label="${esc(`${m.name}، ${sw.kind === 'dial' ? 'الميناء' : 'اللون'} ${x.ar}`)}"><i></i></a>`).join('')}` +
      `${sw.values.length > MAX ? `<span class="dots-more" aria-hidden="true">+${ar(sw.values.length - MAX)}</span>` : ''}</span>` : '';
    return `<article class="card">${J.hasStandInImage(m) ? ph(m, v, '', 'card') : fo(m, v)}<div class="card-body"><p class="card-brand">${lat(m.brand)}</p>` +
      `<h3 class="card-title"><a href="${esc(J.url(m, v))}">${lat(m.name)}</a></h3><p class="card-type">${esc(m.typeAr)}</p>` +
      `${dots || sum ? `<div class="card-meta">${dots}${sum ? `<span>${sum}</span>` : ''}</div>` : ''}</div></article>`;
  }
  const catLink = (c) => `catalog.html${c ? '?category=' + c : ''}`;

  /* ---------- Chrome: toast, preview-only links, search, menu, compact header ---------- */
  const toastEl = $('[data-toast]');
  let toastT;
  function toast(msg) {
    clearTimeout(toastT);
    toastEl.textContent = msg;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    toastT = setTimeout(() => { toastEl.classList.remove('show'); setTimeout(() => { toastEl.textContent = ''; }, 350); }, 2400);
  }
  doc.addEventListener('click', (e) => { if (e.target.closest('[data-preview]')) { e.preventDefault(); toast('معاينة تصميم فقط'); } });
  $$('[data-cat-links]').forEach((ul) => { ul.innerHTML = D.categories.map((c) => `<li><a href="${catLink(c.slug)}">${esc(c.ar)}</a></li>`).join(''); });

  const header = $('[data-header]'), panel = $('#search-panel'), searchBtns = $$('[data-search-toggle]');
  let lastSearchBtn;
  function setSearch(open, from) {
    panel.hidden = !open;
    searchBtns.forEach((b) => b.setAttribute('aria-expanded', String(open)));
    if (open) { lastSearchBtn = from; $('input', panel).focus(); } else if (lastSearchBtn) lastSearchBtn.focus();
  }
  searchBtns.forEach((b) => b.addEventListener('click', () => setSearch(panel.hidden, b)));
  $('[data-search-close]').addEventListener('click', () => setSearch(false));

  const menu = $('#site-menu'), menuBtn = $('[data-menu-open]');
  function setMenu(open, keepFocus) {
    menuBtn.setAttribute('aria-expanded', String(open));
    doc.body.classList.toggle('menu-open', open);
    if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); $('[data-menu-close]').focus(); }
    else { menu.classList.remove('is-open'); menu.hidden = true; if (!keepFocus) menuBtn.focus(); }
  }
  menuBtn.addEventListener('click', () => setMenu(true));
  $('[data-menu-close]').addEventListener('click', () => setMenu(false));
  menu.addEventListener('click', (e) => { if (e.target.closest('a[href]:not([data-preview])')) setMenu(false, true); });
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!menu.hidden) setMenu(false); else if (!panel.hidden) setSearch(false); }
    if (e.key === 'Tab' && !menu.hidden) {
      const f = $$('a[href], button', menu), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  const mast = $('.masthead'), wide = matchMedia('(min-width: 760px)');
  let ticking = false;
  const compact = () => { ticking = false; header.classList.toggle('is-compact', wide.matches && scrollY > header.offsetTop + mast.offsetHeight - 2); };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(compact); } }, { passive: true });
  compact();

  const page = doc.body.dataset.page;

  /* ---------- Home ---------- */
  if (page === 'home') {
    const names = D.brands.map((b) => `<li>${esc(b)}</li>`).join('');
    $('[data-marquee]').innerHTML = `<div class="marquee-inner"><ul lang="en">${names}</ul><ul lang="en" aria-hidden="true">${names}</ul></div>`;
    $('[data-marquee-toggle]').addEventListener('click', (e) => {
      const p = $('[data-marquee-band]').classList.toggle('is-paused');
      e.currentTarget.setAttribute('aria-pressed', String(p));
      $('[data-marquee-label]').textContent = p ? 'تشغيل الحركة' : 'إيقاف الحركة';
    });
    $$('[data-story-brands]').forEach((el) => {
      const s = el.dataset.storyBrands;
      el.innerHTML = [...new Set(D.models.filter((m) => m.category === s).map((m) => m.brand))].map((b) => `<li>${lat(b)}</li>`).join('');
    });
    $('[data-cat-index]').innerHTML = D.categories.map((c, i) => `<li><a href="${catLink(c.slug)}"><span class="n">${ar(String(i + 1).padStart(2, '0'))}</span><span class="t">${esc(c.ar)}</span></a></li>`).join('');
    $('[data-featured]').innerHTML = ['longchamp-le-pliage-one-handbag', 'rolex-datejust-41-126334', 'loewe-puzzle-large'].map((id) => card(J.byId(id))).join('');
    const groups = {};
    D.brands.slice().sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).forEach((b) => { (groups[b[0].toUpperCase()] ||= []).push(b); });
    $('[data-brand-index]').innerHTML = Object.entries(groups).map(([L, list]) => `<div class="bgroup"><span class="bgroup-letter" aria-hidden="true">${L}</span><ul>${list.map((b) => {
      const n = D.brandCounts[b];
      return `<li><a href="catalog.html?brand=${encodeURIComponent(b)}">${lat(b)}${n ? `<span class="bcount"><span class="sr-only">عدد المراجع: </span>${ar(n)}</span>` : ''}</a></li>`;
    }).join('')}</ul></div>`).join('');
  }

  /* ---------- Catalog ---------- */
  if (page === 'catalog') {
    const PER = 48, f = { brand: $('[data-f="brand"]'), color: $('[data-f="color"]'), q: $('[data-f="q"]') }, KEYS = ['category', 'brand', 'color', 'q'];
    let state = {};
    const inFixture = [...new Set(D.models.map((m) => m.brand))].sort();
    const opts = (list) => list.map((b) => `<option value="${esc(b)}">${esc(b)}‎</option>`).join('');
    f.brand.innerHTML = `<option value="">كل العلامات</option><optgroup label="في هذه المعاينة">${opts(inFixture)}</optgroup><optgroup label="علامات أخرى في الدليل">${opts(D.brands.filter((b) => !inFixture.includes(b)))}</optgroup>`;
    const colours = [];
    D.models.forEach((m) => (m.colors || []).forEach((c) => { if (!colours.some((x) => x.en === c.en)) colours.push(c); }));
    f.color.innerHTML = '<option value="">كل الألوان</option>' + colours.map((c) => `<option value="${slugify(c.en)}">${esc(c.ar)}</option>`).join('');
    $('[data-lead]').textContent = `يضم الكتالوج المنشور ${ar(D.meta.catalogReferences.toLocaleString('en').replace(',', '٬'))} مرجعًا، وتعرض هذه المعاينة ${J.countAr(D.models.length, 'model')} منها للتوضيح.`;

    const read = () => {
      const p = J.params();
      state = { page: Math.max(1, parseInt(p.get('page'), 10) || 1) };
      KEYS.forEach((k) => { state[k] = p.get(k) || ''; });
      if (!catOf(state.category)) state.category = '';
      if (!D.brands.includes(state.brand)) state.brand = '';
      f.brand.value = state.brand; f.color.value = state.color; f.q.value = state.q;
      if (f.color.value !== state.color) state.color = '';
    };
    const write = () => {
      const p = new URLSearchParams();
      KEYS.forEach((k) => { if (state[k]) p.set(k, state[k]); });
      if (state.page > 1) p.set('page', state.page);
      history.replaceState(null, '', 'catalog.html' + (p.toString() ? '?' + p : ''));
    };
    const matches = (m) => {
      if (state.category && m.category !== state.category) return false;
      if (state.brand && m.brand !== state.brand) return false;
      if (state.color && !(m.colors || []).some((c) => slugify(c.en) === state.color)) return false;
      if (!state.q) return true;
      const hay = [m.brand, m.name, m.nameAr, m.typeAr, m.collection, catOf(m.category).ar, ...m.variants.map((v) => v.ref), ...(m.colors || m.dials || []).map((c) => c.ar + ' ' + c.en)].filter(Boolean).join(' ').toLowerCase();
      return state.q.toLowerCase().trim().split(/\s+/).every((t) => hay.includes(t));
    };
    const cardFor = (m) => {
      const c = state.color && (m.colors || []).find((x) => slugify(x.en) === state.color);
      return card(m, c && J.nearest(m, J.primary(m), 'color', c.id));
    };
    const render = () => {
      const cat = catOf(state.category);
      $('[data-cat-tabs]').innerHTML = [{ slug: '', ar: 'الكل' }, ...D.categories].map((c) => `<li><a href="${catLink(c.slug)}" data-cat="${c.slug}"${c.slug === state.category ? ' aria-current="true"' : ''}>${esc(c.ar)}</a></li>`).join('');
      $('[data-title]').textContent = cat ? cat.ar : 'الكتالوج';
      $('[data-crumbs]').innerHTML = '<li><a href="home.html">الرئيسية</a></li>' + (cat ? `<li><a href="catalog.html">الكتالوج</a></li><li><span aria-current="page">${esc(cat.ar)}</span></li>` : '<li><span aria-current="page">الكتالوج</span></li>');
      doc.title = `${cat ? cat.ar + ' · ' : ''}الكتالوج · ${ISO('Jwleria')}`;
      const list = D.models.filter(matches), pages = Math.max(1, Math.ceil(list.length / PER));
      state.page = Math.min(state.page, pages);
      const shown = list.slice((state.page - 1) * PER, state.page * PER);
      $('[data-count]').textContent = shown.length ? J.counts(shown).label : 'لا توجد طرازات مطابقة';
      $('[data-results]').innerHTML = shown.length ? shown.map(cardFor).join('') :
        `<div class="empty"><p class="empty-title">لا توجد طرازات مطابقة</p><p>تضم هذه المعاينة ${J.countAr(D.models.length, 'model')} للتوضيح فقط. يمكن تعديل عوامل التصفية أو مسحها.</p><button class="clear-btn" type="button" data-clear>مسح عوامل التصفية</button></div>`;
      $('.filter-line [data-clear]').hidden = !KEYS.some((k) => state[k]);
      let nums = '';
      for (let i = 1; i <= pages; i++) nums += `<li>${i === state.page ? `<span class="pager-num" aria-current="page">${ar(i)}</span>` : `<a class="pager-num" href="?page=${i}" data-page="${i}">${ar(i)}</a>`}</li>`;
      $('[data-pager]').innerHTML = shown.length ? `<button class="pager-step prev" type="button" data-step="-1"${state.page === 1 ? ' disabled' : ''}>${ARROW}السابق</button><ol>${nums}</ol><button class="pager-step next" type="button" data-step="1"${state.page === pages ? ' disabled' : ''}>التالي${ARROW}</button>` : '';
      const note = $('.pager-note') || doc.createElement('p');
      note.className = 'pager-note';
      note.textContent = shown.length ? `الصفحة ${ar(state.page)} من ${ar(pages)} · حتى ${ar(PER)} طرازًا في الصفحة` : '';
      $('[data-pager]').after(note);
    };
    const update = () => { write(); render(); };
    read(); render();
    $('[data-cat-tabs]').addEventListener('click', (e) => {
      const a = e.target.closest('a[data-cat]'); if (!a) return;
      e.preventDefault(); state.category = a.dataset.cat; state.page = 1; update();
      ($('[data-cat-tabs] a[aria-current="true"]') || $('[data-cat-tabs] a')).focus();
    });
    ['brand', 'color'].forEach((k) => f[k].addEventListener('change', () => { state[k] = f[k].value; state.page = 1; update(); }));
    let qt;
    f.q.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { state.q = f.q.value.trim(); state.page = 1; update(); }, 160); });
    $('[data-filters]').addEventListener('submit', (e) => { e.preventDefault(); state.q = f.q.value.trim(); update(); });
    doc.addEventListener('click', (e) => {
      if (e.target.closest('[data-clear]')) { state = { category: '', brand: '', color: '', q: '', page: 1 }; f.brand.value = f.color.value = f.q.value = ''; update(); f.brand.focus(); }
      const s = e.target.closest('[data-step]'), pg = e.target.closest('a[data-page]');
      if (s) { state.page += +s.dataset.step; update(); }
      if (pg) { e.preventDefault(); state.page = +pg.dataset.page; update(); }
    });
  }

  /* ---------- Product: foundation variant contract (options are links to real variants) ---------- */
  if (page === 'product') {
    const p = J.params(), qref = p.get('ref');
    let M = D.models.find((m) => m.id === p.get('model')) || (qref && D.models.find((m) => m.variants.some((v) => v.ref === qref))) || D.models[0];
    let V = M.variants.find((v) => v.ref === qref) || J.primary(M);
    const cat = catOf(M.category), axes = J.axesOf(M), stand = J.hasStandInImage(M);
    const VIEWS = ['أمامي', 'جانبي', 'تفاصيل'], MODS = ['', 'side', 'detail'];

    let canon = $('link[rel="canonical"]');
    if (!canon) { canon = doc.createElement('link'); canon.rel = 'canonical'; doc.head.append(canon); }
    canon.setAttribute('href', J.url(M, J.primary(M)));
    $('[data-crumbs]').innerHTML = `<li><a href="catalog.html">الكتالوج</a></li><li><a href="${catLink(cat.slug)}">${esc(cat.ar)}</a></li>`;

    const nameOf = (x) => (x ? esc(x.ar) + (x.en ? SEP + lat(x.en) : '') + (x.material ? SEP + lat(x.material) : '') : '');
    const optsH = axes.map(({ kind, label, values }) => {
      const sw = kind !== 'size';
      return `<div class="opt"><p class="opt-head"><span class="opt-k" id="k-${kind}">${esc(label.ar)}</span><span class="opt-v" data-sel="${kind}"></span></p>` +
        `<ul class="${sw ? 'swatches' + (values.length > 6 ? ' swatches--many' : '') : 'sizes'}" aria-labelledby="k-${kind}">${values.map((x) =>
          `<li><a class="${sw ? 'swatch' + (/diamond/i.test(x.en) ? ' is-gem' : '') : 'size'}" href="#" data-kind="${kind}" data-val="${esc(x.id)}"${sw ? ` style="--c:${x.tone}"` : ''}>` +
          (sw ? '<i aria-hidden="true"></i>' : `<span class="size-l"><span>${esc(x.ar)}</span>${lat(x.en)}</span><small class="opt-change" data-note></small>`) + '</a></li>').join('')}</ul>` +
        `${sw ? '<p class="opt-hint" data-hint aria-hidden="true"></p>' : ''}</div>`;
    }).join('');
    const media = stand
      ? `<div class="gallery" data-gallery>${VIEWS.map((w, i) => `<figure class="slide">${ph(M, V, w, MODS[i])}</figure>`).join('')}</div><p class="gallery-count" aria-hidden="true"><span data-gi>١</span> / ${ar(VIEWS.length)}</p>`
      : fo(M, V, true);
    const pdp = $('[data-pdp]');
    pdp.innerHTML = `<div class="gallery-wrap">${media}</div><div class="pdp-info"><a class="pdp-brand" href="catalog.html?brand=${encodeURIComponent(M.brand)}">${lat(M.brand)}</a>` +
      `<h1 class="pdp-title">${lat(M.name)}</h1><p class="pdp-type">${esc(M.typeAr)}${M.nameAr ? SEP + `<span class="pdp-ar">${esc(M.nameAr)}</span>` : ''}</p>` +
      `${M.collection ? `<p class="pdp-coll"><span>المجموعة</span>${lat(M.collection)}</p>` : ''}` +
      `<div class="opts">${optsH}<div class="opt" data-chips hidden></div><div class="pdp-ref"><span>المرجع</span>${refH(V.ref, ' data-ref')}</div></div>` +
      '<button class="cta" type="button" data-preview>التواصل عبر واتساب لمعرفة السعر</button><p class="indep"><bdi>Jwleria</bdi> جهة مستقلة، غير تابعة لهذه العلامات ولا تمثلها.</p>' +
      '<h2 class="facts-title">التفاصيل</h2><dl class="facts" data-facts></dl><p class="sr-only" aria-live="polite" data-status></p></div>';

    const current = (a, on) => (on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
    function syncControls() {
      $$('a[data-kind]', pdp).forEach((a) => {
        const { kind, val: id } = a.dataset, t = J.nearest(M, V, kind, id), on = V[kind] === id, x = J.valueOf(M, kind, id);
        const note = on ? '' : J.changeNoteAr(M, V, kind, id);
        a.setAttribute('href', J.url(M, t));
        a.dataset.to = t.ref;
        current(a, on);
        a.classList.toggle('has-change', !!note);
        a.dataset.tip = x.ar + (note ? ' — ' + note : '');
        if (kind === 'size') $('[data-note]', a).textContent = note;
        else a.setAttribute('aria-label', x.ar + (x.material ? '، ' + x.material : '') + (note ? '، ' + note : ''));
      });
      axes.forEach((ax) => { $(`[data-sel="${ax.kind}"]`, pdp).innerHTML = nameOf(J.valueOf(M, ax.kind, V[ax.kind])); });
      // References that share every public option value are offered as chips, never as invented labels.
      const box = $('[data-chips]', pdp), sib = axes.length ? J.siblings(M, V) : [], key = sib.map((s) => s.ref).join();
      box.hidden = sib.length < 2;
      if (box.hidden) { box.innerHTML = box.dataset.key = ''; return; }
      if (box.dataset.key !== key) {
        box.dataset.key = key;
        box.innerHTML = `<p class="opt-head"><span class="opt-k" id="k-ref">${axes.some((a) => a.kind === 'dial') ? 'مراجع بهذا الميناء' : 'مراجع بهذا الاختيار'}</span><span class="opt-v">${J.countAr(sib.length, 'ref')}</span></p>` +
          `<ul class="chips" aria-labelledby="k-ref">${sib.map((s) => `<li><a class="chip" href="${esc(J.url(M, s))}" data-to="${esc(s.ref)}"><span class="sr-only">المرجع </span>${refH(s.ref)}</a></li>`).join('')}</ul>` +
          '<p class="opt-note">تشترك هذه المراجع في الخيارات المنشورة نفسها، ولكل منها صفحة بمرجعها.</p>';
      }
      $$('a', box).forEach((a) => current(a, a.dataset.to === V.ref));
    }
    function facts() {
      const s = V.size && J.size(M, V.size), c = V.color && J.color(M, V.color), dims = (s && s.dims) || M.dims, rows = [];
      if (M.collection) rows.push(['المجموعة', lat(M.collection)]);
      if (s) rows.push(['المقاس', esc(s.ar) + SEP + lat(s.en)]);
      if (dims) rows.push(['الأبعاد', lat(dims)]);
      if (M.material) rows.push(['المادة', esc(M.material.ar) + SEP + lat(M.material.en)]);
      else if (c && c.material) rows.push(['المادة', lat(c.material)]);
      (M.facts || []).forEach((x) => rows.push([x.ar, val(x.v)]));
      rows.push(['الفئة', esc(cat.ar)]);
      $('[data-facts]').innerHTML = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('');
    }
    function sync(announce) {
      syncControls();
      $$('[data-pdp] [data-ref], [data-cta-bar] [data-ref]').forEach((r) => { r.textContent = V.ref; });
      if (stand) $$('[data-gallery] .ph').forEach((el, i) => { el.setAttribute('style', phVars(J.toneOf(M, V))); el.setAttribute('aria-label', phLabel(M, V, VIEWS[i])); });
      else $('[data-fo]').outerHTML = fo(M, V, true);
      facts();
      const picks = axes.map((ax) => J.valueOf(M, ax.kind, V[ax.kind]).ar);
      doc.title = [`${M.typeAr} ${ISO(M.name)}`, ...picks, ISO(V.ref)].join(' · ') + ` — ${ISO(M.brand)} · ${ISO('Jwleria')}`;
      if (announce) $('[data-status]').textContent = [...picks, 'المرجع ' + V.ref].join('، ');
    }
    pdp.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-to]'), v = a && M.variants.find((x) => x.ref === a.dataset.to);
      if (!v || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      const href = a.getAttribute('href');
      if (v !== V) { V = v; sync(true); }
      history.replaceState(null, '', href);
    });
    const hint = (e) => {
      const a = e.target.closest('a.swatch'), h = a && $('p[data-hint]', a.closest('.opt'));
      if (h) h.textContent = /over|in$/.test(e.type) ? a.dataset.tip : '';
    };
    ['pointerover', 'pointerout', 'focusin', 'focusout'].forEach((t) => pdp.addEventListener(t, hint));
    sync(false);

    const gal = $('[data-gallery]'), gi = $('[data-gi]');
    if (gal && window.IntersectionObserver) {
      const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) gi.textContent = ar($$('.slide', gal).indexOf(en.target) + 1); }), { root: gal, threshold: 0.6 });
      $$('.slide', gal).forEach((s) => io.observe(s));
    }

    let rel = D.models.filter((m) => m.brand === M.brand && m.id !== M.id), relTitle = 'قطع أخرى من ' + lat(M.brand), relQ = 'brand=' + encodeURIComponent(M.brand);
    if (!rel.length) { rel = D.models.filter((m) => m.category === M.category && m.id !== M.id); relTitle = 'من الفئة نفسها'; relQ = 'category=' + M.category; }
    $('[data-related]').innerHTML = rel.length ? `<div class="wrap"><div class="section-head"><h2 class="h2" id="related-title">${relTitle}</h2><a class="text-link" href="catalog.html?${relQ}">عرض الكل${ARROW}</a></div>` +
      `<div class="grid">${rel.slice(0, 3).map((m) => card(m)).join('')}</div></div>` : '';
  }
})();
