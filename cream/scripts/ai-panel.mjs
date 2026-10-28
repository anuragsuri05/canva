// Cream AI editor panel: keyless Design for me, rule-based edits, translate.
import { chromium } from '@playwright/test';
const out = process.argv[2] || '.';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message + ' @@ ' + (e.stack||'').split('\n').slice(0,6).join(' | ')));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:5400/');
await p.waitForFunction(() => window.cream?.app.getState().ready);
const id = await p.evaluate(() => window.cream.app.getState().createDesign({ preset: 'instagram-square' }).id);
await p.goto('http://localhost:5400/#/design/' + id);
await p.waitForSelector('[data-testid=editor]');
await p.evaluate(() => window.cream.editor.setState({ side: 'ai' }));
await p.waitForSelector('[data-testid=ai-panel]');
await p.click('[data-testid=ai-mode-design]');
await p.fill('[data-testid=ai-prompt]', 'Instagram post for a summer jazz festival on June 5');
await p.click('[data-testid=ai-generate]');
try { await p.waitForSelector('[data-testid=ai-candidate-0]', { timeout: 30000 }); } catch (e) { await p.screenshot({ path: out + '/ai-fail.png' }); console.log('ERRORS', JSON.stringify(errs)); console.log(await p.$eval('[data-testid=ai-panel]', (e) => e.innerText)); throw e; }
await p.waitForTimeout(2500);
await p.screenshot({ path: out + '/ai-design-candidates.png' });
await p.click('[data-testid=ai-candidate-1]');
await p.click('[data-testid=ai-insert-append]');
await p.waitForTimeout(2500);
await p.screenshot({ path: out + '/ai-design-inserted.png' });
const info = await p.evaluate(() => { const d = window.cream.editor.getState().design; return d.pages.map((pg) => pg.elements.map((e) => e.type + ':' + (e.html ?? '').slice(0, 30))); });
console.log('PAGES', JSON.stringify(info));
// rule-based edits
await p.click('[data-testid=ai-mode-edit]');
for (const cmd of ['make headlines blue', 'dark mode', 'translate to spanish']) {
  await p.fill('[data-testid=ai-prompt]', cmd);
  await p.click('[data-testid=ai-generate]');
  await p.waitForFunction(() => !document.querySelector('[data-testid=ai-stop]'), null, { timeout: 30000 });
  await p.waitForTimeout(800);
}
await p.screenshot({ path: out + '/ai-edits.png' });
const after = await p.evaluate(() => { const s = window.cream.editor.getState(); const pg = s.design.pages.find((x) => x.id === s.pageId); return { bg: pg.background, texts: pg.elements.filter((e) => e.type === 'text').map((e) => [e.color, e.html]) }; });
console.log('AFTER', JSON.stringify(after));
const replies = await p.$$eval('[data-testid=ai-reply]', (els) => els.map((e) => e.innerText.slice(0, 120)));
console.log('REPLIES', JSON.stringify(replies));
console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
await b.close();
