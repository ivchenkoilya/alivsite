/* =========================================================================
   ALIV SPORT — core: data helpers, store (cart / favourites), UI primitives
   No dependencies. Exposes window.ALIV for page modules.
   ========================================================================= */
(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');

  const CFG = window.ALIV_CONFIG;
  const DATA = window.ALIV_DATA || { products: [], categories: [], types: {} };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

  /* ---------------- Data helpers ---------------- */
  const byId = new Map(DATA.products.map((p) => [p.id, p]));
  const bySlug = new Map(DATA.products.map((p) => [p.slug, p]));
  const catBySlug = new Map(DATA.categories.map((c) => [c.slug, c]));
  const up = (rel) => (/^https?:/.test(rel) ? rel : DATA.uploads + rel);
  const srcset = (s) => String(s || '').split(', ').map((part) => up(part)).join(', ');
  const fmt = (n) => new Intl.NumberFormat('ru-RU').format(n).replace(/ /g, ' ');
  const price = (n) => (n ? `${fmt(n)} ₽` : 'Цена по запросу');
  const productUrl = (p) => `product.html?slug=${encodeURIComponent(p.slug)}`;
  const catalogUrl = (params = {}) => 'catalog.html' + (Object.keys(params).length ? '?' + new URLSearchParams(params) : '');
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? few : many;
  };
  const shortSpec = (p) => {
    const m = p.metrics.find((x) => x.id === 'load') || p.metrics.find((x) => x.id === 'dims') || p.metrics.find((x) => x.id === 'weight');
    return m ? `${m.label}: ${m.value}` : '';
  };
  /** <img> for a product image on the light studio stage */
  const productImg = (img, { sizes = '(min-width: 1280px) 22vw, (min-width: 720px) 30vw, 46vw', eager = false, cls = '' } = {}) =>
    img ? `<img class="${cls}" src="${up(img.thumb || img.src)}" srcset="${srcset(img.srcset)}" sizes="${sizes}" alt="${esc(img.alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" width="430" height="573">` : '';

  /* ---------------- Storage (fails soft) ---------------- */
  const storage = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ } },
  };

  /* ---------------- Event bus ---------------- */
  const bus = new EventTarget();
  const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));
  const on = (name, fn) => bus.addEventListener(name, (e) => fn(e.detail));

  /* ---------------- Cart ---------------- */
  const cart = {
    items: storage.get('aliv.cart', []).filter((i) => byId.has(i.id)),
    save() { storage.set('aliv.cart', this.items); emit('cart', this); },
    count() { return this.items.reduce((a, i) => a + i.qty, 0); },
    has(id) { return this.items.some((i) => i.id === id); },
    add(id, qty = 1) {
      const it = this.items.find((i) => i.id === id);
      if (it) it.qty = Math.min(99, it.qty + qty); else this.items.push({ id, qty });
      this.save();
    },
    setQty(id, qty) { const it = this.items.find((i) => i.id === id); if (!it) return; it.qty = Math.max(1, Math.min(99, qty | 0)); this.save(); },
    remove(id) { this.items = this.items.filter((i) => i.id !== id); this.save(); },
    clear() { this.items = []; this.save(); },
    lines() { return this.items.map((i) => ({ ...i, product: byId.get(i.id) })); },
    total() { return this.lines().reduce((a, l) => a + (l.product.price || 0) * l.qty, 0); },
    hasRequestItems() { return this.lines().some((l) => !l.product.price); },
  };

  /* ---------------- Favourites ---------------- */
  const favs = {
    ids: storage.get('aliv.favs', []).filter((id) => byId.has(id)),
    has(id) { return this.ids.includes(id); },
    toggle(id) {
      const added = !this.has(id);
      this.ids = added ? [...this.ids, id] : this.ids.filter((x) => x !== id);
      storage.set('aliv.favs', this.ids); emit('favs', this);
      return added;
    },
  };

  /* ---------------- Compare (max 4) ---------------- */
  const COMPARE_MAX = 4;
  const compare = {
    ids: storage.get('aliv.compare', []).filter((id) => byId.has(id)).slice(0, COMPARE_MAX),
    has(id) { return this.ids.includes(id); },
    save() { storage.set('aliv.compare', this.ids); emit('compare', this); },
    toggle(id) {
      if (this.has(id)) { this.ids = this.ids.filter((x) => x !== id); this.save(); return false; }
      if (this.ids.length >= COMPARE_MAX) return null;
      this.ids = [...this.ids, id]; this.save(); return true;
    },
    drop(id) { this.ids = this.ids.filter((x) => x !== id); this.save(); },
    clear() { this.ids = []; this.save(); },
  };

  /* ---------------- Recently viewed (last 12, newest first) ---------------- */
  const recent = {
    ids: () => storage.get('aliv.recent', []).filter((id) => byId.has(id)),
    push(id) { storage.set('aliv.recent', [id, ...recent.ids().filter((x) => x !== id)].slice(0, 12)); },
  };

  /* ---------------- Toasts ---------------- */
  function toast(message, { type = 'info', action } = {}) {
    const host = $('[data-toasts]'); if (!host) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `${icon(type === 'ok' ? 'check-circle' : 'info')}<span>${message}</span>${action ? `<a href="${action.href}">${action.label}</a>` : '<span></span>'}`;
    host.appendChild(el);
    while (host.children.length > 3) host.firstElementChild.remove();
    setTimeout(() => { el.classList.add('is-leaving'); el.addEventListener('animationend', () => el.remove(), { once: true }); }, 3800);
  }

  /* ---------------- Product card ---------------- */
  /** Art-directed dark render (IMAGE_REQUESTS.md №12), if one has been provided in config.js */
  const darkImg = (p) => (CFG.images['product-dark'] || {})[p.slug] || null;
  function productCard(p, { i = 0, reveal = true } = {}) {
    const fav = favs.has(p.id);
    const inCart = cart.has(p.id);
    const cat = catBySlug.get(p.category);
    const second = p.images[1];
    const cta = p.price
      ? `<button class="p-card__cta ${inCart ? 'is-added' : ''}" type="button" data-add-cart="${p.id}" aria-label="${inCart ? 'Добавлено в корзину' : 'В корзину'}: ${esc(p.name)}">${icon(inCart ? 'check' : 'cart-plus')}</button>`
      : `<button class="p-card__cta" type="button" data-quote-open data-product="${p.id}" aria-label="Запросить цену: ${esc(p.name)}">${icon('message')}</button>`;
    return `
    <article class="p-card ${reveal ? 'reveal' : ''}" style="--i:${i % 6}">
      <div class="p-card__media">
        ${darkImg(p)
          ? `<div class="stage stage--dark"><img class="p-card__img-1" src="${esc(darkImg(p))}" alt="${esc(p.name)}" loading="lazy" decoding="async" width="1200" height="1500"></div>`
          : `<div class="stage">${productImg(p.images[0], { cls: 'p-card__img-1' })}${second ? productImg(second, { cls: 'p-card__img-2' }) : ''}</div>`}
        <div class="p-card__tags">${p.sku ? `<span class="tag">${esc(p.sku)}</span>` : ''}</div>
        <button class="icon-btn p-card__fav ${fav ? 'is-active' : ''}" type="button" data-fav="${p.id}" aria-pressed="${fav}" aria-label="В избранное: ${esc(p.name)}">${icon('heart')}</button>
        <button class="icon-btn p-card__cmp ${compare.has(p.id) ? 'is-active' : ''}" type="button" data-compare="${p.id}" aria-pressed="${compare.has(p.id)}" aria-label="Сравнить: ${esc(p.name)}" title="Сравнить">${icon('layers')}</button>
      </div>
      <div class="p-card__body">
        <p class="p-card__cat">${esc(DATA.types[p.type] || cat?.name || '')}</p>
        <h3 class="p-card__title"><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
        ${shortSpec(p) ? `<p class="p-card__spec">${esc(shortSpec(p))}</p>` : ''}
        <div class="p-card__foot">
          <span class="price ${p.price ? '' : 'price--request'}">${price(p.price)}</span>
          ${cta}
        </div>
      </div>
    </article>`;
  }

  /* Global delegated actions: cart, favourites */
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add-cart]');
    if (add) {
      e.preventDefault();
      const id = Number(add.dataset.addCart);
      const qtyInput = add.dataset.qtyFrom ? $(add.dataset.qtyFrom) : null;
      const qty = qtyInput ? Math.max(1, Number(qtyInput.value) || 1) : 1;
      cart.add(id, qty);
      const p = byId.get(id);
      toast(`«${esc(p.name)}» в корзине`, { type: 'ok', action: { href: 'cart.html', label: 'Оформить' } });
      return;
    }
    const cmp = e.target.closest('[data-compare]');
    if (cmp) {
      e.preventDefault();
      const r = compare.toggle(Number(cmp.dataset.compare));
      if (r === null) toast(`В сравнении уже ${COMPARE_MAX} модели — уберите одну`, { action: { href: 'compare.html', label: 'Открыть' } });
      else toast(r ? 'Добавлено к сравнению' : 'Убрано из сравнения', { type: r ? 'ok' : 'info', action: r ? { href: 'compare.html', label: 'Сравнить' } : null });
      return;
    }
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      e.preventDefault();
      const id = Number(fav.dataset.fav);
      const added = favs.toggle(id);
      toast(added ? 'Добавлено в избранное' : 'Удалено из избранного', { type: added ? 'ok' : 'info', action: added ? { href: 'favorites.html', label: 'Открыть' } : null });
    }
  });

  function syncCardStates() {
    $$('[data-fav]').forEach((b) => {
      const on = favs.has(Number(b.dataset.fav));
      b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on);
      if (b.dataset.favLabel !== undefined) b.querySelector('[data-fav-text]') && (b.querySelector('[data-fav-text]').textContent = on ? 'В избранном' : 'В избранное');
    });
    $$('[data-compare]').forEach((b) => { const on = compare.has(Number(b.dataset.compare)); b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on); });
    $$('.p-card__cta[data-add-cart]').forEach((b) => {
      const on = cart.has(Number(b.dataset.addCart));
      b.classList.toggle('is-added', on);
      b.innerHTML = icon(on ? 'check' : 'cart-plus');
    });
  }

  function badge(el, n, bump) {
    if (!el) return;
    el.textContent = n > 99 ? '99+' : n;
    el.classList.toggle('is-on', n > 0);
    if (bump && !reduceMotion) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  }
  on('cart', () => { badge($('[data-cart-count]'), cart.count(), true); renderMiniCart(); syncCardStates(); });
  on('favs', () => { badge($('[data-fav-count]'), favs.ids.length, true); syncCardStates(); });
  on('compare', () => { renderCompareTray(); syncCardStates(); });

  /* Floating compare tray (hidden on the compare page itself) */
  function renderCompareTray() {
    if (document.body.dataset.page === 'compare') return;
    let tray = $('[data-compare-tray]');
    if (!tray) { tray = document.createElement('div'); tray.className = 'cmp-tray'; tray.setAttribute('data-compare-tray', ''); tray.setAttribute('aria-live', 'polite'); document.body.appendChild(tray); }
    const items = compare.ids.map((id) => byId.get(id));
    tray.classList.toggle('is-visible', items.length > 0);
    document.body.classList.toggle('has-cmp-tray', items.length > 0);
    tray.innerHTML = items.length ? `
      <div class="cmp-tray__items">${items.map((p) => `<span class="cmp-tray__item"><span class="stage">${productImg(p.images[0], { sizes: '48px' })}</span><button type="button" data-compare="${p.id}" aria-label="Убрать ${esc(p.name)} из сравнения">${icon('close')}</button></span>`).join('')}${Array.from({ length: COMPARE_MAX - items.length }, () => '<span class="cmp-tray__slot"></span>').join('')}</div>
      <p class="cmp-tray__label"><b>${items.length}</b> из ${COMPARE_MAX} в сравнении</p>
      <a class="btn btn--primary btn--sm" href="compare.html">${icon('layers')}Сравнить</a>` : '';
  }

  /* ---------------- Mini cart (drawer) ---------------- */
  function renderMiniCart() {
    const body = $('[data-cart-mini]'); const foot = $('[data-cart-mini-foot]'); const label = $('[data-cart-count-text]');
    if (!body) return;
    const lines = cart.lines();
    if (label) label.textContent = lines.length ? `· ${cart.count()}` : '';
    if (!lines.length) {
      body.innerHTML = `<div class="empty" style="border:0">${icon('cart')}<p class="h4">Корзина пуста</p><p>Добавьте тренажёры из каталога — или запросите коммерческое предложение на оснащение зала.</p></div>`;
      foot.innerHTML = `<a class="btn btn--primary btn--block" href="catalog.html">Перейти в каталог ${icon('arrow-right', 'i--arrow')}</a>`;
      return;
    }
    body.innerHTML = `<ul class="mini-cart">${lines.map((l) => `
      <li class="mini-cart__item">
        <a class="stage mini-cart__img" href="${productUrl(l.product)}">${productImg(l.product.images[0], { sizes: '72px' })}</a>
        <div class="mini-cart__info">
          <a class="mini-cart__name" href="${productUrl(l.product)}">${esc(l.product.name)}</a>
          <span class="mini-cart__price ${l.product.price ? '' : 'muted'}">${l.product.price ? price(l.product.price * l.qty) : 'Цена по запросу'}</span>
          <div class="mini-cart__row">
            <div class="qty qty--sm">
              <button type="button" data-qty-dec="${l.id}" aria-label="Уменьшить количество" ${l.qty <= 1 ? 'disabled' : ''}>${icon('minus')}</button>
              <input type="number" min="1" max="99" value="${l.qty}" data-qty-input="${l.id}" aria-label="Количество">
              <button type="button" data-qty-inc="${l.id}" aria-label="Увеличить количество">${icon('plus')}</button>
            </div>
            <button class="icon-btn" type="button" data-remove="${l.id}" aria-label="Удалить ${esc(l.product.name)}">${icon('trash')}</button>
          </div>
        </div>
      </li>`).join('')}</ul>`;
    foot.innerHTML = `
      <div class="mini-cart__total"><span>Итого${cart.hasRequestItems() ? ' (без позиций по запросу)' : ''}</span><b>${price(cart.total()) === 'Цена по запросу' ? '—' : price(cart.total())}</b></div>
      <a class="btn btn--primary btn--block" href="cart.html">Оформить заказ ${icon('arrow-right', 'i--arrow')}</a>`;
  }
  document.addEventListener('click', (e) => {
    const dec = e.target.closest('[data-qty-dec]'); const inc = e.target.closest('[data-qty-inc]'); const rm = e.target.closest('[data-remove]');
    if (dec) { const id = Number(dec.dataset.qtyDec); const it = cart.items.find((i) => i.id === id); if (it && it.qty > 1) cart.setQty(id, it.qty - 1); }
    if (inc) { const id = Number(inc.dataset.qtyInc); const it = cart.items.find((i) => i.id === id); if (it) cart.setQty(id, it.qty + 1); }
    if (rm) { const id = Number(rm.dataset.remove); const p = byId.get(id); cart.remove(id); toast(`«${esc(p.name)}» удалён из корзины`); }
  });
  document.addEventListener('change', (e) => {
    const inp = e.target.closest('[data-qty-input]');
    if (inp) cart.setQty(Number(inp.dataset.qtyInput), Number(inp.value) || 1);
  });

  /* ---------------- Focus trap for dialogs ---------------- */
  const focusables = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])';
  let lastFocus = null;
  let openLayer = null;
  function openOverlay(el, { focus } = {}) {
    if (openLayer && openLayer !== el) closeOverlay(openLayer, { restore: false });
    lastFocus = lastFocus || document.activeElement;
    openLayer = el;
    el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    const t = focus ? $(focus, el) : $(focusables, el.querySelector('[role=dialog]') || el);
    setTimeout(() => t && t.focus({ preventScroll: true }), 60);
  }
  function closeOverlay(el, { restore = true } = {}) {
    if (!el) return;
    el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true');
    if (openLayer === el) openLayer = null;
    if (!openLayer) document.body.classList.remove('is-locked');
    $$(`[aria-controls="${el.id}"]`).forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (restore && lastFocus) { lastFocus.focus({ preventScroll: true }); lastFocus = null; }
  }
  document.addEventListener('keydown', (e) => {
    if (!openLayer) return;
    if (e.key === 'Escape') { e.preventDefault(); closeOverlay(openLayer); return; }
    if (e.key === 'Tab') {
      const dlg = openLayer.querySelector('[role=dialog]') || openLayer;
      const f = $$(focusables, dlg).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* Drawers */
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-drawer-open]');
    if (opener) { const d = $(`[data-drawer="${opener.dataset.drawerOpen}"]`); if (d) { lastFocus = opener; opener.setAttribute('aria-expanded', 'true'); openOverlay(d); } return; }
    const closer = e.target.closest('[data-drawer-close]');
    if (closer) closeOverlay(closer.closest('.drawer'));
  });

  /* ---------------- Header ---------------- */
  function initHeader() {
    const header = $('[data-header]');
    const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    const page = document.body.dataset.page;
    $$(`[data-nav="${page}"]`).forEach((a) => a.setAttribute('aria-current', 'page'));
    const dd = $('[data-nav-categories]');
    const typeCounts = DATA.products.reduce((a, p) => ((a[p.type] = (a[p.type] || 0) + 1), a), {});
    const typeLinks = Object.entries(DATA.types).filter(([id]) => typeCounts[id]).map(([id, label]) => ({ href: catalogUrl({ type: id }), label, count: typeCounts[id] }));
    if (dd) dd.innerHTML = typeLinks.map((l) => `<a href="${l.href}">${esc(l.label)}<span>${l.count}</span></a>`).join('') + `<a class="is-all" href="catalog.html">Весь каталог · ${DATA.products.length} ${plural(DATA.products.length, 'модель', 'модели', 'моделей')} ${icon('arrow-right')}</a>`;
    const mob = $('[data-mobile-categories]');
    if (mob) mob.innerHTML = DATA.categories.map((c) => `<a href="${catalogUrl({ cat: c.slug })}">${esc(c.name)}</a>`).join('');
    const foot = $('[data-footer-categories]');
    if (foot) foot.innerHTML += DATA.categories.map((c) => `<li><a href="${catalogUrl({ cat: c.slug })}">${esc(c.name)}</a></li>`).join('');
    $$('[data-year]').forEach((y) => (y.textContent = new Date().getFullYear()));
  }

  /* ---------------- Search overlay ---------------- */
  const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[\s.,\-()]+/g, ' ').trim();
  function searchProducts(q) {
    const nq = norm(q); if (!nq) return [];
    const words = nq.split(' ');
    return DATA.products
      .map((p) => {
        const hay = norm(`${p.name} ${p.sku || ''} ${DATA.types[p.type] || ''}`);
        if (!words.every((w) => hay.includes(w))) return null;
        const score = (norm(p.name).startsWith(nq) ? 3 : 0) + (p.sku && norm(p.sku).includes(nq) ? 2 : 0) + (p.price ? 0.5 : 0);
        return { p, score };
      })
      .filter(Boolean).sort((a, b) => b.score - a.score).map((x) => x.p);
  }
  const highlight = (text, q) => {
    const words = norm(q).split(' ').filter(Boolean);
    let out = esc(text);
    words.forEach((w) => { const re = new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'); out = out.replace(re, '<mark>$1</mark>'); });
    return out;
  };
  function initSearch() {
    const ov = $('[data-search]'); if (!ov) return;
    const input = $('[data-search-input]', ov); const results = $('[data-search-results]', ov);
    let active = -1;
    const popular = DATA.products.filter((p) => p.price).slice(0, 5);
    const render = () => {
      const q = input.value.trim();
      const list = q ? searchProducts(q).slice(0, 8) : popular;
      active = -1;
      results.innerHTML = (q ? '' : '<p class="search-hint caps">Популярные модели</p>') +
        (list.length ? list.map((p, i) => `
          <a class="search-item" href="${productUrl(p)}" role="option" id="sr-${i}">
            <span class="stage search-item__img">${productImg(p.images[0], { sizes: '56px' })}</span>
            <span><span class="search-item__name">${highlight(p.name, q)}</span><br><span class="search-item__meta">${esc(DATA.types[p.type] || '')}${p.sku ? ' · ' + highlight(p.sku, q) : ''}</span></span>
            <span class="search-item__price ${p.price ? '' : 'is-request'}">${p.price ? price(p.price) : 'по запросу'}</span>
          </a>`).join('') + (q ? `<a class="search-item" href="${catalogUrl({ q })}" style="grid-template-columns:1fr auto"><b>Все результаты в каталоге</b>${icon('arrow-right', 'accent')}</a>` : '')
          : `<p class="search-hint">По запросу «${esc(q)}» ничего не найдено. Проверьте написание или посмотрите <a class="text-link" href="price.html">полный прайс-лист</a> — там более 200 позиций.</p>`);
    };
    let t; input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 90); });
    input.addEventListener('keydown', (e) => {
      const items = $$('.search-item', results);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((it, i) => it.classList.toggle('is-active', i === active));
        items[active]?.scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', items[active]?.id || '');
      }
      if (e.key === 'Enter' && active >= 0 && items[active]) { e.preventDefault(); items[active].click(); }
    });
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-search-open]')) { lastFocus = e.target.closest('[data-search-open]'); render(); openOverlay(ov, { focus: '[data-search-input]' }); }
      else if (e.target.closest('[data-search-close]')) closeOverlay(ov);
    });
    document.addEventListener('keydown', (e) => {
      if ((e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault(); render(); openOverlay(ov, { focus: '[data-search-input]' });
      }
    });
  }

  /* ---------------- Forms: validation + CF7 delivery ---------------- */
  const phoneDigits = (v) => String(v).replace(/\D/g, '');
  function maskPhone(input) {
    input.addEventListener('input', () => {
      let d = phoneDigits(input.value);
      if (!d) { input.value = ''; return; }
      if (d[0] === '8') d = '7' + d.slice(1);
      if (d[0] !== '7') d = '7' + d;
      d = d.slice(0, 11);
      const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
      input.value = '+7' + (p[0] ? ` (${p[0]}` : '') + (p[0].length === 3 ? ')' : '') + (p[1] ? ` ${p[1]}` : '') + (p[2] ? `-${p[2]}` : '') + (p[3] ? `-${p[3]}` : '');
    });
  }
  function validate(form) {
    let ok = true;
    $$('input, textarea, select', form).forEach((el) => {
      if (el.type === 'hidden') return;
      const field = el.closest('.field') || el.closest('.checkbox');
      let valid = true;
      const v = el.type === 'checkbox' ? el.checked : el.value.trim();
      if (el.required && !v) valid = false;
      if (valid && el.type === 'tel' && el.value.trim()) valid = phoneDigits(el.value).length === 11;
      if (valid && el.type === 'email' && el.value.trim()) valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim());
      if (field) field.classList.toggle('is-invalid', !valid);
      el.setAttribute('aria-invalid', String(!valid));
      if (!valid && ok) { ok = false; el.focus(); }
    });
    return ok;
  }
  const formMode = () => {
    const m = CFG.forms.mode;
    if (m !== 'auto') return m;
    return CFG.forms.liveHosts.includes(location.hostname) ? 'live' : 'demo';
  };
  /** Sends {name, phone, message} through the site's existing Contact Form 7 form. */
  async function sendRequest({ name, phone, message }) {
    if (formMode() === 'demo') {
      await new Promise((r) => setTimeout(r, 900));
      console.info('[ALIV demo] Заявка не отправлена (демо-режим). Данные:', { name, phone, message });
      return { ok: true, demo: true };
    }
    const f = CFG.forms; const fd = new FormData();
    fd.append('_wpcf7', f.formId); fd.append('_wpcf7_unit_tag', f.unitTag); fd.append('_wpcf7_locale', 'ru_RU'); fd.append('_wpcf7_container_post', '0');
    fd.append(f.fields.name, name); fd.append(f.fields.phone, phone); fd.append(f.fields.message, message);
    const res = await fetch(f.endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status === 'mail_sent') return { ok: true };
    throw new Error(json.message || 'Не удалось отправить форму');
  }
  function setStatus(form, type, html) {
    const s = $('[data-form-status]', form); if (!s) return;
    s.className = `form-status form-status--${type} is-visible`;
    s.innerHTML = `${icon(type === 'ok' ? 'check-circle' : type === 'err' ? 'alert' : 'info')}<span>${html}</span>`;
  }
  /**
   * Wire a form: validation, loading state, delivery, success/error.
   * compose(form) → { name, phone, message } lets each page build its own message body.
   */
  function bindForm(form, { compose, onSuccess } = {}) {
    if (!form || form.dataset.bound) return; form.dataset.bound = '1';
    $$('[data-phone]', form).forEach(maskPhone);
    form.addEventListener('input', (e) => { const f = e.target.closest('.field, .checkbox'); if (f && f.classList.contains('is-invalid')) { f.classList.remove('is-invalid'); } });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = $('[data-form-status]', form); if (status) status.className = 'form-status';
      if (!validate(form)) { setStatus(form, 'err', 'Проверьте отмеченные поля.'); return; }
      const btn = $('[type=submit]', form);
      const fd = new FormData(form);
      let payload;
      try {
        payload = compose ? compose(form, fd) : {
          name: fd.get('name'), phone: fd.get('phone'),
          message: [fd.get('subject'), fd.get('message'), fd.get('email') ? `Эл. почта: ${fd.get('email')}` : '', `Страница: ${location.href}`].filter(Boolean).join('\n'),
        };
      } catch (err) { setStatus(form, 'err', esc(err.message)); return; } // page-specific checks (e.g. reviews)
      btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
      try {
        const r = await sendRequest(payload);
        form.reset();
        setStatus(form, r.demo ? 'info' : 'ok', r.demo
          ? '<b>Демо-режим:</b> форма прошла проверку, но заявка не отправлена — отправка включается на рабочем домене (assets/js/config.js → forms.mode).'
          : '<b>Заявка отправлена.</b> Менеджер свяжется с вами в рабочее время.');
        toast(r.demo ? 'Демо-режим: заявка не отправлена' : 'Заявка отправлена', { type: r.demo ? 'info' : 'ok' });
        onSuccess && onSuccess(r);
      } catch (err) {
        setStatus(form, 'err', `Не удалось отправить заявку (${esc(err.message)}). Позвоните нам: <a class="text-link" href="${CFG.contacts.phoneMainHref}">${CFG.contacts.phoneMain}</a> или напишите на <a class="text-link" href="mailto:${CFG.contacts.email}">${CFG.contacts.email}</a>.`);
      } finally {
        btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy');
      }
    });
  }

  /* ---------------- Quote modal ---------------- */
  function initQuote() {
    const modal = $('[data-modal="quote"]'); if (!modal) return;
    const form = $('[data-form="quote"]', modal);
    const ctx = $('[data-quote-context]', modal);
    let context = null;
    bindForm(form, {
      compose: (f, fd) => ({
        name: fd.get('name'), phone: fd.get('phone'),
        message: [
          context?.title || 'Запрос коммерческого предложения',
          ...(context?.lines || []),
          fd.get('message') ? `Комментарий: ${fd.get('message')}` : '',
          fd.get('email') ? `Эл. почта: ${fd.get('email')}` : '',
          `Страница: ${location.href}`,
        ].filter(Boolean).join('\n'),
      }),
    });
    function open({ product, items, title, kicker } = {}) {
      context = { title: title || 'Запрос коммерческого предложения', lines: [] };
      $('[data-quote-title]', modal).textContent = title || (product ? 'Узнать цену и сроки' : 'Запросить коммерческое предложение');
      $('[data-quote-kicker]', modal).textContent = kicker || (product ? 'Цена по запросу' : 'Для залов, студий и B2B');
      const status = $('[data-form-status]', form); status.className = 'form-status';
      if (product) {
        context.title = `Запрос цены: ${product.name}`;
        context.lines = [`Товар: ${product.name}${product.sku ? ' (' + product.sku + ')' : ''}`, `Ссылка: ${product.url}`];
        ctx.innerHTML = `<div class="modal__product"><span class="stage">${productImg(product.images[0], { sizes: '64px' })}</span><div><b>${esc(product.name)}</b><br><span class="muted small">${product.price ? price(product.price) : 'Цена по запросу'}</span></div></div>`;
      } else if (items && items.length) {
        context.lines = items.map((it) => `• ${it.label}${it.meta ? ' — ' + it.meta : ''}`);
        ctx.innerHTML = `<ul class="modal__list">${items.map((it) => `<li><b>${esc(it.label)}</b><span>${esc(it.meta || '')}</span></li>`).join('')}</ul>`;
      } else ctx.innerHTML = '';
      openOverlay(modal, { focus: '#q-name' });
    }
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-quote-open]');
      if (b) {
        e.preventDefault(); lastFocus = b;
        const p = b.dataset.product ? byId.get(Number(b.dataset.product)) : null;
        const fromCart = b.dataset.quoteCart !== undefined;
        open({ product: p, title: b.dataset.quoteTitle, items: fromCart ? cart.lines().map((l) => ({ label: l.product.name, meta: `${l.qty} шт.` })) : null });
        return;
      }
      if (e.target.closest('[data-modal-close]')) closeOverlay(e.target.closest('.modal'));
    });
    ALIV.openQuote = open;
  }

  /* ---------------- Reveal on scroll ---------------- */
  let io;
  function observeReveals(root = document) {
    const els = $$('.reveal:not(.is-in)', root);
    if (reduceMotion || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
    io = io || new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------------- Count-up for real figures ---------------- */
  function countUp(root = document) {
    $$('[data-count]', root).forEach((el) => {
      const target = Number(el.dataset.count);
      if (reduceMotion) { el.textContent = fmt(target); return; }
      const obs = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return; obs.disconnect();
        const t0 = performance.now(); const dur = 1200;
        const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
      obs.observe(el);
    });
  }

  /* ---------------- Accordion ---------------- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.acc__btn'); if (!b) return;
    const panel = document.getElementById(b.getAttribute('aria-controls'));
    const open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', String(open)); panel.classList.toggle('is-open', open);
  });

  /* ---------------- Image slots (art-directed visuals) ---------------- */
  function applyImageSlots(root = document) {
    const narrow = window.matchMedia('(max-width: 899px)').matches;
    $$('[data-slot]', root).forEach((el) => {
      const mobileSrc = el.dataset.slotMobile && CFG.images[el.dataset.slotMobile];
      const src = (narrow && mobileSrc) || CFG.images[el.dataset.slot];
      if (!src) return;
      const img = el.tagName === 'IMG' ? el : el.querySelector('img');
      if (img) { img.removeAttribute('srcset'); img.src = src; el.classList.remove('media-slot--pending'); }
      else { el.classList.remove('media-slot--pending'); el.innerHTML = `<img src="${src}" alt="${esc(el.dataset.alt || '')}" loading="lazy" decoding="async">`; }
    });
  }

  /* ---------------- Parallax (subtle, hero only) ---------------- */
  function parallax() {
    const els = $$('[data-parallax]'); if (!els.length || reduceMotion) return;
    let ticking = false;
    const update = () => {
      els.forEach((el) => { const k = Number(el.dataset.parallax) || 0.15; const r = el.parentElement.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; el.style.transform = `translate3d(0, ${(-r.top * k).toFixed(1)}px, 0) scale(1.06)`; });
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
    update();
  }

  /* ---------------- Card → product morph (cross-document View Transitions) ---------------- */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.p-card a[href^="product.html"], .search-item[href^="product.html"], .hero-product, .cat-tile');
    if (!link || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    document.querySelectorAll('[style*="view-transition-name"]').forEach((el) => { if (!el.closest('.site-header')) el.style.viewTransitionName = ''; });
    const img = link.closest('.p-card, .search-item, .hero-product, .cat-tile')?.querySelector('.stage');
    if (img) img.style.viewTransitionName = 'pimg';
  });

  /* ---------------- "Недавно смотрели" block (any page that has [data-recent]) ---------------- */
  function renderRecent(excludeId) {
    const box = $('[data-recent]'); if (!box) return;
    const items = recent.ids().filter((id) => id !== excludeId).slice(0, 4).map((id) => byId.get(id));
    box.hidden = !items.length;
    if (items.length) $('[data-recent-grid]', box).innerHTML = items.map((p, i) => productCard(p, { i })).join('');
  }

  /* ---------------- Public API ---------------- */
  const ALIV = window.ALIV = {
    CFG, DATA, $, $$, esc, icon, up, srcset, fmt, price, plural, productUrl, catalogUrl, productImg, productCard, shortSpec,
    byId, bySlug, catBySlug, cart, favs, compare, recent, renderRecent, COMPARE_MAX, on, emit, toast, bindForm, sendRequest, openOverlay, closeOverlay,
    observeReveals, countUp, searchProducts, norm, applyImageSlots, reduceMotion,
  };

  /* ---------------- Boot ---------------- */
  initHeader();
  initSearch();
  initQuote();
  badge($('[data-cart-count]'), cart.count());
  badge($('[data-fav-count]'), favs.ids.length);
  renderMiniCart();
  renderCompareTray();
  applyImageSlots();
  document.addEventListener('DOMContentLoaded', () => { observeReveals(); countUp(); parallax(); });
  // keep state in sync across tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'aliv.cart') { cart.items = storage.get('aliv.cart', []); emit('cart'); }
    if (e.key === 'aliv.favs') { favs.ids = storage.get('aliv.favs', []); emit('favs'); }
  });
})();
