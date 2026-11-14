/*
 * ALIV SPORT — product reviews with star rating and protection against fake reviews.
 *
 * Only real reviews are shown (WooCommerce rating/count in data/products.js; none exist yet).
 * New reviews never appear instantly — they go to moderation through the site's form, and:
 *   • the author gives an order number or the phone used for the purchase (not published) —
 *     the manager checks it against orders, and only verified buyers get published with the
 *     "Проверенный покупатель" badge (WooCommerce has the same option: "verified owners only");
 *   • honeypot field + minimum time on the page filter out bots;
 *   • one review per product from a device; the text must be meaningful (≥ 40 characters).
 * Rules are published openly next to the form (see RULES) — honest moderation, not hiding criticism.
 */
(function () {
  'use strict';
  const A = window.ALIV;
  const { $, esc, icon, plural } = A;
  const root = $('[data-reviews]');
  if (!root) return;
  const p = A.bySlug.get(new URLSearchParams(location.search).get('slug') || 'zhim-nogami');
  if (!p) return;
  const openedAt = Date.now();
  const MIN_SECONDS = 8;
  const doneKey = `aliv.review.${p.id}`;
  const already = (() => { try { return !!localStorage.getItem(doneKey); } catch (e) { return false; } })();
  const reviews = p.reviewList || []; // filled from WooCommerce when real reviews exist

  const star = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
  const RULES = [
    'Публикуем отзывы только проверенных покупателей: менеджер сверяет номер заказа или телефон с данными о покупке. Эти данные не публикуются.',
    'Публикуем и положительные, и отрицательные отзывы — если они о товаре и написаны без оскорблений.',
    'Не публикуем: рекламу, ссылки, персональные данные, оскорбления, отзывы не о товаре и повторы.',
    'На каждый отзыв может ответить представитель ALIV SPORT — ответ публикуется под отзывом.',
    'Рейтинг товара считается только по опубликованным отзывам проверенных покупателей.',
  ];

  const avg = p.rating || 0; const count = p.reviewCount || 0;
  root.innerHTML = `
    <div class="rv-summary">
      ${count ? `
        <p class="rv-avg">${avg.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}</p>
        <span class="stars" style="--val:${avg};--size:22px" role="img" aria-label="Рейтинг ${avg} из 5"></span>
        <p class="muted small">${count} ${plural(count, 'отзыв', 'отзыва', 'отзывов')} проверенных покупателей</p>`
      : `<span class="stars" style="--val:0;--size:22px" aria-hidden="true"></span>
        <p class="h4">Отзывов пока нет</p>
        <p class="muted small">Купили этот тренажёр? Расскажите, как он в работе, — ваш отзыв поможет другим покупателям.</p>`}
      <div class="rv-trust">${icon('shield')}<span>Публикуем только отзывы проверенных покупателей</span></div>
    </div>
    <div class="rv-main">
      <div class="rv-list" data-rv-list>${reviews.map((r) => `
        <article class="rv-item">
          <header><b>${esc(r.author)}</b>${r.verified ? `<span class="tag tag--new">${icon('check')}Проверенный покупатель</span>` : ''}<span class="stars" style="--val:${r.rating};--size:16px" role="img" aria-label="Оценка ${r.rating} из 5"></span><time class="muted small">${esc(r.date)}</time></header>
          <p>${esc(r.text)}</p>
          ${r.reply ? `<div class="rv-reply"><b>Ответ ALIV SPORT</b><p>${esc(r.reply)}</p></div>` : ''}
        </article>`).join('')}</div>

      ${already ? `<div class="form-status form-status--ok is-visible">${icon('check-circle')}<span>Вы уже отправили отзыв об этом тренажёре — он на проверке. Спасибо!</span></div>` : `
      <form class="form rv-form panel panel--pad" data-rv-form novalidate>
        <h3 class="h4">Оставить отзыв</h3>
        <div class="field star-field" data-star-field>
          <span class="field__label">Ваша оценка <b>*</b></span>
          <fieldset class="star-input" aria-label="Оценка от 1 до 5">
            ${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" value="${n}" id="rv-s${n}"><label for="rv-s${n}" title="${n} из 5">${star}<span class="sr-only">${n} из 5</span></label>`).join('')}
          </fieldset>
          <span class="field__error">Поставьте оценку</span>
        </div>
        <div class="form-row form-row--2">
          <div class="field">
            <label class="field__label" for="rv-name">Имя <b>*</b></label>
            <div class="field__control"><svg class="i"><use href="#i-user"/></svg><input class="input" id="rv-name" name="name" required autocomplete="name" placeholder="Как подписать отзыв"></div>
            <span class="field__error">Укажите имя</span>
          </div>
          <div class="field">
            <label class="field__label" for="rv-phone">Телефон, указанный при покупке <b>*</b></label>
            <div class="field__control"><svg class="i"><use href="#i-shield"/></svg><input class="input" id="rv-phone" name="phone" type="tel" inputmode="tel" required data-phone placeholder="Не публикуется"></div>
            <span class="field__error">Нужен для проверки покупки</span>
          </div>
        </div>
        <div class="field">
          <label class="field__label" for="rv-order">Номер заказа или счёта</label>
          <input class="input input--plain" id="rv-order" name="order" placeholder="Если есть — ускорит проверку. Не публикуется">
        </div>
        <div class="form-row form-row--2">
          <div class="field"><label class="field__label" for="rv-plus">Достоинства</label><textarea class="textarea input--plain" id="rv-plus" name="plus" rows="3"></textarea></div>
          <div class="field"><label class="field__label" for="rv-minus">Недостатки</label><textarea class="textarea input--plain" id="rv-minus" name="minus" rows="3"></textarea></div>
        </div>
        <div class="field">
          <label class="field__label" for="rv-text">Отзыв <b>*</b></label>
          <textarea class="textarea input--plain" id="rv-text" name="text" required minlength="40" rows="4" placeholder="Как давно пользуетесь, для какого зала покупали, что понравилось"></textarea>
          <span class="field__error">Напишите хотя бы пару предложений (от 40 символов)</span>
        </div>
        <label class="rv-hp" aria-hidden="true">Не заполняйте это поле <input type="text" name="website" tabindex="-1" autocomplete="off"></label>
        <label class="checkbox"><input type="checkbox" name="consent" required><span>Согласен с правилами публикации и обработкой персональных данных</span></label>
        <div class="form-status" role="status" aria-live="polite" data-form-status></div>
        <button class="btn btn--primary" type="submit">${icon('send')}Отправить на проверку</button>
      </form>`}

      <div class="acc rv-rules"><div class="acc__item">
        <button class="acc__btn" type="button" aria-expanded="false" aria-controls="rv-rules">Правила публикации отзывов<span class="acc__icon" aria-hidden="true"></span></button>
        <div class="acc__panel" id="rv-rules"><div><div class="acc__content"><ul class="check-list">${RULES.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div></div></div>
      </div></div>
    </div>`;

  const form = $('[data-rv-form]', root);
  if (!form) return;
  // star rating is validated separately (radio group)
  form.addEventListener('change', (e) => { if (e.target.name === 'rating') $('[data-star-field]', form).classList.remove('is-invalid'); });
  A.bindForm(form, {
    compose: (f, fd) => {
      const rating = fd.get('rating');
      if (!rating) { $('[data-star-field]', form).classList.add('is-invalid'); throw new Error('Поставьте оценку'); }
      if (fd.get('website')) throw new Error('Не удалось отправить'); // honeypot filled → bot
      if ((Date.now() - openedAt) / 1000 < MIN_SECONDS) throw new Error('Слишком быстро — проверьте текст и отправьте ещё раз');
      if (String(fd.get('text')).trim().length < 40) { form.querySelector('#rv-text').closest('.field').classList.add('is-invalid'); throw new Error('Отзыв слишком короткий'); }
      return {
        name: fd.get('name'),
        phone: fd.get('phone'),
        message: [
          'ОТЗЫВ НА МОДЕРАЦИЮ (публиковать только после проверки покупки)',
          `Товар: ${p.name}${p.sku ? ' (' + p.sku + ')' : ''} — ${p.url}`,
          `Оценка: ${rating} из 5`,
          `Телефон покупки: ${fd.get('phone')}${fd.get('order') ? ` · заказ/счёт: ${fd.get('order')}` : ''}`,
          fd.get('plus') ? `Достоинства: ${fd.get('plus')}` : '',
          fd.get('minus') ? `Недостатки: ${fd.get('minus')}` : '',
          `Отзыв: ${fd.get('text')}`,
        ].filter(Boolean).join('\n'),
      };
    },
    onSuccess: (r) => {
      if (!r.demo) { try { localStorage.setItem(doneKey, String(Date.now())); } catch (e) { /* ignore */ } }
      const st = $('[data-form-status]', form);
      st.className = `form-status form-status--${r.demo ? 'info' : 'ok'} is-visible`;
      st.innerHTML = `${icon(r.demo ? 'info' : 'check-circle')}<span>${r.demo ? '<b>Демо-режим:</b> отзыв прошёл проверку формы, но не отправлен.' : '<b>Спасибо!</b> Отзыв отправлен на проверку. После подтверждения покупки он появится на странице.'}</span>`;
    },
  });
})();
