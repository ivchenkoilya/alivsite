/* ALIV SPORT — cart & checkout (order request) */
(function () {
  'use strict';
  const A = window.ALIV;
  const { $, $$, esc, icon, price, fmt, plural, productImg, productUrl, cart } = A;

  const linesEl = $('[data-cart-lines]');
  const layout = $('[data-cart-layout]');
  let done = false;

  function step(n) { $$('[data-step]').forEach((s) => { const k = Number(s.dataset.step); s.classList.toggle('is-active', k <= n); s.classList.toggle('is-done', k < n); }); }

  function render() {
    if (done) return;
    const lines = cart.lines();
    if (!lines.length) {
      layout.classList.add('is-empty');
      linesEl.innerHTML = `<div class="empty">${icon('cart')}<p class="h4">Корзина пуста</p><p>Добавьте тренажёры из каталога. Для оснащения зала удобнее запросить коммерческое предложение — подберём комплект и рассчитаем стоимость.</p><div class="flex wrap gap-3" style="justify-content:center"><a class="btn btn--primary" href="catalog.html">Перейти в каталог</a><button class="btn btn--outline" type="button" data-quote-open data-quote-title="Оснащение зала">Запросить КП</button></div></div>`;
      return;
    }
    layout.classList.remove('is-empty');
    linesEl.innerHTML = `
      <ul class="cart-list">${lines.map((l) => `
        <li class="cart-item">
          <a class="stage cart-item__img" href="${productUrl(l.product)}" tabindex="-1" aria-hidden="true">${productImg(l.product.images[0], { sizes: '120px' })}</a>
          <div class="cart-item__info">
            <p class="cart-item__type">${esc(A.DATA.types[l.product.type] || '')}${l.product.sku ? ' · ' + esc(l.product.sku) : ''}</p>
            <a class="cart-item__name" href="${productUrl(l.product)}">${esc(l.product.name)}</a>
            <p class="cart-item__unit">${l.product.price ? `${price(l.product.price)} / шт.` : 'Цена по запросу — уточнит менеджер'}</p>
          </div>
          <div class="cart-item__qty qty">
            <button type="button" data-qty-dec="${l.id}" aria-label="Уменьшить" ${l.qty <= 1 ? 'disabled' : ''}>${icon('minus')}</button>
            <input type="number" min="1" max="99" value="${l.qty}" data-qty-input="${l.id}" aria-label="Количество: ${esc(l.product.name)}">
            <button type="button" data-qty-inc="${l.id}" aria-label="Увеличить">${icon('plus')}</button>
          </div>
          <p class="cart-item__sum">${l.product.price ? price(l.product.price * l.qty) : '—'}</p>
          <button class="icon-btn cart-item__rm" type="button" data-remove="${l.id}" aria-label="Удалить ${esc(l.product.name)}">${icon('trash')}</button>
        </li>`).join('')}</ul>
      <div class="cart-actions">
        <a class="link-arrow" href="catalog.html">${icon('arrow-left')} Продолжить покупки</a>
        <button class="btn btn--ghost btn--sm" type="button" data-clear>${icon('trash')} Очистить корзину</button>
      </div>`;
    const total = cart.total();
    const count = cart.count();
    $('[data-summary]').innerHTML = `
      <div><dt>Товаров</dt><dd>${count} шт.</dd></div>
      ${cart.hasRequestItems() ? '<div><dt>Позиции по запросу</dt><dd>цену уточнит менеджер</dd></div>' : ''}
      <div><dt>Доставка и сборка</dt><dd>рассчитываются отдельно</dd></div>
      <div class="summary__total"><dt>Итого</dt><dd>${total ? price(total) : '—'}</dd></div>`;
  }

  linesEl.addEventListener('click', (e) => { if (e.target.closest('[data-clear]')) { cart.clear(); A.toast('Корзина очищена'); } });
  A.on('cart', render);
  $('[data-form="order"]').addEventListener('focusin', () => step(2));

  A.bindForm($('[data-form="order"]'), {
    compose: (f, fd) => {
      const lines = cart.lines();
      return {
        name: fd.get('name'), phone: fd.get('phone'),
        message: [
          'ЗАКАЗ С САЙТА',
          ...lines.map((l, i) => `${i + 1}. ${l.product.name}${l.product.sku ? ' (' + l.product.sku + ')' : ''} — ${l.qty} шт. × ${l.product.price ? fmt(l.product.price) + ' ₽' : 'цена по запросу'}`),
          `Итого по товарам с ценой: ${fmt(cart.total())} ₽`,
          fd.get('city') ? `Город доставки: ${fd.get('city')}` : '',
          fd.get('email') ? `Эл. почта: ${fd.get('email')}` : '',
          fd.get('message') ? `Комментарий: ${fd.get('message')}` : '',
        ].filter(Boolean).join('\n'),
      };
    },
    onSuccess: (r) => {
      const n = cart.count();
      done = true; step(3);
      if (!r.demo) cart.clear();
      layout.classList.add('is-done');
      layout.innerHTML = `<div class="done panel panel--pad">
        <span class="done__icon">${icon('check')}</span>
        <h2 class="h2">${r.demo ? 'Заказ сформирован (демо-режим)' : 'Заказ оформлен'}</h2>
        <p class="lead">${r.demo ? 'Форма прошла проверку, но в демо-режиме заявка не отправляется. На рабочем домене она уйдёт менеджеру через форму сайта.' : `Мы получили заявку на ${n} ${plural(n, 'товар', 'товара', 'товаров')}. Менеджер свяжется с вами в рабочее время (Пн–Пт 8:00–17:00), подтвердит наличие, доставку и оплату.`}</p>
        <div class="flex wrap gap-3"><a class="btn btn--primary" href="catalog.html">Вернуться в каталог</a><a class="btn btn--outline" href="tel:+79520886886">${icon('phone')} +7 (952) 088-68-86</a></div>
      </div>`;
    },
  });

  render();
})();
