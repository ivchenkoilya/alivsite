/* ALIV SPORT — compare page: side-by-side table built from real attributes */
(function () {
  'use strict';
  const A = window.ALIV;
  const { $, esc, icon, price, plural, productImg, productUrl, DATA } = A;
  const box = $('[data-cmp]');

  const val = (p, re) => { const s = p.specs.find((x) => re.test(x.label)); return s ? s.value.replace(/\.$/, '').replace(/(\d)\s*кг/g, '$1 кг').replace(/[хx]/gi, '×') : ''; };
  const feat = (p, re) => (p.features.find((f) => re.test(f)) || '').replace(/^[^0-9]*?(?=\d)/, '').replace(/\.$/, '');
  const numOf = (s) => { const m = String(s).replace(/\s/g, '').match(/\d+(?:[.,]\d+)?/); return m ? Number(m[0].replace(',', '.')) : null; };
  const area = (p) => { const n = (val(p, /^габарит/i).match(/\d{3,5}/g) || []).map(Number); return n.length >= 2 ? (n[0] * n[1]) / 1e6 : null; };

  // rows: label, getter, and which direction is "better" (only for highlighting, never invented)
  const ROWS = [
    { k: 'price', label: 'Цена', get: (p) => (p.price ? price(p.price) : 'по запросу'), num: (p) => p.price || null, best: 'min' },
    { k: 'type', label: 'Тип', get: (p) => DATA.types[p.type] || '' },
    { k: 'purpose', label: 'Назначение', get: (p) => (p.purpose === 'home' ? 'Для дома' : 'Для залов') },
    { k: 'dims', label: 'Габариты, мм', get: (p) => val(p, /^габарит/i) },
    { k: 'area', label: 'Площадь основания', get: (p) => (area(p) ? `${area(p).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} м²` : ''), num: area, best: 'min' },
    { k: 'load', label: 'Нагрузка', get: (p) => val(p, /^нагрузка/i), num: (p) => numOf(val(p, /^нагрузка/i)), best: 'max' },
    { k: 'user', label: 'Макс. вес пользователя', get: (p) => val(p, /пользовател/i), num: (p) => numOf(val(p, /пользовател/i)), best: 'max' },
    { k: 'weight', label: 'Вес тренажёра', get: (p) => val(p, /^вес$/i) },
    { k: 'profile', label: 'Профиль рамы', get: (p) => feat(p, /профил/i) },
    { k: 'disc', label: 'Посадочный диаметр дисков', get: (p) => feat(p, /диаметр/i) },
    { k: 'adjust', label: 'Регулировки', get: (p) => (p.features.find((f) => /регулир/i.test(f)) || '').replace(/\.$/, '') },
  ];

  function render() {
    const items = A.compare.ids.map((id) => A.byId.get(id)).filter(Boolean);
    $('[data-cmp-tools]').hidden = !items.length;
    $('[data-cmp-summary]').textContent = items.length ? `${items.length} ${plural(items.length, 'модель', 'модели', 'моделей')} · максимум ${A.COMPARE_MAX}` : '';
    if (!items.length) {
      box.innerHTML = `<div class="empty">${icon('layers')}<p class="h4">Пока нечего сравнивать</p><p>Нажмите значок сравнения на карточке тренажёра в каталоге — до ${A.COMPARE_MAX} моделей.</p><a class="btn btn--primary" href="catalog.html">Перейти в каталог</a></div>`;
      return;
    }
    const onlyDiff = $('[data-cmp-diff]').checked;
    const rows = ROWS.map((r) => ({ ...r, vals: items.map(r.get) }))
      .filter((r) => r.vals.some(Boolean))
      .filter((r) => !onlyDiff || items.length < 2 || new Set(r.vals.map((v) => v || '—')).size > 1);
    const bestIdx = (r) => {
      if (!r.best || items.length < 2) return -1;
      const nums = items.map((p) => r.num(p));
      const valid = nums.filter((n) => n !== null);
      if (valid.length < 2 || new Set(valid).size < 2) return -1;
      const target = r.best === 'min' ? Math.min(...valid) : Math.max(...valid);
      return nums.indexOf(target);
    };
    box.innerHTML = `
      <table class="cmp-table" style="--cols:${items.length}">
        <caption class="sr-only">Сравнение характеристик</caption>
        <thead><tr><th scope="col" class="cmp-table__corner"><span class="muted small">Характеристика</span></th>${items.map((p) => `
          <th scope="col" class="cmp-col">
            <div class="cmp-card">
              <button class="icon-btn cmp-card__rm" type="button" data-compare="${p.id}" aria-label="Убрать ${esc(p.name)}">${icon('close')}</button>
              <a class="stage cmp-card__img" href="${productUrl(p)}">${productImg(p.images[0], { sizes: '240px' })}</a>
              <a class="cmp-card__name" href="${productUrl(p)}">${esc(p.name)}</a>
              ${p.price ? `<button class="btn btn--primary btn--sm" type="button" data-add-cart="${p.id}">${icon('cart')}В корзину</button>` : `<button class="btn btn--outline btn--sm" type="button" data-quote-open data-product="${p.id}">Узнать цену</button>`}
            </div>
          </th>`).join('')}${items.length < A.COMPARE_MAX ? `<th scope="col" class="cmp-col cmp-col--add"><a class="cmp-add" href="catalog.html">${icon('plus')}<span>Добавить модель</span></a></th>` : ''}</tr></thead>
        <tbody>${rows.map((r) => { const b = bestIdx(r); return `<tr><th scope="row">${esc(r.label)}</th>${r.vals.map((v, i) => `<td class="${i === b ? 'is-best' : ''}">${v ? esc(v) : '<span class="muted">—</span>'}${i === b ? `<span class="cmp-best">${r.best === 'min' ? 'меньше' : 'больше'}</span>` : ''}</td>`).join('')}${items.length < A.COMPARE_MAX ? '<td></td>' : ''}</tr>`; }).join('')}</tbody>
      </table>
      <p class="form-note">Значения — из характеристик производителя на сайте. «—» — параметр не указан, уточните у менеджера.</p>`;
  }

  $('[data-cmp-diff]').addEventListener('change', render);
  $('[data-cmp-clear]').addEventListener('click', () => { A.compare.clear(); A.toast('Сравнение очищено'); });
  $('[data-cmp-quote]').addEventListener('click', () => {
    const items = A.compare.ids.map((id) => A.byId.get(id)).filter(Boolean).map((p) => ({ label: p.name, meta: p.price ? price(p.price) : 'по запросу' }));
    A.openQuote({ items, title: 'КП по моделям из сравнения', kicker: 'Сравнение' });
  });
  A.on('compare', render);
  render();
})();
