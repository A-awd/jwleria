/* Jwleria — design preview, direction A "الدار". Renders pages from window.JWL (fixture). Not production code. */
(function () {
  'use strict';
  var J = window.JWL, D = J.data, doc = document, ar = J.arDigits;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var lat = function (s, cls) { return '<bdi dir="ltr" lang="en"' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(s) + '</bdi>'; };
  var refH = function (r, attr) { return '<bdi class="ref" dir="ltr"' + (attr || '') + '>' + esc(r) + '</bdi>'; };
  var ISO = function (s) { return '⁨' + s + '⁩'; };
  var isLatin = function (s) { return /[A-Za-z0-9]/.test(s) && !/[؀-ۿ]/.test(s); };
  var val = function (s) { return isLatin(s) ? lat(s) : esc(s); };
  var catOf = function (slug) { return D.categories.find(function (c) { return c.slug === slug; }); };
  var slug = function (s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-'); };
  var ARROW = '<svg class="arr" viewBox="0 0 22 10" width="22" height="10" aria-hidden="true" focusable="false"><path d="M21 5H1.5M5.5 1 1.5 5l4 4"/></svg>';

  // Arabic counted nouns: 1, 2, 3–10, 11+
  function counted(n, one, two, few, many) {
    if (n === 1) return one;
    if (n === 2) return two;
    return ar(n) + ' ' + (n % 100 >= 3 && n % 100 <= 10 ? few : many);
  }
  var nColours = function (n) { return counted(n, 'لون واحد', 'لونان', 'ألوان', 'لونًا'); };
  var nSizes = function (n) { return counted(n, 'مقاس واحد', 'مقاسان', 'مقاسات', 'مقاسًا'); };
  var nModels = function (n) { return counted(n, 'طراز واحد', 'طرازان', 'طرازات', 'طرازًا'); };

  /* ---------- Placeholder imagery ---------- */
  function rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return A.map(function (v, i) { return Math.round(v * (1 - t) + B[i] * t); }); }
  function lum(c) { c = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  var css = function (c) { return 'rgb(' + c.join(',') + ')'; };
  function phVars(tone) {
    var inner = mix(tone, '#ffffff', 0.5), outer = mix(tone, '#faf7f2', 0.2);
    var bg = 'radial-gradient(120% 90% at 50% 34%, ' + css(inner) + ' 0%, ' + css(outer) + ' 100%)';
    var ink = lum(mix(tone, '#ffffff', 0.35)) < 0.3 ? 'rgba(255,255,255,.62)' : 'rgba(27,25,21,.34)';
    return '--ph-bg:' + bg + ';--ph-ink:' + ink;
  }
  var ICONS = {
    bag: '<path d="M44 47c0-15 32-15 32 0"/><path d="M30 47h60l6 50H24z"/><path d="M30 58h60" opacity=".5"/>',
    watch: '<path d="M49 17h22l-2 19H51zM51 84h18l2 19H49z"/><circle cx="60" cy="60" r="25"/><circle cx="60" cy="60" r="20" opacity=".55"/><path d="M60 60V47M60 60l8 5M85 57h4v6h-4"/>',
    luggage: '<rect x="34" y="34" width="52" height="64" rx="6"/><path d="M50 34V23h20v11M48 44v44M72 44v44"/><circle cx="43" cy="102" r="3"/><circle cx="77" cy="102" r="3"/>',
    ring: '<circle cx="60" cy="68" r="24"/><path d="M51 42l9-11 9 11-9 7z"/>',
  };
  function iconFor(m) {
    if (m.category === 'watches') return 'watch';
    if (m.category === 'luggage') return 'luggage';
    if (m.category === 'jewelry' || m.category === 'bracelets') return 'ring';
    return 'bag';
  }
  function colourOf(m, v) { return v && v.color ? J.color(m, v.color) : null; }
  function phLabel(m, v, view) {
    var c = colourOf(m, v);
    return m.name + (c ? '، ' + c.ar : '') + (view ? '، منظر ' + view : '') + ' — صورة مؤقتة';
  }
  function ph(m, v, view, mod) {
    return '<div class="ph' + (mod ? ' ph--' + mod : '') + '" role="img" aria-label="' + esc(phLabel(m, v, view)) + '" style="' + phVars(J.toneOf(m, v)) + '">' +
      '<svg class="ph-icon" viewBox="0 0 120 120" aria-hidden="true" focusable="false">' + ICONS[iconFor(m)] + '</svg>' +
      '<span class="ph-chip" aria-hidden="true"><span>مكان الصورة الأصلية' + (view ? ' · ' + view : '') + '</span>' + refH(v.ref, ' data-ref') + '</span></div>';
  }

  /* ---------- Model card (one per model) ---------- */
  var url = function (m, ref) { return 'product.html?model=' + encodeURIComponent(m.id) + '&ref=' + encodeURIComponent(ref); };
  function firstOfColour(m, cid) { return J.find(m, J.variantOf(m).size, cid) || J.find(m, null, cid); }
  function summary(m) {
    var parts = [], nc = (m.colors || []).length, ns = (m.sizes || []).length;
    if (nc > 1) parts.push(nColours(nc));
    if (ns > 1) parts.push(nSizes(ns));
    if (!parts.length) parts.push(m.variants.length === 1 ? 'مرجع واحد' : counted(m.variants.length, 'مرجع واحد', 'مرجعان', 'مراجع', 'مرجعًا'));
    return parts.join(' · ');
  }
  function card(m, colourSlug) {
    var v = J.variantOf(m);
    if (colourSlug) {
      var c = (m.colors || []).find(function (x) { return slug(x.en) === colourSlug; });
      if (c) v = firstOfColour(m, c.id) || v;
    }
    var dots = (m.colors || []).length > 1 ? '<span class="dots">' + m.colors.map(function (c) {
      var cv = firstOfColour(m, c.id);
      return '<a class="dot" href="' + url(m, cv.ref) + '" style="--c:' + c.tone + '" aria-label="' + esc(m.name + '، اللون ' + c.ar) + '" title="' + esc(c.ar) + '"><i></i></a>';
    }).join('') + '</span>' : '';
    return '<article class="card">' + ph(m, v) +
      '<div class="card-body"><p class="card-brand">' + lat(m.brand) + '</p>' +
      '<h3 class="card-title"><a href="' + url(m, v.ref) + '">' + lat(m.name) + '</a></h3>' +
      '<p class="card-type">' + esc(m.typeAr) + '</p>' +
      '<div class="card-meta">' + dots + '<span>' + summary(m) + '</span></div></div></article>';
  }

  /* ---------- Chrome: toast, preview-only links, search, menu, compact header ---------- */
  var toastEl = $('[data-toast]'), toastT;
  function toast(msg) {
    clearTimeout(toastT);
    toastEl.textContent = msg;
    requestAnimationFrame(function () { toastEl.classList.add('show'); });
    toastT = setTimeout(function () { toastEl.classList.remove('show'); setTimeout(function () { toastEl.textContent = ''; }, 350); }, 2400);
  }
  doc.addEventListener('click', function (e) {
    var t = e.target.closest('[data-preview]');
    if (t) { e.preventDefault(); toast('معاينة تصميم فقط'); }
  });

  $$('[data-cat-links]').forEach(function (ul) {
    ul.innerHTML = D.categories.map(function (c) { return '<li><a href="catalog.html?category=' + c.slug + '">' + esc(c.ar) + '</a></li>'; }).join('');
  });

  var header = $('[data-header]'), panel = $('#search-panel'), searchBtns = $$('[data-search-toggle]'), lastSearchBtn;
  function setSearch(open, from) {
    panel.hidden = !open;
    searchBtns.forEach(function (b) { b.setAttribute('aria-expanded', String(open)); });
    if (open) { lastSearchBtn = from; $('input', panel).focus(); }
    else if (lastSearchBtn) lastSearchBtn.focus();
  }
  searchBtns.forEach(function (b) { b.addEventListener('click', function () { setSearch(panel.hidden, b); }); });
  $('[data-search-close]').addEventListener('click', function () { setSearch(false); });

  var menu = $('#site-menu'), menuBtn = $('[data-menu-open]');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    doc.body.classList.toggle('menu-open', open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
      $('[data-menu-close]').focus();
    } else {
      menu.classList.remove('is-open');
      menu.hidden = true;
      menuBtn.focus();
    }
  }
  menuBtn.addEventListener('click', function () { setMenu(true); });
  $('[data-menu-close]').addEventListener('click', function () { setMenu(false); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a[href]:not([data-preview])')) { menuBtn.setAttribute('aria-expanded', 'false'); doc.body.classList.remove('menu-open'); menu.hidden = true; } });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!menu.hidden) setMenu(false);
      else if (!panel.hidden) setSearch(false);
    }
    if (e.key === 'Tab' && !menu.hidden) {
      var f = $$('a[href], button', menu), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  var mast = $('.masthead'), wide = matchMedia('(min-width: 760px)'), ticking = false;
  function compact() {
    ticking = false;
    var on = wide.matches && window.scrollY > header.offsetTop + mast.offsetHeight - 2;
    header.classList.toggle('is-compact', on);
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(compact); } }, { passive: true });
  compact();

  /* ---------- Radio groups (variant selectors) ---------- */
  function radioGroup(group, onPick) {
    group.addEventListener('click', function (e) {
      var b = e.target.closest('[role="radio"]');
      if (b && b.getAttribute('aria-disabled') !== 'true') onPick(b);
    });
    group.addEventListener('keydown', function (e) {
      var all = $$('[role="radio"]', group), i = all.indexOf(doc.activeElement);
      if (i < 0) return;
      var rtl = getComputedStyle(group).direction === 'rtl', k = e.key, step = 0;
      if (k === 'ArrowDown' || k === (rtl ? 'ArrowLeft' : 'ArrowRight')) step = 1;
      else if (k === 'ArrowUp' || k === (rtl ? 'ArrowRight' : 'ArrowLeft')) step = -1;
      else if (k === 'Home') { i = -1; step = 1; }
      else if (k === 'End') { i = all.length; step = -1; }
      else if (k === ' ' || k === 'Enter') { e.preventDefault(); if (all[i].getAttribute('aria-disabled') !== 'true') onPick(all[i]); return; }
      else return;
      e.preventDefault();
      for (var n = 1; n <= all.length; n++) {
        var j = ((i + step * n) % all.length + all.length) % all.length;
        if (all[j].getAttribute('aria-disabled') !== 'true') { all[j].focus(); onPick(all[j]); return; }
      }
    });
  }

  /* ---------- Pages ---------- */
  var page = doc.body.getAttribute('data-page');

  if (page === 'home') {
    var names = D.brands.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('');
    $('[data-marquee]').innerHTML = '<div class="marquee-inner"><ul lang="en">' + names + '</ul><ul lang="en" aria-hidden="true">' + names + '</ul></div>';
    var band = $('[data-marquee-band]'), mt = $('[data-marquee-toggle]');
    mt.addEventListener('click', function () {
      var p = band.classList.toggle('is-paused');
      $('[data-marquee-label]').textContent = p ? 'تشغيل الحركة' : 'إيقاف الحركة';
    });

    $$('[data-story-brands]').forEach(function (el) {
      var s = el.getAttribute('data-story-brands'), seen = [];
      D.models.forEach(function (m) { if (m.category === s && seen.indexOf(m.brand) < 0) seen.push(m.brand); });
      el.innerHTML = seen.map(function (b) { return lat(b); }).join('');
    });
    $('[data-cat-index]').innerHTML = D.categories.map(function (c, i) {
      return '<li><a href="catalog.html?category=' + c.slug + '"><span class="n">' + ar(String(i + 1).padStart(2, '0')) + '</span><span class="t">' + esc(c.ar) + '</span></a></li>';
    }).join('');
    $('[data-featured]').innerHTML = ['longchamp-le-pliage-one-handbag', 'audemars-piguet-royal-oak-15202or', 'loewe-puzzle-large']
      .map(function (id) { return card(J.byId(id)); }).join('');

    var groups = {};
    D.brands.slice().sort(function (a, b) { return a.localeCompare(b, 'en', { sensitivity: 'base' }); }).forEach(function (b) {
      var L = b[0].toUpperCase(); (groups[L] = groups[L] || []).push(b);
    });
    $('[data-brand-index]').innerHTML = Object.keys(groups).map(function (L) {
      return '<div class="bgroup"><span class="bgroup-letter" aria-hidden="true">' + L + '</span><ul>' + groups[L].map(function (b) {
        var n = D.brandCounts[b];
        return '<li><a href="catalog.html?brand=' + encodeURIComponent(b) + '">' + lat(b) + (n ? '<span class="bcount"><span class="sr-only">عدد المراجع: </span>' + ar(n) + '</span>' : '') + '</a></li>';
      }).join('') + '</ul></div>';
    }).join('');
  }

  if (page === 'catalog') {
    var PER = 48, state = {};
    var f = { brand: $('[data-f="brand"]'), color: $('[data-f="color"]'), q: $('[data-f="q"]') };
    var inFixture = [];
    D.models.forEach(function (m) { if (inFixture.indexOf(m.brand) < 0) inFixture.push(m.brand); });
    inFixture.sort();
    var opt = function (v, t) { return '<option value="' + esc(v) + '">' + esc(t) + '‎</option>'; };
    f.brand.innerHTML = '<option value="">كل العلامات</option><optgroup label="في هذه المعاينة">' + inFixture.map(function (b) { return opt(b, b); }).join('') +
      '</optgroup><optgroup label="علامات أخرى في الدليل">' + D.brands.filter(function (b) { return inFixture.indexOf(b) < 0; }).map(function (b) { return opt(b, b); }).join('') + '</optgroup>';
    var colours = [];
    D.models.forEach(function (m) { (m.colors || []).forEach(function (c) { if (!colours.some(function (x) { return x.en === c.en; })) colours.push(c); }); });
    f.color.innerHTML = '<option value="">كل الألوان</option>' + colours.map(function (c) { return '<option value="' + slug(c.en) + '">' + esc(c.ar) + '</option>'; }).join('');

    var read = function () {
      var p = J.params();
      state = { category: p.get('category') || '', brand: p.get('brand') || '', color: p.get('color') || '', q: p.get('q') || '', page: Math.max(1, parseInt(p.get('page'), 10) || 1) };
      if (state.category && !catOf(state.category)) state.category = '';
      if (state.brand && D.brands.indexOf(state.brand) < 0) state.brand = '';
      f.brand.value = state.brand; f.color.value = state.color; f.q.value = state.q;
      if (f.color.value !== state.color) state.color = '';
    };
    var write = function () {
      var p = new URLSearchParams();
      ['category', 'brand', 'color', 'q'].forEach(function (k) { if (state[k]) p.set(k, state[k]); });
      if (state.page > 1) p.set('page', state.page);
      var qs = p.toString();
      history.replaceState(null, '', qs ? '?' + qs : location.pathname);
    };
    var matches = function (m) {
      if (state.category && m.category !== state.category) return false;
      if (state.brand && m.brand !== state.brand) return false;
      if (state.color && !(m.colors || []).some(function (c) { return slug(c.en) === state.color; })) return false;
      if (state.q) {
        var hay = [m.brand, m.name, m.nameAr || '', m.typeAr, m.collection || '', catOf(m.category).ar]
          .concat(m.variants.map(function (v) { return v.ref; }), (m.colors || []).map(function (c) { return c.ar + ' ' + c.en; })).join(' ').toLowerCase();
        return state.q.toLowerCase().trim().split(/\s+/).every(function (t) { return hay.indexOf(t) > -1; });
      }
      return true;
    };
    var render = function () {
      var cat = catOf(state.category);
      $('[data-cat-tabs]').innerHTML = [{ slug: '', ar: 'الكل' }].concat(D.categories).map(function (c) {
        return '<li><a href="catalog.html' + (c.slug ? '?category=' + c.slug : '') + '" data-cat="' + c.slug + '" aria-current="' + (c.slug === state.category) + '">' + esc(c.ar) + '</a></li>';
      }).join('');
      $('[data-title]').textContent = cat ? cat.ar : 'الكتالوج';
      $('[data-crumbs]').innerHTML = '<li><a href="home.html">الرئيسية</a></li>' + (cat ? '<li><a href="catalog.html">الكتالوج</a></li><li><span aria-current="page">' + esc(cat.ar) + '</span></li>' : '<li><span aria-current="page">الكتالوج</span></li>');
      doc.title = (cat ? cat.ar + ' · ' : '') + 'الكتالوج · ' + ISO('Jwleria');

      var list = D.models.filter(matches), pages = Math.max(1, Math.ceil(list.length / PER));
      state.page = Math.min(state.page, pages);
      var shown = list.slice((state.page - 1) * PER, state.page * PER);
      $('[data-count]').textContent = list.length ? nModels(list.length) : 'لا توجد طرازات';
      $('[data-results]').innerHTML = shown.length ? shown.map(function (m) { return card(m, state.color); }).join('') :
        '<div class="empty"><p class="empty-title">لا توجد طرازات مطابقة</p><p>تضم هذه المعاينة عشرة طرازات للتوضيح فقط. يمكن تعديل عوامل التصفية أو مسحها.</p><button class="clear-btn" type="button" data-clear>مسح عوامل التصفية</button></div>';
      var any = state.category || state.brand || state.color || state.q;
      $('.filter-line [data-clear]').hidden = !any;

      var nums = '';
      for (var i = 1; i <= pages; i++) nums += '<li>' + (i === state.page ? '<span class="pager-num" aria-current="page">' + ar(i) + '</span>' : '<a class="pager-num" href="?page=' + i + '" data-page="' + i + '">' + ar(i) + '</a>') + '</li>';
      $('[data-pager]').innerHTML = shown.length ? '<button class="pager-step prev" type="button" data-step="-1"' + (state.page === 1 ? ' disabled' : '') + '>' + ARROW + 'السابق</button><ol>' + nums +
        '</ol><button class="pager-step next" type="button" data-step="1"' + (state.page === pages ? ' disabled' : '') + '>التالي' + ARROW + '</button>' : '';
      var note = $('.pager-note') || doc.createElement('p');
      note.className = 'pager-note';
      note.textContent = shown.length ? 'الصفحة ' + ar(state.page) + ' من ' + ar(pages) + ' · حتى ' + ar(PER) + ' طرازًا في الصفحة' : '';
      $('[data-pager]').after(note);
    };
    var update = function () { write(); render(); };

    read(); render();
    $('[data-cat-tabs]').addEventListener('click', function (e) {
      var a = e.target.closest('a[data-cat]'); if (!a) return;
      e.preventDefault(); state.category = a.getAttribute('data-cat'); state.page = 1; update();
      var cur = $('[data-cat-tabs] a[aria-current="true"]'); if (cur) cur.focus();
    });
    f.brand.addEventListener('change', function () { state.brand = f.brand.value; state.page = 1; update(); });
    f.color.addEventListener('change', function () { state.color = f.color.value; state.page = 1; update(); });
    var qt;
    f.q.addEventListener('input', function () { clearTimeout(qt); qt = setTimeout(function () { state.q = f.q.value.trim(); state.page = 1; update(); }, 160); });
    $('[data-filters]').addEventListener('submit', function (e) { e.preventDefault(); state.q = f.q.value.trim(); update(); });
    doc.addEventListener('click', function (e) {
      if (e.target.closest('[data-clear]')) {
        state = { category: '', brand: '', color: '', q: '', page: 1 };
        f.brand.value = ''; f.color.value = ''; f.q.value = ''; update(); f.brand.focus();
      }
      var s = e.target.closest('[data-step]'), pg = e.target.closest('a[data-page]');
      if (s) { state.page += +s.getAttribute('data-step'); update(); }
      if (pg) { e.preventDefault(); state.page = +pg.getAttribute('data-page'); update(); }
    });
    window.addEventListener('popstate', function () { read(); render(); });
  }

  if (page === 'product') {
    var p = J.params(), M = p.get('model') ? J.byId(p.get('model')) : null, qref = p.get('ref');
    if (!M && qref) M = D.models.find(function (m) { return m.variants.some(function (v) { return v.ref === qref; }); });
    M = M || D.models[0];
    var V = J.variantOf(M, qref), cat = catOf(M.category);
    var cols = M.colors || [], sizes = (M.sizes || []).filter(function (s) { return M.variants.some(function (v) { return v.size === s.id; }); });
    var multiC = cols.length > 1, multiS = sizes.length > 1;
    var VIEWS = [['أمامي', ''], ['جانبي', 'side'], ['تفاصيل', 'detail']];

    $('[data-crumbs]').innerHTML = '<li><a href="catalog.html">الكتالوج</a></li><li><a href="catalog.html?category=' + cat.slug + '">' + esc(cat.ar) + '</a></li>';

    var colourV = function (c) { return esc(c.ar) + (c.material ? '<span class="sep">·</span>' + lat(c.material) : ''); };
    var sizeV = function (s) { return esc(s.ar) + ' ' + lat(s.en); };
    var opts = '';
    if (multiC) {
      opts += '<div class="opt"><p class="opt-head"><span class="opt-k" id="c-k">' + esc(M.colorLabel ? M.colorLabel.ar : 'اللون') + '</span><span class="opt-v" data-cv></span></p>' +
        '<div class="swatches" role="radiogroup" aria-labelledby="c-k" data-colors>' + cols.map(function (c) {
          return '<button class="swatch" type="button" role="radio" aria-checked="false" tabindex="-1" data-id="' + c.id + '" style="--c:' + c.tone + '" aria-label="' + esc(c.ar + (c.material ? '، ' + c.material : '')) + '" title="' + esc(c.ar) + '"><i></i></button>';
        }).join('') + '</div><span id="c-why" hidden>لا يوجد مرجع لهذا اللون بالمقاس المحدد</span><p class="opt-note" data-cnote hidden>الألوان المشطوبة غير موجودة بالمقاس المحدد.</p></div>';
    }
    if (multiS) {
      opts += '<div class="opt"><p class="opt-head"><span class="opt-k" id="s-k">المقاس</span><span class="opt-v" data-sv></span></p>' +
        '<div class="sizes" role="radiogroup" aria-labelledby="s-k" data-sizes>' + sizes.map(function (s) {
          return '<button class="size" type="button" role="radio" aria-checked="false" tabindex="-1" data-id="' + s.id + '"><span>' + esc(s.ar) + '</span>' + lat(s.en) + '</button>';
        }).join('') + '</div><span id="s-why" hidden>لا يوجد مرجع لهذا المقاس باللون المحدد</span></div>';
    }
    if (!multiC && cols.length === 1) opts += '<div class="opt"><p class="opt-head"><span class="opt-k">اللون</span><span class="opt-v">' + colourV(cols[0]) + '</span></p></div>';

    $('[data-pdp]').innerHTML =
      '<div class="gallery-wrap"><div class="gallery" data-gallery tabindex="-1">' + VIEWS.map(function (w) {
        return '<figure class="slide">' + ph(M, V, w[0], w[1]) + '</figure>';
      }).join('') + '</div><p class="gallery-count" aria-hidden="true"><span data-gi>١</span> / ' + ar(VIEWS.length) + '</p></div>' +
      '<div class="pdp-info">' +
      '<a class="pdp-brand" href="catalog.html?brand=' + encodeURIComponent(M.brand) + '">' + lat(M.brand) + '</a>' +
      '<h1 class="pdp-title">' + lat(M.name) + '</h1>' +
      '<p class="pdp-type">' + esc(M.typeAr + (M.nameAr ? ' ' + M.nameAr : '')) + '</p>' +
      (M.collection ? '<p class="pdp-coll"><span>المجموعة</span>' + lat(M.collection) + '</p>' : '') +
      '<div class="opts">' + opts + '<div class="pdp-ref"><span>المرجع</span>' + refH(V.ref, ' data-ref') + '</div></div>' +
      '<button class="cta" type="button" data-preview>التواصل عبر واتساب لمعرفة السعر</button>' +
      '<p class="indep"><bdi>Jwleria</bdi> جهة مستقلة، غير تابعة لهذه العلامات ولا تمثلها.</p>' +
      '<dl class="facts" data-facts></dl><p class="sr-only" aria-live="polite" data-status></p></div>';

    var facts = function () {
      var rows = [], s = V.size && J.size(M, V.size), c = colourOf(M, V);
      if (!multiS && s) rows.push(['المقاس', sizeV(s)]);
      var dims = (s && s.dims) || M.dims;
      if (dims) rows.push(['الأبعاد', lat(dims)]);
      if (M.material) rows.push(['المادة', esc(M.material.ar) + '<span class="sep">·</span>' + lat(M.material.en)]);
      else if (c && c.material) rows.push(['المادة', lat(c.material)]);
      (M.facts || []).forEach(function (x) { rows.push([x.ar, val(x.v)]); });
      rows.push(['الفئة', esc(cat.ar)]);
      $('[data-facts]').innerHTML = rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>'; }).join('');
    };

    var sync = function (announce) {
      var c = colourOf(M, V), s = V.size && J.size(M, V.size);
      if (multiC) {
        $$('[data-colors] [role="radio"]').forEach(function (b) {
          var id = b.getAttribute('data-id'), on = id === V.color, ok = !multiS || !!J.find(M, V.size, id);
          b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
          if (ok) { b.removeAttribute('aria-disabled'); b.removeAttribute('aria-describedby'); }
          else { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-describedby', 'c-why'); }
        });
        $('[data-cv]').innerHTML = colourV(c);
        $('[data-cnote]').hidden = !$('[data-colors] [aria-disabled="true"]');
      }
      if (multiS) {
        $$('[data-sizes] [role="radio"]').forEach(function (b) {
          var on = b.getAttribute('data-id') === V.size;
          b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
        });
        $('[data-sv]').innerHTML = sizeV(s);
      }
      $$('[data-pdp] [data-ref]').forEach(function (r) { r.textContent = V.ref; });
      $$('[data-gallery] .ph').forEach(function (el, i) {
        el.setAttribute('style', phVars(J.toneOf(M, V)));
        el.setAttribute('aria-label', phLabel(M, V, VIEWS[i][0]));
      });
      facts();
      doc.title = M.typeAr + ' ' + ISO(M.name) + (c ? ' · ' + c.ar : '') + (s && multiS ? '، ' + s.ar : '') + ' — ' + ISO(M.brand) + ' · ' + ISO('Jwleria');
      history.replaceState(null, '', '?model=' + encodeURIComponent(M.id) + '&ref=' + encodeURIComponent(V.ref));
      if (announce) $('[data-status]').textContent = (c ? c.ar : '') + (s && multiS ? '، ' + s.ar : '') + ' · المرجع ' + V.ref;
    };
    var pick = function (v) { if (v && v !== V) { V = v; sync(true); } };
    if (multiC) radioGroup($('[data-colors]'), function (b) { var id = b.getAttribute('data-id'); pick(J.find(M, V.size, id) || J.find(M, null, id)); });
    if (multiS) radioGroup($('[data-sizes]'), function (b) { var id = b.getAttribute('data-id'); pick(J.find(M, id, V.color) || J.find(M, id, null)); });
    sync(false);

    // Mobile swipe gallery counter
    var gal = $('[data-gallery]'), gi = $('[data-gi]');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) gi.textContent = ar($$('.slide', gal).indexOf(en.target) + 1); });
      }, { root: gal, threshold: 0.6 });
      $$('.slide', gal).forEach(function (s) { io.observe(s); });
    }

    // Other models: same brand first, otherwise same category (still one card per model)
    var rel = D.models.filter(function (m) { return m.brand === M.brand && m.id !== M.id; }), relTitle;
    if (rel.length) relTitle = 'قطع أخرى من ' + lat(M.brand);
    else { rel = D.models.filter(function (m) { return m.category === M.category && m.id !== M.id; }); relTitle = 'من الفئة نفسها'; }
    $('[data-related]').innerHTML = rel.length ? '<div class="wrap"><div class="section-head"><h2 class="h2" id="related-title">' + relTitle + '</h2><a class="text-link" href="catalog.html?' +
      (rel[0].brand === M.brand ? 'brand=' + encodeURIComponent(M.brand) : 'category=' + M.category) + '">عرض الكل' + ARROW + '</a></div><div class="grid">' +
      rel.slice(0, 3).map(function (m) { return card(m); }).join('') + '</div></div>' : '';
  }
})();
