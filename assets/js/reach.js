/*
 * ALIV SPORT — "Позвонить" / "Написать письмо" that work on every device.
 * Phones and tablets: tel: / mailto: open the dialer or mail app directly.
 * Computers often have no app registered for tel:/mailto:, so the click would do nothing —
 * there we open a dialog: numbers to copy + a "call me back" form; e-mail with copy and
 * one-click compose in Gmail / Яндекс Почте / Mail.ru.
 */
(function () {
  'use strict';
  const A = window.ALIV;
  const { esc, icon } = A;
  const C = A.CFG.contacts;
  const desktop = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const modal = document.createElement('div');
  modal.className = 'modal'; modal.setAttribute('data-modal', 'reach'); modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = '<div class="modal__backdrop" data-modal-close></div><div class="modal__dialog reach" role="dialog" aria-modal="true" aria-labelledby="reach-title"></div>';
  document.body.appendChild(modal);
  const box = modal.querySelector('.reach');

  const copyBtn = (value, label) => `<button class="btn btn--outline btn--sm" type="button" data-copy-value="${esc(value)}">${icon('copy')}${label}</button>`;
  const subj = encodeURIComponent('Запрос с сайта ALIV SPORT');

  function openPhone() {
    box.innerHTML = `
      <div class="modal__head"><div><p class="kicker">Позвонить</p><h2 class="h3" id="reach-title" style="margin-top:10px">Наберите нас или закажите звонок</h2></div><button class="icon-btn" type="button" data-modal-close aria-label="Закрыть">${icon('close')}</button></div>
      <div class="modal__body">
        <ul class="reach__list">
          <li><span>${icon('phone')}</span><div><a class="reach__big" href="${C.phoneMainHref}" data-direct>${esc(C.phoneMain)}</a><small>Мобильный</small></div>${copyBtn(C.phoneMain, 'Копировать')}</li>
          <li><span>${icon('phone')}</span><div><a class="reach__big" href="${C.phoneOfficeHref}" data-direct>${esc(C.phoneOffice)}</a><small>Офис, Конаково</small></div>${copyBtn(C.phoneOffice, 'Копировать')}</li>
        </ul>
        <p class="reach__hours">${icon('clock')}<span>${esc(C.hours)}</span><b class="reach__now" data-reach-now></b></p>
        <form class="form reach__form" data-form="callback" novalidate>
          <p class="h4">Перезвоните мне</p>
          <div class="form-row form-row--2">
            <div class="field"><div class="field__control"><svg class="i"><use href="#i-user"/></svg><input class="input" name="name" required autocomplete="name" placeholder="Имя" aria-label="Имя"></div><span class="field__error">Укажите имя</span></div>
            <div class="field"><div class="field__control"><svg class="i"><use href="#i-phone"/></svg><input class="input" name="phone" type="tel" inputmode="tel" required data-phone autocomplete="tel" placeholder="+7 (___) ___-__-__" aria-label="Телефон"></div><span class="field__error">Проверьте номер</span></div>
          </div>
          <label class="checkbox"><input type="checkbox" name="consent" required><span>Согласен на обработку персональных данных</span></label>
          <div class="form-status" role="status" aria-live="polite" data-form-status></div>
          <button class="btn btn--primary btn--block" type="submit">${icon('phone')}Жду звонка</button>
        </form>
      </div>`;
    A.bindForm(box.querySelector('[data-form="callback"]'), {
      compose: (f, fd) => ({ name: fd.get('name'), phone: fd.get('phone'), message: `ОБРАТНЫЙ ЗВОНОК\nСтраница: ${location.href}` }),
    });
    const now = box.querySelector('[data-reach-now]');
    try {
      const parts = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      const d = parts.find((x) => x.type === 'weekday').value; const h = Number(parts.find((x) => x.type === 'hour').value);
      const open = !/сб|вс/i.test(d) && h >= 8 && h < 17;
      now.textContent = open ? 'сейчас на связи' : 'сейчас нерабочее время — перезвоним утром';
      now.classList.toggle('is-open', open);
    } catch (e) { now.remove(); }
    A.openOverlay(modal, { focus: '[data-modal-close]' });
  }

  function openMail() {
    const to = encodeURIComponent(C.email);
    box.innerHTML = `
      <div class="modal__head"><div><p class="kicker">Написать письмо</p><h2 class="h3" id="reach-title" style="margin-top:10px">${esc(C.email)}</h2></div><button class="icon-btn" type="button" data-modal-close aria-label="Закрыть">${icon('close')}</button></div>
      <div class="modal__body">
        <p class="muted" style="margin-bottom:16px">Для предложений, заказов и запросов КП. Откройте удобную почту — адрес и тема уже подставлены.</p>
        <div class="reach__mail">
          <a class="btn btn--primary" href="https://mail.google.com/mail/?view=cm&to=${to}&su=${subj}" target="_blank" rel="noopener">Gmail</a>
          <a class="btn btn--dark" href="https://mail.yandex.ru/compose?to=${to}&subject=${subj}" target="_blank" rel="noopener">Яндекс Почта</a>
          <a class="btn btn--dark" href="https://e.mail.ru/compose/?to=${to}&subject=${subj}" target="_blank" rel="noopener">Mail.ru</a>
          <a class="btn btn--dark" href="mailto:${esc(C.email)}?subject=${subj}" data-direct>Почтовая программа</a>
        </div>
        <div class="reach__copyline"><code>${esc(C.email)}</code>${copyBtn(C.email, 'Скопировать адрес')}</div>
        <p class="form-note">Или оставьте заявку — менеджер ответит сам: <button class="text-link" type="button" data-quote-open>форма заявки</button>.</p>
      </div>`;
    A.openOverlay(modal, { focus: '[data-modal-close]' });
  }

  document.addEventListener('click', async (e) => {
    const cp = e.target.closest('[data-copy-value]');
    if (cp) {
      try { await navigator.clipboard.writeText(cp.dataset.copyValue); A.toast(`Скопировано: ${esc(cp.dataset.copyValue)}`, { type: 'ok' }); }
      catch (err) { A.toast('Не удалось скопировать — выделите текст вручную'); }
      return;
    }
    const a = e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
    if (!a || a.hasAttribute('data-direct') || !desktop()) return; // phones dial directly
    e.preventDefault();
    if (a.href.startsWith('tel:')) openPhone(); else openMail();
  });
  A.openPhone = openPhone; A.openMail = openMail;
})();
