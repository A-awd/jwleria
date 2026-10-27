/* Jwleria — direction C «المعرض». Static design preview, not production code. */
(() => {
  'use strict';
  const J = window.JWL, D = J.data, AR = J.AR;
  const d = document, B = d.body, PAGE = B.dataset.page;
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const EM = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => EM[c]);
  const lat = (s, c) => `<bdi class="lat${c ? ' ' + c : ''}" lang="en" dir="ltr">${esc(s)}</bdi>`;
  const refT = (r, id) => `<bdi class="ref"${id ? ` id="${id}"` : ''} dir="ltr" style="--n:${String(r).length}">${esc(r)}</bdi>`;
  const fv = (s) => (/[؀-ۿ]/.test(s) ? esc(s) : lat(s, 'lv'));
  const cat = (slug) => D.categories.find((c) => c.slug === slug) || { slug, ar: slug, en: slug };
  const IMG = '../shared/img/';
  const FO = 'لا تتوفر صورة أصلية معتمدة لهذا المرجع حاليًا.';
  const INQ = 'التواصل عبر واتساب لمعرفة السعر';
  const VIEWS = ['الواجهة', 'الجانب', 'الخلف', 'التفاصيل'];
  const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

  const P = {
    bag: '<path d="M23 25v-4a9 9 0 0 1 18 0v4"/><path d="M13 25h38l-3.5 27h-31z"/>',
    watch: '<circle cx="32" cy="32" r="12"/><path d="M26.5 21.5 28.5 9h7l2 12.5M26.5 42.5l2 12.5h7l2-12.5M32 26v6l4 2.5"/>',
    luggage: '<rect x="17" y="18" width="30" height="34" rx="4"/><path d="M26 18v-6h12v6M25 26v18M39 26v18"/><circle cx="23" cy="55.5" r="2"/><circle cx="41" cy="55.5" r="2"/>',
    right: '<path d="m25 16 16 16-16 16"/>',
    left: '<path d="M39 16 23 32l16 16"/>',
  };
  const svg = (p, c = 'ico', w = 1.4) => `<svg class="${c}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
  const ui = (k) => svg(P[k], 'ui', 3);
  const ico = (m) => svg(P[m.category === 'watches' ? 'watch' : m.category === 'luggage' ? 'luggage' : 'bag']);

  // Dark tone? (relative luminance below ~0.3) picks the light icon colour.
  const dark = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) < 148; };
  const optKind = (m) => (m.axes || []).find((a) => a === 'color' || a === 'dial');
  const optOf = (m, v) => { const k = optKind(m); return k && v[k] ? J.valueOf(m, k, v[k]) : null; };
  const dia = (o) => /diamond/i.test(o.en || '');
  const sumOf = (m) => esc(J.summaryAr(m)) || '&nbsp;';
  const phLabel = (m, v, view) => {
    const o = optOf(m, v), s = v.size && (m.sizes || []).length > 1 ? J.size(m, v.size) : null;
    return `${m.name}${o ? '، اللون ' + o.ar : ''}${s ? '، المقاس ' + s.ar : ''} — صورة مؤقتة${view ? '، ' + view : ''}`;
  };

  /* media: stand-in block or facts-only state */
  const tagH = (v, view) => `<span>مكان الصورة الأصلية${view ? ' · ' + view : ''}</span>${refT(v.ref)}`;
  function standin(m, v, view) {
    const t = J.toneOf(m, v);
    return `<div class="ph${dark(t) ? ' dk' : ''}" data-c="${m.category}" role="img" aria-label="${esc(phLabel(m, v, view))}" style="--tone:${t}">${ico(m)}</div><p class="tag">${tagH(v, view)}</p>`;
  }
  // Card panels omit the model line (the card text repeats it).
  // The PDP panel shows only the reference, the selected option and the sentence (the h1 names the model).
  const optLine = (m, v) => { const o = optOf(m, v); return o ? `<p class="fo-o"><span class="fo-sw${dia(o) ? ' dia' : ''}" aria-hidden="true" style="--tone:${o.tone}"></span>${esc(o.ar)}</p>` : ''; };
  const factsOnly = (m, v, full) => full
    ? `<div class="fo fo-p"><p class="fo-r">${refT(v.ref)}</p>${optLine(m, v)}<p class="fo-s">${FO}</p></div>`
    : `<div class="fo"><p class="fo-b">${lat(m.brand)}</p><p class="fo-r">${refT(v.ref)}</p><p class="fo-s">${FO}</p></div>`;
  function paintStandin(box, m, v, view) {
    const ph = $('.ph', box), t = J.toneOf(m, v);
    if (!ph) { box.innerHTML = standin(m, v, view); return; }
    ph.style.setProperty('--tone', t);
    ph.classList.toggle('dk', dark(t));
    ph.setAttribute('aria-label', phLabel(m, v, view));
    $('.tag', box).innerHTML = tagH(v, view);
  }

  /* one card per model */
  function card(m, h, fv) {
    const p = fv || J.primary(m), si = J.hasStandInImage(m), k = optKind(m);
    const all = k ? ((J.axesOf(m).find((a) => a.kind === k) || {}).values || []) : [];
    // Distinct tones first (plain vs diamond-set dials share one).
    const first = (o, i) => all.findIndex((x) => x.tone === o.tone) === i;
    const vals = all.filter(first).concat(all.filter((o, i) => !first(o, i)));
    let dots = '';
    if (vals.length > 1) {
      dots = vals.slice(0, 6).map((o, i) => {
        const t = J.nearest(m, p, k, o.id);
        return `<a class="dot${i > 2 ? ' dx' : ''}${dia(o) ? ' dia' : ''}" href="${J.url(m, t)}" data-ref="${esc(t.ref)}" style="--tone:${o.tone}" aria-label="${esc(o.ar + '، ' + m.name)}"><i></i></a>`;
      }).join('');
      if (vals.length > 6) dots += `<span class="more md" aria-hidden="true" dir="ltr">+${AR(vals.length - 6)}</span>`;
      if (vals.length > 3) dots += `<span class="more mm" aria-hidden="true" dir="ltr">+${AR(vals.length - 3)}</span>`;
      dots = `<div class="dots">${dots}</div>`;
    }
    // Dots follow the title in the DOM; CSS puts them on the stage floor.
    return `<article class="card${dots ? ' has-dots' : ''}" data-model="${m.id}" data-ref="${esc(p.ref)}"><div class="stage ${si ? 'is-si' : 'is-fo'}">${si ? standin(m, p) : factsOnly(m, p)}</div>` +
      `<div class="c-txt"><p class="c-brand">${lat(m.brand)}</p><h${h} class="c-name"><a class="c-link" href="${J.url(m, p)}">${lat(m.name)}</a></h${h}>` +
      `<p class="c-type">${esc(m.typeAr)}</p><p class="c-sum">${sumOf(m)}</p></div>${dots}</article>`;
  }
  // Hover/focus on a dot previews that variant on the card.
  function peek(dot, on) {
    const c = dot.closest('.card');
    if (!c) return;
    const m = J.byId(c.dataset.model), v = J.variantOf(m, on ? dot.dataset.ref : c.dataset.ref), st = $('.stage', c);
    if (J.hasStandInImage(m)) paintStandin(st, m, v); else $('.fo-r', st).innerHTML = refT(v.ref);
    const o = optOf(m, v);
    $('.c-sum', c).innerHTML = on && o ? `${esc(o.ar)} · ${lat(o.material || o.en)}` : sumOf(m);
  }
  const dotOf = (e) => e.target.closest && e.target.closest('.dot');
  [['mouseover', 1], ['mouseout', 0], ['focusin', 1], ['focusout', 0]].forEach(([ev, on]) => d.addEventListener(ev, (e) => {
    const x = dotOf(e);
    if (x && !(ev[0] === 'm' && x.contains(e.relatedTarget))) peek(x, !!on);
  }));

  /* horizontal scrollers (RTL aware) */
  function scroller(row, prev, next) {
    if (!row || !prev || !next) return;
    const step = () => Math.max(row.clientWidth * 0.8, 140);
    prev.addEventListener('click', () => row.scrollBy({ left: step(), behavior: smooth() }));
    next.addEventListener('click', () => row.scrollBy({ left: -step(), behavior: smooth() }));
    const upd = () => {
      const x = Math.abs(row.scrollLeft), max = row.scrollWidth - row.clientWidth;
      prev.disabled = x < 4;
      next.disabled = x > max - 4;
    };
    row.addEventListener('scroll', upd, { passive: true });
    addEventListener('resize', upd);
    upd();
  }
  const scBtns = (id, what) => `<div class="scbs">${[['prev', 'السابقة', 'right'], ['next', 'التالية', 'left']].map(([c, t, i]) => `<button class="scb sc-${c}" type="button" aria-controls="${id}" aria-label="${what} ${t}">${ui(i)}</button>`).join('')}</div>`;
  const center = (row, el) => {
    if (!row || !el) return;
    const r = row.getBoundingClientRect(), e = el.getBoundingClientRect();
    row.scrollLeft += e.left + e.width / 2 - (r.left + r.width / 2);
  };

  /* shell: header, chips, toast */
  let tt;
  function toast(msg) {
    const t = $('.toast');
    t.textContent = msg || 'معاينة تصميم فقط';
    t.classList.add('on');
    clearTimeout(tt);
    tt = setTimeout(() => t.classList.remove('on'), 2400);
  }
  function shell() {
    const cb = $('#cbar');
    if (PAGE === 'catalog') cb.remove();
    else {
      const here = PAGE === 'product' ? J.byId(J.params().get('model')).category : '';
      cb.innerHTML = `<nav class="wrap" aria-label="الفئات"><ul class="chips"><li><a class="chip" href="catalog.html">كل الفئات</a></li>${D.categories.map((c) => `<li><a class="chip${c.slug === here ? ' is-here" aria-current="true' : ''}" href="catalog.html?category=${c.slug}">${c.ar}</a></li>`).join('')}</ul></nav>`;
    }
    const mb = $('.mb'), nv = $('#nav'), sb = $('#sbtn'), sp = $('#sp');
    // Phone menu: full-height sheet over a scrim, with a labelled close button and the category list.
    nv.insertAdjacentHTML('afterbegin', `<div class="nav-h"><span class="nav-t">القائمة</span><button class="nav-x" type="button"><svg class="ui" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m18 18 28 28M46 18 18 46"/></svg><span>إغلاق القائمة</span></button></div>`);
    nv.insertAdjacentHTML('beforeend', `<div class="nav-c"><h2 class="nav-ch" id="nav-ch">الفئات</h2><ul aria-labelledby="nav-ch">${D.categories.map((c) => `<li><a href="catalog.html?category=${c.slug}">${c.ar}</a></li>`).join('')}</ul></div>`);
    const scrim = d.createElement('div');
    scrim.className = 'scrim';
    nv.after(scrim);
    const mq = matchMedia('(max-width: 899px)');
    const menu = (o, back) => {
      mb.setAttribute('aria-expanded', String(o));
      nv.classList.toggle('open', o);
      B.classList.toggle('menu-open', o);
      if (o && mq.matches) $('.nav-x', nv).focus();
      else if (back) mb.focus();
    };
    $('.nav-x', nv).addEventListener('click', () => menu(false, true));
    scrim.addEventListener('click', () => menu(false, true));
    mq.addEventListener('change', () => { if (!mq.matches) menu(false); });
    nv.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !nv.classList.contains('open')) return;
      const f = $$('a, button', nv), a = f[0], z = f[f.length - 1];
      if (e.shiftKey && d.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && d.activeElement === z) { e.preventDefault(); a.focus(); }
    });
    const search = (o) => { sp.hidden = !o; sb.setAttribute('aria-expanded', String(o)); if (o) $('#sq').focus(); };
    mb.addEventListener('click', () => menu(mb.getAttribute('aria-expanded') !== 'true'));
    nv.addEventListener('click', (e) => { if (e.target.closest('a')) menu(false); });
    sb.addEventListener('click', () => {
      if (sp) return search(sp.hidden);
      const q = $('#q');
      q.scrollIntoView({ block: 'center', behavior: smooth() });
      q.focus({ preventScroll: true });
    });
    d.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (mb.getAttribute('aria-expanded') === 'true') { menu(false); mb.focus(); }
      if (sp && !sp.hidden) { search(false); sb.focus(); }
    });
    d.addEventListener('click', (e) => { if (e.target.closest('[data-inert]')) { e.preventDefault(); toast(); } });
  }

  /* home */
  function home() {
    // A non-default real variant per model, each card linking to that reference.
    const pick = [['longchamp-le-pliage-one-handbag', 'L1626979163'], ['rolex-datejust-41-126334', 'm126334-0027'], ['loewe-puzzle-large', 'B510PNLX05-0018'], ['longchamp-le-pliage-one-travel-bag', null]]
      .map(([id, ref]) => { const m = J.byId(id); return [m, ref ? J.variantOf(m, ref) : m.variants.find((x) => x.color === 'P87') || J.primary(m)]; });
    const doors = D.brands.map((b) => {
      const n = D.brandCounts[b];
      return `<li><a class="door" href="catalog.html?brand=${encodeURIComponent(b)}"><span class="door-f"><span class="door-n">${lat(b)}</span>${n ? `<span class="door-c">${J.countAr(n, 'ref')}</span>` : ''}</span></a></li>`;
    }).join('');
    // A repeated illustration gets a mirrored close-up crop.
    const seen = {};
    const cats = D.categories.map((c) => {
      const alt = seen[c.img] ? ' class="alt"' : '';
      seen[c.img] = 1;
      return `<li><a class="cat" href="catalog.html?category=${c.slug}"><span class="cat-i"><img${alt} src="${IMG}${c.img}-320.webp" srcset="${IMG}${c.img}-320.webp 320w, ${IMG}${c.img}-640.webp 640w" sizes="(max-width: 1099px) 30vw, 130px" width="320" height="320" alt="" loading="lazy" decoding="async"><span class="cap" aria-hidden="true">صورة توضيحية</span></span><span class="cat-n">${c.ar}</span>${lat(c.en, 'cat-e')}</a></li>`;
    }).join('');
    $('#main').insertAdjacentHTML('beforeend', `
<section class="wrap sec" id="brands" aria-labelledby="bh" tabindex="-1">
<div class="sec-h"><div><h2 id="bh">العلامات</h2><p>${AR(D.brands.length)} علامة في الدليل. الرقم تحت الاسم عدد المراجع المنشورة حاليًا.</p></div>${scBtns('doors', 'العلامات')}</div>
<ul class="sc-row doors" id="doors">${doors}</ul>
</section>
<section class="wrap sec" id="categories" aria-labelledby="ch" tabindex="-1">
<div class="sec-h"><div><h2 id="ch">الفئات</h2><p>${AR(D.categories.length)} فئات للتصفح.</p></div><a class="more-l" href="catalog.html">الكتالوج كاملًا</a></div>
<ul class="cats">${cats}</ul>
</section>
<section class="wrap sec" aria-labelledby="fh">
<div class="sec-h"><div><h2 id="fh">مختارات من الكتالوج</h2><p>ساعات وحقائب بمراجعها الفعلية.</p></div><a class="more-l" href="catalog.html">عرض الكتالوج</a></div>
<ul class="grid4">${pick.map(([m, v]) => `<li>${card(m, 3, v)}</li>`).join('')}</ul>
</section>`);
    scroller($('#doors'), $('#brands .sc-prev'), $('#brands .sc-next'));
  }

  /* catalog */
  function catalog() {
    const q = J.params(), per = 48, tc = J.counts(D.models), total = `${J.countAr(tc.models, 'model')} و${J.countAr(tc.refs, 'ref')}`;
    const st = { category: D.categories.some((c) => c.slug === q.get('category')) ? q.get('category') : '', brand: q.get('brand') || '', q: q.get('q') || '' };
    const brands = D.brands.slice();
    if (st.brand && !brands.includes(st.brand)) brands.push(st.brand);
    const n = (s) => D.models.filter((m) => m.category === s).length;
    const hay = (m) => [m.brand, m.name, m.collection, m.typeAr, m.nameAr, cat(m.category).ar].concat(m.variants.map((v) => v.ref)).join(' ').toLowerCase();
    $('.fcat .chips').innerHTML = [['', 'كل الفئات']].concat(D.categories.map((c) => [c.slug, c.ar])).map(([s, t]) => `<li><button class="chip" type="button" data-cat="${s}" aria-pressed="false">${t}${s && n(s) ? `<span class="chip-n">${AR(n(s))}</span>` : ''}</button></li>`).join('');
    $('#fb').insertAdjacentHTML('beforeend', brands.map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join(''));
    $('#fb').value = st.brand;
    $('#q').value = st.q;
    // Brand-aware empty state for directory brands outside the fixture.
    function empty() {
      const b = st.brand, out = b && !D.models.some((m) => m.brand === b), c = D.brandCounts[b];
      $('#empty-h').innerHTML = out ? `طرازات ${lat(b)} غير مضمّنة في هذه المعاينة.` : 'لا توجد طرازات مطابقة في هذه المعاينة.';
      $('#empty-s').innerHTML = (out && c ? `في الكتالوج العام ${J.countAr(c, 'ref')} من ${lat(b)}. ` : '') + `تضم هذه المعاينة ${total} فقط.`;
    }
    function apply() {
      const term = st.q.trim().toLowerCase();
      const list = D.models.filter((m) => (!st.category || m.category === st.category) && (!st.brand || m.brand === st.brand) && (!term || hay(m).includes(term)));
      const pages = Math.max(1, Math.ceil(list.length / per)), shown = list.slice(0, per), c = st.category ? cat(st.category) : null;
      $('#grid').innerHTML = shown.map((m) => `<li>${card(m, 2)}</li>`).join('');
      $('#grid').hidden = !list.length;
      $('#empty').hidden = !!list.length;
      if (!list.length) empty();
      $('#count').innerHTML = list.length ? `<strong>${J.counts(shown).label}</strong>` : 'لا نتائج مطابقة';
      $('#clr').hidden = !(st.category || st.brand || term);
      $$('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === st.category)));
      $('#h1').textContent = c ? c.ar : 'الكتالوج';
      $('#crumbs').innerHTML = `<li><a href="home.html">الرئيسية</a></li>${c ? `<li><a href="catalog.html">الكتالوج</a></li><li><span aria-current="page">${c.ar}</span></li>` : '<li><span aria-current="page">الكتالوج</span></li>'}`;
      const p = new URLSearchParams();
      if (st.category) p.set('category', st.category);
      if (st.brand) p.set('brand', st.brand);
      if (st.q.trim()) p.set('q', st.q.trim());
      const qs = p.toString(), base = 'catalog.html' + (qs ? '?' + qs : '');
      $('#pager').innerHTML = list.length ? `<span class="pg-t">السابق</span><ol><li><a class="pg" href="${base}${qs ? '&' : '?'}page=1" aria-current="page" aria-label="الصفحة ${AR(1)}">${AR(1)}</a></li></ol><span class="pg-t">التالي</span><p class="pg-s">صفحة ${AR(1)} من ${AR(pages)} · حتى ${AR(per)} طرازًا في الصفحة</p>` : '';
      d.title = `${c ? c.ar + ' — ' : ''}الكتالوج · Jwleria (معاينة ج)`;
      history.replaceState(null, '', base);
    }
    $('#filters').addEventListener('submit', (e) => e.preventDefault());
    $('.fcat').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) { st.category = b.dataset.cat; apply(); } });
    $('#fb').addEventListener('change', (e) => { st.brand = e.target.value; apply(); });
    let qt;
    $('#q').addEventListener('input', (e) => { clearTimeout(qt); qt = setTimeout(() => { st.q = e.target.value; apply(); }, 160); });
    const reset = () => { st.category = st.brand = st.q = ''; $('#fb').value = ''; $('#q').value = ''; apply(); };
    $('#clr').addEventListener('click', reset);
    $('#reset').addEventListener('click', reset);
    apply();
    const on = $('.fcat [aria-pressed="true"]');
    if (on) center($('.fcat .chips'), on);
  }

  /* product */
  function product() {
    const q = J.params(), m = J.byId(q.get('model')), C = cat(m.category), SI = J.hasStandInImage(m);
    let v = J.variantOf(m, q.get('ref')), view = 0;
    let canon = $('link[rel="canonical"]');
    if (!canon) { canon = d.createElement('link'); canon.rel = 'canonical'; d.head.append(canon); }
    canon.setAttribute('href', J.url(m, J.primary(m)));
    // Related: same category only (same brand first); up to four cards.
    const oth = D.models.filter((x) => x.id !== m.id && x.category === m.category);
    const rel = oth.filter((x) => x.brand === m.brand).concat(oth.filter((x) => x.brand !== m.brand)).slice(0, 4);
    const relH = `قطع أخرى من ${C.ar}`;
    const sum = J.summaryAr(m);
    $('#main').innerHTML = `<div class="wrap">
<nav class="crumbs" aria-label="مسار التنقل"><ol><li><a href="catalog.html">الكتالوج</a></li><li><a href="catalog.html?category=${C.slug}">${C.ar}</a></li></ol></nav>
<div class="pdp">
<div class="p-head">
<p class="p-brand"><a href="catalog.html?brand=${encodeURIComponent(m.brand)}">${lat(m.brand)}</a></p>
<h1 class="p-title"><span class="p-lat">${lat(m.name)}</span><span class="p-type">${esc(m.typeAr)}${m.nameAr ? ' · ' + esc(AR(m.nameAr)) : ''}</span></h1>
          ${sum ? `<p class="p-sum">${sum}</p>` : ''}
</div>
<section class="gal${SI ? '' : ' no-rail'}" aria-label="صور المنتج">
${SI ? `<div class="rail" role="group" aria-label="مناظر الصورة">${VIEWS.map((t, i) => `<button class="th" type="button" data-view="${i}" aria-pressed="${i === 0}"><span class="th-s"><i></i></span><span>${t}</span></button>`).join('')}</div>` : ''}
<div class="pstage stage ${SI ? 'is-si' : 'is-fo'}" id="media" data-view="0"></div>
</section>
<div class="p-body">
<div class="axes" id="opts"></div>
<button class="btn btn-s cta" id="cta" type="button" data-inert aria-describedby="inq">${INQ}</button>
<p class="inq" id="inq"><span>مرجع الاستفسار</span>${refT(v.ref, 'ref')}</p>
<div class="accs"><details class="acc" open><summary>الأبعاد والخامة<span class="pm" aria-hidden="true"></span></summary><dl class="facts" id="f1"></dl></details>
<details class="acc"><summary>المرجع والمجموعة<span class="pm" aria-hidden="true"></span></summary><dl class="facts" id="f2"></dl></details></div>
<p class="sr" id="live" aria-live="polite"></p>
</div>
</div>
${rel.length ? `<section class="rel" aria-labelledby="rh"><div class="sec-h"><h2 id="rh">${relH}</h2><a class="more-l" href="catalog.html?category=${C.slug}">${C.ar} في الكتالوج</a></div><ul class="grid4">${rel.map((x) => `<li>${card(x, 3)}</li>`).join('')}</ul></section>` : ''}
</div>
<div class="actbar off" id="actbar"><button class="btn btn-s" type="button" data-inert aria-describedby="inq">${INQ}</button></div>`;

    function media() {
      const box = $('#media');
      box.dataset.view = view;
      if (SI) paintStandin(box, m, v, VIEWS[view]); else box.innerHTML = factsOnly(m, v, true);
      $$('.th').forEach((b, i) => { b.setAttribute('aria-pressed', String(i === view)); $('i', b).style.setProperty('--tone', J.toneOf(m, v)); });
    }
    function opt(k, o) {
      const t = J.nearest(m, v, k, o.id), on = v[k] === o.id, note = on ? '' : J.changeNoteAr(m, v, k, o.id);
      const a = `class="opt opt-${k}" href="${J.url(m, t)}" data-k="${k}" data-v="${esc(o.id)}"${on ? ' aria-current="true"' : ''}`;
      const nt = note ? `<small class="o-note">${esc(note)}</small>` : '';
      if (k === 'size') return `<a ${a}><span class="o-ar">${esc(o.ar)}</span>${lat(o.en, 'o-lat')}${nt}</a>`;
      return `<a ${a}><span class="o-sw${dia(o) ? ' dia' : ''}" aria-hidden="true"><i style="--tone:${o.tone}"></i></span><span class="o-ar">${esc(o.ar)}</span>${lat(o.en, 'o-lat')}${o.material ? lat(o.material, 'o-mat') : ''}${nt}</a>`;
    }
    function axis(ax) {
      const k = ax.kind, cur = J.valueOf(m, k, v[k]);
      const curL = cur ? `${esc(cur.ar)} ${lat(cur.en)}${cur.material ? ' · ' + lat(cur.material) : ''}` : '';
      const items = ax.values.map((o) => opt(k, o)).join('');
      const list = k === 'size' ? `<div class="pills">${items}</div>` : k === 'dial' ? `<div class="sc-row drow" id="dr">${items}</div>` : `<div class="ctiles">${items}</div>`;
      return `<div class="axis" data-axis="${k}" role="group" aria-labelledby="ax-${k}"><div class="axis-h"><p id="ax-${k}"><span class="axis-k">${esc(ax.label.ar)}</span><span class="axis-v">${curL}</span></p>${k === 'dial' ? scBtns('dr', 'الموانئ') : ''}</div>${list}</div>`;
    }
    function refs() {
      const sib = J.siblings(m, v);
      if (sib.length < 2) return '';
      const one = (m.axes || []).length === 1 ? m.axes[0] : '';
      const h = one === 'dial' ? 'مراجع بهذا الميناء' : one === 'color' ? 'مراجع بهذا اللون' : 'مراجع بهذه الخيارات';
      return `<div class="refs" data-axis="ref" role="group" aria-labelledby="ax-ref"><p class="refs-h" id="ax-ref">${h} <span class="refs-c">(${AR(sib.length)})</span></p><div class="rchips">${sib.map((x) => `<a class="rc" href="${J.url(m, x)}" data-ref="${esc(x.ref)}"${x.ref === v.ref ? ' aria-current="true"' : ''}>${refT(x.ref)}</a>`).join('')}</div><p class="refs-n">تختلف هذه المراجع في تفاصيل غير مذكورة هنا.</p></div>`;
    }
    function opts(focusSel) {
      const box = $('#opts'), axes = J.axesOf(m).sort((a, b) => (a.kind === 'size') - (b.kind === 'size'));
      if (!axes.length) { box.hidden = true; return; }
      const old = $('#dr'), sl = old ? old.scrollLeft : null;
      box.innerHTML = axes.map(axis).join('') + refs();
      const row = $('#dr');
      if (row) {
        scroller(row, $('.sc-prev', box), $('.sc-next', box));
        if (sl !== null) row.scrollLeft = sl; else center(row, $('[aria-current]', row));
      }
      const f = focusSel && $(focusSel, box);
      if (f) f.focus({ preventScroll: true });
    }
    function facts() {
      const sz = v.size ? J.size(m, v.size) : null, dims = sz ? sz.dims : m.dims;
      const col = v.color ? J.color(m, v.color) : null, dial = v.dial ? J.valueOf(m, 'dial', v.dial) : null;
      const row = (k, x) => `<div><dt>${k}</dt><dd>${x}</dd></div>`;
      let a = '';
      if (sz) a += row('المقاس', `${esc(sz.ar)} ${lat(sz.en, 'lv')}`);
      if (dims) a += row('الأبعاد', lat(dims, 'lv'));
      if (m.material) a += row('الخامة', `${esc(m.material.ar)} · ${lat(m.material.en, 'lv')}`);
      else if (col && col.material) a += row('الخامة', lat(col.material, 'lv'));
      (m.facts || []).forEach((f) => { a += row(esc(f.ar), fv(f.v)); });
      $('#f1').innerHTML = a || row('الأبعاد', '<span class="muted">غير منشورة بعد</span>');
      let b = row('المرجع', refT(v.ref)) + row('المجموعة', lat(m.collection, 'lv')) + row('العلامة', lat(m.brand, 'lv')) + row('الفئة', esc(C.ar));
      if (col) b += row('اللون', `${esc(col.ar)} ${lat(col.en, 'lv')}`);
      if (dial) b += row('الميناء', `${esc(dial.ar)} ${lat(dial.en, 'lv')}`);
      $('#f2').innerHTML = b;
    }
    function meta() {
      $('#ref').textContent = v.ref;
      const vals = J.axesOf(m).map((a) => J.valueOf(m, a.kind, v[a.kind])).filter(Boolean).map((x) => x.ar);
      d.title = `${m.name}${vals.length ? ' — ' + vals.join(' · ') : ''} · ${v.ref} | Jwleria`;
    }
    function render(focusSel) { media(); opts(focusSel); facts(); meta(); }

    $('#opts').addEventListener('click', (e) => {
      const a = e.target.closest('a.opt, a.rc');
      if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute('href'), ref = new URLSearchParams(href.split('?')[1]).get('ref');
      const nv = m.variants.find((x) => x.ref === ref);
      if (!nv) return;
      e.preventDefault();
      v = nv;
      render(a.classList.contains('rc') ? `.rc[data-ref="${ref}"]` : `.opt[data-k="${a.dataset.k}"][data-v="${a.dataset.v}"]`);
      history.replaceState(null, '', href);
      const vals = J.axesOf(m).map((x) => J.valueOf(m, x.kind, v[x.kind])).filter(Boolean).map((x) => x.ar);
      $('#live').textContent = `${vals.length ? vals.join('، ') + '، ' : ''}المرجع ${v.ref}`;
    });
    const rail = $('.rail');
    if (rail) rail.addEventListener('click', (e) => { const b = e.target.closest('.th'); if (b) { view = +b.dataset.view; media(); } });

    render();
    // Action bar: after the title has scrolled away, while the CTA is out of view.
    const ab = $('#actbar');
    B.classList.add('has-ab');
    if ('IntersectionObserver' in window) {
      let past = false, seen = true;
      const upd = () => ab.classList.toggle('off', !past || seen);
      new IntersectionObserver(([e]) => { past = !e.isIntersecting && e.boundingClientRect.top < 120; upd(); }, { rootMargin: '-120px 0px 0px 0px' }).observe($('.p-title'));
      new IntersectionObserver(([e]) => { seen = e.isIntersecting; upd(); }, { threshold: 0.2 }).observe($('#cta'));
    } else ab.classList.remove('off');
  }

  shell();
  ({ home, catalog, product })[PAGE]();
  if (location.hash) { const t = d.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
})();
