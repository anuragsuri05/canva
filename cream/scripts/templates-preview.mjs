// Opens the preview modal for the first result of each search and screenshots every page.
// node scripts/templates-preview.mjs <outdir> <query> [maxPages] [cardIndex]
import { chromium } from '@playwright/test';
const [out, q, maxPages = '12', idx = '0'] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:5400/#/templates/' + encodeURIComponent(q));
await p.waitForFunction(() => window.cream?.app.getState().ready);
await p.waitForSelector('[data-testid=template-card]');
await p.locator('[data-testid=template-card]').nth(Number(idx)).click();
await p.waitForSelector('[data-testid=template-preview]');
const slug = q.replace(/\W+/g, '_') + '_' + idx;
for (let i = 0; i < Number(maxPages); i++) {
  await p.waitForTimeout(1800);
  await p.locator('[data-testid=template-preview]').screenshot({ path: `${out}/pv-${slug}-${i + 1}.png` });
  const next = p.locator('[data-testid=template-preview] .nav.r');
  if (!(await next.count()) || (await next.isDisabled())) break;
  await next.click();
}
// customize -> editor
await p.click('[data-testid=customize-template]');
await p.waitForSelector('[data-testid=editor]', { timeout: 10000 }).catch(() => {});
const info = await p.evaluate(() => {
  const d = window.cream.editor.getState().design;
  return d && { title: d.title, preset: d.preset, pages: d.pages.length };
});
console.log('customized', JSON.stringify(info));
console.log('ERRORS', JSON.stringify(errs.slice(0, 5)));
await b.close();
