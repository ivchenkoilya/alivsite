/*
 * Builds data/products.js and data/pricelist.js from raw exports of the live
 * WordPress/WooCommerce site (Store API + WP REST API).
 *
 * Usage:  node tools/build-data.js <dir-with-p1.json,cats.json,pagesc.json>
 *
 * Raw files are fetched with:
 *   /wp-json/wc/store/v1/products?per_page=100          -> p1.json
 *   /wp-json/wc/store/v1/products/categories?per_page=100 -> cats.json
 *   /wp-json/wp/v2/pages?per_page=100&_fields=slug,content -> pagesc.json
 *
 * Nothing here changes business data: names, SKUs, prices and specs are copied
 * as published. The only derived fields are `type` and `purpose` (filter facets
 * inferred from the product name / category) — see TYPE_RULES below. On the
 * WordPress side these should become real product attributes or tags.
 */
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) { console.error('usage: node tools/build-data.js <raw-dir>'); process.exit(1); }
const out = path.join(__dirname, '..', 'data');
fs.mkdirSync(out, { recursive: true });

const products = JSON.parse(fs.readFileSync(path.join(src, 'p1.json'), 'utf8'));
const cats = JSON.parse(fs.readFileSync(path.join(src, 'cats.json'), 'utf8'));
const pages = JSON.parse(fs.readFileSync(path.join(src, 'pagesc.json'), 'utf8'));

const decode = (s) => String(s || '')
  .replace(/&#8212;/g, '—').replace(/&#8211;/g, '–').replace(/&nbsp;/g, ' ')
  .replace(/&quot;/g, '"').replace(/&#8220;|&#8221;|&#171;|&#187;/g, '"')
  .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&#8381;/g, '₽')
  .replace(/&amp;/g, '&').replace(/&#039;/g, "'");

// "Жим ногами ." -> "Жим ногами"; "скамья для ..." -> "Скамья для ..."
const cleanName = (n) => {
  let s = decode(n).replace(/\s+/g, ' ').replace(/\s*\.\s*$/, '').replace(/\s+,/g, ',').replace(/,(?=\S)/g, ', ').trim();
  s = s.replace(/\s*-\s*присед/i, '-присед').replace(/\(\s*/g, '(').replace(/\s*\)/g, ')');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const CAT = {
  75: { slug: 'gruzoblochnoe', name: 'Грузоблочные тренажёры', full: 'Оборудование для залов грузоблочное' },
  74: { slug: 'svobodnye-vesa', name: 'Свободные веса, скамьи, стойки', full: 'Оборудование для залов на свободных весах, скамьи, стойки, стеллажи' },
  21: { slug: 'dlya-doma', name: 'Для дома', full: 'Скамьи, стойки, тренажеры для дома' },
};

// Facet rules — first match wins. Inferred from product names only.
const TYPE_RULES = [
  ['racks', 'Рамы, Смит, стойки для приседаний', /рама|полурама|смитт|стойки для приседаний/i],
  ['legs', 'Тренажёры для ног', /жим ногами|гакк|присед|голень|ягодич|бедра/i],
  ['back', 'Спина и тяги', /тяга|гравитрон|гиперэкстенз/i],
  ['press', 'Грудь и плечи', /жим на|пек-дек/i],
  ['arms', 'Руки', /бицепс|трицепс|скотт/i],
  ['functional', 'Турники, брусья, функционал', /брусья|плиобокс|турник/i],
  ['benches', 'Скамьи', /скамья/i],
  ['storage', 'Стойки и хранение', /стойк|тележка|стеллаж/i],
];
const typeOf = (name) => {
  for (const [id, label, re] of TYPE_RULES) if (re.test(name)) return { id, label };
  return { id: 'other', label: 'Другое' };
};

// Description HTML -> structured blocks: paragraphs, lists with headings.
function parseDescription(html) {
  const text = decode(html)
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '')
    .replace(/\r/g, '');
  const blocks = [];
  let list = null;
  for (let raw of text.split('\n')) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    if (/^[•·\-–]\s*/.test(line)) {
      if (!list) { list = { type: 'list', items: [] }; blocks.push(list); }
      list.items.push(line.replace(/^[•·\-–]\s*/, ''));
      continue;
    }
    list = null;
    if (/:$/.test(line) && line.length < 60) blocks.push({ type: 'heading', text: line.replace(/:$/, '') });
    else blocks.push({ type: 'p', text: line });
  }
  return blocks;
}

const lc = (s) => s.trim().toLowerCase();
function parseSpecs(attrs) {
  const specs = [];
  const extra = [];
  const pack = [];
  for (const a of attrs) {
    const key = lc(a.name);
    const vals = a.terms.map((t) => decode(t.name).trim()).filter(Boolean);
    if (!vals.length) continue;
    if (/упаков|место/.test(key)) { pack.push(...vals.flatMap((v) => v.split('\n')).map((v) => v.trim()).filter((v) => v && !/^\d+\.$/.test(v))); continue; }
    if (key === 'основная информация') { extra.push(...vals.flatMap((v) => v.split('\n')).map((v) => v.trim()).filter(Boolean)); continue; }
    const label = a.name.trim().charAt(0).toUpperCase() + a.name.trim().slice(1);
    specs.push({ label, value: vals.join(vals.length > 1 ? ' / ' : '').replace(/\s*\n\s*/g, ' / ') });
  }
  return { specs, features: extra, packaging: pack };
}

// Key metrics for product hero (only from real attributes)
function keyMetrics(specs) {
  const find = (re) => specs.find((s) => re.test(s.label));
  const out = [];
  const dims = find(/^габарит/i);
  const load = find(/^нагрузка/i);
  const weight = find(/^вес$/i);
  const user = find(/пользовател/i);
  if (dims) out.push({ id: 'dims', label: 'Габариты, мм', value: dims.value.replace(/[хx/]/gi, ' × ') });
  if (load) out.push({ id: 'load', label: 'Нагрузка', value: load.value.replace(/\.$/, '') });
  if (weight) out.push({ id: 'weight', label: 'Вес тренажёра', value: weight.value.replace(/\.$/, '') });
  if (user) out.push({ id: 'user', label: 'Макс. вес пользователя', value: user.value.replace(/\.$/, '') });
  return out;
}

const UP = 'https://alivsport.inetsystems.ru/wp-content/uploads/';
const rel = (u) => String(u || '').split(UP).join('');
const list = products.map((p) => {
  const catId = p.categories.length ? p.categories[0].id : 21; // the 3 uncategorised items are the home category (count = 3)
  const name = cleanName(p.name);
  const price = Number(p.prices.price) || null;
  const { specs, features, packaging } = parseSpecs(p.attributes);
  const type = typeOf(name);
  return {
    id: p.id,
    slug: p.slug,
    name,
    sku: decode(p.sku).trim() || null,
    price,
    category: CAT[catId].slug,
    type: type.id,
    purpose: catId === 21 ? 'home' : 'gym',
    url: p.permalink,
    images: p.images.map((i) => ({ src: rel(i.src), thumb: rel(i.thumbnail), srcset: rel(i.srcset), alt: decode(i.alt) || name })),
    specs,
    metrics: keyMetrics(specs),
    features,
    packaging,
    description: parseDescription(p.description),
    order: products.indexOf(p),
    // real WooCommerce rating (0 / 0 when there are no reviews yet — nothing is invented)
    rating: Number(p.average_rating) || 0,
    reviewCount: Number(p.review_count) || 0,
  };
});

const types = Object.fromEntries([...TYPE_RULES.map(([id, label]) => [id, label]), ['other', 'Другое']]);
const categories = Object.values(CAT).map((c) => ({ ...c, count: list.filter((p) => p.category === c.slug).length }));

fs.writeFileSync(path.join(out, 'products.js'),
  '/* Generated by tools/build-data.js from the live WooCommerce Store API. Do not edit by hand. */\n' +
  'window.ALIV_DATA = ' + JSON.stringify({ uploads: UP, generated: new Date().toISOString().slice(0, 10), categories, types, products: list }) + ';\n');

// ---------- Price list ----------
const plHtml = pages.find((p) => p.slug === 'prajs-list').content.rendered;
const rows = [...plHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) =>
  [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => decode(c[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()));
const series = [];
let cur = null;
let pendingSeries = null;
for (const r of rows) {
  const cells = r.filter((c) => c !== '');
  if (!cells.length) continue;
  const joined = cells.join(' ');
  const sm = joined.match(/^СЕРИЯ\s+(\d{3})$/);
  if (sm) { pendingSeries = sm[1]; continue; }
  if (pendingSeries && cells.length === 1 && !/^AL/.test(cells[0])) {
    cur = { code: pendingSeries, title: cells[0].replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' '), items: [] };
    series.push(cur); pendingSeries = null; continue;
  }
  const codeIdx = cells.findIndex((c) => /^AL[\s-]?\d/.test(c));
  if (codeIdx === -1 || !cur) continue;
  const rest = cells.slice(codeIdx + 1);
  if (rest.length < 3) continue; // empty placeholder codes (AL-005, AL-100…)
  const num = (v) => Number(String(v).replace(/\s/g, '').replace(',', '.'));
  let name = rest[0];
  const isNew = /новинка/i.test(name);
  name = name.replace(/\s*новинка\s*/i, '').replace(/\s+/g, ' ').trim();
  const opt = num(rest[1]);
  const rozn = num(rest[2]);
  if (!isFinite(opt) || !isFinite(rozn)) continue;
  cur.items.push({ code: cells[codeIdx], name, opt, rozn, isNew });
}
fs.writeFileSync(path.join(out, 'pricelist.js'),
  '/* Generated by tools/build-data.js from the live "Прайс-лист" page. Do not edit by hand. */\n' +
  'window.ALIV_PRICELIST = ' + JSON.stringify({ title: 'Прайс-лист 2025', source: 'https://alivsport.inetsystems.ru/prajs-list/', fetched: new Date().toISOString().slice(0, 10), series: series.filter((x) => x.items.length) }) + ';\n');

console.log('products', list.length, 'priced', list.filter((p) => p.price).length);
console.log('types', Object.entries(list.reduce((a, p) => ((a[p.type] = (a[p.type] || 0) + 1), a), {})));
console.log('series', series.map((s) => s.code + ':' + s.items.length).join(' '));
