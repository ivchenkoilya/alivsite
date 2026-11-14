/* ALIV SPORT — favourites */
(function () {
  'use strict';
  const A = window.ALIV;
  const { $, icon, plural, productCard } = A;
  const grid = $('[data-fav-grid]');

  function render() {
    const items = A.favs.ids.map((id) => A.byId.get(id)).filter(Boolean);
    const priced = items.filter((p) => p.price);
    $('[data-fav-summary]').textContent = items.length ? `${items.length} ${plural(items.length, 'модель', 'модели', 'моделей')} в списке` : '';
    $('[data-fav-actions]').hidden = !items.length;
    $('[data-fav-to-cart]').hidden = !priced.length;
    grid.innerHTML = items.length ? items.map((p, i) => productCard(p, { i })).join('')
      : `<div class="empty" style="grid-column:1/-1">${icon('heart')}<p class="h4">В избранном пока пусто</p><p>Отмечайте модели сердечком в каталоге — список сохранится на этом устройстве.</p><a class="btn btn--primary" href="catalog.html">Перейти в каталог</a></div>`;
    A.observeReveals(grid);
  }
  $('[data-fav-to-cart]').addEventListener('click', () => {
    const priced = A.favs.ids.map((id) => A.byId.get(id)).filter((p) => p && p.price && !A.cart.has(p.id));
    priced.forEach((p) => A.cart.add(p.id));
    A.toast(priced.length ? `Добавлено в корзину: ${priced.length}` : 'Эти модели уже в корзине', { type: 'ok', action: { href: 'cart.html', label: 'Корзина' } });
  });
  $('[data-fav-quote]').addEventListener('click', () => {
    const items = A.favs.ids.map((id) => A.byId.get(id)).filter(Boolean).map((p) => ({ label: p.name, meta: p.price ? A.price(p.price) : 'по запросу' }));
    A.openQuote({ items, title: 'КП по списку избранного', kicker: 'Избранное' });
  });
  A.on('favs', render);
  render();
})();
