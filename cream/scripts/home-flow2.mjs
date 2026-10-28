import { chromium } from '@playwright/test';
import fs from 'fs';
const out = process.argv[2];
const img = process.argv[3];
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGE ' + e.message));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
p.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'DELETE' : undefined));
const log = (...a) => console.log(...a);
const shot = (n) => p.screenshot({ path: `${out}/home2-${n}.png` });
const st = (fn, a) => p.evaluate(fn, a);
await p.goto('http://localhost:5400/');
await p.waitForFunction(() => window.cream?.app.getState().ready);

// Category picker
await p.click('[data-testid=cat-social]');
await p.waitForTimeout(300);
await shot('1-cat-social');
// Edit photo
await p.click('[data-testid=create-design-btn]');
const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-testid=edit-photo-btn]')]);
await fc.setFiles(img);
await p.waitForSelector('[data-testid=editor]', { timeout: 10000 });
log('edit photo design', await st(() => { const d = window.cream.editor.getState().design; return [d.width, d.height, d.pages[0].elements[0]?.type]; }));
// Brand panel in editor
await p.evaluate(() => window.cream.editor.setState({ side: 'brand' }));
await p.waitForSelector('[data-testid=brand-panel]');
await p.evaluate(() => window.cream.editor.getState().deselect());
await p.locator('[data-testid=brand-panel-swatch]').nth(1).click();
log('page bg', await st(() => JSON.stringify(window.cream.editor.getState().design.pages[0].background)));
await p.click('[data-testid=brand-panel-font-heading]');
await p.waitForTimeout(300);
log('inserted', await st(() => { const els = window.cream.editor.getState().design.pages[0].elements; const t = els[els.length - 1]; return [t.type, t.fontFamily, t.fontSize, t.role]; }));
// apply color to selected text
await p.locator('[data-testid=brand-panel-swatch]').nth(0).click();
log('text color', await st(() => { const els = window.cream.editor.getState().design.pages[0].elements; return els[els.length - 1].color; }));
await shot('2-brand-panel');
await p.evaluate(() => window.cream.editor.setState({ side: 'logos' }));
await p.waitForTimeout(300);
await shot('3-logos-panel');
await p.click('[data-testid=brand-edit-link]').catch(async () => {
  await p.evaluate(() => window.cream.editor.setState({ side: 'brand' }));
  await p.click('[data-testid=brand-edit-link]');
});
await p.waitForSelector('[data-testid=kit-page]');
log('navigated to kit page');

// Hero AI mode
await p.goto('http://localhost:5400/#/');
await p.waitForSelector('[data-testid=hero]');
await p.click('[data-testid=hero-mode-ai]');
await p.fill('[data-testid=hero-input]', 'make a poster');
await shot('4-hero-ai');
await p.click('[data-testid=hero-submit]');
await p.waitForTimeout(300);
log('route', await st(() => location.hash), await st(() => sessionStorage.getItem('cream-ai-prompt')));
// Hero search
await p.goto('http://localhost:5400/#/');
await p.fill('[data-testid=hero-input]', 'insta');
await p.waitForTimeout(200);
await shot('5-hero-search');

// Nav pin/unpin + reorder
await p.hover('[data-testid=nav-dreamlab]');
await p.click('[data-testid=pin-dreamlab]');
log('pinned after unpin', await st(() => window.cream.app.getState().settings.pinnedNav.join(',')));
await p.click('[data-testid=nav-more]');
await shot('6-more');
await p.click('[data-testid=more-pin-dreamlab]');
await p.locator('[data-testid=nav-apps]').dragTo(p.locator('[data-testid=nav-projects]'));
await p.waitForTimeout(200);
log('pinned after reorder', await st(() => window.cream.app.getState().settings.pinnedNav.join(',')));

// import .cream
const d = await st(() => window.cream.app.getState().designs[Object.keys(window.cream.app.getState().designs)[0]]);
fs.writeFileSync(out + '/x.cream', JSON.stringify(d));
await p.click('[data-testid=create-design-btn]');
const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-testid=import-file-btn]')]);
await fc2.setFiles(out + '/x.cream');
await p.waitForSelector('[data-testid=editor]', { timeout: 10000 });
log('imported count', await st(() => Object.keys(window.cream.app.getState().designs).length));

// Settings storage + trash empty
await p.goto('http://localhost:5400/#/settings/storage');
await p.waitForTimeout(800);
log('storage', await p.locator('[data-testid=storage-usage]').innerText());
await p.goto('http://localhost:5400/#/settings/profile');
await p.fill('[data-testid=profile-name]', 'Laksh Sharma');
await p.click('[data-testid=avatar-color-e2557a]');
await shot('7-profile');
const ids = await st(() => Object.keys(window.cream.app.getState().designs));
await st((ids) => ids.forEach((id) => window.cream.app.getState().trashDesign(id)), ids);
await p.goto('http://localhost:5400/#/trash');
await p.waitForTimeout(300);
await p.click('[data-testid=trash-empty]');
await p.waitForTimeout(300);
log('after empty', await st(() => Object.keys(window.cream.app.getState().designs).length));
// Planner add
await st(() => window.cream.app.getState().createDesign({ preset: 'instagram-post' }));
await p.goto('http://localhost:5400/#/planner');
await p.click('[data-testid=planner-add]');
await p.fill('[data-testid=planner-caption]', 'Launch day!');
await p.click('[data-testid=planner-save]');
await p.waitForTimeout(300);
log('planner', await st(() => localStorage.getItem('cream-planner')));
await shot('8-planner');
console.log('ERRORS', JSON.stringify(errs.slice(0, 15)));
await b.close();
