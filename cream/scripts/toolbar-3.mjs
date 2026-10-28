import { chromium } from '@playwright/test';
const out = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.setDefaultTimeout(15000);
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const log = (...a) => console.log(...a);
await p.goto('http://localhost:5400/');
await p.waitForFunction(() => window.cream?.app.getState().ready);
const id = await p.evaluate(() => window.cream.app.getState().createDesign({ preset: 'instagram-square' }).id);
await p.goto('http://localhost:5400/#/design/' + id);
await p.waitForSelector('[data-testid=editor]');
await p.waitForTimeout(800);
await p.evaluate(() => window.cream.editor.setState({ side: null }));
const shot = async (n) => { await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${n}.png` }); };
const ids = await p.evaluate(async () => {
  const D = await import('/src/model/defaults.ts');
  const t = D.makeText('Hello brave world', 100, 100, 700, { fontSize: 64 });
  const t2 = D.makeText('Second text', 100, 300, 500, { fontSize: 40 });
  const v = D.makeVideo('https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.360p.webm', 60, 640, 360, 100, 500, 400);
  const f = D.makeFrame('circle', 600, 500, 300, 300);
  const st = D.makeSticky(700, 100);
  window.cream.editor.getState().addElements([t, t2, v, f, st], { select: false });
  return { t: t.id, t2: t2.id, v: v.id, f: f.id, st: st.id };
});
const el = (k) => p.evaluate((i) => { const s = window.cream.editor.getState(); for (const pg of s.design.pages) for (const e of pg.elements) if (e.id === i) return e; }, ids[k]);
const sel = async (k) => { await p.evaluate((i) => window.cream.editor.getState().select([i]), ids[k]); await p.waitForTimeout(300); };

// partial bold while editing
await sel('t');
await p.evaluate((i) => window.cream.editor.setState({ editingId: i }), ids.t);
await p.waitForTimeout(400);
await p.evaluate(() => {
  const ed = document.querySelector('.page-frame [contenteditable="true"]');
  const tn = ed.firstChild; const r = document.createRange(); r.setStart(tn, 6); r.setEnd(tn, 11);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
});
await p.waitForTimeout(100);
await p.click('[data-testid=tb-bold]');
await p.waitForTimeout(300);
log('partial html', (await el('t')).html, 'weight', (await el('t')).fontWeight);
await p.click('[data-testid=tb-color]');
await p.click('[data-testid=default-ff3131]');
await p.waitForTimeout(300);
log('partial color html', (await el('t')).html);
await shot('e1-partial');
// exit editing
await p.evaluate(() => window.cream.editor.setState({ editingId: null }));
// font apply
await sel('t2');
await p.click('[data-testid=tb-font]');
await p.fill('[data-testid=font-search]', 'lobster');
await p.waitForTimeout(1500);
await shot('e2-font-search');
await p.click('[data-testid="font-Lobster"]');
log('font', (await el('t2')).fontFamily);
await p.click('[data-testid=font-cat-handwriting]'); await p.fill('[data-testid=font-search]', ''); await p.waitForTimeout(800); await shot('e3-font-cat');
// slider drag => single undo
const pastBefore = await p.evaluate(() => window.cream.editor.getState().past.length);
await p.click('[data-testid=tb-transparency]');
const sl = p.locator('[data-testid=transparency-slider]');
const bb = await sl.boundingBox();
await p.mouse.move(bb.x + bb.width - 2, bb.y + bb.height / 2); await p.mouse.down();
for (let i = 0; i < 10; i++) await p.mouse.move(bb.x + bb.width - 2 - i * 15, bb.y + bb.height / 2);
await p.mouse.up();
const pastAfter = await p.evaluate(() => window.cream.editor.getState().past.length);
log('opacity', (await el('t2')).opacity, 'undo steps added', pastAfter - pastBefore);
await shot('e4-transparency');
await p.click('[data-testid=tb-transparency]');
// paint roller: copy style from t2, paste to t
await p.click('[data-testid=tb-copy-style]');
await sel('t');
log('paint roller font', (await el('t')).fontFamily);
// effects curve
await p.click('[data-testid=tb-effects]'); await p.click('[data-testid=shape-curve]'); log('curve', (await el('t')).curve); await shot('e5-curve');
// video
await sel('v'); await shot('e6-video');
await p.click('[data-testid=tb-edit-video]'); await p.waitForTimeout(800); await shot('e7-video-panel');
await p.click('[data-testid=tb-playback]'); await shot('e8-playback'); await p.click('[data-testid=tb-playback]');
// frame
await sel('f'); await shot('e9-frame');
// sticky
await sel('st'); await shot('e10-sticky');
// link & alt
await sel('t2');
await p.click('[data-testid=tb-more]'); await p.click('[data-testid=more-link]');
await p.fill('[data-testid=link-url]', 'example.com'); await shot('e11-link'); await p.click('[data-testid=link-save]');
log('link', (await el('t2')).link);
await p.click('[data-testid=tb-more]'); await p.click('[data-testid=more-alt]');
await p.fill('[data-testid=alt-text]', 'A heading'); await shot('e12-alt'); await p.click('[data-testid=alt-save]');
log('alt', (await el('t2')).alt);
// animate element: choose + duration
await p.click('[data-testid=tb-animate]'); await p.click('[data-testid=anim-tab-element]'); await p.click('[data-testid=anim-pop]'); await p.click('[data-testid=anim-speed-slow]');
log('anim', JSON.stringify((await el('t2')).anim)); await shot('e13-anim-settings');
await p.locator('[data-testid=anim-rise]').hover(); await p.waitForTimeout(300); await shot('e14-anim-hover');
console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
await b.close();
