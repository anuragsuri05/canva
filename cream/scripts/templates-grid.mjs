// Screenshots the Templates page grid for a list of searches: node scripts/templates-grid.mjs <outdir> [query...]
import { chromium } from '@playwright/test';
const out = process.argv[2];
const queries = process.argv.slice(3);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() === 'error' && !/picsum|Failed to load resource/.test(m.text()) && errs.push(m.text()));
await p.goto('http://localhost:5400/');
await p.waitForFunction(() => window.cream?.app.getState().ready);
for (const q of queries.length ? queries : ['instagram post']) {
  await p.evaluate((q) => (location.hash = '#/templates/' + encodeURIComponent(q)), q);
  await p.waitForSelector('[data-testid=template-card]', { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const count = await p.locator('[data-testid=templates-count]').textContent().catch(() => '?');
  console.log(q, '=>', count);
  const el = p.locator('.tpl-masonry').first();
  await el.evaluate((e) => e.scrollIntoView());
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/grid-${q.replace(/\W+/g, '_')}.png` });
}
console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
await b.close();
