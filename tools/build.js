/*
 * Static page builder: src/pages/*.html + src/partials/* → dist/
 * Each page starts with a JSON meta comment:
 *   <!--meta {"title": "...", "description": "...", "page": "home", "scripts": ["home"], "data": ["products"]} -->
 * Usage: node tools/build.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
// BRAND=original node tools/build.js → the current alivgym logo; default → new ALIV SPORT mark
const logo = read(`src/partials/${process.env.BRAND === 'original' ? 'logo-original' : 'logo'}.html`).trim();
const partial = (name) => read(`src/partials/${name}.html`).replace(/<!--logo-->/g, logo);
const v = Date.now().toString(36); // cache-busting for static hosting

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
// manual copy: fs.cpSync fails on some Windows paths with non-ASCII characters
const copyDir = (from, to) => {
  const src = path.join(root, from); const dst = path.join(dist, to);
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.isDirectory()) copyDir(path.join(from, e.name), path.join(to, e.name));
    else fs.writeFileSync(path.join(dst, e.name), fs.readFileSync(path.join(src, e.name)));
  }
};
copyDir('assets', 'assets');
copyDir('data', 'data');

const SITE = 'https://alivsport.inetsystems.ru';
const pages = fs.readdirSync(path.join(root, 'src/pages')).filter((f) => f.endsWith('.html'));
for (const file of pages) {
  let src = read(`src/pages/${file}`);
  const m = src.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`${file}: missing meta block`);
  const meta = JSON.parse(m[1]);
  src = src.slice(m[0].length);
  const data = (meta.data || []).map((d) => `<script src="data/${d}.js?v=${v}"></script>`).join('\n  ');
  const scripts = (meta.scripts || []).map((s) => `<script src="assets/js/${s}.js?v=${v}"></script>`).join('\n  ');
  const styles = (meta.styles || []).map((s) => `<link rel="stylesheet" href="assets/css/${s}.css?v=${v}">`).join('\n  ');
  const html = `<!doctype html>
<html lang="ru" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${meta.title}</title>
  <meta name="description" content="${meta.description}">
  ${meta.canonical ? `<link rel="canonical" href="${SITE}${meta.canonical}">` : ''}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="ALIV SPORT">
  <meta property="og:title" content="${meta.title}">
  <meta property="og:description" content="${meta.description}">
  <meta name="theme-color" content="#0B0C0E">
  <link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://alivsport.inetsystems.ru">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Oswald:wght@500;600;700&family=Unbounded:wght@600;800&display=swap">
  <link rel="stylesheet" href="assets/css/tokens.css?v=${v}">
  <link rel="stylesheet" href="assets/css/main.css?v=${v}">
  <link rel="stylesheet" href="assets/css/pages.css?v=${v}">
  <link rel="stylesheet" href="assets/css/features.css?v=${v}">
  <link rel="stylesheet" href="assets/css/ambient.css?v=${v}">
  ${styles}
  ${meta.preload ? meta.preload.map((h) => `<link rel="preload" as="image" href="${h}" fetchpriority="high">`).join('\n  ') : ''}
  ${meta.jsonld ? `<script type="application/ld+json">${JSON.stringify(meta.jsonld)}</script>` : ''}
</head>
<body data-page="${meta.page}" data-brand="${process.env.BRAND === 'original' ? 'original' : 'new'}">
${partial('icons')}
${partial('header')}
<main id="main">
${src.trim()}
</main>
${partial('footer')}
${partial('overlays')}
  <script src="assets/js/config.js?v=${v}"></script>
  ${data}
  <script src="assets/js/core.js?v=${v}"></script>
  <script src="assets/js/reach.js?v=${v}"></script>
  <script src="assets/js/ambient.js?v=${v}"></script>
  ${scripts}
</body>
</html>
`;
  fs.writeFileSync(path.join(dist, file), html.replace(/\n\s*\n\s*\n/g, '\n'));
  console.log('built', file);
}
