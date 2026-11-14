/* ALIV SPORT — catalog: search, filters, sort, pagination, URL state */
(function () {
  'use strict';
  const A = window.ALIV;
  const { $, $$, DATA, esc, icon, plural, productCard, norm } = A;
  const PAGE = 12;
  const all = DATA.products;

  const TYPE_ICONS = { racks: 'grid', legs: 'gauge', back: 'layers', press: 'target', arms: 'dumbbell', functional: 'sparkle', benches: 'ruler', storage: 'box', other: 'cube' };

  /* ---------- State ---------- */
  const state = { q: '', cat: [], type: [], purpose: [], priced: false, min: null, max: null, sort: 'default', limit: PAGE };
  const params = new URLSearchParams(location.search);
  const list = (k) => (params.get(k) ? params.get(k).split(',').filter(Boolean) : []);
  state.q = params.get('q') || '';
  state.cat = list('cat'); state.type = list('type'); state.purpose = list('purpose');
  state.priced = params.get('priced') === '1';
  state.min = Number(params.get('min')) || null; state.max = Number(params.get('max')) || null;
  if (state.max && !params.has('priced')) state.priced = true; // budget from the home selector
  state.sort = params.get('sort') || 'default';

  /* ---------- Filtering ---------- */
  function matches(p, s, skip) {
    if (s.q) { const hay = norm(`${p.name} ${p.sku || ''} ${DATA.types[p.type]}`); if (!norm(s.q).split(' ').every((w) => hay.includes(w))) return false; }
    if (skip !== 'cat' && s.cat.length && !s.cat.includes(p.category)) return false;
    if (skip !== 'type' && s.type.length && !s.type.includes(p.type)) return false;
    if (skip !== 'purpose' && s.purpose.length && !s.purpose.includes(p.purpose)) return false;
    if (skip !== 'price') {
      if (s.priced && !p.price) return false;
      if ((s.min || s.max) && p.price) { if (s.min && p.price < s.min) return false; if (s.max && p.price > s.max) return false; }
      if ((s.min || s.max) && !p.price && s.priced) return false;
    }
    return true;
  }
  const sorters = {
    default: (a, b) => a.order - b.order,
    'price-asc': (a, b) => (a.price || Infinity) - (b.price || Infinity) || a.order - b.order,
    'price-desc': (a, b) => (b.price || -1) - (a.price || -1) || a.order - b.order,
    name: (a, b) => a.name.localeCompare(b.name, 'ru'),
  };
  const results = () => all.filter((p) => matches(p, state)).sort(sorters[state.sort] || sorters.default);

  /* ---------- Build filter UI ---------- */
  const form = $('[data-filter-form]');
  $('[data-f-cats]').innerHTML = DATA.categories.map((c) => `<label class="checkbox"><input type="checkbox" name="cat" value="${c.slug}"><span>${esc(c.name)}</span><span class="checkbox__count" data-count-cat="${c.slug}"></span></label>`).join('');
  const typeIds = Object.keys(DATA.types).filter((id) => all.some((p) => p.type === id));
  $('[data-f-types]').innerHTML = typeIds.map((id) => `<label class="checkbox"><input type="checkbox" name="type" value="${id}"><span>${esc(DATA.types[id])}</span><span class="checkbox__count" data-count-type="${id}"></span></label>`).join('');
  $('[data-type-rail]').innerHTML = `<button class="type-pill" type="button" data-type-pill="" aria-pressed="false">${icon('grid')}<span>Всё оборудование</span></button>` +
    typeIds.map((id) => `<button class="type-pill" type="button" data-type-pill="${id}" aria-pressed="false">${icon(TYPE_ICONS[id] || 'cube')}<span>${esc(DATA.types[id])}</span></button>`).join('');

  function syncInputs() {
    $$('input[name=cat]', form).forEach((i) => (i.checked = state.cat.includes(i.value)));
    $$('input[name=type]', form).forEach((i) => (i.checked = state.type.includes(i.value)));
    $$('input[name=purpose]', form).forEach((i) => (i.checked = state.purpose.includes(i.value)));
    $('input[name=priced]', form).checked = state.priced;
    $('[data-price-min]').value = state.min || ''; $('[data-price-max]').value = state.max || '';
    $('[data-q]').value = state.q; $('[data-sort]').value = state.sort;
  }

  function updateCounts() {
    const c = (skip, fn) => all.filter((p) => matches(p, state, skip) && fn(p)).length;
    $$('[data-count-cat]').forEach((el) => { const n = c('cat', (p) => p.category === el.dataset.countCat); el.textContent = n; el.closest('.checkbox').classList.toggle('is-zero', !n); });
    $$('[data-count-type]').forEach((el) => { const n = c('type', (p) => p.type === el.dataset.countType); el.textContent = n; el.closest('.checkbox').classList.toggle('is-zero', !n); });
    $$('[data-count-purpose]').forEach((el) => { const n = c('purpose', (p) => p.purpose === el.dataset.countPurpose); el.textContent = n; el.closest('.checkbox').classList.toggle('is-zero', !n); });
    $('[data-count-priced]').textContent = c('price', (p) => !!p.price);
  }

  /* ---------- Render ---------- */
  const grid = $('[data-grid]');
  let lastKey = '';
  function render({ append = false } = {}) {
    const res = results();
    const shown = res.slice(0, state.limit);
    const n = res.length;
    $('[data-found]').innerHTML = `Найдено: <b>${n}</b> ${plural(n, 'модель', 'модели', 'моделей')}`;
    $('[data-apply-count]').textContent = `(${n})`;

    if (!n) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${icon('search')}<p class="h4">Ничего не найдено</p><p>Под выбранные условия моделей нет. Сбросьте часть фильтров или поищите в полном прайс-листе — там более 200 позиций.</p><div class="flex wrap gap-3" style="justify-content:center"><button class="btn btn--primary" type="button" data-reset>Сбросить фильтры</button><a class="btn btn--outline" href="price.html${state.q ? '?q=' + encodeURIComponent(state.q) : ''}">Искать в прайс-листе</a></div></div>`;
    } else if (append) {
      const from = grid.children.length;
      grid.insertAdjacentHTML('beforeend', shown.slice(from).map((p, i) => productCard(p, { i })).join(''));
    } else {
      grid.innerHTML = shown.map((p, i) => productCard(p, { i })).join('');
    }
    A.observeReveals(grid);

    const more = $('[data-more]');
    const rest = n - shown.length;
    more.hidden = rest <= 0;
    more.innerHTML = `Показать ещё ${Math.min(rest, PAGE)} ${icon('chevron-down')}`;
    $('[data-shown]').textContent = n ? `Показано ${shown.length} из ${n}` : '';
    $('[data-progress]').style.width = n ? `${(shown.length / n) * 100}%` : '0';
    $('[data-progress]').parentElement.hidden = !n;

    renderChips(); updateCounts(); syncPills(); writeUrl();
    const key = JSON.stringify({ ...state, limit: 0 });
    if (key !== lastKey && !append && lastKey) grid.classList.remove('is-swap'), void grid.offsetWidth, grid.classList.add('is-swap');
    lastKey = key;
  }

  function renderChips() {
    const chips = [];
    if (state.q) chips.push({ k: 'q', v: state.q, label: `«${state.q}»` });
    state.cat.forEach((v) => chips.push({ k: 'cat', v, label: A.catBySlug.get(v)?.name || v }));
    state.purpose.forEach((v) => chips.push({ k: 'purpose', v, label: v === 'home' ? 'Для дома' : 'Для залов' }));
    state.type.forEach((v) => chips.push({ k: 'type', v, label: DATA.types[v] || v }));
    if (state.priced) chips.push({ k: 'priced', v: '1', label: 'С ценой' });
    if (state.min || state.max) chips.push({ k: 'price', v: '', label: `${state.min ? 'от ' + A.fmt(state.min) : ''} ${state.max ? 'до ' + A.fmt(state.max) : ''} ₽`.trim() });
    const box = $('[data-active-chips]');
    box.innerHTML = chips.map((c) => `<button class="chip is-active" type="button" data-chip="${c.k}" data-v="${esc(c.v)}" aria-label="Убрать фильтр: ${esc(c.label)}">${esc(c.label)}${icon('close')}</button>`).join('') +
      (chips.length > 1 ? `<button class="btn btn--ghost btn--sm" type="button" data-reset>Сбросить всё</button>` : '');
    const badge = $('[data-filter-badge]');
    const nf = chips.filter((c) => c.k !== 'q').length;
    badge.hidden = !nf; badge.textContent = nf;
  }

  function syncPills() {
    $$('[data-type-pill]').forEach((b) => {
      const id = b.dataset.typePill;
      const on = id ? state.type.length === 1 && state.type[0] === id : !state.type.length;
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function writeUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    ['cat', 'type', 'purpose'].forEach((k) => state[k].length && p.set(k, state[k].join(',')));
    if (state.priced) p.set('priced', '1');
    if (state.min) p.set('min', state.min); if (state.max) p.set('max', state.max);
    if (state.sort !== 'default') p.set('sort', state.sort);
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  const update = () => { state.limit = PAGE; render(); };

  /* ---------- Events ---------- */
  form.addEventListener('change', (e) => {
    const t = e.target;
    if (['cat', 'type', 'purpose'].includes(t.name)) state[t.name] = $$(`input[name=${t.name}]:checked`, form).map((i) => i.value);
    if (t.name === 'priced') state.priced = t.checked;
    if (t.name === 'min' || t.name === 'max') {
      state.min = Number($('[data-price-min]').value) || null; state.max = Number($('[data-price-max]').value) || null;
      if (state.min && state.max && state.min > state.max) [state.min, state.max] = [state.max, state.min];
    }
    update();
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  let qt;
  $('[data-q]').addEventListener('input', (e) => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value.trim(); update(); }, 160); });
  $('[data-sort]').addEventListener('change', (e) => { state.sort = e.target.value; update(); });
  $('[data-more]').addEventListener('click', () => { state.limit += PAGE; render({ append: true }); });
  $('[data-type-rail]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-type-pill]'); if (!b) return;
    const id = b.dataset.typePill;
    state.type = id && !(state.type.length === 1 && state.type[0] === id) ? [id] : [];
    syncInputs(); update();
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-reset]')) {
      Object.assign(state, { q: '', cat: [], type: [], purpose: [], priced: false, min: null, max: null });
      syncInputs(); update(); return;
    }
    const chip = e.target.closest('[data-chip]');
    if (chip) {
      const k = chip.dataset.chip; const v = chip.dataset.v;
      if (k === 'q') state.q = '';
      else if (k === 'priced') state.priced = false;
      else if (k === 'price') { state.min = null; state.max = null; }
      else state[k] = state[k].filter((x) => x !== v);
      syncInputs(); update();
    }
  });

  /* Mobile filter panel */
  const panel = $('[data-filters]');
  const openBtn = $('[data-filters-open]');
  const isMobile = () => window.matchMedia('(max-width: 1023px)').matches;
  openBtn.addEventListener('click', () => {
    panel.classList.add('is-open'); document.body.classList.add('is-locked', 'filters-open'); openBtn.setAttribute('aria-expanded', 'true');
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    setTimeout(() => $('input, button', panel)?.focus(), 60);
  });
  const closePanel = () => {
    if (!panel.classList.contains('is-open')) return;
    panel.classList.remove('is-open'); document.body.classList.remove('is-locked', 'filters-open'); openBtn.setAttribute('aria-expanded', 'false');
    panel.removeAttribute('role'); panel.removeAttribute('aria-modal'); openBtn.focus();
  };
  $$('[data-filters-close]').forEach((b) => b.addEventListener('click', closePanel));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isMobile()) closePanel(); });

  /* Grid / list view (list = horizontal cards, as in the reference). Remembered per device. */
  const setView = (v) => {
    grid.classList.toggle('is-list', v === 'list');
    $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    try { localStorage.setItem('aliv.view', v); } catch (e) { /* private mode */ }
  };
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  let savedView = 'grid'; try { savedView = localStorage.getItem('aliv.view') || 'grid'; } catch (e) { /* ignore */ }
  setView(savedView);

  syncInputs();
  render();
  A.renderRecent();
})();
