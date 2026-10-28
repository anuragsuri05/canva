// Builds every template once (in the browser via Vite) and prints counts + failures.
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage();
const warns = [];
p.on('console', (m) => (m.type() === 'warning' || m.type() === 'error') && warns.push(m.text().slice(0, 200)));
p.on('pageerror', (e) => warns.push('PAGEERROR ' + e.message));
await p.goto('http://localhost:5400/');
await p.waitForFunction(() => window.cream?.app.getState().ready);
const res = await p.evaluate(async () => {
  const m = await import('/src/templates/index.ts');
  const idx = m.getIndex();
  const t0 = performance.now();
  let pages = 0;
  let els = 0;
  const bad = [];
  const offPage = [];
  for (const meta of idx) {
    try {
      const b = m.buildTemplateCached(meta.id, true);
      pages += b.pages.length;
      for (const pg of b.pages) {
        els += pg.elements.length;
        const h = pg.height ?? b.height;
        for (const e of pg.elements) {
          if (e.type !== 'text') continue;
          if (e.y + e.h > h + 2 || e.x + e.w > b.width + 2 || e.y < -2 || e.x < -2) offPage.push(meta.id + ' ' + JSON.stringify(e.html.slice(0, 30)));
          if (!isFinite(e.x + e.y + e.w + e.h + e.fontSize)) bad.push(meta.id + ' NaN');
        }
      }
    } catch (e) {
      bad.push(meta.id + ' ' + e.message);
    }
  }
  return {
    total: idx.length,
    ms: Math.round(performance.now() - t0),
    pages,
    els,
    byGroup: m.countBy('group'),
    byCategory: m.countBy('category'),
    byKind: m.countBy('kind'),
    animated: idx.filter((x) => x.animated).length,
    multi: idx.filter((x) => x.pages > 1).length,
    bad: bad.slice(0, 20),
    badCount: bad.length,
    offPage: offPage.slice(0, 40),
    offCount: offPage.length,
  };
});
console.log(JSON.stringify(res, null, 1));
console.log('WARN', warns.length, JSON.stringify(warns.slice(0, 10)));
await b.close();
