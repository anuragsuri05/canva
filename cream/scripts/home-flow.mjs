import { chromium } from '@playwright/test';
const out = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGE ' + e.message));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
p.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'Renamed' : undefined));
const log = (...a) => console.log(...a);
const shot = (n) => p.screenshot({ path: `${out}/home-${n}.png` });
const st = (fn, a) => p.evaluate(fn, a);

await p.goto('http://localhost:5400/');
await p.waitForFunction(() => window.cream?.app.getState().ready);
// seed a few designs
await st(() => {
  const a = window.cream.app.getState();
  for (const id of ['presentation', 'instagram-post', 'flyer', 'youtube-thumbnail']) a.createDesign({ preset: id });
});
await p.waitForTimeout(800);
await shot('1-home');

// Create menu + custom size
await p.click('[data-testid=create-design-btn]');
await p.waitForTimeout(300);
await shot('2-create-menu');
await p.click('[data-testid=custom-size-btn]');
await p.fill('[data-testid=custom-size-width]', '30');
await p.waitForTimeout(150);
const disabled = await p.locator('[data-testid=create-custom]').isDisabled();
log('custom invalid disabled:', disabled, 'error visible:', await p.locator('[data-testid=custom-size-error]').isVisible());
await shot('3-custom-invalid');
await p.selectOption('[data-testid=custom-size-unit]', 'in');
log('in width', await p.inputValue('[data-testid=custom-size-width]'), await p.inputValue('[data-testid=custom-size-height]'));
await p.selectOption('[data-testid=custom-size-unit]', 'px');
await p.fill('[data-testid=custom-size-width]', '1200');
await p.fill('[data-testid=custom-size-height]', '600');
await p.click('[data-testid=create-custom]');
await p.waitForSelector('[data-testid=editor]', { timeout: 10000 });
log('editor design', await st(() => { const d = window.cream.editor.getState().design; return [d.width, d.height, d.category]; }));
await p.goto('http://localhost:5400/#/');
await p.waitForSelector('[data-testid=home-main]');

// Projects + folder
await p.click('[data-testid=nav-projects]');
await p.click('[data-testid=add-new]');
await p.click('[data-testid=new-folder]');
await p.fill('[data-testid=new-folder-name]', 'Campaign');
await p.click('[data-testid=new-folder-create]');
await p.waitForTimeout(400);
const folderId = await st(() => window.cream.app.getState().folders.find((f) => f.name === 'Campaign')?.id);
log('folder', folderId);
// drag first design onto folder
const card = p.locator('[data-testid=design-card]').first();
const dId = await card.getAttribute('data-id');
await card.dragTo(p.locator('[data-testid=folder-card]').first());
await p.waitForTimeout(300);
log('dragged design folderId == folder:', await st((id) => window.cream.app.getState().designs[id].folderId, dId), '==', folderId);
// star second card
const c2 = p.locator('[data-testid=design-card]').nth(0);
const d2 = await c2.getAttribute('data-id');
await c2.hover();
await c2.locator('[data-testid=card-star]').click();
log('starred', await st((id) => window.cream.app.getState().designs[id].starred, d2));
// move via menu
await c2.locator('[data-testid=card-menu]').click();
await p.click('[data-testid=menu-move]');
await p.locator('.move-row', { hasText: 'Campaign' }).click();
await p.click('[data-testid=move-confirm]');
await p.waitForTimeout(200);
log('menu-moved', await st((id) => window.cream.app.getState().designs[id].folderId, d2));
await shot('4-projects');
// multi-select + bulk star
const cards = p.locator('[data-testid=design-card]');
const n = await cards.count();
log('root designs', n);
await cards.nth(0).hover();
await cards.nth(0).locator('[data-testid=card-check]').click();
await cards.nth(1).locator('[data-testid=card-check]').click();
await shot('5-bulk');
await p.click('[data-testid=bulk-copy]');
await p.waitForTimeout(300);
log('after bulk copy count', await cards.count());
// list view
await p.click('[data-testid=view-list]');
await shot('6-list');
await p.click('[data-testid=view-grid]');
// folder page
await p.goto('http://localhost:5400/#/folder/' + folderId);
await p.waitForSelector('[data-testid=folder-page]');
await p.waitForTimeout(500);
await shot('7-folder');
// trash a design from folder
const fc = p.locator('[data-testid=design-card]').first();
const tId = await fc.getAttribute('data-id');
await fc.hover();
await fc.locator('[data-testid=card-menu]').click();
await p.click('[data-testid=menu-trash]');
log('trashed', !!(await st((id) => window.cream.app.getState().designs[id].trashedAt, tId)));
await p.click('[data-testid=nav-trash]');
await p.waitForTimeout(400);
await shot('8-trash');
const tc = p.locator('[data-testid=design-card]').first();
await tc.hover();
await tc.locator('[data-testid=card-menu]').click();
await p.click('[data-testid=menu-restore]');
log('restored', (await st((id) => window.cream.app.getState().designs[id].trashedAt, tId)) === null);
// starred nav
log('starred nav text', (await p.locator('[data-testid=nav-starred]').innerText()).replace(/\n/g, ' | '));

// Brand
await p.click('[data-testid=nav-brand]');
await p.waitForSelector('[data-testid=brand-hub]');
await shot('9-brand');
await p.locator('[data-testid=kit-card]').first().click();
await p.waitForSelector('[data-testid=kit-page]');
await p.click('[data-testid=swatch-add]');
await p.fill('[data-testid=swatch-hex]', '12b886');
await p.keyboard.press('Escape');
await p.fill('[data-testid=font-heading-size]', '80');
await p.fill('[data-testid=kit-voice]', 'Warm and witty.');
await p.waitForTimeout(400);
log('kit', await st(() => { const k = window.cream.app.getState().brandKits[0]; return [k.palettes[0].colors.join(','), k.fonts.heading.size, k.voice]; }));
await p.click('[data-testid=font-heading-family]');
await p.fill('[data-testid=font-search]', 'Lob');
await p.waitForTimeout(600);
await shot('10-kit-fontpick');
await p.locator('.font-row', { hasText: 'Lobster' }).first().click();
await p.waitForTimeout(600);
await shot('11-kit');
log('heading font', await st(() => window.cream.app.getState().brandKits[0].fonts.heading.family));

// Theme
await p.click('[data-testid=account-btn]');
await shot('12-account-menu');
await p.click('[data-testid=theme-dark]');
await p.goto('http://localhost:5400/#/');
await p.waitForTimeout(700);
await shot('13-dark-home');
log('theme attr', await p.evaluate(() => document.documentElement.dataset.theme));
for (const s of ['settings/storage', 'settings/billing', 'planner', 'print', 'apps', 'uploads']) {
  await p.goto('http://localhost:5400/#/' + s);
  await p.waitForTimeout(600);
  await shot('14-' + s.replace('/', '-'));
}
await st(() => window.cream.app.getState().updateSettings({ theme: 'light' }));
// notifications
await st(() => window.cream.app.getState().notify('Alex commented on your design'));
await p.goto('http://localhost:5400/#/');
await p.click('[data-testid=notif-bell]');
await p.waitForTimeout(200);
await shot('15-notifs');
await p.click('[data-testid=notif-mark-read]');
log('unread', await st(() => window.cream.app.getState().notifications.filter((n) => !n.read).length));
console.log('ERRORS', JSON.stringify(errs.slice(0, 15)));
await b.close();
