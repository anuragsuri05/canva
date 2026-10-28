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
  const c = document.createElement('canvas'); c.width = 400; c.height = 300; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0,0,400,300); gr.addColorStop(0,'#ff6b6b'); gr.addColorStop(0.5,'#4ecdc4'); gr.addColorStop(1,'#1a535c'); g.fillStyle = gr; g.fillRect(0,0,400,300);
  g.fillStyle='#ffe66d'; g.beginPath(); g.arc(300,80,50,0,7); g.fill();
  const img = D.makeImage(c.toDataURL('image/png'), 400, 300, 60, 60, 400);
  const shape = D.makeShape('rect', 560, 80, 300, 200, '#7c4dff');
  const line = D.makeLine(100, 700, 500, 760);
  const svg = D.makeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#ff914d"/><rect x="30" y="30" width="40" height="40" fill="#004aad"/></svg>', 620, 600, 200, 200);
  const chart = D.makeChart('column', 600, 340, 400, 240);
  const table = D.makeTable(3, 3, 80, 860, 600);
  table.y = 850; table.cells[0][0].html = 'A'; 
  window.cream.editor.getState().addElements([img, shape, line, svg, chart, table], { select: false });
  return { img: img.id, shape: shape.id, line: line.id, svg: svg.id, chart: chart.id, table: table.id };
});
const sel = async (k) => { await p.evaluate((i) => window.cream.editor.getState().select([i]), ids[k]); await p.waitForTimeout(300); };
const el = (k) => p.evaluate((i) => { const s = window.cream.editor.getState(); for (const pg of s.design.pages) for (const e of pg.elements) if (e.id === i) return e; }, ids[k]);

// SHAPE
await sel('shape'); await shot('s1-shape');
await p.click('[data-testid=tb-fill]'); await p.waitForTimeout(300);
await p.click('[data-testid=default-ff3131]');
log('shape fill', JSON.stringify((await el('shape')).fill));
await p.click('[data-testid=gradient-3]');
log('shape grad', (await el('shape')).fill.kind);
await shot('s2-shape-gradient');
await p.click('[data-testid=color-add]'); await p.waitForTimeout(200); await shot('s3-gradient-editor');
await p.click('[data-testid=tb-border]'); await p.click('[data-testid=border-dashed]'); await shot('s4-border');
log('stroke', JSON.stringify((await el('shape')).stroke));
await p.click('[data-testid=tb-border]');
// undo works
await p.evaluate(() => window.cream.editor.getState().undo());
log('after undo stroke', JSON.stringify((await el('shape')).stroke));

// LINE
await sel('line'); await shot('l1-line');
await p.click('[data-testid=tb-end-cap]'); await shot('l2-caps'); await p.click('[data-testid=cap-arrow]');
await p.click('[data-testid=tb-line-style]'); await p.click('[data-testid=line-dashed]'); await p.click('[data-testid=tb-line-style]');
await p.click('[data-testid=tb-line-type]'); await p.click('[data-testid=line-type-curve]');
const L = await el('line'); log('line', L.endCap, L.style, L.lineType);
await shot('l3-line-done');

// SVG
await sel('svg'); await shot('v1-svg');
await p.click('[data-testid=tb-svg-color-0]'); await p.click('[data-testid=default-00bf63]');
log('svg map', JSON.stringify((await el('svg')).colorMap));
await shot('v2-svg-recolor');

// IMAGE
await sel('img'); await shot('i1-image');
await p.click('[data-testid=tb-edit-image]'); await shot('i2-edit-tools');
await p.click('[data-testid=img-tab-filters]'); await shot('i3-filters');
await p.click('[data-testid=filter-Noir]'); log('preset', (await el('img')).preset);
await p.click('[data-testid=img-tab-adjust]'); await p.click('[data-testid=auto-adjust]'); log('filters', JSON.stringify((await el('img')).filters)); await shot('i4-adjust');
await p.click('[data-testid=img-tab-effects]'); await p.click('[data-testid=shadow-drop]'); await p.click('[data-testid=duotone-Ocean]'); await shot('i5-effects');
await p.click('[data-testid=img-tab-filters]'); await p.click('[data-testid=filter-None]');
await p.evaluate((i)=>window.cream.editor.getState().updateEl(i,{duotone:undefined}), ids.img);
await p.click('[data-testid=tb-crop]'); await shot('i6-crop');
await p.click('[data-testid=tb-crop-aspect]'); await p.click('[data-testid=aspect-1x1]');
const I = await el('img'); log('crop', JSON.stringify(I.crop), I.w, I.h);
await shot('i7-crop-square');
await p.click('[data-testid=tb-crop-done]');
await p.click('[data-testid=tb-rounding]'); await shot('i8-rounding'); await p.click('[data-testid=tb-rounding]');

// CHART
await sel('chart'); await shot('c1-chart');
await p.click('[data-testid=tb-chart-edit]'); await shot('c2-chart-data');
await p.fill('[data-testid=value-0-0]', '42');
await p.click('[data-testid=chart-add-row]');
const C = await el('chart'); log('chart', C.series[0].values.join(','), C.labels.length);

// TABLE
await sel('table'); await shot('tb1-table');
await p.click('[data-testid=tb-table-edit]');
await p.click('[data-testid=table-row-below]'); await p.click('[data-testid=table-merge-right]');
const T = await el('table'); log('table rows', T.cells.length, 'colspan', T.cells[0][0].colspan, T.cells[0][1].hidden);
await shot('tb2-table-panel');

// MULTI
await p.evaluate((x) => window.cream.editor.getState().select([x.shape, x.svg]), ids); await p.waitForTimeout(300); await shot('m1-multi');
await p.click('[data-testid=tb-group]'); log('grouped', (await el('shape')).groupId === (await el('svg')).groupId);
// LAYERS
await p.evaluate(() => window.cream.editor.setState({ right: 'position' })); await p.waitForTimeout(300);
await p.click('[data-testid=pos-tab-layers]'); await shot('p1-layers');
const before = await p.evaluate(() => window.cream.editor.getState().design.pages[0].elements.map(e => e.type).join(','));
const rows = p.locator('[data-testid=layers-list] > .ct-layer');
const n = await rows.count();
await rows.nth(n - 1).dragTo(rows.nth(0), { targetPosition: { x: 40, y: 5 } });
const after = await p.evaluate(() => window.cream.editor.getState().design.pages[0].elements.map(e => e.type).join(','));
log('layers', before, '=>', after);
await shot('p2-layers-after');
// PAGE
await p.evaluate(() => window.cream.editor.getState().deselect()); await p.waitForTimeout(200);
await p.click('[data-testid=tb-bg-color]'); await p.click('[data-testid=default-ffde59]');
log('bg', JSON.stringify(await p.evaluate(() => window.cream.editor.getState().design.pages[0].background)));
await shot('pg1-page');
await p.click('[data-testid=tb-animate]'); await p.click('[data-testid=magic-animate]'); await shot('pg2-anim');
log('pageAnim', JSON.stringify(await p.evaluate(() => window.cream.editor.getState().design.pages[0].pageAnim)));
await p.click('[data-testid=tb-transition]'); await p.click('[data-testid=transition-slide]'); await shot('pg3-trans');
// LOCK
await sel('shape'); await p.click('[data-testid=tb-lock]'); await p.click('[data-testid=lock-full]'); await shot('k1-locked');
console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
await b.close();
