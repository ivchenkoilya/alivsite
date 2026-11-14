/* ALIV SPORT — contacts: form, copy, open/closed status, click-to-load map */
(function () {
  'use strict';
  const A = window.ALIV;
  const { $, $$, icon } = A;

  A.bindForm($('[data-form="contacts"]'));

  // Messengers — rendered only when listed in config.js (added later)
  const ms = (A.CFG.messengers || []).filter((m) => m && m.href);
  const mBox = $('[data-messengers]');
  if (mBox && ms.length) {
    mBox.hidden = false;
    mBox.innerHTML = ms.map((m) => `<a class="quick__btn" href="${A.esc(m.href)}" target="_blank" rel="noopener">${icon('message')}${A.esc(m.label)}</a>`).join('');
  }

  // Copy to clipboard
  $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); A.toast('Скопировано', { type: 'ok' }); }
    catch (e) { A.toast('Не удалось скопировать — выделите текст вручную'); }
  }));

  // Open / closed now (Moscow time, Mon–Fri 8:00–17:00)
  const st = $('[data-work-status]');
  try {
    const parts = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value || '';
    const day = get('weekday').toLowerCase(); const h = Number(get('hour')) + Number(get('minute')) / 60;
    const open = !/сб|вс/.test(day) && h >= 8 && h < 17;
    st.className = `work-status ${open ? 'is-open' : ''}`;
    st.innerHTML = `<i></i>${open ? 'Сейчас открыто' : 'Сейчас закрыто'}`;
  } catch (e) { st.remove(); }

  // Product visual in aside
  const p = A.bySlug.get('gravitron') || A.DATA.products[0];
  const pl = $('[data-contact-product]');
  if (p && pl) { pl.href = A.productUrl(p); pl.setAttribute('aria-label', p.name); pl.innerHTML = A.productImg(p.images[0], { sizes: '400px' }); }

  // Map: load the Yandex widget only on request (privacy + performance)
  $('[data-map-load]').addEventListener('click', () => {
    const q = encodeURIComponent(A.CFG.contacts.addressQuery);
    $('[data-map]').innerHTML = `<iframe title="Карта: ${A.esc(A.CFG.contacts.address)}" src="https://yandex.ru/map-widget/v1/?text=${q}&z=16" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  });

  A.observeReveals();
})();
