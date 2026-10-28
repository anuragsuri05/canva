// Asset library verification: Elements, Photos, Uploads, Text, Videos, Audio, Draw, Projects, Apps, Charts, Backgrounds, Stickies, QR.
import { chromium } from '@playwright/test';
const out = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const shot = async (n) => {
  await p.evaluate(() => document.querySelectorAll('vite-error-overlay').forEach((e) => e.remove()));
  await p.screenshot({ path: `${out}/${n}.png` });
};
const els = () => p.evaluate(() => window.cream.editor.getState().design.pages[0].elements.map((e) => e.type + (e.src ? ':' + String(e.src).slice(0, 30) : '')));
const side = async (t) => {
  await p.evaluate((t) => window.cream.editor.setState({ side: t }), t);
  await p.waitForSelector(`[data-testid=panel-${t}]`);
};
const step = async (name, fn) => {
  try {
    await fn();
    console.log('OK  ', name);
  } catch (e) {
    console.log('FAIL', name, e.message.split('\n')[0]);
    await shot('FAIL-' + name.replace(/\W+/g, '_')).catch(() => {});
  }
};

await p.goto('http://localhost:5400/');
await p.waitForFunction(() => window.cream?.app.getState().ready);
const id = await p.evaluate(() => window.cream.app.getState().createDesign({ preset: 'instagram-square' }).id);
await p.goto('http://localhost:5400/#/design/' + id);
await p.waitForSelector('[data-testid=editor]');
await p.waitForTimeout(1200);

await step('elements home', async () => {
  await side('elements');
  await p.waitForSelector('[data-testid=photo-tile]', { timeout: 15000 });
  await p.waitForTimeout(1500);
  await shot('01-elements');
});
await step('insert shape', async () => {
  await p.click('[data-testid=shape-circle]');
  await p.waitForFunction(() => window.cream.editor.getState().design.pages[0].elements.some((e) => e.type === 'shape'));
});
await step('insert line + chart + frame + grid + table', async () => {
  await p.click('[data-testid=line-arrow]');
  await p.click('[data-testid=see-all-charts]');
  await p.click('[data-testid=chart-pie]');
  await p.click('[data-testid=panel-back]');
  await p.click('[data-testid=see-all-frames]');
  await p.waitForTimeout(300);
  await shot('02-frames');
  await p.click('[data-testid=frame-circle]');
  await p.click('[data-testid=panel-back]');
  await p.click('[data-testid=see-all-grids]');
  await p.click('[data-testid=grid-2x2]');
  await p.click('[data-testid=panel-back]');
  await p.click('[data-testid=see-all-tables]');
  await p.click('[data-testid=table-3x3]');
  await p.click('[data-testid=panel-back]');
});
await step('drag shape onto canvas', async () => {
  const before = (await els()).length;
  await p.dragAndDrop('[data-testid=shape-diamond]', '.page-frame', { targetPosition: { x: 120, y: 120 } });
  await p.waitForFunction((n) => window.cream.editor.getState().design.pages[0].elements.length > n, before, { timeout: 5000 });
});
await step('elements search cat + insert icon', async () => {
  await p.fill('[data-testid=elements-search]', 'cat');
  await p.waitForSelector('[data-testid=elements-results] [data-testid=icon-tile]', { timeout: 15000 });
  await p.waitForTimeout(2500);
  await shot('03-elements-search');
  await p.click('[data-testid=elements-tab-stickers]');
  await p.waitForSelector('[data-testid=icon-tile]');
  await p.waitForTimeout(1000);
  await shot('04-stickers');
  await p.locator('[data-testid=icon-tile]').first().click();
  await p.waitForFunction(() => window.cream.editor.getState().design.pages[0].elements.some((e) => e.type === 'svg'), null, { timeout: 15000 });
});
await step('photos search + insert', async () => {
  await side('photos');
  await p.fill('[data-testid=photos-search]', 'mountain');
  await p.waitForTimeout(600);
  await p.waitForSelector('[data-testid=photo-tile] img', { timeout: 15000 });
  await p.waitForTimeout(2000);
  await shot('05-photos');
  await p.locator('[data-testid=photo-tile]').first().click();
  await p.waitForFunction(() => window.cream.editor.getState().design.pages[0].elements.some((e) => e.type === 'image'), null, { timeout: 20000 });
});
await step('upload png + insert', async () => {
  await side('uploads');
  const buf = await p.screenshot({ clip: { x: 0, y: 0, width: 320, height: 200 } });
  await p.setInputFiles('[data-testid=upload-input]', { name: 'test-upload.png', mimeType: 'image/png', buffer: buf });
  await p.waitForSelector('[data-testid=upload-tile]', { timeout: 10000 });
  await p.waitForTimeout(500);
  await shot('06-uploads');
  await p.locator('[data-testid=upload-tile]').first().click();
  await p.waitForFunction(() => window.cream.editor.getState().design.pages[0].elements.some((e) => e.type === 'image' && String(e.src).startsWith('asset:')), null, { timeout: 10000 });
});
await step('text panel + combo', async () => {
  await side('text');
  await p.waitForSelector('[data-testid=text-panel]');
  await p.waitForTimeout(3000);
  await shot('07-text');
  await p.locator('[data-testid=font-combo]').first().click();
  await p.waitForFunction(() => window.cream.editor.getState().design.pages[0].elements.filter((e) => e.type === 'text').length >= 2);
  await p.click('[data-testid=dynamic-page-number]');
});
await step('videos', async () => {
  await side('videos');
  await p.waitForSelector('[data-testid=video-tile] img', { timeout: 15000 });
  await p.waitForTimeout(2000);
  await p.locator('[data-testid=video-tile]').first().hover();
  await p.waitForTimeout(1500);
  await shot('08-videos');
});
await step('audio', async () => {
  await side('audio');
  await p.waitForSelector('[data-testid=audio-row]', { timeout: 15000 });
  await p.waitForTimeout(800);
  await shot('09-audio');
  await p.locator('[data-testid=audio-row]').first().click();
  await p.waitForFunction(() => window.cream.editor.getState().design.audio.length > 0, null, { timeout: 20000 });
});
await step('draw', async () => {
  await side('draw');
  await p.click('[data-testid=draw-marker]');
  const d = await p.evaluate(() => window.cream.editor.getState().draw);
  if (d?.tool !== 'marker') throw new Error('draw not set ' + JSON.stringify(d));
  await shot('10-draw');
  await p.click('[data-testid=draw-select]');
  if (await p.evaluate(() => window.cream.editor.getState().draw)) throw new Error('select did not exit');
});
await step('projects', async () => {
  await side('projects');
  await p.waitForSelector('[data-testid=projects-panel]');
  await p.waitForTimeout(600);
  await shot('11-projects');
});
await step('apps', async () => {
  await side('apps');
  await p.waitForSelector('[data-testid=apps-panel]');
  await shot('12-apps');
  await p.click('[data-testid=app-mockups]');
  await p.waitForSelector('[data-testid=panel-elements]');
  await p.waitForTimeout(500);
  await shot('13-mockups');
});
await step('charts', async () => {
  await side('charts');
  await p.waitForTimeout(500);
  await shot('14-charts');
});
await step('backgrounds', async () => {
  await side('backgrounds');
  await p.locator('[data-testid=bg-gradient]').nth(2).click();
  await p.waitForSelector('[data-testid=photo-tile] img', { timeout: 15000 });
  await p.waitForTimeout(1500);
  await shot('15-backgrounds');
});
await step('stickies', async () => {
  await side('stickies');
  await p.click('[data-testid=sticky-3]');
  await p.mouse.click(1300, 500);
  await shot('16-stickies');
});
await step('qr', async () => {
  await p.keyboard.press('Escape');
  await p.evaluate(() => window.cream.editor.setState({ modal: 'qr', editingId: null }));
  await p.fill('[data-testid=qr-url]', 'https://example.com');
  await p.waitForSelector('[data-testid=qr-preview] svg');
  await shot('17-qr');
  await p.click('[data-testid=qr-add]');
  await p.waitForFunction(() => window.cream.editor.getState().design.pages[0].elements.filter((e) => e.type === 'svg').length >= 2);
});
await p.evaluate(() => window.cream.editor.setState({ side: null, selection: [] }));
await p.waitForTimeout(1500);
await shot('18-canvas');
console.log('ELEMENTS', JSON.stringify(await els()));
console.log('ERRORS', JSON.stringify(errs.slice(0, 15), null, 1));
await b.close();
