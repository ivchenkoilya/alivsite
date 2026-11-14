/* ALIV SPORT — price list: search, series filter, sort, selection → КП, XLSX export, print */
(function () {
  'use strict';
  const A = window.ALIV;
  const { $, $$, esc, fmt, plural, icon, norm } = A;
  const PL = window.ALIV_PRICELIST;
  const PREVIEW = 8; // rows per series in the overview

  const titleCase = (s) => s.charAt(0) + s.slice(1).toLowerCase().replace(/\(\s*/g, '(').replace(/\s+\)/g, ')');
  const rows = PL.series.flatMap((s) => s.items.map((it, i) => ({ ...it, series: s.code, idx: i })));
  const total = rows.length;

  $('[data-pl-title]').textContent = PL.title;
  $('[data-pl-source]').innerHTML = `Данные — со страницы <a class="text-link" href="${PL.source}" rel="noopener">прайс-листа на сайте</a>. Цены в рублях.`;
  $('[data-price-facts]').innerHTML = [
    ['file', `${total} ${plural(total, 'позиция', 'позиции', 'позиций')}`],
    ['layers', `${PL.series.length} ${plural(PL.series.length, 'серия', 'серии', 'серий')}`],
    ['wallet', 'Опт и розница'],
    ['sparkle', `${rows.filter((r) => r.isNew).length} новинок`],
  ].map(([i, t]) => `<li>${icon(i)}<span>${t}</span></li>`).join('');

  /* ---------- State ---------- */
  const params = new URLSearchParams(location.search);
  const state = { series: params.get('series') || '', q: params.get('q') || '', sort: 'code', onlyNew: false, expanded: new Set(), selected: new Set() };

  const chips = $('[data-series-chips]');
  chips.innerHTML = `<button class="chip" type="button" data-series="" aria-pressed="false">Все серии <span class="chip__count">${total}</span></button>` +
    PL.series.map((s) => `<button class="chip" type="button" data-series="${s.code}" aria-pressed="false"><b>${s.code}</b> ${esc(titleCase(s.title).replace(/\s*\(.*\)/, ''))} <span class="chip__count">${s.items.length}</span></button>`).join('');

  const codeKey = (c) => c.replace(/[^\d.]/g, '').split('.').map(Number);
  const cmpCode = (a, b) => { const x = codeKey(a.code), y = codeKey(b.code); return x[0] - y[0] || (x[1] || 0) - (y[1] || 0); };
  const sorters = { code: cmpCode, 'price-asc': (a, b) => a.rozn - b.rozn, 'price-desc': (a, b) => b.rozn - a.rozn, name: (a, b) => a.name.localeCompare(b.name, 'ru') };
  const keyOf = (r) => r.code;

  function filtered() {
    const q = norm(state.q).split(' ').filter(Boolean);
    return rows.filter((r) => (!state.series || r.series === state.series) && (!state.onlyNew || r.isNew) &&
      (!q.length || q.every((w) => norm(`${r.code} ${r.code.replace('-', '')} ${r.name}`).includes(w))));
  }

  const body = $('[data-pl-body]');
  function rowHtml(r) {
    const k = keyOf(r); const sel = state.selected.has(k);
    return `<tr class="pl-row ${sel ? 'is-selected' : ''}" data-key="${esc(k)}" data-pl-key="${esc(k)}">
      <td class="pl-sel no-print"><label class="checkbox"><input type="checkbox" ${sel ? 'checked' : ''} data-select="${esc(k)}" aria-label="Выбрать ${esc(r.code)} ${esc(r.name)}"></label></td>
      <td class="pl-code">${esc(r.code)}</td>
      <td class="pl-name"><button type="button" class="pl-open" data-open aria-label="Подробнее: ${esc(r.code)} ${esc(r.name)}">${esc(r.name)}</button>${r.isNew ? ' <span class="tag tag--new">новинка</span>' : ''}</td>
      <td class="num pl-opt" data-label="Опт">${fmt(r.opt)}</td>
      <td class="num pl-rozn" data-label="Розница">${fmt(r.rozn)}</td>
    </tr>`;
  }
  function render() {
    const list = filtered();
    const grouped = state.sort === 'code';
    const searching = !!(state.q || state.onlyNew || state.series);
    let html = '';
    if (grouped) {
      for (const s of PL.series) {
        const items = list.filter((r) => r.series === s.code).sort(cmpCode);
        if (!items.length) continue;
        const open = searching || state.expanded.has(s.code) || window.matchMedia('print').matches;
        const visible = open ? items : items.slice(0, PREVIEW);
        html += `<tr class="pl-group" id="series-${s.code}"><th colspan="5" scope="colgroup"><span class="pl-group__code">${s.code}</span>Серия ${s.code} — ${esc(titleCase(s.title))} <span class="pl-group__count">${items.length}</span></th></tr>`;
        html += visible.map(rowHtml).join('');
        if (items.length > visible.length) html += `<tr class="pl-more no-print"><td colspan="5"><button class="btn btn--outline btn--sm" type="button" data-expand="${s.code}">Показать ещё ${items.length - visible.length} ${plural(items.length - visible.length, 'позицию', 'позиции', 'позиций')} ${icon('chevron-down')}</button></td></tr>`;
      }
    } else {
      html = list.slice().sort(sorters[state.sort]).map(rowHtml).join('');
    }
    body.innerHTML = html || `<tr><td colspan="5"><div class="empty">${icon('search')}<p class="h4">Ничего не найдено</p><p>Проверьте артикул или название. Можно также <button class="text-link" type="button" data-quote-open data-quote-title="Поиск позиции в прайс-листе">спросить менеджера</button>.</p></div></td></tr>`;
    $('[data-pl-found]').textContent = searching ? `Найдено: ${list.length} ${plural(list.length, 'позиция', 'позиции', 'позиций')}` : '';
    $$('[data-series]', chips).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.series === state.series)));
    const p = new URLSearchParams(); if (state.series) p.set('series', state.series); if (state.q) p.set('q', state.q);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
  }

  /* ---------- Selection ---------- */
  const bar = $('[data-sel-bar]');
  function syncSel() {
    const n = state.selected.size;
    const sum = rows.filter((r) => state.selected.has(keyOf(r))).reduce((a, r) => a + r.rozn, 0);
    $('[data-sel-count]').textContent = n;
    $('[data-sel-word]').textContent = plural(n, 'позиция', 'позиции', 'позиций');
    $('[data-sel-sum]').textContent = `${fmt(sum)} ₽`;
    bar.classList.toggle('is-visible', n > 0);
    document.body.classList.toggle('has-buybar', n > 0);
  }
  body.addEventListener('change', (e) => {
    const cb = e.target.closest('[data-select]'); if (!cb) return;
    const k = cb.dataset.select;
    cb.checked ? state.selected.add(k) : state.selected.delete(k);
    cb.closest('tr').classList.toggle('is-selected', cb.checked);
    syncSel();
  });
  /* ---------- Quick view (shared module plview.js) ---------- */
  const openRow = (r) => A.openPriceItem(r, {
    selected: state.selected.has(keyOf(r)),
    onSelect: (on) => {
      const k = keyOf(r); on ? state.selected.add(k) : state.selected.delete(k);
      const row = body.querySelector(`.pl-row[data-key="${CSS.escape(k)}"]`); if (row) { row.classList.toggle('is-selected', on); $('[data-select]', row).checked = on; }
      syncSel();
    },
  });
  A.bindPricePreview(body, (k) => rows.find((x) => keyOf(x) === k));
  // click anywhere on a row (except the checkbox) opens the quick view
  body.addEventListener('click', (e) => {
    const tr = e.target.closest('.pl-row'); if (!tr || e.target.closest('input, label, a, button:not([data-open])')) return;
    const r = rows.find((x) => keyOf(x) === tr.dataset.key); if (r) openRow(r);
  });
  $('[data-sel-clear]').addEventListener('click', () => { state.selected.clear(); render(); syncSel(); });
  $$('[data-sel-quote]').forEach((b) => b.addEventListener('click', () => {
    const items = rows.filter((r) => state.selected.has(keyOf(r))).map((r) => ({ label: `${r.code} ${r.name}`, meta: `опт ${fmt(r.opt)} / розн. ${fmt(r.rozn)} ₽` }));
    A.openQuote({ items, title: items.length ? `КП по прайс-листу: ${items.length} ${plural(items.length, 'позиция', 'позиции', 'позиций')}` : 'Запросить коммерческое предложение', kicker: 'Прайс-лист' });
  }));

  /* ---------- Controls ---------- */
  chips.addEventListener('click', (e) => { const c = e.target.closest('[data-series]'); if (!c) return; state.series = c.dataset.series; render(); });
  let t; $('[data-pl-q]').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 120); });
  $('[data-pl-sort]').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  $('[data-pl-new]').addEventListener('change', (e) => { state.onlyNew = e.target.checked; render(); });
  body.addEventListener('click', (e) => { const b = e.target.closest('[data-expand]'); if (b) { state.expanded.add(b.dataset.expand); render(); } });
  $('[data-pl-q]').value = state.q;

  /* ---------- Export: XLSX (SheetJS, loaded on demand) with CSV fallback ---------- */
  const exportRows = () => [['Серия', 'Код', 'Наименование', 'Опт, ₽', 'Розница, ₽', 'Новинка'], ...PL.series.flatMap((s) => s.items.map((r) => [`${s.code} — ${titleCase(s.title)}`, r.code, r.name, r.opt, r.rozn, r.isNew ? 'да' : '']))];
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  $('[data-xlsx]').addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.classList.add('is-loading');
    try {
      if (!window.XLSX) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      const ws = window.XLSX.utils.aoa_to_sheet(exportRows());
      ws['!cols'] = [{ wch: 44 }, { wch: 10 }, { wch: 60 }, { wch: 12 }, { wch: 12 }, { wch: 9 }];
      const wb = window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(wb, ws, 'Прайс-лист');
      window.XLSX.writeFile(wb, 'ALIV-SPORT-prajs-list.xlsx');
      A.toast('Прайс-лист сохранён в XLSX', { type: 'ok' });
    } catch (err) {
      const csv = '﻿' + exportRows().map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'ALIV-SPORT-prajs-list.csv'; a.click();
      A.toast('XLSX недоступен — сохранён CSV для Excel');
    } finally { btn.classList.remove('is-loading'); }
  });
  $('[data-print]').addEventListener('click', () => {
    const prev = { ...state, expanded: new Set(state.expanded) };
    Object.assign(state, { series: '', q: '', onlyNew: false, sort: 'code' }); PL.series.forEach((s) => state.expanded.add(s.code)); render();
    window.print();
    Object.assign(state, prev); render();
  });

  render(); syncSel();
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
})();
