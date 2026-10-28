// Translate panel (MyMemory keyless) + rule-based "translate to french" + Magic Write offline tools.
import { chromium } from '@playwright/test';
const out = process.argv[2] || '.';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:5400/');
await p.waitForFunction(() => window.cream?.app.getState().ready);
const id = await p.evaluate(() => window.cream.app.getState().createDesign({ preset: 'instagram-square' }).id);
await p.goto('http://localhost:5400/#/design/' + id);
await p.waitForSelector('[data-testid=editor]');
await p.evaluate(() => {
  const ed = window.cream.editor.getState();
  const mk = (html, y, size, w = 900) => ({ id: 't' + y, type: 'text', x: 90, y, w, h: size * 1.4, rotation: 0, opacity: 1, html, fontFamily: 'Inter', fontSize: size, fontWeight: 700, italic: false, underline: false, strike: false, color: '#222', align: 'left', lineHeight: 1.3, letterSpacing: 0, uppercase: false, autoHeight: true });
  ed.addElements([mk('Good morning, <b>friends</b>!', 120, 80), mk('Our new coffee shop opens next week.', 400, 40), mk('Fresh bread every day', 600, 40)]);
  window.cream.editor.setState({ right: 'translate', selection: [] });
});
await p.waitForSelector('[data-testid=translate-panel]');
await p.selectOption('[data-testid=translate-lang]', 'es');
await p.click('[data-testid=translate-apply]');
await p.waitForSelector('[data-testid=translate-done], [data-testid=ai-error]', { timeout: 60000 });
await p.waitForTimeout(800);
await p.screenshot({ path: out + '/ai-translate.png' });
const pages = await p.evaluate(() => window.cream.editor.getState().design.pages.map((pg) => ({ title: pg.title, t: pg.elements.map((e) => e.html) })));
console.log('PAGES', JSON.stringify(pages));
// RTL
await p.selectOption('[data-testid=translate-lang]', 'ar');
await p.click('[data-testid=translate-apply]');
await p.waitForTimeout(500);
await p.waitForFunction(() => !document.querySelector('[data-testid=translate-apply]')?.disabled || false, null, { timeout: 60000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: out + '/ai-translate-rtl.png' });
const rtl = await p.evaluate(() => { const s = window.cream.editor.getState(); const pg = s.design.pages.find((x) => x.id === s.pageId); return pg.elements.map((e) => [Math.round(e.x), e.align, e.html]); });
console.log('RTL', JSON.stringify(rtl));
// rule edit translate
await p.evaluate(() => window.cream.editor.setState({ side: 'ai', right: null, pageId: window.cream.editor.getState().design.pages[0].id }));
await p.click('[data-testid=ai-mode-edit]');
await p.fill('[data-testid=ai-prompt]', 'translate to french');
await p.click('[data-testid=ai-generate]');
await p.waitForTimeout(500);
await p.waitForFunction(() => !document.querySelector('[data-testid=ai-stop]'), null, { timeout: 60000 });
const fr = await p.evaluate(() => window.cream.editor.getState().design.pages[0].elements.map((e) => e.html));
console.log('FR', JSON.stringify(fr));
// Magic write offline
await p.evaluate(() => window.cream.editor.setState({ right: 'magic-write', selection: [window.cream.editor.getState().design.pages[0].elements[1].id] }));
await p.waitForSelector('[data-testid=magic-write-panel]');
await p.click('[data-testid=magic-write-offline-upper]');
await p.click('[data-testid=magic-write-replace]');
await p.waitForTimeout(300);
await p.screenshot({ path: out + '/ai-magicwrite.png' });
console.log('MW', await p.evaluate(() => window.cream.editor.getState().design.pages[0].elements[1].html));
console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
await b.close();
