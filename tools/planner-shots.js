/* Visual check of the planner: presets, zones, drag, 3D view, PNG export → qa/ov/ */
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const c = await b.newContext({ viewport: { width: Number(process.argv[2]) || 1440, height: 1000 }, acceptDownloads: true });
  const p = await c.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:5173/planner.html', { waitUntil: 'networkidle' });
  await p.click('[data-preset=gym]');
  await p.click('[data-zone=legs]');
  await p.click('[data-zone=power]');
  await p.waitForTimeout(600);
  const it = p.locator('.plan-item').nth(1); const bx = await it.boundingBox();
  await p.mouse.move(bx.x + 15, bx.y + 15); await p.mouse.down();
  await p.mouse.move(bx.x + 120, bx.y + 160, { steps: 5 }); await p.mouse.up();
  await p.waitForTimeout(400);
  await p.locator('.planner__main').screenshot({ path: 'qa/ov/planner2.png' });
  await p.click('[data-view-mode="3d"]'); await p.waitForTimeout(1000);
  await p.locator('[data-plan]').screenshot({ path: 'qa/ov/planner3d.png' });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-plan-png]')]);
  await dl.saveAs('qa/ov/plan-export.png');
  console.log('items', await p.locator('.plan-item').count(), 'errors', errs);
  await b.close();
})();
