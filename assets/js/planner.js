/*
 * ALIV SPORT — Конструктор зала (v2).
 * Units: millimetres. Machines use their real footprint from the product attributes.
 * Room presets · ready-made zones · type filters · drag with 50 mm snap · rotate / copy / delete
 * · distances from the selected machine to the walls · access zones · entrance marker
 * · fill gauge · bill of materials · perspective view · PNG export · КП with the plan.
 */
(function () {
  'use strict';
  const A = window.ALIV;
  const { $, $$, esc, icon, price, plural, up, productUrl, DATA } = A;
  const STORE = 'aliv.planner';
  const SNAP = 50;
  const m = (mm) => (mm / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 });

  /* ---------- machines with a real footprint ---------- */
  const footprint = (p) => {
    const s = p.specs.find((x) => /^габарит/i.test(x.label));
    const n = s ? (s.value.match(/\d{3,5}/g) || []).map(Number) : [];
    if (n.length >= 2) return { L: n[0], W: n[1], H: n[2] || null };
    const get = (re) => { const x = p.specs.find((y) => re.test(y.label)); const mm = x && x.value.match(/\d{2,5}/); return mm ? Number(mm[0]) : null; };
    const L = get(/^длина/i); const W = get(/^ширина/i);
    return L && W ? { L, W, H: get(/^высота/i) } : null;
  };
  const lib = DATA.products.map((p) => ({ p, fp: footprint(p) })).filter((x) => x.fp);
  const libBySlug = new Map(lib.map((x) => [x.p.slug, x]));

  const PRESETS = [
    { id: 'home', label: 'Дом', L: 4000, W: 3000 },
    { id: 'garage', label: 'Гараж', L: 6000, W: 4000 },
    { id: 'studio', label: 'Студия', L: 8000, W: 6000 },
    { id: 'gym', label: 'Зал', L: 12000, W: 8000 },
    { id: 'club', label: 'Клуб', L: 20000, W: 12000 },
  ];
  // ready-made zones: built from what really has dimensions, grouped by type
  const ZONES = [
    { id: 'legs', label: 'Зона ног', icon: 'gauge', types: ['legs'] },
    { id: 'power', label: 'Силовая зона', icon: 'grid', types: ['racks'] },
    { id: 'back', label: 'Спина и тяги', icon: 'layers', types: ['back', 'press', 'arms'] },
    { id: 'free', label: 'Скамьи и стойки', icon: 'box', types: ['benches', 'storage', 'functional'] },
  ].map((z) => ({ ...z, items: lib.filter((x) => z.types.includes(x.p.type)).sort((a, b) => (b.p.price ? 1 : 0) - (a.p.price ? 1 : 0)).slice(0, 3) }))
    .filter((z) => z.items.length);

  /* ---------- state ---------- */
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || null; } catch (e) { return null; } };
  const state = { L: 10000, W: 6000, gap: 500, door: 'bottom', items: [], sel: null, view: '2d', typeFilter: '', ...(load() || {}) };
  state.items = (state.items || []).filter((it) => libBySlug.has(it.slug));
  state.sel = null;
  let uid = state.items.reduce((mx, it) => Math.max(mx, it.id), 0);
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify({ L: state.L, W: state.W, gap: state.gap, door: state.door, items: state.items })); } catch (e) { /* private mode */ } };

  const plan = $('[data-plan]'); const stage = $('[data-plan-stage]'); const room = $('[data-plan-room]');

  /* ---------- geometry ---------- */
  const dimsOf = (it) => { const fp = libBySlug.get(it.slug).fp; return it.rot ? { w: fp.W, h: fp.L, H: fp.H } : { w: fp.L, h: fp.W, H: fp.H }; };
  const rectOf = (it, pad = 0) => { const d = dimsOf(it); return { x1: it.x - pad, y1: it.y - pad, x2: it.x + d.w + pad, y2: it.y + d.h + pad }; };
  const overlap = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
  let scale = 0.05;

  function layout() {
    const avail = plan.clientWidth - 70;
    const maxH = Math.max(340, Math.min(640, window.innerHeight * 0.66));
    scale = Math.min(avail / state.L, maxH / state.W);
    room.style.width = `${state.L * scale}px`; room.style.height = `${state.W * scale}px`;
    room.style.setProperty('--grid', `${500 * scale}px`); room.style.setProperty('--grid-m', `${1000 * scale}px`);
    $('[data-dim-x]').textContent = `${m(state.L)} м`; $('[data-dim-y]').textContent = `${m(state.W)} м`;
    $('[data-scale] i').style.width = `${1000 * scale}px`;
    const door = $('[data-door-mark]'); door.dataset.side = state.door; door.hidden = state.door === 'none';
    plan.classList.toggle('is-3d', state.view === '3d');
  }

  function analyse() {
    const issues = new Map();
    state.items.forEach((a) => { const r = rectOf(a); if (r.x1 < 0 || r.y1 < 0 || r.x2 > state.L || r.y2 > state.W) issues.set(a.id, 'out'); });
    for (let i = 0; i < state.items.length; i++) for (let j = i + 1; j < state.items.length; j++) {
      const a = state.items[i]; const b = state.items[j];
      if (overlap(rectOf(a), rectOf(b))) { issues.set(a.id, 'hit'); issues.set(b.id, 'hit'); }
      else if (state.gap && overlap(rectOf(a, state.gap / 2), rectOf(b, state.gap / 2))) { if (!issues.has(a.id)) issues.set(a.id, 'zone'); if (!issues.has(b.id)) issues.set(b.id, 'zone'); }
    }
    return issues;
  }

  /* ---------- render ---------- */
  function render() {
    layout();
    const issues = analyse();
    $$('.plan-item', room).forEach((el) => { if (!state.items.some((it) => String(it.id) === el.dataset.id)) el.remove(); });
    state.items.forEach((it) => {
      let el = room.querySelector(`.plan-item[data-id="${it.id}"]`);
      const { p } = libBySlug.get(it.slug);
      if (!el) {
        el = document.createElement('div');
        el.className = 'plan-item is-new'; el.dataset.id = it.id; el.dataset.type = p.type;
        el.innerHTML = `<span class="plan-item__zone"></span><span class="plan-item__body"><img src="${up(p.images[0].thumb)}" alt="" draggable="false"><span class="plan-item__label"><b>${esc(p.name)}</b><small></small></span></span><span class="plan-item__badge" aria-hidden="true"></span>`;
        room.appendChild(el);
        setTimeout(() => el.classList.remove('is-new'), 500);
      }
      const d = dimsOf(it);
      el.style.left = `${it.x * scale}px`; el.style.top = `${it.y * scale}px`;
      el.style.width = `${d.w * scale}px`; el.style.height = `${d.h * scale}px`;
      el.style.setProperty('--gap', `${(state.gap / 2) * scale}px`);
      el.style.setProperty('--lift', `${Math.min(90, ((d.H || 1200) / 1000) * 32)}px`);
      const iss = issues.get(it.id) || '';
      el.dataset.issue = iss;
      el.classList.toggle('is-sel', state.sel === it.id);
      el.classList.toggle('is-small', d.w * scale < 96 || d.h * scale < 64);
      el.querySelector('small').textContent = `${m(d.w)} × ${m(d.h)} м`;
      el.querySelector('.plan-item__badge').textContent = iss === 'hit' ? '!' : iss === 'out' ? '↗' : '';
    });
    $('[data-plan-empty]').hidden = state.items.length > 0;
    $('[data-plan-hint]').hidden = !state.items.length;
    renderMeasures(); renderStats(issues); renderSel(); renderBom(); save();
  }

  // distances from the selected machine to each wall
  function renderMeasures() {
    const box = $('[data-measures]'); const it = state.items.find((x) => x.id === state.sel);
    if (!it || state.view === '3d') { box.innerHTML = ''; return; }
    const r = rectOf(it); const s = scale;
    const cx = ((r.x1 + r.x2) / 2) * s; const cy = ((r.y1 + r.y2) / 2) * s;
    const lines = [
      { d: r.x1, style: `left:0;top:${cy}px;width:${Math.max(0, r.x1 * s)}px`, cls: 'h' },
      { d: state.L - r.x2, style: `left:${r.x2 * s}px;top:${cy}px;width:${Math.max(0, (state.L - r.x2) * s)}px`, cls: 'h' },
      { d: r.y1, style: `top:0;left:${cx}px;height:${Math.max(0, r.y1 * s)}px`, cls: 'v' },
      { d: state.W - r.y2, style: `top:${r.y2 * s}px;left:${cx}px;height:${Math.max(0, (state.W - r.y2) * s)}px`, cls: 'v' },
    ];
    box.innerHTML = lines.filter((l) => l.d > 0).map((l) => `<span class="plan-m plan-m--${l.cls} ${l.d < state.gap ? 'is-tight' : ''}" style="${l.style}"><em>${m(l.d)} м</em></span>`).join('');
  }

  function renderStats(issues) {
    const used = state.items.reduce((a, it) => { const d = dimsOf(it); return a + (d.w * d.h) / 1e6; }, 0);
    const roomA = (state.L * state.W) / 1e6;
    const withZones = state.items.reduce((a, it) => { const d = dimsOf(it); return a + ((d.w + state.gap) * (d.h + state.gap)) / 1e6; }, 0);
    const fill = roomA ? Math.min(100, Math.round((withZones / roomA) * 100)) : 0;
    const priced = state.items.map((it) => libBySlug.get(it.slug).p).filter((p) => p.price);
    const total = priced.reduce((a, p) => a + p.price, 0);
    const req = state.items.length - priced.length;
    const vals = [...issues.values()];
    const hits = vals.filter((v) => v === 'hit').length; const outs = vals.filter((v) => v === 'out').length; const zones = vals.filter((v) => v === 'zone').length;
    const gauge = $('[data-gauge]');
    $('[data-gauge-val]').style.strokeDasharray = `${fill} 100`;
    $('[data-gauge-txt]').textContent = `${fill}%`;
    gauge.dataset.level = fill > 85 ? 'bad' : fill > 65 ? 'warn' : 'ok';
    const status = hits || outs ? `<span class="plan-status is-bad">${icon('alert')}${outs ? `${outs} выходит за стены` : ''}${outs && hits ? ' · ' : ''}${hits ? `${hits} пересекаются` : ''}</span>`
      : zones ? `<span class="plan-status is-warn">${icon('info')}Тесно: пересекаются зоны подхода</span>`
      : state.items.length ? `<span class="plan-status is-ok">${icon('check-circle')}Всё помещается</span>` : '<span class="plan-status">Добавьте тренажёры</span>';
    $('[data-stats]').innerHTML = `
      <div><b>${state.items.length}</b><span>${plural(state.items.length, 'тренажёр', 'тренажёра', 'тренажёров')}</span></div>
      <div><b>${used.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} м²</b><span>из ${roomA.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} м² · с зонами ${fill}%</span></div>
      <div><b>${total ? price(total) : '—'}</b><span>${req ? `+ ${req} по запросу` : 'по ценам сайта'}</span></div>
      ${status}`;
    ['[data-plan-quote]', '[data-plan-png]'].forEach((s) => ($(s).disabled = !state.items.length));
  }

  function renderSel() {
    const box = $('[data-sel]'); const it = state.items.find((x) => x.id === state.sel);
    box.hidden = !it; if (!it) return;
    const { p } = libBySlug.get(it.slug); const d = dimsOf(it);
    $('[data-sel-img]').innerHTML = A.productImg(p.images[0], { sizes: '56px' });
    $('[data-sel-name]').textContent = p.name;
    $('[data-sel-meta]').textContent = `${m(d.w)} × ${m(d.h)} м${d.H ? ` · высота ${m(d.H)} м` : ''} · ${p.price ? price(p.price) : 'цена по запросу'}`;
    $('[data-sel-open]').href = productUrl(p);
  }

  function renderBom() {
    const counts = new Map(); state.items.forEach((it) => counts.set(it.slug, (counts.get(it.slug) || 0) + 1));
    $('[data-bom]').innerHTML = counts.size ? [...counts].map(([slug, n]) => {
      const { p, fp } = libBySlug.get(slug);
      return `<li><span class="stage">${A.productImg(p.images[0], { sizes: '44px' })}</span><span class="planner__bom-name"><a href="${productUrl(p)}">${esc(p.name)}</a><small>${m(fp.L)} × ${m(fp.W)} м</small></span><span class="planner__bom-qty">× ${n}</span><span class="planner__bom-sum">${p.price ? price(p.price * n) : 'по запросу'}</span><button class="icon-btn" type="button" data-bom-add="${slug}" aria-label="Добавить ещё ${esc(p.name)}">${icon('plus')}</button></li>`;
    }).join('') : '<li class="planner__bom-empty muted small">Пока пусто — здесь появится список тренажёров со стоимостью.</li>';
  }

  /* ---------- library, presets, zones ---------- */
  function renderLib() {
    const q = A.norm($('[data-lib-q]').value || '');
    const list = lib.filter(({ p }) => (!q || A.norm(p.name).includes(q)) && (!state.typeFilter || p.type === state.typeFilter));
    $('[data-lib-count]').textContent = `${lib.length} ${plural(lib.length, 'модель', 'модели', 'моделей')} с опубликованными размерами`;
    $('[data-lib]').innerHTML = list.map(({ p, fp }) => `
      <li class="lib-item">
        <span class="stage lib-item__img">${A.productImg(p.images[0], { sizes: '56px' })}</span>
        <span class="lib-item__txt"><b>${esc(p.name)}</b><small>${m(fp.L)} × ${m(fp.W)} м · ${p.price ? price(p.price) : 'по запросу'}</small></span>
        <button class="icon-btn icon-btn--boxed" type="button" data-add="${p.slug}" aria-label="Добавить ${esc(p.name)} на план">${icon('plus')}</button>
      </li>`).join('') || '<li class="muted small">Ничего не найдено</li>';
    const types = [...new Set(lib.map((x) => x.p.type))];
    $('[data-lib-types]').innerHTML = `<button class="chip ${state.typeFilter ? '' : 'is-active'}" type="button" data-type-f="">Все</button>` +
      types.map((t) => `<button class="chip ${state.typeFilter === t ? 'is-active' : ''}" type="button" data-type-f="${t}">${esc(DATA.types[t])}</button>`).join('');
  }
  $('[data-presets]').innerHTML = PRESETS.map((pr) => `<button class="preset" type="button" data-preset="${pr.id}"><b>${esc(pr.label)}</b><small>${m(pr.L)}×${m(pr.W)} м</small></button>`).join('');
  $('[data-sets]').innerHTML = ZONES.map((z) => `<button class="zone-btn" type="button" data-zone="${z.id}">${icon(z.icon)}<span><b>${esc(z.label)}</b><small>${z.items.length} ${plural(z.items.length, 'тренажёр', 'тренажёра', 'тренажёров')}</small></span>${icon('plus')}</button>`).join('');
  const syncPresets = () => $$('[data-preset]').forEach((b) => { const pr = PRESETS.find((x) => x.id === b.dataset.preset); b.classList.toggle('is-active', pr.L === state.L && pr.W === state.W); });
  const syncInputs = () => { $$('[data-room]').forEach((inp) => { inp.value = String(state[inp.dataset.room] / 1000); }); $('[data-door]').value = state.door; syncPresets(); };

  // free spot: scan the room row by row; returns false when nothing fits
  function place(it) {
    const d = dimsOf(it); const g = state.gap;
    for (let y = 0; y + d.h <= state.W; y += 250) for (let x = 0; x + d.w <= state.L; x += 250) {
      it.x = x; it.y = y;
      if (!state.items.some((o) => o !== it && overlap(rectOf(it, g / 2), rectOf(o, g / 2)))) return true;
    }
    it.x = 0; it.y = 0; return false;
  }
  function add(slug, { quiet = false } = {}) {
    const it = { id: ++uid, slug, x: 0, y: 0, rot: 0 };
    let ok = place(it);
    if (!ok) { it.rot = 1; ok = place(it); }
    state.items.push(it); state.sel = it.id;
    if (!quiet) { render(); A.toast(ok ? `«${esc(libBySlug.get(slug).p.name)}» на плане` : 'Места не хватает — тренажёр поставлен в угол, передвиньте его', { type: ok ? 'ok' : 'info' }); }
    return ok;
  }

  /* ---------- interactions ---------- */
  document.addEventListener('click', (e) => {
    const addB = e.target.closest('[data-add], [data-bom-add]'); if (addB) { add(addB.dataset.add || addB.dataset.bomAdd); return; }
    const pr = e.target.closest('[data-preset]');
    if (pr) { const x = PRESETS.find((p) => p.id === pr.dataset.preset); state.L = x.L; state.W = x.W; syncInputs(); render(); return; }
    const z = e.target.closest('[data-zone]');
    if (z) { const zone = ZONES.find((x) => x.id === z.dataset.zone); zone.items.forEach((x) => add(x.p.slug, { quiet: true })); render(); A.toast(`Добавлена зона «${esc(zone.label)}»`, { type: 'ok' }); return; }
    const tf = e.target.closest('[data-type-f]'); if (tf) { state.typeFilter = tf.dataset.typeF; renderLib(); return; }
    const vm = e.target.closest('[data-view-mode]');
    if (vm) { state.view = vm.dataset.viewMode; $$('[data-view-mode]').forEach((b) => { b.classList.toggle('is-active', b === vm); b.setAttribute('aria-pressed', String(b === vm)); }); render(); }
  });
  $('[data-lib-q]').addEventListener('input', renderLib);
  $$('[data-room]').forEach((inp) => inp.addEventListener('input', () => {
    const v = Number(String(inp.value).replace(',', '.')); if (!isFinite(v) || inp.value === '') return;
    const k = inp.dataset.room;
    state[k] = k === 'gap' ? Math.max(0, Math.min(2000, v * 1000)) : Math.max(2000, Math.min(60000, v * 1000));
    syncPresets(); render();
  }));
  $('[data-door]').addEventListener('change', (e) => { state.door = e.target.value; render(); });

  let drag = null;
  room.addEventListener('pointerdown', (e) => {
    if (state.view === '3d') { state.view = '2d'; $$('[data-view-mode]').forEach((b) => { const on = b.dataset.viewMode === '2d'; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); }); }
    const el = e.target.closest('.plan-item'); if (!el) { state.sel = null; render(); return; }
    const it = state.items.find((x) => String(x.id) === el.dataset.id);
    state.sel = it.id; el.setPointerCapture(e.pointerId);
    drag = { it, el, sx: e.clientX, sy: e.clientY, ox: it.x, oy: it.y };
    el.classList.add('is-drag'); render(); plan.focus({ preventScroll: true });
  });
  room.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const d = dimsOf(drag.it);
    const x = Math.round((drag.ox + (e.clientX - drag.sx) / scale) / SNAP) * SNAP;
    const y = Math.round((drag.oy + (e.clientY - drag.sy) / scale) / SNAP) * SNAP;
    drag.it.x = Math.max(-d.w * 0.8, Math.min(state.L - d.w * 0.2, x));
    drag.it.y = Math.max(-d.h * 0.8, Math.min(state.W - d.h * 0.2, y));
    render();
  });
  const endDrag = () => { if (drag) { drag.el.classList.remove('is-drag'); drag = null; render(); } };
  room.addEventListener('pointerup', endDrag); room.addEventListener('pointercancel', endDrag);

  const sel = () => state.items.find((x) => x.id === state.sel);
  const rotate = (it) => { const d0 = dimsOf(it); it.rot = it.rot ? 0 : 1; const d1 = dimsOf(it); it.x = Math.round((it.x + (d0.w - d1.w) / 2) / SNAP) * SNAP; it.y = Math.round((it.y + (d0.h - d1.h) / 2) / SNAP) * SNAP; render(); };
  const remove = (it) => { state.items = state.items.filter((x) => x !== it); state.sel = null; render(); };
  plan.addEventListener('keydown', (e) => {
    const it = sel(); if (!it) return;
    const step = e.shiftKey ? 500 : 100;
    const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (mv) { e.preventDefault(); it.x += mv[0]; it.y += mv[1]; render(); }
    if (/^[rRкК]$/.test(e.key)) { e.preventDefault(); rotate(it); }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(it); }
  });
  $('[data-sel-rotate]').addEventListener('click', () => { const it = sel(); if (it) rotate(it); });
  $('[data-sel-del]').addEventListener('click', () => { const it = sel(); if (it) remove(it); });
  $('[data-sel-dup]').addEventListener('click', () => { const it = sel(); if (it) add(it.slug); });
  $('[data-plan-clear]').addEventListener('click', () => { if (!state.items.length) return; state.items = []; state.sel = null; render(); A.toast('План очищен'); });

  /* ---------- PNG export (drawn on canvas — shareable with the manager) ---------- */
  $('[data-plan-png]').addEventListener('click', () => {
    const W = 1600; const pad = 90; const s = (W - pad * 2) / state.L; const H = Math.round(state.W * s + pad * 2 + 120);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = '#0B0C0E'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#15171A'; g.fillRect(pad, pad, state.L * s, state.W * s);
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
    for (let x = 0; x <= state.L; x += 1000) { g.beginPath(); g.moveTo(pad + x * s, pad); g.lineTo(pad + x * s, pad + state.W * s); g.stroke(); }
    for (let y = 0; y <= state.W; y += 1000) { g.beginPath(); g.moveTo(pad, pad + y * s); g.lineTo(pad + state.L * s, pad + y * s); g.stroke(); }
    g.strokeStyle = '#E8E9EB'; g.lineWidth = 6; g.strokeRect(pad, pad, state.L * s, state.W * s);
    g.font = '600 26px Manrope, sans-serif'; g.fillStyle = '#C9CBCF'; g.textAlign = 'center';
    g.fillText(`${m(state.L)} м`, pad + (state.L * s) / 2, pad - 26);
    g.save(); g.translate(pad - 30, pad + (state.W * s) / 2); g.rotate(-Math.PI / 2); g.fillText(`${m(state.W)} м`, 0, 0); g.restore();
    state.items.forEach((it) => {
      const d = dimsOf(it); const x = pad + it.x * s; const y = pad + it.y * s;
      if (state.gap) { g.setLineDash([8, 6]); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.strokeRect(x - (state.gap / 2) * s, y - (state.gap / 2) * s, (d.w + state.gap) * s, (d.h + state.gap) * s); g.setLineDash([]); }
      g.fillStyle = 'rgba(255,106,0,.25)'; g.fillRect(x, y, d.w * s, d.h * s);
      g.strokeStyle = '#FF6A00'; g.lineWidth = 3; g.strokeRect(x, y, d.w * s, d.h * s);
      const name = libBySlug.get(it.slug).p.name;
      g.fillStyle = '#fff'; g.font = '700 20px Manrope, sans-serif'; g.textAlign = 'left';
      const maxW = d.w * s - 16; let label = name; while (g.measureText(label).width > maxW && label.length > 4) label = label.slice(0, -2);
      if (label !== name) label = label.trim() + '…';
      if (maxW > 40) { g.fillText(label, x + 8, y + 28); g.font = '500 16px Manrope, sans-serif'; g.fillStyle = '#C9CBCF'; g.fillText(`${m(d.w)} × ${m(d.h)} м`, x + 8, y + 50); }
    });
    g.fillStyle = '#FF6A00'; g.font = '800 30px Manrope, sans-serif'; g.textAlign = 'left';
    g.fillText('ALIV SPORT · планировка зала', pad, H - 70);
    g.fillStyle = '#A5A8AE'; g.font = '500 20px Manrope, sans-serif';
    g.fillText(`${state.items.length} тренажёров · помещение ${m(state.L)} × ${m(state.W)} м · зона подхода ${m(state.gap)} м · ${A.CFG.contacts.phoneMain}`, pad, H - 36);
    const a = document.createElement('a'); a.download = 'ALIV-SPORT-plan.png'; a.href = c.toDataURL('image/png'); a.click();
    A.toast('План сохранён в PNG', { type: 'ok' });
  });

  $('[data-plan-quote]').addEventListener('click', () => {
    const counts = new Map(); state.items.forEach((it) => counts.set(it.slug, (counts.get(it.slug) || 0) + 1));
    const items = [...counts].map(([slug, n]) => { const { p } = libBySlug.get(slug); return { label: p.name, meta: `${n} шт. · ${p.price ? price(p.price) : 'по запросу'}` }; });
    items.unshift({ label: `Помещение ${m(state.L)} × ${m(state.W)} м`, meta: `зона подхода ${m(state.gap)} м` });
    A.openQuote({ items, title: 'Расчёт оснащения зала по планировке', kicker: 'Конструктор зала' });
  });
  window.addEventListener('resize', render);

  const addSlug = new URLSearchParams(location.search).get('add');
  syncInputs(); renderLib(); render();
  if (addSlug && libBySlug.has(addSlug)) { add(addSlug); history.replaceState(null, '', location.pathname); }
})();
