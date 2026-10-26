/* Jwleria — Direction B «الفهرس». Design preview only.
   Renders every page client-side from window.JWL (../shared/catalog-data.js). */
(function () {
  'use strict';
  var J = window.JWL, D = J.data, A = J.arDigits;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  /* Latin run, always isolated */
  var L = function (s, cls) { return '<bdi lang="en" dir="ltr"' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(s) + '</bdi>'; };
  /* Mixed value: isolate only when it carries Latin letters */
  var V = function (s) { return /[A-Za-z]/.test(s) ? L(s) : esc(s); };
  var enc = encodeURIComponent;
  var FSI = '⁨', PDI = '⁩';
  var CAT = {}; D.categories.forEach(function (c) { CAT[c.slug] = c; });
  var F = {
    col: ['لون واحد', 'لونان', 'ألوان', 'لونًا'],
    size: ['مقاس واحد', 'مقاسان', 'مقاسات', 'مقاسًا'],
    model: ['طراز واحد', 'طرازان', 'طرازات', 'طرازًا'],
    ref: ['مرجع واحد', 'مرجعان', 'مراجع', 'مرجعًا']
  };
  function plural(n, f) { return n === 1 ? f[0] : n === 2 ? f[1] : A(n) + ' ' + (n >= 3 && n <= 10 ? f[2] : f[3]); }
  function url(m, ref) { return 'product.html?model=' + enc(m.id) + '&ref=' + enc(ref || m.defaultRef); }

  /* ——— icons ——— */
  var sv = function (vb, d, sw) { return '<svg viewBox="0 0 ' + vb + ' ' + vb + '" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.5) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>'; };
  var I = {
    search: sv(20, '<circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/>'),
    menu: sv(20, '<path d="M3 6.5h14M3 10h14M3 13.5h14"/>', 1.4),
    x: sv(16, '<path d="m3.5 3.5 9 9m0-9-9 9"/>', 1.4),
    chev: '<svg class="chev" viewBox="0 0 10 10" aria-hidden="true" focusable="false"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
    arrow: sv(20, '<path d="M16 10H4m4.5-4.5L4 10l4.5 4.5"/>', 1.3),
    filter: sv(20, '<path d="M3 6h14M5.5 10h9M8 14h4"/>', 1.4)
  };
  var GLYPH = {
    bag: '<path d="M14.5 18h19l2.2 22.5H12.3z"/><path d="M19 18v-3.2a5 5 0 0 1 10 0V18"/>',
    watch: '<circle cx="24" cy="24" r="9"/><circle cx="24" cy="24" r="6.4" stroke-opacity=".6"/><path d="M19.6 16.2 20.6 7h6.8l1 9.2M19.6 31.8l1 9.2h6.8l1-9.2M24 20.2V24l2.6 1.6M33 22.6h1.6v2.8H33"/>',
    lug: '<rect x="14" y="14" width="20" height="26" rx="2.6"/><path d="M20 14V8.5h8V14M20 19.5v15M28 19.5v15M18 40v2.4M30 40v2.4"/>'
  };
  function glyph(m) { var k = m.category === 'watches' ? 'watch' : m.category === 'luggage' ? 'lug' : 'bag'; return sv(48, GLYPH[k], 1.1); }

  /* ——— placeholder tint ——— */
  function rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function mix(h, p) { return '#' + rgb(h).map(function (v) { return Math.round(v * p + 255 * (1 - p)).toString(16).padStart(2, '0'); }).join(''); }
  function lum(h) { var c = rgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function tone(m, v) { var t = J.toneOf(m, v), b = mix(t, 0.9); return { a: mix(t, 0.66), b: b, dk: lum(b) < 0.2 }; }
  function phLabel(m, v, view) { var c = J.color(m, v.color); return m.name + (c ? '، ' + c.ar : '') + (view ? '، ' + view : '') + ' — صورة مؤقتة'; }
  function ph(m, v, view) {
    var t = tone(m, v);
    return '<div class="ph' + (t.dk ? ' dk' : '') + '" role="img" aria-label="' + esc(phLabel(m, v, view)) + '" style="--a:' + t.a + ';--b:' + t.b + '">' + glyph(m) +
      '<span class="ph-l" aria-hidden="true"><span>مكان الصورة الأصلية' + (view ? ' · ' + view : '') + '</span>' + L(v.ref, 'ref') + '</span></div>';
  }
  function paint(el, m, v, view) {
    var t = tone(m, v);
    el.style.setProperty('--a', t.a); el.style.setProperty('--b', t.b); el.classList.toggle('dk', t.dk);
    el.setAttribute('aria-label', phLabel(m, v, view)); $('.ref', el).textContent = v.ref;
  }

  /* ——— model card: one per model ——— */
  function summary(m) {
    var cs = m.colors || [], ss = m.sizes || [];
    if (m.variants.length === 1) return 'مرجع واحد';
    return [cs.length > 1 && plural(cs.length, F.col), ss.length > 1 && plural(ss.length, F.size)].filter(Boolean).join(' · ');
  }
  function card(m) {
    var cs = m.colors || [], v = J.variantOf(m, m.defaultRef);
    var dots = cs.length > 1 ? '<span class="dots" aria-hidden="true">' + cs.slice(0, 4).map(function (c) { return '<i style="background:' + c.tone + '"></i>'; }).join('') +
      (cs.length > 4 ? '<em>+' + A(cs.length - 4) + '</em>' : '') + '</span>' : '';
    return '<article class="card">' + ph(m, v) + '<div class="card-b"><p class="card-brand">' + L(m.brand) + '</p>' +
      '<h3 class="card-name"><a href="' + url(m) + '">' + L(m.name) + '</a></h3><p class="card-type">' + esc(m.typeAr) + '</p>' +
      '<p class="card-v">' + dots + '<span>' + summary(m) + '</span></p></div></article>';
  }

  /* ——— brand A–Z ——— */
  var LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  var GROUPS = {}; D.brands.forEach(function (b) { var l = b[0].toUpperCase(); (GROUPS[l] = GROUPS[l] || []).push(b); });
  function azLetters(prefix, asFilter) {
    var items = LET.map(function (l) {
      if (!GROUPS[l]) return '<span lang="en" aria-hidden="true">' + l + '</span>';
      return asFilter ? '<button type="button" lang="en" aria-pressed="false" data-l="' + l + '">' + l + '</button>' : '<a href="#' + prefix + '-' + l + '" lang="en">' + l + '</a>';
    }).join('');
    return asFilter ? '<div class="az-l" role="group" aria-label="تصفية العلامات حسب الحرف"><button type="button" class="all" aria-pressed="true" data-l="">الكل</button>' + items + '</div>'
      : '<nav class="az-l" aria-label="الانتقال إلى حرف">' + items + '</nav>';
  }
  function azCols(prefix, tag) {
    return '<div class="az-c">' + Object.keys(GROUPS).sort().map(function (l) {
      return '<div class="az-g" id="' + prefix + '-' + l + '" data-l="' + l + '"><' + tag + ' class="az-h" lang="en">' + l + '</' + tag + '><ul>' +
        GROUPS[l].map(function (b) {
          var n = D.brandCounts[b];
          return '<li><a href="catalog.html?brand=' + enc(b) + '">' + L(b) + (n ? '<span class="n"><span class="vh">، المراجع المنشورة: </span>' + A(n) + '</span>' : '') + '</a></li>';
        }).join('') + '</ul></div>';
    }).join('') + '</div>';
  }
  var TOPS = Object.keys(D.brandCounts).sort(function (a, b) { return D.brandCounts[b] - D.brandCounts[a]; });

  /* ——— header / drawer / footer ——— */
  var page = document.body.getAttribute('data-page');
  var P0 = J.params();
  function header() {
    var cats = P0.getAll('category');
    var curCat = page === 'catalog' && cats.length === 1 && !P0.getAll('brand').length ? cats[0] : '';
    var cur = function (c) { return c ? ' aria-current="page"' : ''; };
    var q = page === 'catalog' ? esc(P0.get('q') || '') : '';
    var srch = function (id) {
      return '<form class="srch" role="search" action="catalog.html"><label class="vh" for="' + id + '">البحث في الكتالوج</label>' +
        '<input id="' + id + '" name="q" type="search" placeholder="علامة، طراز أو مرجع" autocomplete="off" value="' + q + '">' + I.search + '</form>';
    };
    var QC = ['watches', 'jewelry', 'handbags', 'leather-goods', 'luggage'];
    $('#hd').innerHTML =
      '<div class="wrap hd-row">' +
        '<a class="wm" href="home.html"><bdi lang="en">Jwleria</bdi><span class="vh"> — الرئيسية</span></a>' +
        '<nav class="nav" aria-label="التنقل الرئيسي"><ul>' +
          '<li><button type="button" class="dd" aria-expanded="false" aria-controls="p-brands">العلامات' + I.chev + '</button></li>' +
          QC.map(function (s) { return '<li class="q"><a href="catalog.html?category=' + s + '"' + cur(curCat === s) + '>' + CAT[s].ar + '</a></li>'; }).join('') +
          '<li><button type="button" class="dd" aria-expanded="false" aria-controls="p-cats">الفئات' + I.chev + '</button></li>' +
          '<li><a href="catalog.html"' + cur(page === 'catalog' && QC.indexOf(curCat) < 0) + '>الكتالوج</a></li>' +
          '<li><a href="#about">عن <bdi>Jwleria</bdi></a></li>' +
        '</ul></nav>' +
        '<div class="hd-end">' + srch('q1') +
          '<a class="lang" href="#" lang="en" hreflang="en" data-inert>English</a>' +
          '<button type="button" class="ib ib-s" aria-expanded="false" aria-controls="msrch" aria-label="البحث">' + I.search + '</button>' +
          '<button type="button" class="ib ib-m" aria-expanded="false" aria-controls="drawer" aria-label="القائمة">' + I.menu + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="msrch" id="msrch" hidden><div class="wrap">' + srch('q2') + '</div></div>' +
      '<div class="mega" id="p-brands" hidden><div class="wrap mega-in"><div>' +
        '<div class="mega-hd"><p class="mega-t">العلامات من ' + L('A') + ' إلى ' + L('Z') + ' <span class="mega-m">· ' + A(D.brands.length) + ' علامة في الدليل</span></p><a class="lnk" href="home.html#az">الفهرس الكامل</a></div>' +
        azLetters('mb', true) + azCols('mb', 'span') +
      '</div><div class="mega-side"><p class="mega-t">مراجع منشورة</p><p class="mega-m">عدد المراجع لكل علامة في الكتالوج العام</p><ul class="tops">' +
        TOPS.map(function (b) { return '<li><a href="catalog.html?brand=' + enc(b) + '">' + L(b) + '<span class="n">' + A(D.brandCounts[b]) + '</span></a></li>'; }).join('') +
      '</ul></div></div></div>' +
      '<div class="mega" id="p-cats" hidden><div class="wrap mega-in solo">' +
        '<div class="mega-hd"><p class="mega-t">الفئات <span class="mega-m">· ' + A(D.categories.length) + ' فئات</span></p><a class="lnk" href="catalog.html">الكتالوج كاملًا</a></div>' +
        '<ul class="mega-cats">' + D.categories.map(function (c) { return '<li><a href="catalog.html?category=' + c.slug + '"><span class="c-ar">' + c.ar + '</span><span class="c-en" lang="en">' + c.en + '</span></a></li>'; }).join('') + '</ul>' +
      '</div></div>';

    var dr = document.createElement('div');
    dr.innerHTML = '<div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-t" hidden><div class="scrim" data-close></div><div class="drawer-p">' +
      '<div class="drawer-hd"><h2 id="drawer-t">القائمة</h2><button type="button" class="x" data-close aria-label="إغلاق القائمة">' + I.x + '</button></div>' +
      '<div class="drawer-bd"><div class="d-sec d-links"><a href="catalog.html">الكتالوج' + I.arrow + '</a><a href="#about" data-close>عن <bdi>Jwleria</bdi></a><a href="#" lang="en" hreflang="en" data-inert>English</a></div>' +
      '<div class="d-sec"><h3 class="d-t">الفئات</h3><ul class="d-cats d-links">' + D.categories.map(function (c) { return '<li><a href="catalog.html?category=' + c.slug + '">' + c.ar + '</a></li>'; }).join('') + '</ul></div>' +
      '<div class="d-sec"><h3 class="d-t">العلامات من ' + L('A') + ' إلى ' + L('Z') + '</h3><div class="d-az">' + azCols('dz', 'span') + '</div></div>' +
      '</div></div></div>';
    document.body.appendChild(dr.firstChild);
  }

  function footer() {
    var d = J.data.meta.retrieved.split('-');
    $('#ft').innerHTML = '<div class="wrap"><div class="ft-g">' +
      '<div class="ft-a" id="about"><h2>عن <bdi>Jwleria</bdi></h2><p>كتالوج مستقل يعرض قطعًا من علامات عالمية للاطلاع والاستفسار، مرتّبًا حسب العلامة والفئة والطراز.</p>' +
      '<p class="legal">أسماء العلامات التجارية ملك لأصحابها. <bdi>Jwleria</bdi> جهة مستقلة، غير تابعة لهذه العلامات ولا تمثلها.</p></div>' +
      '<div class="ft-c"><h2>الفئات</h2><ul>' + D.categories.map(function (c) { return '<li><a href="catalog.html?category=' + c.slug + '">' + c.ar + '</a></li>'; }).join('') + '</ul></div>' +
      '<div><h2>العلامات</h2><ul>' + TOPS.map(function (b) { return '<li><a href="catalog.html?brand=' + enc(b) + '">' + L(b) + '</a></li>'; }).join('') + '<li><a href="home.html#az">كل العلامات</a></li></ul></div>' +
      '<div><h2>الموقع</h2><ul><li><a href="catalog.html">الكتالوج</a></li><li><a href="home.html#categories">الفئات</a></li><li><a href="#" lang="en" hreflang="en" data-inert>English</a></li></ul></div>' +
      '</div><div class="ft-bot"><p>© ' + A(d[0]) + ' <bdi>Jwleria</bdi></p><p>معاينة تصميم · بيانات المنتجات من الكتالوج العام بتاريخ ' + A(+d[2]) + ' أكتوبر ' + A(d[0]) + '</p></div></div>';
  }

  /* ——— shared behaviour ——— */
  var tt;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg || 'معاينة تصميم فقط'; t.classList.add('show');
    clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }
  function modal(el, opener, onClose) {
    var last;
    var focusables = function () { return $$('a[href],button:not([disabled]),input:not([disabled]),select', el).filter(function (x) { return x.getClientRects().length; }); };
    function open() {
      last = document.activeElement; el.hidden = false; document.body.classList.add('lock');
      if (opener) opener.setAttribute('aria-expanded', 'true');
      var f = focusables(); (f[0] || el).focus();
    }
    function close() {
      if (el.hidden) return;
      el.hidden = true; document.body.classList.remove('lock');
      if (opener) opener.setAttribute('aria-expanded', 'false');
      if (onClose) onClose();
      (last && last.isConnected ? last : opener).focus();
    }
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(), a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
    el.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) close(); });
    return { open: open, close: close, isOpen: function () { return !el.hidden; } };
  }
  function wire() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-inert]'); if (a) { e.preventDefault(); toast(); }
    });
    /* disclosure mega-panels */
    var dds = $$('.dd'), hd = $('#hd');
    var shut = function (b, focus) { b.setAttribute('aria-expanded', 'false'); $('#' + b.getAttribute('aria-controls')).hidden = true; if (focus) b.focus(); };
    dds.forEach(function (b) {
      b.addEventListener('click', function () {
        var was = b.getAttribute('aria-expanded') === 'true';
        dds.forEach(function (x) { shut(x); });
        if (!was) { b.setAttribute('aria-expanded', 'true'); $('#' + b.getAttribute('aria-controls')).hidden = false; }
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      dds.forEach(function (b) { if (b.getAttribute('aria-expanded') === 'true') shut(b, true); });
      var sb = $('.ib-s'); if (sb.getAttribute('aria-expanded') === 'true') { sb.click(); sb.focus(); }
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.dd, .mega')) dds.forEach(function (x) { shut(x); }); });
    hd.addEventListener('focusout', function (e) { if (e.relatedTarget && !hd.contains(e.relatedTarget)) dds.forEach(function (x) { shut(x); }); });
    $$('#p-brands .az-l button').forEach(function (b) {
      b.addEventListener('click', function () {
        var l = b.getAttribute('data-l');
        $$('#p-brands .az-l button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        $$('#p-brands .az-g').forEach(function (g) { g.hidden = !!l && g.getAttribute('data-l') !== l; });
      });
    });
    /* mobile search row */
    var sb = $('.ib-s'), ms = $('#msrch');
    sb.addEventListener('click', function () {
      var open = ms.hidden; ms.hidden = !open; sb.setAttribute('aria-expanded', String(open));
      if (open) $('input', ms).focus();
    });
    /* drawer */
    var mb = $('.ib-m'), dw = modal($('#drawer'), mb);
    mb.addEventListener('click', dw.open);
    matchMedia('(min-width: 960px)').addEventListener('change', function (e) { if (e.matches) { dw.close(); ms.hidden = true; sb.setAttribute('aria-expanded', 'false'); } });
  }

  /* ——— radiogroup (RTL-aware arrows, roving tabindex) ——— */
  function radiogroup(el, pick) {
    var rtl = document.documentElement.dir === 'rtl';
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[role="radio"]');
      if (!b || b.getAttribute('aria-disabled') === 'true') return;
      pick(b.getAttribute('data-v')); b.focus();
    });
    el.addEventListener('keydown', function (e) {
      var step = { ArrowDown: 1, ArrowUp: -1, ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1 }[e.key];
      if (!step && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      var items = $$('[role="radio"]', el).filter(function (b) { return b.getAttribute('aria-disabled') !== 'true'; });
      if (!items.length) return;
      var i = items.indexOf(document.activeElement);
      if (i < 0) i = items.findIndex(function (b) { return b.getAttribute('aria-checked') === 'true'; });
      i = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + step + items.length) % items.length;
      pick(items[i].getAttribute('data-v')); items[i].focus();
    });
  }

  /* ——— HOME ——— */
  function home() {
    var feat = ['longchamp-le-pliage-one-handbag', 'audemars-piguet-royal-oak-15202or', 'loewe-puzzle-large', 'jaeger-lecoultre-reverso-classic-monoface', 'longchamp-le-pliage-one-travel-bag'];
    var d = D.meta.retrieved.split('-');
    var seen = {};
    $('#main').innerHTML =
      '<section class="hero" aria-labelledby="h1"><div class="wrap hero-g"><div>' +
        '<h1 id="h1"><span>الفخامة،</span> <span>بكل تفاصيلها</span></h1>' +
        '<p class="lead">مختارات من العلامات العالمية، والتفاصيل عبر واتساب.</p>' +
        '<div class="btns"><a class="btn" href="catalog.html">عرض الكتالوج' + I.arrow + '</a><a class="btn btn--ghost" href="#az">العلامات من ' + L('A') + ' إلى ' + L('Z') + '</a></div>' +
      '</div><div><ul class="facts">' +
        '<li><b>' + A(D.brands.length) + '</b><span>علامة</span></li>' +
        '<li><b>' + A(D.categories.length) + '</b><span>فئات</span></li>' +
        '<li><b>' + A(D.meta.catalogReferences) + '</b><span>مرجعًا</span></li>' +
      '</ul><p class="src">أرقام الكتالوج العام بتاريخ ' + A(+d[2]) + ' أكتوبر ' + A(d[0]) + '</p></div></div></section>' +

      '<section class="sec" id="az" aria-labelledby="az-t"><div class="wrap">' +
        '<div class="sec-hd"><h2 id="az-t">العلامات من ' + L('A') + ' إلى ' + L('Z') + '</h2><p class="meta">' + A(D.brands.length) + ' علامة في الدليل · الرقم بجانب الاسم هو عدد المراجع المنشورة</p></div>' +
        azLetters('az', false) + azCols('az', 'h3') +
      '</div></section>' +

      '<section class="sec" id="categories" aria-labelledby="cat-t"><div class="wrap">' +
        '<div class="sec-hd"><h2 id="cat-t">الفئات</h2><p class="meta">' + A(D.categories.length) + ' فئات · الصور المصغّرة توضيحية وليست صور منتجات</p></div>' +
        '<ul class="cats">' + D.categories.map(function (c, i) {
          var alt = seen[c.img]; seen[c.img] = 1;
          var src = '../shared/img/' + c.img;
          return '<li><a class="cat" href="catalog.html?category=' + c.slug + '"><span class="cat-n">' + A(String(i + 1).padStart(2, '0')) + '</span>' +
            '<span class="cat-x"><span class="cat-ar">' + c.ar + '</span><span class="c-en" lang="en">' + c.en + '</span></span>' +
            '<figure class="cat-f' + (alt ? ' alt' : '') + '"><img src="' + src + '-320.webp" srcset="' + src + '-320.webp 320w, ' + src + '-640.webp 640w" sizes="(max-width: 767px) 72px, 112px" width="320" height="320" alt="" loading="lazy" decoding="async"><figcaption>صورة توضيحية</figcaption></figure></a></li>';
        }).join('') + '</ul>' +
      '</div></section>' +

      '<section class="sec" id="featured" aria-labelledby="ft-t"><div class="wrap">' +
        '<div class="sec-hd"><h2 id="ft-t" class="grow">مختارات</h2><a class="lnk" href="catalog.html">الكتالوج كاملًا</a></div>' +
        '<div class="grid grid--5">' + feat.map(function (id) { return card(J.byId(id)); }).join('') + '</div>' +
      '</div></section>';
  }

  /* ——— CATALOG ——— */
  function catalog() {
    var ms = D.models;
    var ck = function (c) { return c.en.toLowerCase().replace(/\s+/g, '-'); };
    var COLS = [];
    ms.forEach(function (m) { (m.colors || []).forEach(function (c) { if (!COLS.some(function (x) { return x.k === ck(c); })) COLS.push({ k: ck(c), ar: c.ar, tone: c.tone }); }); });
    var S = {
      brand: P0.getAll('brand'), category: P0.getAll('category').filter(function (s) { return CAT[s]; }),
      color: P0.getAll('color').filter(function (k) { return COLS.some(function (x) { return x.k === k; }); }),
      q: (P0.get('q') || '').trim(), sort: P0.get('sort') === 'name' ? 'name' : 'new', page: Math.max(1, parseInt(P0.get('page'), 10) || 1)
    };
    var BR = ms.map(function (m) { return m.brand; }).concat(S.brand).filter(function (b, i, a) { return a.indexOf(b) === i; })
      .sort(function (a, b) { return a.localeCompare(b, 'en', { sensitivity: 'base' }); });
    var hay = function (m) {
      return [m.brand, m.name, m.nameAr, m.typeAr, m.collection, CAT[m.category].ar, CAT[m.category].en].concat(
        m.variants.map(function (x) { return x.ref; }), (m.colors || []).map(function (c) { return c.ar + ' ' + c.en; })).join(' ').toLowerCase();
    };
    var has = function (m, f, val) { return f === 'brand' ? m.brand === val : f === 'category' ? m.category === val : (m.colors || []).some(function (c) { return ck(c) === val; }); };
    var ok = function (m, skip) {
      return ['brand', 'category', 'color'].every(function (f) { return f === skip || !S[f].length || S[f].some(function (v) { return has(m, f, v); }); }) &&
        (!S.q || S.q.toLowerCase().split(/\s+/).every(function (t) { return hay(m).indexOf(t) > -1; }));
    };
    var opt = function (f, val, label) { return '<li><label class="ck"><input type="checkbox" name="' + f + '" value="' + esc(val) + '"><span class="t">' + label + '</span><span class="n" data-n></span></label></li>'; };

    $('#main').innerHTML = '<div class="wrap">' +
      '<nav class="bc" aria-label="مسار التنقل"><ol id="bc"></ol></nav>' +
      '<div class="cl"><aside class="side" aria-labelledby="title">' +
        '<h1 id="title">الكتالوج</h1><p class="note">طراز واحد لكل منتج، والألوان والمقاسات داخل صفحة المنتج.</p>' +
        '<div id="fslot"><form id="ff" aria-label="عوامل التصفية">' +
          '<fieldset class="fg"><legend>العلامة</legend><ul>' + BR.map(function (b) { return opt('brand', b, L(b)); }).join('') + '</ul></fieldset>' +
          '<fieldset class="fg"><legend>الفئة</legend><ul>' + D.categories.map(function (c) { return opt('category', c.slug, esc(c.ar)); }).join('') + '</ul></fieldset>' +
          '<fieldset class="fg"><legend>اللون</legend><div class="sws">' + COLS.map(function (c) {
            return '<label class="sw"><input type="checkbox" name="color" value="' + c.k + '"><i style="background:' + c.tone + '"></i>' + esc(c.ar) + '<span class="n" data-n></span></label>';
          }).join('') + '</div></fieldset>' +
        '</form></div>' +
      '</aside><div class="res">' +
        '<div class="tb"><button type="button" class="fbtn" id="fbtn" aria-expanded="false" aria-controls="sheet">' + I.filter + '<span>تصفية</span><span id="fn"></span></button>' +
          '<p class="count" id="count" tabindex="-1" aria-live="polite"></p><ul class="act" id="act"></ul>' +
          '<div class="sort"><label class="k" for="sort">الترتيب</label><select id="sort"><option value="new">الأحدث</option><option value="name">الاسم</option></select></div></div>' +
        '<h2 class="vh">النتائج</h2><div class="grid" id="grid"></div>' +
        '<nav class="pg" id="pg" aria-label="ترقيم الصفحات"></nav>' +
      '</div></div></div>';

    var sh = document.createElement('div');
    sh.innerHTML = '<div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t" hidden><div class="scrim" data-close></div><div class="sheet-p">' +
      '<div class="sheet-hd"><h2 id="sheet-t">التصفية</h2><button type="button" class="x" data-close aria-label="إغلاق">' + I.x + '</button></div>' +
      '<div class="sheet-bd" id="sslot"></div>' +
      '<div class="sheet-ft"><button type="button" class="btn btn--ghost" data-clear>مسح الكل</button><button type="button" class="btn" data-close id="sgo">عرض النتائج</button></div></div></div>';
    document.body.appendChild(sh.firstChild);
    $('#sort').value = S.sort;

    function sync() {
      $$('#ff input').forEach(function (i) {
        var f = i.name, n = ms.filter(function (m) { return ok(m, f) && has(m, f, i.value); }).length;
        i.checked = S[f].indexOf(i.value) > -1;
        i.disabled = !n && !i.checked;
        $('[data-n]', i.closest('label')).textContent = A(n);
      });
    }
    function render() {
      var list = ms.filter(function (m) { return ok(m); });
      if (S.sort === 'name') list = list.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'en'); });
      var per = 48, pages = Math.max(1, Math.ceil(list.length / per));
      S.page = Math.min(S.page, pages);
      $('#grid').innerHTML = list.length ? list.slice((S.page - 1) * per, S.page * per).map(card).join('') :
        '<div class="empty"><p class="empty-t">لا توجد طرازات مطابقة في هذه المعاينة.</p><p>تضم المعاينة عشرة طرازات من الكتالوج العام فقط.</p><button type="button" class="btn btn--ghost" data-clear>مسح عوامل التصفية</button></div>';
      $('#count').textContent = list.length ? plural(list.length, F.model) : 'لا نتائج';
      $('#sgo').textContent = list.length ? 'عرض ' + plural(list.length, F.model) : 'لا نتائج';
      var nAct = S.brand.length + S.category.length + S.color.length + (S.q ? 1 : 0);
      $('#fn').textContent = nAct ? '(' + A(nAct) + ')' : '';

      var oneCat = S.category.length === 1 && !S.brand.length ? CAT[S.category[0]] : null;
      var oneBr = !oneCat && S.brand.length === 1 && !S.category.length ? S.brand[0] : '';
      var head = oneCat ? esc(oneCat.ar) : oneBr ? L(oneBr) : '';
      $('#title').innerHTML = head || 'الكتالوج';
      $('#bc').innerHTML = '<li><a href="home.html">الرئيسية</a></li>' + (head ? '<li><a href="catalog.html">الكتالوج</a></li><li><span aria-current="page">' + head + '</span></li>' : '<li><span aria-current="page">الكتالوج</span></li>');
      document.title = (oneCat ? oneCat.ar + ' — ' : oneBr ? FSI + oneBr + PDI + ' — ' : '') + 'الكتالوج · ' + FSI + 'Jwleria' + PDI;

      var chips = [].concat(
        S.brand.map(function (b) { return ['brand', b, L(b)]; }),
        S.category.map(function (c) { return ['category', c, esc(CAT[c].ar)]; }),
        S.color.map(function (k) { return ['color', k, esc(COLS.filter(function (x) { return x.k === k; })[0].ar)]; }),
        S.q ? [['q', S.q, 'البحث: <bdi>' + esc(S.q) + '</bdi>']] : []);
      $('#act').innerHTML = chips.map(function (c) {
        return '<li><button type="button" class="ac" data-f="' + c[0] + '" data-v="' + esc(c[1]) + '"><span class="vh">إزالة عامل التصفية: </span>' + c[2] + I.x + '</button></li>';
      }).join('') + (chips.length > 1 ? '<li><button type="button" class="ac-x" data-clear>مسح الكل</button></li>' : '');

      var pb = function (p, label, dis, cur, aria) { return '<button type="button" data-p="' + p + '"' + (dis ? ' disabled' : '') + (cur ? ' aria-current="page"' : '') + (aria ? ' aria-label="' + aria + '"' : '') + '>' + label + '</button>'; };
      var nums = ''; for (var i = 1; i <= pages; i++) nums += '<li>' + pb(i, A(i), false, i === S.page, 'الصفحة ' + A(i)) + '</li>';
      $('#pg').innerHTML = pb(S.page - 1, 'السابق', S.page <= 1) + '<ol>' + nums + '</ol>' + pb(S.page + 1, 'التالي', S.page >= pages) +
        '<p class="pg-i">الصفحة ' + A(S.page) + ' من ' + A(pages) + ' · حتى ' + A(per) + ' طرازًا في الصفحة</p>';

      var u = new URLSearchParams();
      ['brand', 'category', 'color'].forEach(function (f) { S[f].forEach(function (x) { u.append(f, x); }); });
      if (S.q) u.set('q', S.q); if (S.sort !== 'new') u.set('sort', S.sort); if (S.page > 1) u.set('page', S.page);
      var qs = u.toString(); history.replaceState(null, '', qs ? '?' + qs : 'catalog.html');
      sync();
    }

    $('#ff').addEventListener('change', function (e) {
      var i = e.target; if (!i.name) return;
      S[i.name] = $$('#ff input[name="' + i.name + '"]:checked').map(function (x) { return x.value; }); S.page = 1; render();
    });
    $('#ff').addEventListener('submit', function (e) { e.preventDefault(); });
    $('#sort').addEventListener('change', function (e) { S.sort = e.target.value; S.page = 1; render(); });
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-clear]')) {
        S.brand = []; S.category = []; S.color = []; S.q = ''; S.page = 1;
        $$('.srch input').forEach(function (x) { x.value = ''; }); render();
        if (!e.target.closest('.sheet')) $('#count').focus();
        return;
      }
      var a = e.target.closest('.ac');
      if (a) {
        var f = a.getAttribute('data-f');
        if (f === 'q') { S.q = ''; $$('.srch input').forEach(function (x) { x.value = ''; }); }
        else S[f] = S[f].filter(function (x) { return x !== a.getAttribute('data-v'); });
        S.page = 1; render(); $('#count').focus(); return;
      }
      var p = e.target.closest('#pg [data-p]');
      if (p && !p.disabled) { S.page = +p.getAttribute('data-p'); render(); $('#count').focus(); }
    });
    var sheet = modal($('#sheet'), $('#fbtn'), function () { $('#fslot').appendChild($('#ff')); });
    $('#fbtn').addEventListener('click', function () { $('#sslot').appendChild($('#ff')); sheet.open(); });
    matchMedia('(min-width: 960px)').addEventListener('change', function (e) { if (e.matches) sheet.close(); });
    render();
  }

  /* ——— PRODUCT ——— */
  function product() {
    var m = J.byId(P0.get('model')), v = J.variantOf(m, P0.get('ref'));
    var cat = CAT[m.category], cs = m.colors || [], ss = m.sizes || [];
    var multiS = ss.length > 1;
    var VIEWS = ['أمامي', 'جانبي', 'خلفي', 'تفاصيل'];
    var sum = [cs.length > 1 && plural(cs.length, F.col), multiS && plural(ss.length, F.size), plural(m.variants.length, F.ref)].filter(Boolean).join(' · ');
    var mates = D.models.filter(function (x) { return x.brand === m.brand && x.id !== m.id; });
    var rel = (mates.length ? mates : D.models.filter(function (x) { return x.category === m.category && x.id !== m.id; })).slice(0, 3);
    var relHref = mates.length ? 'catalog.html?brand=' + enc(m.brand) : 'catalog.html?category=' + cat.slug;
    var relAll = mates.length ? 'كل طرازات ' + L(m.brand) : 'كل ' + cat.ar;
    var n = D.brandCounts[m.brand];

    var colourOpt = cs.length ? '<div class="opt"><div class="opt-h"><span class="k" id="lc">' + (m.colorLabel ? m.colorLabel.ar : 'اللون') + '</span><span class="v" id="cv"></span><span class="aux">' + plural(cs.length, F.col) + '</span></div>' +
      '<div class="chips" role="radiogroup" aria-labelledby="lc" id="rg-c">' + cs.map(function (c) {
        return '<button type="button" role="radio" class="chip" data-v="' + esc(c.id) + '" aria-checked="false" tabindex="-1"><i style="background:' + c.tone + '"></i>' + esc(c.ar) + '<span class="vh dr"></span></button>';
      }).join('') + '</div></div>' : '';
    var sizeOpt = !ss.length ? '' : multiS ?
      '<div class="opt"><div class="opt-h"><span class="k" id="ls">المقاس</span><span class="v" id="sv"></span><span class="aux">' + plural(ss.length, F.size) + '</span></div>' +
      '<div class="seg" role="radiogroup" aria-labelledby="ls" id="rg-s">' + ss.map(function (s) {
        return '<button type="button" role="radio" data-v="' + esc(s.id) + '" aria-checked="false" tabindex="-1">' + esc(s.ar) + '<span class="sz" lang="en">' + esc(s.en) + '</span><span class="vh dr"></span></button>';
      }).join('') + '</div></div>' :
      '<div class="opt"><div class="opt-h"><span class="k">المقاس</span><span class="v">' + esc(ss[0].ar) + ' <bdi lang="en">' + esc(ss[0].en) + '</bdi></span><span class="aux">مقاس واحد</span></div></div>';

    $('#main').innerHTML = '<div class="wrap">' +
      '<nav class="bc" aria-label="مسار التنقل"><ol><li><a href="catalog.html">الكتالوج</a></li><li><a href="catalog.html?category=' + cat.slug + '">' + cat.ar + '</a></li></ol></nav>' +
      '<div class="pdp"><div class="gal-w"><div class="gal" id="gal" role="group" aria-label="صور مؤقتة للطراز">' + VIEWS.map(function (w) { return ph(m, v, w); }).join('') + '</div>' +
        '<div class="gal-dots" aria-hidden="true">' + VIEWS.map(function (w, i) { return '<i' + (i ? '' : ' class="on"') + '></i>'; }).join('') + '</div></div>' +
      '<div class="info">' +
        '<p class="pdp-brand"><a href="catalog.html?brand=' + enc(m.brand) + '">' + L(m.brand) + '</a></p>' +
        '<h1><span class="pdp-name">' + L(m.name) + '</span><span class="pdp-type">' + esc(m.typeAr) + (m.nameAr ? ' · ' + esc(m.nameAr) : '') + '</span></h1>' +
        '<p class="pdp-sum">' + sum + '</p>' + colourOpt + sizeOpt +
        '<div class="refrow"><span class="k">المرجع</span><bdi class="ref" id="ref" lang="en" dir="ltr"></bdi></div>' +
        '<div class="buy"><p class="buy-s" id="buys" aria-hidden="true"></p><button type="button" class="cta" data-inert>التواصل عبر واتساب لمعرفة السعر</button></div>' +
        '<table class="facts-t"><caption class="vh">مواصفات الطراز</caption><tbody id="facts"></tbody></table>' +
        '<details class="acc"><summary>التفاصيل</summary><div class="acc-b" id="acc1"></div></details>' +
        '<details class="acc"><summary>عن العلامة</summary><div class="acc-b"><p>' + L(m.brand) + ' من العلامات المدرجة في دليل <bdi>Jwleria</bdi>.' +
          (n ? ' عدد المراجع المنشورة في الكتالوج العام: ' + A(n) + '.' : '') + '</p><a class="lnk" href="catalog.html?brand=' + enc(m.brand) + '">كل طرازات ' + L(m.brand) + ' في الكتالوج</a></div></details>' +
      '</div></div>' +
      '<section class="sec rel" aria-labelledby="rel-t"><div class="sec-hd"><h2 id="rel-t" class="grow">' + (mates.length ? 'قطع أخرى من ' + L(m.brand) : 'من الفئة نفسها') + '</h2><a class="lnk" href="' + relHref + '">' + relAll + '</a></div>' +
        '<div class="grid">' + rel.map(card).join('') + '<a class="more-t" href="' + relHref + '"><span>' + relAll + '</span><span class="more-n">في الكتالوج</span>' + I.arrow + '</a></div></section>' +
      '</div>';
    document.body.classList.add('has-buy');

    function facts() {
      var c = J.color(m, v.color), s = J.size(m, v.size), dims = (s && s.dims) || m.dims, rows = [];
      if (m.collection) rows.push(['المجموعة', L(m.collection)]);
      rows.push(['الفئة', '<a href="catalog.html?category=' + cat.slug + '">' + cat.ar + '</a>']);
      rows.push(['النوع', esc(m.typeAr)]);
      if (c) rows.push(['اللون', esc(c.ar) + '<br><span class="sub">' + L(c.en) + '</span>']);
      if (s) rows.push(['المقاس', esc(s.ar) + ' <bdi lang="en">' + esc(s.en) + '</bdi>']);
      if (dims) rows.push(['الأبعاد', L(dims)]);
      if (m.material) rows.push(['المادة', esc(m.material.ar) + '<br><span class="sub">' + L(m.material.en) + '</span>']);
      if (c && c.material) rows.push(['الخامة', L(c.material)]);
      (m.facts || []).forEach(function (f) { rows.push([esc(f.ar), V(f.v)]); });
      return rows.map(function (r) { return '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td></tr>'; }).join('');
    }
    function details() {
      return '<p>' + (m.variants.length > 1 ? 'صفحة واحدة لهذا الطراز؛ لكل لون' + (multiS ? ' ومقاس' : '') + ' مرجع خاص يتغيّر مع الاختيار.' : 'طراز بمرجع واحد.') +
        ' الصور المعروضة أماكن مؤقتة إلى حين اعتماد الصور الأصلية.</p>' +
        (m.variants.length > 1 ? '<p>مراجع هذا الطراز:</p><ul class="refs">' + m.variants.map(function (x) {
          return '<li><a href="' + url(m, x.ref) + '" data-ref="' + esc(x.ref) + '"' + (x.ref === v.ref ? ' aria-current="true"' : '') + '>' + L(x.ref, 'ref') + '</a></li>';
        }).join('') + '</ul>' : '');
    }
    function update() {
      var c = J.color(m, v.color), s = J.size(m, v.size);
      $$('#rg-c [role="radio"]').forEach(function (b) {
        var id = b.getAttribute('data-v'), on = id === v.color, okc = !!J.find(m, multiS ? v.size : null, id);
        b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
        b.setAttribute('aria-disabled', String(!okc)); b.title = okc ? '' : 'غير مدرج بهذا المقاس';
        $('.dr', b).textContent = okc ? '' : '، غير مدرج بهذا المقاس';
      });
      $$('#rg-s [role="radio"]').forEach(function (b) {
        var id = b.getAttribute('data-v'), on = id === v.size, oks = m.variants.some(function (x) { return x.size === id; });
        b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
        b.setAttribute('aria-disabled', String(!oks)); $('.dr', b).textContent = oks ? '' : '، غير مدرج';
      });
      if ($('#cv')) $('#cv').innerHTML = c ? esc(c.ar) + (c.material ? ' · ' + L(c.material) : '') : '';
      if ($('#sv')) $('#sv').innerHTML = s ? esc(s.ar) + ' <bdi lang="en">' + esc(s.en) + '</bdi>' : '';
      $('#ref').textContent = v.ref;
      $$('#gal .ph').forEach(function (el, i) { paint(el, m, v, VIEWS[i]); });
      $('#facts').innerHTML = facts();
      $('#acc1').innerHTML = details();
      $('#buys').innerHTML = L(v.ref, 'ref') + (c ? '<span>·</span><span>' + esc(c.ar) + '</span>' : '') + (s && multiS ? '<span>·</span><span>' + esc(s.ar) + '</span>' : '');
      document.title = FSI + m.name + PDI + ' · ' + (c ? c.ar + ' · ' : '') + (s && multiS ? s.ar + ' · ' : '') + FSI + v.ref + PDI + ' — ' + FSI + 'Jwleria' + PDI;
      history.replaceState(null, '', '?model=' + enc(m.id) + '&ref=' + enc(v.ref));
    }
    if ($('#rg-c')) radiogroup($('#rg-c'), function (id) { v = J.find(m, multiS ? v.size : null, id) || v; update(); });
    if ($('#rg-s')) radiogroup($('#rg-s'), function (id) { v = J.find(m, id, v.color) || J.find(m, id, null) || v; update(); });
    $('#acc1').addEventListener('click', function (e) {
      var a = e.target.closest('[data-ref]'); if (!a) return;
      e.preventDefault(); v = J.variantOf(m, a.getAttribute('data-ref')); update();
      var f = $('[data-ref="' + a.getAttribute('data-ref') + '"]', $('#acc1')); if (f) f.focus();
    });
    var gal = $('#gal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var i = Array.prototype.indexOf.call(gal.children, e.target);
          $$('.gal-dots i').forEach(function (d, j) { d.classList.toggle('on', i === j); });
        });
      }, { root: gal, threshold: 0.6 });
      Array.prototype.forEach.call(gal.children, function (c) { io.observe(c); });
    }
    update();
  }

  header(); footer(); wire();
  ({ home: home, catalog: catalog, product: product })[page]();
})();
