/* ALIV SPORT — product page: gallery, lightbox, buy box, specs, related, buy bar */
(function () {
  'use strict';
  const A = window.ALIV;
  const { $, $$, DATA, esc, icon, price, up, srcset, productCard, catalogUrl } = A;

  const slug = new URLSearchParams(location.search).get('slug') || 'zhim-nogami';
  const p = A.bySlug.get(slug);
  const root = $('[data-product-root]');

  if (!p) {
    root.innerHTML = `<div class="container section"><div class="empty">${icon('search')}<h1 class="h3">Товар не найден</h1><p>Возможно, ссылка устарела. Посмотрите каталог или найдите модель через поиск.</p><a class="btn btn--primary" href="catalog.html">Перейти в каталог</a></div></div>`;
    $('[data-buybar]').remove();
    return;
  }

  const cat = A.catBySlug.get(p.category);
  const typeLabel = DATA.types[p.type];
  const darkOverride = (A.CFG.images['product-dark'] || {})[p.slug];

  /* ---------- SEO (on WordPress this comes from the Woo template) ---------- */
  document.title = `${p.name}${p.price ? ' — ' + price(p.price) : ''} | ALIV SPORT`;
  const leadText = (p.description.find((b) => b.type === 'p') || {}).text || '';
  const md = document.querySelector('meta[name=description]');
  if (md) md.content = `${p.name} от производителя ALIV SPORT. ${leadText}`.slice(0, 160);
  const ld = document.createElement('script'); ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku || undefined,
    image: p.images.map((i) => up(i.src)), description: leadText, brand: { '@type': 'Brand', name: 'ALIV SPORT' }, url: p.url,
    offers: p.price ? { '@type': 'Offer', price: p.price, priceCurrency: 'RUB', availability: 'https://schema.org/InStock', url: p.url } : undefined,
  });
  document.head.appendChild(ld);

  /* ---------- Breadcrumbs ---------- */
  $('[data-pp-crumbs]').insertAdjacentHTML('beforeend', `<li><a href="${catalogUrl({ cat: p.category })}">${esc(cat.name)}</a></li><li aria-current="page">${esc(p.name)}</li>`);

  /* ---------- Buy box ---------- */
  $('[data-pp-tags]').innerHTML = `<a class="tag tag--outline" href="${catalogUrl({ type: p.type })}">${esc(typeLabel)}</a>${p.sku ? `<span class="tag">Арт. ${esc(p.sku)}</span>` : ''}<span class="tag">${p.purpose === 'home' ? 'Для дома' : 'Для залов'}</span>`;
  $('[data-pp-title]').textContent = p.name;
  // real rating only (WooCommerce); no reviews yet → invite the first one
  $('[data-pp-title]').insertAdjacentHTML('afterend', p.reviewCount
    ? `<a class="rating-line" href="#reviews"><span class="stars" style="--val:${p.rating}" role="img" aria-label="Рейтинг ${p.rating} из 5"></span><b>${p.rating.toLocaleString('ru-RU')}</b> · ${p.reviewCount} ${A.plural(p.reviewCount, 'отзыв', 'отзыва', 'отзывов')}</a>`
    : `<a class="rating-line" href="#reviews"><span class="stars" style="--val:0" aria-hidden="true"></span>Отзывов пока нет · оставить первый</a>`);
  A.recent.push(p.id);
  const lead = $('[data-pp-lead]');
  const leadTruncated = leadText.length > 220;
  if (leadText) lead.textContent = leadTruncated ? leadText.slice(0, leadText.lastIndexOf(' ', 210)) + '…' : leadText; else lead.remove();

  const metricIcons = { dims: 'ruler', load: 'weight', weight: 'cube', user: 'user' };
  const metrics = $('[data-pp-metrics]');
  if (p.metrics.length) metrics.innerHTML = p.metrics.map((m) => `<div class="metric"><svg class="i"><use href="#i-${metricIcons[m.id]}"/></svg><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd></div>`).join('');
  else metrics.remove();

  $('[data-pp-price]').innerHTML = p.price ? price(p.price) : 'По запросу';
  $('[data-pp-price]').classList.toggle('is-request', !p.price);
  $('[data-pp-price-label]').textContent = p.price ? 'Цена' : 'Стоимость';
  $('[data-pp-price-note]').innerHTML = p.price ? 'Для залов и оптовых заказов — индивидуальные условия по&nbsp;КП' : 'Рассчитаем стоимость с доставкой и сборкой под ваш объект';

  const favBtn = (cls = '') => `<button class="btn btn--outline ${cls}" type="button" data-fav="${p.id}" data-fav-label aria-pressed="${A.favs.has(p.id)}">${icon('heart')}<span data-fav-text>${A.favs.has(p.id) ? 'В избранном' : 'В избранное'}</span></button>`;
  $('[data-pp-actions]').innerHTML = p.price
    ? `<div class="buybox__buy">
         <div class="qty"><button type="button" data-q-dec aria-label="Меньше">${icon('minus')}</button><input id="pp-qty" type="number" min="1" max="99" value="1" aria-label="Количество"><button type="button" data-q-inc aria-label="Больше">${icon('plus')}</button></div>
         <button class="btn btn--primary btn--lg buybox__cart" type="button" data-add-cart="${p.id}" data-qty-from="#pp-qty" data-main-cta>${icon('cart')}В корзину</button>
       </div>
       <div class="buybox__secondary">${favBtn()}<button class="btn btn--outline" type="button" data-quote-open data-product="${p.id}" data-quote-title="Коммерческое предложение: ${esc(p.name)}">${icon('file')}Запросить КП</button></div>`
    : `<button class="btn btn--primary btn--lg btn--block" type="button" data-quote-open data-product="${p.id}" data-main-cta>${icon('message')}Узнать цену и сроки</button>
       <div class="buybox__secondary">${favBtn()}<a class="btn btn--outline" href="tel:+79520886886">${icon('phone')}Позвонить</a></div>`;
  const qty = $('#pp-qty');
  if (qty) {
    const dec = $('[data-q-dec]');
    const syncQty = () => { qty.value = Math.max(1, Math.min(99, Number(qty.value) || 1)); dec.disabled = Number(qty.value) <= 1; };
    dec.addEventListener('click', () => { qty.value = Number(qty.value) - 1; syncQty(); });
    $('[data-q-inc]').addEventListener('click', () => { qty.value = Number(qty.value) + 1; syncQty(); });
    qty.addEventListener('change', syncQty); syncQty();
  }
  A.on('favs', () => $$('[data-fav-text]').forEach((s) => (s.textContent = A.favs.has(p.id) ? 'В избранном' : 'В избранное')));

  /* ---------- Gallery ---------- */
  const imgs = p.images.map((im, i) => ({ ...im, full: up(im.src), set: srcset(im.srcset), i }));
  if (darkOverride) imgs.unshift({ full: darkOverride, set: '', alt: p.name, dark: true });
  const track = $('[data-gallery-track]');
  track.innerHTML = imgs.map((im, i) => `
    <figure class="gallery__slide ${im.dark ? 'stage--dark' : ''} stage" role="group" aria-roledescription="слайд" aria-label="${i + 1} из ${imgs.length}" data-zoom>
      <img src="${im.set ? up(p.images[im.i].thumb) : im.full}" ${im.set ? `srcset="${im.set}" sizes="(min-width: 1024px) 56vw, 100vw"` : ''} alt="${esc(im.alt)}${imgs.length > 1 ? ', фото ' + (i + 1) : ''}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" draggable="false">
    </figure>`).join('');
  const thumbs = $('[data-gallery-thumbs]');
  thumbs.innerHTML = imgs.map((im, i) => `<button class="thumb stage" type="button" role="tab" aria-label="Фото ${i + 1}" data-thumb="${i}"><img src="${im.set ? up(p.images[im.i].thumb) : im.full}" alt="" loading="lazy"></button>`).join('');
  $('[data-gallery-dots]').innerHTML = imgs.map(() => '<span></span>').join('');
  if (imgs.length < 2) $('[data-gallery]').classList.add('is-single');

  let current = 0;
  const slides = $$('.gallery__slide', track);
  function setActive(i) {
    current = i;
    $$('[data-thumb]', thumbs).forEach((t, k) => { t.classList.toggle('is-active', k === i); t.setAttribute('aria-selected', String(k === i)); });
    $$('span', $('[data-gallery-dots]')).forEach((d, k) => d.classList.toggle('is-active', k === i));
    $('[data-gallery-counter]').textContent = `${i + 1} / ${imgs.length}`;
    $('[data-gallery-prev]').disabled = i === 0;
    $('[data-gallery-next]').disabled = i === imgs.length - 1;
    const t = $(`[data-thumb="${i}"]`, thumbs); if (t) thumbs.scrollTo({ left: t.offsetLeft - thumbs.clientWidth / 2 + t.clientWidth / 2, behavior: 'smooth' });
  }
  const go = (i) => { i = Math.max(0, Math.min(imgs.length - 1, i)); track.scrollTo({ left: slides[i].offsetLeft, behavior: A.reduceMotion ? 'auto' : 'smooth' }); setActive(i); };
  // native scroll-snap gives touch swipe; keep the index in sync
  let st; track.addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(() => setActive(Math.round(track.scrollLeft / track.clientWidth)), 60); }, { passive: true });
  $('[data-gallery-prev]').addEventListener('click', () => go(current - 1));
  $('[data-gallery-next]').addEventListener('click', () => go(current + 1));
  thumbs.addEventListener('click', (e) => { const t = e.target.closest('[data-thumb]'); if (t) go(Number(t.dataset.thumb)); });
  track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); } if (e.key === 'Enter') openLb(current); });
  setActive(0);
  // matching name for the card → product image morph
  if (slides[0]) slides[0].style.viewTransitionName = 'pimg';

  // Desktop hover zoom (follows the cursor)
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    slides.forEach((s) => {
      const img = $('img', s);
      s.addEventListener('mousemove', (e) => { const r = s.getBoundingClientRect(); img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`; s.classList.add('is-zoom'); });
      s.addEventListener('mouseleave', () => s.classList.remove('is-zoom'));
    });
  }

  /* ---------- Lightbox ---------- */
  const lb = $('[data-lightbox]'); const lbImg = $('[data-lb-img]'); let lbIndex = 0;
  $('[data-lb-thumbs]').innerHTML = imgs.map((im, i) => `<button class="stage" type="button" data-lb-thumb="${i}" aria-label="Фото ${i + 1}"><img src="${im.set ? up(p.images[im.i].thumb) : im.full}" alt="" loading="lazy"></button>`).join('');
  let showLb = function (i) {
    lbIndex = (i + imgs.length) % imgs.length;
    lbImg.classList.remove('is-zoomed');
    lbImg.style.opacity = 0;
    const im = imgs[lbIndex];
    lbImg.onload = () => (lbImg.style.opacity = 1);
    lbImg.src = im.full; lbImg.alt = im.alt;
    $('[data-lb-counter]').textContent = `${p.name} · ${lbIndex + 1} / ${imgs.length}`;
    $$('[data-lb-thumb]').forEach((b, k) => b.classList.toggle('is-active', k === lbIndex));
  };
  function openLb(i) { showLb(i); A.openOverlay(lb, { focus: '[data-lb-close]' }); }
  $('[data-gallery-open]').addEventListener('click', () => openLb(current));
  track.addEventListener('click', (e) => { if (e.target.closest('.gallery__slide')) openLb(current); });
  $('[data-lb-close]').addEventListener('click', () => { A.closeOverlay(lb); go(lbIndex); });
  $('[data-lb-prev]').addEventListener('click', () => showLb(lbIndex - 1));
  $('[data-lb-next]').addEventListener('click', () => showLb(lbIndex + 1));
  $('[data-lb-thumbs]').addEventListener('click', (e) => { const b = e.target.closest('[data-lb-thumb]'); if (b) showLb(Number(b.dataset.lbThumb)); });
  /* Inspection viewer: click/tap zooms to the point, wheel / pinch / +− change zoom, drag pans. */
  const zoom = { s: 1, x: 0, y: 0 };
  const stage = $('[data-lb-stage]');
  const zoomLabel = $('[data-lb-zoom-label]');
  const clampPan = () => {
    const r = lbImg.getBoundingClientRect(); const w = r.width / zoom.s; const h = r.height / zoom.s;
    const mx = (w * (zoom.s - 1)) / 2; const my = (h * (zoom.s - 1)) / 2;
    zoom.x = Math.max(-mx, Math.min(mx, zoom.x)); zoom.y = Math.max(-my, Math.min(my, zoom.y));
  };
  const applyZoom = (animate = true) => {
    clampPan();
    lbImg.style.transition = animate ? '' : 'none';
    lbImg.style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`;
    lbImg.classList.toggle('is-zoomed', zoom.s > 1);
    if (zoomLabel) zoomLabel.textContent = `${Math.round(zoom.s * 100)}%`;
  };
  const setZoom = (s, cx, cy) => {
    const r = lbImg.getBoundingClientRect();
    const ox = cx === undefined ? 0 : cx - (r.left + r.width / 2); const oy = cy === undefined ? 0 : cy - (r.top + r.height / 2);
    const k = Math.max(1, Math.min(4, s)) / zoom.s;
    zoom.x = (zoom.x - ox) * k + ox; zoom.y = (zoom.y - oy) * k + oy; zoom.s *= k;
    if (zoom.s === 1) { zoom.x = 0; zoom.y = 0; }
    applyZoom();
  };
  const resetZoom = () => { zoom.s = 1; zoom.x = 0; zoom.y = 0; applyZoom(false); };
  const _showLb = showLb; showLb = (i) => { resetZoom(); _showLb(i); }; // eslint-disable-line no-func-assign
  let drag = null; let moved = false; const pointers = new Map(); let pinch0 = 0;
  lbImg.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, e); lbImg.setPointerCapture(e.pointerId); moved = false;
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / zoom.s; }
    else drag = { x: e.clientX - zoom.x, y: e.clientY - zoom.y };
  });
  lbImg.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, e);
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; setZoom(Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch0); moved = true; return; }
    if (drag && zoom.s > 1) { zoom.x = e.clientX - drag.x; zoom.y = e.clientY - drag.y; moved = moved || Math.abs(e.movementX) + Math.abs(e.movementY) > 1; applyZoom(false); }
  });
  const endPointer = (e) => { pointers.delete(e.pointerId); if (!pointers.size) drag = null; };
  lbImg.addEventListener('pointerup', (e) => { endPointer(e); if (!moved) setZoom(zoom.s > 1 ? 1 : 2.5, e.clientX, e.clientY); });
  lbImg.addEventListener('pointercancel', endPointer);
  stage.addEventListener('wheel', (e) => { if (!lb.classList.contains('is-open')) return; e.preventDefault(); setZoom(zoom.s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY); }, { passive: false });
  $('[data-lb-zoom-in]')?.addEventListener('click', () => setZoom(zoom.s * 1.5));
  $('[data-lb-zoom-out]')?.addEventListener('click', () => setZoom(zoom.s / 1.5));
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'ArrowRight') showLb(lbIndex + 1);
    if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
    if (e.key === '+' || e.key === '=') setZoom(zoom.s * 1.5);
    if (e.key === '-') setZoom(zoom.s / 1.5);
    if (e.key === '0') resetZoom();
  });
  // swipe between photos (only when not zoomed)
  let sx = null;
  stage.addEventListener('touchstart', (e) => { sx = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
  stage.addEventListener('touchend', (e) => { if (sx === null || zoom.s > 1) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) showLb(lbIndex + (dx < 0 ? 1 : -1)); sx = null; });
  if (imgs.length < 2) $$('[data-lb-prev], [data-lb-next]').forEach((b) => (b.hidden = true));

  /* ---------- Description ---------- */
  const desc = $('[data-pp-desc]');
  // the first paragraph is already shown in full in the buy box — don't repeat it
  const blocks = p.description.slice();
  if (leadText && !leadTruncated) blocks.splice(blocks.findIndex((b) => b.type === 'p'), 1);
  const intro = []; const sections = []; const outro = [];
  let cur = null;
  blocks.forEach((b) => {
    if (b.type === 'heading') { cur = { title: b.text, items: [], text: [] }; sections.push(cur); return; }
    if (b.type === 'list') { (cur || (cur = { title: '', items: [], text: [] }, sections.push(cur), cur)).items.push(...b.items); return; }
    if (cur && cur.items.length) { outro.push(b.text); return; }
    if (cur) cur.text.push(b.text); else intro.push(b.text);
  });
  desc.innerHTML = `
    ${intro.length ? `<div class="pp-desc__intro prose">${intro.map((t) => `<p>${esc(t)}</p>`).join('')}</div>` : ''}
    ${sections.length ? `<div class="pp-desc__cols">${sections.map((s, i) => `
      <div class="pp-desc__col panel panel--pad reveal" style="--i:${i}">
        ${s.title ? `<h3 class="h3">${esc(s.title)}</h3>` : ''}
        ${s.text.map((t) => `<p class="muted">${esc(t)}</p>`).join('')}
        ${s.items.length ? `<ul class="check-list">${s.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      </div>`).join('')}</div>` : ''}
    ${outro.length ? `<div class="pp-desc__outro prose">${outro.map((t) => `<p>${esc(t)}</p>`).join('')}</div>` : ''}`;

  /* ---------- Specs ---------- */
  const specs = $('[data-pp-specs]');
  const rows = p.specs.map((s) => `<tr><th scope="row">${esc(s.label)}</th><td>${esc(s.value.replace(/\.$/, ''))}</td></tr>`).join('');
  const featureRows = p.features.map((f) => { const m = f.match(/^(.+?)\s*[-—]\s*(.+)$/) || f.match(/^(размер профиля|посадочный диаметр диска)\s+(.+)$/i); return m ? `<tr><th scope="row">${esc(m[1].charAt(0).toUpperCase() + m[1].slice(1))}</th><td>${esc(m[2].replace(/\.$/, ''))}</td></tr>` : null; });
  const plainFeatures = p.features.filter((f, i) => !featureRows[i]);
  const tableHtml = rows + featureRows.filter(Boolean).join('');
  if (!tableHtml && !plainFeatures.length && !p.packaging.length) {
    specs.innerHTML = `<div class="panel panel--pad"><p class="muted">Подробные характеристики этой модели пока не опубликованы на сайте — уточните их у менеджера.</p><button class="btn btn--outline" style="margin-top:16px" type="button" data-quote-open data-product="${p.id}" data-quote-title="Характеристики: ${esc(p.name)}">${icon('file')}Запросить характеристики</button></div>`;
  } else {
    specs.innerHTML = `
      ${tableHtml ? `<div class="panel panel--pad"><table class="spec-table"><caption class="sr-only">Характеристики ${esc(p.name)}</caption><tbody>${tableHtml}</tbody></table></div>` : ''}
      ${plainFeatures.length ? `<div class="panel panel--pad"><h3 class="h4" style="margin-bottom:14px">Конструкция и регулировки</h3><ul class="check-list">${plainFeatures.map((f) => `<li>${esc(f.charAt(0).toUpperCase() + f.slice(1).replace(/\.$/, ''))}</li>`).join('')}</ul></div>` : ''}
      ${p.packaging.length ? `<div class="acc"><div class="acc__item"><button class="acc__btn" type="button" aria-expanded="false" aria-controls="acc-pack">Упаковка и отгрузка<span class="acc__icon" aria-hidden="true"></span></button><div class="acc__panel" id="acc-pack"><div><div class="acc__content"><ul class="pack-list">${p.packaging.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div></div></div></div>` : ''}`;
  }

  /* ---------- Fit check: will it fit in your room? (from the real "Габариты") ---------- */
  const dimSpec = p.specs.find((s) => /^габарит/i.test(s.label));
  const dimNums = dimSpec ? (dimSpec.value.match(/\d{3,5}/g) || []).map(Number) : [];
  if (dimNums.length >= 2) {
    const [eqL, eqW] = dimNums; // manufacturer order: Д × Ш × В
    specs.insertAdjacentHTML('beforeend', `
      <div class="fit panel panel--pad" data-fit>
        <div class="fit__head">
          <div><h3 class="h4">Поместится ли в ваш зал?</h3><p class="muted small">Введите размеры помещения — покажем, сколько места займёт тренажёр.</p></div>
          <span class="fit__status" data-fit-status></span>
        </div>
        <div class="fit__body">
          <form class="fit__form" data-fit-form>
            <label class="field"><span class="field__label">Длина помещения, м</span><input class="input input--plain" type="number" inputmode="decimal" min="1" max="100" step="0.1" value="6" name="L"></label>
            <label class="field"><span class="field__label">Ширина помещения, м</span><input class="input input--plain" type="number" inputmode="decimal" min="1" max="100" step="0.1" value="4" name="W"></label>
            <label class="checkbox"><input type="checkbox" name="rot"><span>Повернуть тренажёр на 90°</span></label>
          </form>
          <div class="fit__plan"><svg data-fit-svg role="img" aria-label="План помещения сверху"></svg></div>
        </div>
        <p class="fit__summary" data-fit-summary aria-live="polite"></p>
        <a class="btn btn--outline btn--sm" href="planner.html?add=${encodeURIComponent(p.slug)}">${icon('grid')}Расставить в конструкторе зала</a>
        <p class="form-note">Расчёт по габаритам производителя (${esc(dimSpec.value.replace(/\.$/, ''))} мм, порядок Д×Ш×В). Оставьте место для подхода к тренажёру и загрузки дисков.</p>
      </div>`);
    const fitForm = $('[data-fit-form]'); const svg = $('[data-fit-svg]');
    const fmtM = (mm) => (mm / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
    const renderFit = () => {
      const fd = new FormData(fitForm);
      const L = Math.max(1, Number(String(fd.get('L')).replace(',', '.')) || 1) * 1000;
      const W = Math.max(1, Number(String(fd.get('W')).replace(',', '.')) || 1) * 1000;
      const rot = !!fd.get('rot');
      const eL = rot ? eqW : eqL; const eW = rot ? eqL : eqW;
      const fits = eL <= L && eW <= W;
      const pad = 60; const vbW = 1000; const scale = (vbW - pad * 2) / L; const vbH = W * scale + pad * 2;
      const rx = pad + (L - eL) / 2 * scale; const ry = pad + (W - eW) / 2 * scale;
      svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
      svg.innerHTML = `
        <defs><pattern id="fitgrid" width="${1000 * scale}" height="${1000 * scale}" patternUnits="userSpaceOnUse" x="${pad}" y="${pad}"><path d="M ${1000 * scale} 0 L 0 0 0 ${1000 * scale}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="1"/></pattern></defs>
        <rect x="${pad}" y="${pad}" width="${L * scale}" height="${W * scale}" fill="url(#fitgrid)" stroke="rgba(255,255,255,.55)" stroke-width="3"/>
        <text x="${vbW / 2}" y="${pad - 18}" text-anchor="middle" class="fit__t">${fmtM(L)} м</text>
        <text x="${pad - 18}" y="${pad + W * scale / 2}" text-anchor="middle" class="fit__t" transform="rotate(-90 ${pad - 18} ${pad + W * scale / 2})">${fmtM(W)} м</text>
        <rect class="fit__eq ${fits ? '' : 'is-bad'}" x="${rx}" y="${ry}" width="${eL * scale}" height="${eW * scale}" rx="6"/>
        <text x="${rx + eL * scale / 2}" y="${ry + eW * scale / 2}" text-anchor="middle" dominant-baseline="middle" class="fit__t fit__t--eq">${fmtM(eL)} × ${fmtM(eW)} м</text>`;
      const area = (eL * eW) / 1e6; const roomArea = (L * W) / 1e6;
      const st = $('[data-fit-status]');
      st.className = `fit__status ${fits ? 'is-ok' : 'is-bad'}`;
      st.textContent = fits ? 'Помещается' : 'Не помещается';
      $('[data-fit-summary]').innerHTML = fits
        ? `Тренажёр займёт <b>${area.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} м²</b> — ${Math.round((area / roomArea) * 100)}% площади. Свободно по длине — <b>${fmtM(L - eL)} м</b>, по ширине — <b>${fmtM(W - eW)} м</b>.`
        : `Не хватает ${eL > L ? `<b>${fmtM(eL - L)} м</b> по длине` : ''}${eL > L && eW > W ? ' и ' : ''}${eW > W ? `<b>${fmtM(eW - W)} м</b> по ширине` : ''}.${!rot && eqW <= L && eqL <= W ? ' Попробуйте повернуть тренажёр.' : ''}`;
    };
    fitForm.addEventListener('input', renderFit);
    renderFit();
  }

  /* ---------- Related ---------- */
  const related = DATA.products.filter((x) => x.id !== p.id && x.type === p.type)
    .concat(DATA.products.filter((x) => x.id !== p.id && x.type !== p.type && x.category === p.category))
    .sort((a, b) => (b.type === p.type) - (a.type === p.type) || (b.price ? 1 : 0) - (a.price ? 1 : 0)).slice(0, 4);
  $('[data-related]').innerHTML = related.map((x, i) => productCard(x, { i })).join('');
  $('[data-related-link]').href = catalogUrl({ type: p.type });

  /* ---------- Consultation ---------- */
  A.bindForm($('[data-form="consult"]'), {
    compose: (f, fd) => ({ name: fd.get('name'), phone: fd.get('phone'), message: [`Консультация по товару: ${p.name}${p.sku ? ' (' + p.sku + ')' : ''}`, `Ссылка: ${p.url}`, fd.get('message') ? `Вопрос: ${fd.get('message')}` : '', `Страница: ${location.href}`].filter(Boolean).join('\n') }),
  });

  /* ---------- Section tabs (scroll spy) ---------- */
  const tabLinks = $$('[data-pp-tabs] a');
  const spy = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) tabLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('.pp-section').forEach((s) => spy.observe(s));

  /* ---------- Mobile buy bar ---------- */
  const bar = $('[data-buybar]');
  $('[data-buybar-name]').textContent = p.name;
  $('[data-buybar-price]').textContent = p.price ? price(p.price) : 'Цена по запросу';
  $('[data-buybar-action]').innerHTML = p.price
    ? `<button class="btn btn--primary" type="button" data-add-cart="${p.id}">${icon('cart')}В корзину</button>`
    : `<button class="btn btn--primary" type="button" data-quote-open data-product="${p.id}">Узнать цену</button>`;
  const mainCta = $('[data-main-cta]');
  const footer = $('.site-footer');
  let ctaVisible = true; let footerVisible = false;
  const syncBar = () => {
    const show = !ctaVisible && !footerVisible && window.matchMedia('(max-width: 1023px)').matches;
    bar.classList.toggle('is-visible', show); bar.setAttribute('aria-hidden', String(!show));
    document.body.classList.toggle('has-buybar', show);
  };
  // scroll-based (not IntersectionObserver) so fast jumps / restored scroll positions are handled too
  let raf = 0;
  const measure = () => {
    raf = 0;
    ctaVisible = mainCta.getBoundingClientRect().bottom > 0;
    footerVisible = footer.getBoundingClientRect().top < window.innerHeight;
    syncBar();
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  measure();

  A.renderRecent(p.id);
  A.observeReveals();
})();
