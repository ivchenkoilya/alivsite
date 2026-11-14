/* ALIV SPORT — ambient details: reading-progress line under the header, back-to-top with a progress ring */
(function () {
  'use strict';
  const A = window.ALIV;
  const bar = document.createElement('div'); bar.className = 'read-progress'; bar.setAttribute('aria-hidden', 'true');
  const header = document.querySelector('[data-header]'); if (header) header.appendChild(bar);
  const top = document.createElement('button');
  top.type = 'button'; top.className = 'to-top'; top.setAttribute('aria-label', 'Наверх');
  top.innerHTML = '<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16" pathLength="100"></circle><circle class="to-top__val" cx="18" cy="18" r="16" pathLength="100"></circle></svg>' + A.icon('chevron-down');
  document.body.appendChild(top);
  const val = top.querySelector('.to-top__val');
  let raf = 0;
  const update = () => {
    raf = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const k = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    bar.style.transform = `scaleX(${k})`;
    val.style.strokeDasharray = `${(k * 100).toFixed(1)} 100`;
    top.classList.toggle('is-on', window.scrollY > window.innerHeight * 1.2);
  };
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: A.reduceMotion ? 'auto' : 'smooth' }));
  update();
})();
