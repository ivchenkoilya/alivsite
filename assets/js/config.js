/* =========================================================================
   ALIV SPORT — runtime configuration
   ========================================================================= */
window.ALIV_CONFIG = {
  /* Forms are delivered through the site's existing Contact Form 7 form (#16,
     the one used on /kontakty/ and the home page). Its REST endpoint accepts
     cross-origin POSTs.
       mode: 'auto'  → live only on hosts listed in liveHosts, demo elsewhere
             'live'  → always send
             'demo'  → never send; simulate success and say so in the UI */
  forms: {
    mode: 'auto',
    liveHosts: ['alivsport.inetsystems.ru'],
    endpoint: 'https://alivsport.inetsystems.ru/wp-json/contact-form-7/v1/contact-forms/16/feedback',
    formId: 16,
    unitTag: 'wpcf7-f16-o1',
    fields: { name: 'your-name', phone: 'tel-774', message: 'your-message' },
  },

  /* Art-directed visuals produced separately (see IMAGE_REQUESTS.md).
     Put the file into assets/img/generated/ and set the path here — the slot
     switches from its fallback (a real ALIV photo) or placeholder automatically. */
  images: {
    'home-hero': null,          // №01  e.g. 'assets/img/generated/home-hero.webp'
    'home-hero-mobile': null,   // №02
    'catalog-hero': null,       // №03
    'about-hero': null,         // №04
    'production-1': null,       // №05 цех / общий план
    'production-2': null,       // №06 сварка
    'production-3': null,       // №07 порошковая окраска
    'production-4': null,       // №08 сборка / контроль
    'price-hero': null,         // №09
    'contacts-hero': null,      // №10
    'cta-band': null,           // №11
    'product-dark': {},         // №12+ { 'zhim-nogami': 'assets/img/generated/products/zhim-nogami-dark.webp' }
  },

  /* Добавятся позже — блоки появятся на сайте автоматически, как только списки заполнены.
     Пустые списки = блоков нет (никаких «мёртвых» ссылок). */
  messengers: [
    // { type: 'whatsapp', label: 'WhatsApp', href: 'https://wa.me/79520886886' },
    // { type: 'telegram', label: 'Telegram', href: 'https://t.me/username' },
    // { type: 'max', label: 'MAX', href: '…' },
  ],
  documents: [
    // { title: 'Сертификат соответствия', kind: 'PDF', size: '1,2 МБ', href: 'assets/docs/certificate.pdf' },
    // { title: 'Паспорт изделия «Жим ногами»', kind: 'PDF', size: '800 КБ', href: 'assets/docs/zhim-nogami.pdf' },
  ],

  contacts: {
    phoneMain: '+7 (952) 088-68-86', phoneMainHref: 'tel:+79520886886',
    phoneOffice: '+7 (48242) 4-57-17', phoneOfficeHref: 'tel:+74824245717',
    email: 'if-78@mail.ru',
    address: '171251, Тверская область, г. Конаково, ул. Белавинская, 47а',
    addressQuery: 'Конаково, Белавинская улица, 47а',
    hours: 'Пн–Пт 8:00–17:00, Сб–Вс — выходные',
  },
};
