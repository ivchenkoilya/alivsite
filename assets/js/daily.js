/*
 * ALIV SPORT — "Тренажёры дня": a new set of real machines every day.
 * The set is picked from the catalogue with a date-seeded shuffle, so every visitor sees
 * the same picks on the same day and they change at midnight (Moscow time).
 * Inspection: move the cursor / drag a finger across the photo to "turn" the machine
 * through its real gallery shots; when idle it slowly flips by itself.
 */
(function () {
  'use strict';
  const A = window.ALIV;
  const root = A.$('[data-daily]');
  if (!root) return;
  const { $, $$, esc, icon, up, srcset, price, productUrl, DATA } = A;

  /* ---------- deterministic daily pick ---------- */
  const today = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  let seed = [...today].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 2166136261);
  const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pool = DATA.products.filter((p) => p.images.length >= 3 && p.metrics.length);
  const shuffled = pool.map((p) => [rnd(), p]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  // at least one machine that can be ordered online, and no two of the same type
  const picks = [];
  const pricedFirst = shuffled.find((p) => p.price);
  if (pricedFirst) picks.push(pricedFirst);
  for (const p of shuffled) { if (picks.length >= 4) break; if (!picks.includes(p) && !picks.some((x) => x.type === p.type)) picks.push(p); }
  if (picks.length < 2) { root.remove(); return; }

  $('[data-daily-date]', root).textContent = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long' }).format(new Date());

  /* ---------- tabs ---------- */
  const tabs = $('[data-daily-tabs]', root);
  tabs.innerHTML = picks.map((p, i) => `
    <button class="daily-tab" type="button" role="tab" aria-selected="false" data-pick="${i}">
      <span class="stage daily-tab__img">${A.productImg(p.images[0], { sizes: '72px' })}</span>
      <span class="daily-tab__txt"><span>${String(i + 1).padStart(2, '0')}</span>${esc(p.name)}</span>
    </button>`).join('');

  const viewer = $('[data-daily-viewer]', root);
  const info = $('[data-daily-info]', root);
  let frames = []; let frame = 0; let idleTimer = 0; let touched = false;

  function setFrame(i) {
    if (!frames.length) return;
    frame = (i + frames.length) % frames.length;
    frames.forEach((f, k) => f.classList.toggle('is-on', k === frame));
    $$('.daily-dots i', viewer).forEach((d, k) => d.classList.toggle('is-on', k === frame));
  }
  function idle() { clearInterval(idleTimer); if (!A.reduceMotion && !touched) idleTimer = setInterval(() => setFrame(frame + 1), 1800); }

  function show(i) {
    const p = picks[i];
    $$('[data-pick]', tabs).forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
    const shots = p.images.slice(0, 8);
    viewer.innerHTML = `
      <a class="daily-viewer__link" href="${productUrl(p)}" aria-label="Открыть ${esc(p.name)}">
        ${shots.map((im, k) => `<img class="daily-frame ${k === 0 ? 'is-on' : ''}" src="${up(im.thumb)}" srcset="${srcset(im.srcset)}" sizes="(min-width: 1000px) 44vw, 92vw" alt="${k === 0 ? esc(p.name) : ''}" ${k ? 'loading="lazy"' : ''} decoding="async" draggable="false">`).join('')}
      </a>
      <div class="daily-hint" aria-hidden="true">${icon('arrow-left')}<span>Проведите по фото — осмотрите со всех сторон</span>${icon('arrow-right')}</div>
      <div class="daily-dots" aria-hidden="true">${shots.map((_, k) => `<i class="${k === 0 ? 'is-on' : ''}"></i>`).join('')}</div>`;
    frames = $$('.daily-frame', viewer); frame = 0; touched = false; idle();
    const cmpOn = A.compare.has(p.id);
    info.innerHTML = `
      <p class="daily-info__type">${esc(DATA.types[p.type] || '')}${p.sku ? ` · ${esc(p.sku)}` : ''}</p>
      <h3 class="daily-info__name">${esc(p.name)}</h3>
      <dl class="daily-metrics">${p.metrics.slice(0, 4).map((m) => `<div><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd></div>`).join('')}</dl>
      <p class="daily-info__price ${p.price ? '' : 'is-request'}">${p.price ? price(p.price) : 'Цена по запросу'}</p>
      <div class="daily-info__actions">
        <a class="btn btn--primary" href="${productUrl(p)}">Смотреть тренажёр ${icon('arrow-right', 'i--arrow')}</a>
        ${p.price ? `<button class="btn btn--outline" type="button" data-add-cart="${p.id}">${icon('cart')}В корзину</button>` : `<button class="btn btn--outline" type="button" data-quote-open data-product="${p.id}">${icon('message')}Узнать цену</button>`}
        <button class="icon-btn icon-btn--boxed ${cmpOn ? 'is-active' : ''}" type="button" data-compare="${p.id}" aria-pressed="${cmpOn}" aria-label="Сравнить ${esc(p.name)}" title="Сравнить">${icon('layers')}</button>
      </div>`;
    info.classList.remove('is-swap'); void info.offsetWidth; info.classList.add('is-swap');
  }

  /* scrub: horizontal pointer position → frame */
  const scrubTo = (clientX) => { const r = viewer.getBoundingClientRect(); const x = Math.min(0.999, Math.max(0, (clientX - r.left) / r.width)); setFrame(Math.floor(x * frames.length)); };
  viewer.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || dragging) { touched = true; clearInterval(idleTimer); viewer.classList.add('is-scrubbing'); scrubTo(e.clientX); } });
  viewer.addEventListener('mouseleave', () => { viewer.classList.remove('is-scrubbing'); touched = false; idle(); });
  let dragging = false; let moved = false; let sx = 0;
  viewer.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { dragging = true; moved = false; sx = e.clientX; } });
  viewer.addEventListener('pointerup', () => { dragging = false; });
  viewer.addEventListener('pointercancel', () => { dragging = false; });
  viewer.addEventListener('pointermove', (e) => { if (dragging && Math.abs(e.clientX - sx) > 8) moved = true; });
  viewer.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; } });
  viewer.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); touched = true; clearInterval(idleTimer); setFrame(frame + (e.key === 'ArrowRight' ? 1 : -1)); } });

  tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (b) show(Number(b.dataset.pick)); });
  // pause the idle flipping when the section is off-screen
  new IntersectionObserver(([en]) => { if (en.isIntersecting) idle(); else clearInterval(idleTimer); }).observe(root);
  show(0);
})();
