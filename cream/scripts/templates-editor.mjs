// Editor flow for the templates system: node scripts/templates-editor.mjs <outdir> [preset] [templateQuery]
import { chromium } from '@playwright/test';
const out = process.argv[2];
const preset = process.argv[3] ?? 'presentation';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() === 'error' && !/picsum|Failed to load resource/.test(m.text()) && errs.push(m.text()));
await p.goto('http://localhost:5400/');
await p.waitForFunction(() => window.cream?.app.getState().ready);
const id = await p.evaluate((preset) => window.cream.app.getState().createDesign({ preset }).id, preset);
await p.goto('http://localhost:5400/#/design/' + id);
await p.waitForSelector('[data-testid=editor]');
await p.waitForTimeout(800);
if (!(await p.locator('[data-testid=design-panel]').count())) await p.click('[data-testid=tab-design]');
await p.waitForSelector('[data-testid=design-panel]');
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/ed-${preset}-panel.png` });
// open first template card in the panel
const cards = p.locator('[data-testid=design-panel] [data-testid=template-card]');
console.log('panel cards', await cards.count());
await cards.first().click();
await p.waitForTimeout(800);
const applyAll = p.locator('[data-testid=apply-all-pages]');
if (await applyAll.count()) {
  await p.screenshot({ path: `${out}/ed-${preset}-detail.png` });
  await applyAll.click();
}
await p.waitForTimeout(3000);
const st = await p.evaluate(() => {
  const d = window.cream.editor.getState().design;
  return { pages: d.pages.length, els: d.pages.map((pg) => pg.elements.length) };
});
console.log('after apply', JSON.stringify(st));
await p.screenshot({ path: `${out}/ed-${preset}-applied.png` });
// Styles: apply a palette twice (shuffle) and a font set
await p.click('[data-testid=design-tab-styles]');
await p.waitForTimeout(300);
await p.click('[data-testid=palette-p3]');
await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/ed-${preset}-palette.png` });
await p.click('[data-testid=palette-p3]');
await p.click('[data-testid=fontset-fs3]');
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/ed-${preset}-palette2-font.png` });
// Layouts
await p.click('[data-testid=design-tab-layouts]');
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/ed-${preset}-layouts.png` });
const lay = p.locator('[data-testid^=layout-]').nth(2);
if (await lay.count()) await lay.click();
await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/ed-${preset}-layout-applied.png` });
console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
await b.close();
