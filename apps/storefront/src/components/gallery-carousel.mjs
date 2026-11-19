// Decision 0028: the product page's own photographs as a gentle carousel on the existing native scroll-snap row.
// - Swiping, trackpads, vertical page scrolling and pinch zoom stay native: every listener is passive and none prevents
//   a default, and navigation scrolls only the row, horizontally, so the page never moves.
// - Dots, a count and previous/next show and choose the photograph; the shown one is the one most inside the row, which
//   holds in both writing directions.
// - The automatic advance (every 5 s) runs only with two or more photographs, while the gallery is at least half on
//   screen, while the page is visible, and never under reduced motion. The visitor's own touch, drag, wheel, key press,
//   focus or navigation stops it for good; the pause/play control stops or restarts it.
// - init() returns destroy(), which removes every timer, observer and listener, so an in-place variant swap can tear the
//   old gallery down before the new one starts at its primary.

/** @param {HTMLElement | null} gallery @returns {{destroy(): void}} */
export function initCarousel(gallery, { interval = 5000 } = {}) {
  const none = { destroy() {} };
  if (!gallery || typeof IntersectionObserver === 'undefined') return none;
  const track = gallery.querySelector('[data-carousel-track]');
  const controls = gallery.querySelector('[data-carousel-controls]');
  const slides = track ? [...track.children].filter((node) => node.tagName === 'FIGURE') : [];
  if (!track || !controls || slides.length < 2) return none;

  const dots = [...controls.querySelectorAll('[data-carousel-dot]')];
  const count = controls.querySelector('[data-carousel-count]');
  const toggle = controls.querySelector('[data-carousel-toggle]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const undo = [];
  const on = (target, type, handler, options) => {
    if (!target) return;
    target.addEventListener(type, handler, options);
    undo.push(() => target.removeEventListener(type, handler, options));
  };

  let current = 0;
  let timer = 0;
  let visible = false;
  let stopped = reduced.matches; // under reduced motion nothing moves until the visitor presses play
  let paused = false;

  const render = () => {
    dots.forEach((dot, i) => (i === current ? dot.setAttribute('aria-current', 'true') : dot.removeAttribute('aria-current')));
    if (count) count.textContent = (controls.dataset.count ?? '{n} / {m}').replace('{n}', String(current + 1)).replace('{m}', String(slides.length));
    const playing = !stopped && !paused;
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(!playing));
      toggle.setAttribute('aria-label', (playing ? controls.dataset.pause : controls.dataset.play) ?? '');
    }
  };
  // Horizontal only, by the physical distance between the slide's centre and the row's centre: right-to-left safe.
  const go = (index, smooth = true) => {
    const n = (index + slides.length) % slides.length;
    const row = track.getBoundingClientRect();
    const box = slides[n].getBoundingClientRect();
    track.scrollBy({ left: box.left + box.width / 2 - (row.left + row.width / 2), behavior: smooth && !reduced.matches ? 'smooth' : 'auto' });
    current = n;
    render();
  };
  const clear = () => { clearTimeout(timer); timer = 0; };
  const schedule = () => {
    clear();
    if (stopped || paused || !visible || document.visibilityState !== 'visible') return;
    timer = setTimeout(() => { go(current + 1); schedule(); }, interval);
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clear();
    if (count) count.setAttribute('aria-live', 'polite');
    render();
  };

  const shown = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting && entry.intersectionRatio >= 0.6) { current = slides.indexOf(entry.target); render(); }
  }, { root: track, threshold: [0.6] });
  slides.forEach((slide) => shown.observe(slide));
  const onScreen = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
    schedule();
  }, { threshold: 0.5 });
  onScreen.observe(gallery);

  on(controls.querySelector('[data-carousel-prev]'), 'click', () => { stop(); go(current - 1); });
  on(controls.querySelector('[data-carousel-next]'), 'click', () => { stop(); go(current + 1); });
  dots.forEach((dot, i) => on(dot, 'click', () => { stop(); go(i); }));
  on(toggle, 'click', () => {
    if (stopped || paused) { stopped = false; paused = false; schedule(); } else { paused = true; clear(); }
    render();
  });
  for (const type of ['pointerdown', 'touchstart', 'wheel']) on(track, type, stop, { passive: true });
  on(gallery, 'keydown', (event) => { if (event.target !== toggle) stop(); });
  on(gallery, 'focusin', (event) => { if (event.target !== toggle) stop(); });
  on(document, 'visibilitychange', schedule);
  on(reduced, 'change', () => { if (reduced.matches) stop(); });

  // Each selected variant starts at its primary photograph.
  track.scrollTo({ left: 0, behavior: 'auto' });
  controls.hidden = false;
  render();
  schedule();

  return {
    destroy() {
      clear();
      shown.disconnect();
      onScreen.disconnect();
      undo.splice(0).forEach((remove) => remove());
    },
  };
}
