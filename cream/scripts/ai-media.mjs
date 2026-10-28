// Magic Media (Pollinations keyless) + Dream Lab + Graphics (Iconify fallback). Slow: free engine is rate-limited.
import { chromium } from '@playwright/test';
const out = process.argv[2] || '.';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:5400/');
await p.waitForFunction(() => window.cream?.app.getState().ready);
const id = await p.evaluate(() => window.cream.app.getState().createDesign({ preset: 'instagram-square' }).id);
await p.goto('http://localhost:5400/#/design/' + id);
await p.waitForSelector('[data-testid=editor]');
await p.evaluate(() => window.cream.editor.setState({ side: 'magic-media' }));
await p.waitForSelector('[data-testid=magic-media-panel]');
// graphics (keyless → Iconify)
await p.click('[data-testid=magic-media-tab-graphics]');
await p.fill('[data-testid=ai-prompt]', 'rocket');
await p.click('[data-testid=magic-graphics-generate]');
await p.waitForSelector('[data-testid=ai-graphic]', { timeout: 20000 });
await p.locator('[data-testid=ai-graphic]').first().click();
await p.waitForTimeout(1500);
await p.screenshot({ path: out + '/ai-graphics.png' });
// images
await p.click('[data-testid=magic-media-tab-images]');
await p.fill('[data-testid=ai-prompt]', 'a cozy reading nook by a rainy window, warm lamp light');
await p.click('[data-testid=ai-style-watercolor]');
await p.click('[data-testid=magic-media-generate]');
const t0 = Date.now();
try {
  await p.waitForSelector('[data-testid=ai-result]', { timeout: 900000 });
  console.log('first image after', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await p.locator('[data-testid=ai-result]').first().click();
  await p.waitForTimeout(2500);
} catch (e) {
  console.log('NO IMAGE', e.message.slice(0, 100));
}
await p.screenshot({ path: out + '/ai-magicmedia.png' });
console.log('ELS', JSON.stringify(await p.evaluate(() => window.cream.editor.getState().design.pages[0].elements.map((e) => [e.type, (e.src || '').slice(0, 20)]))));
console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
await b.close();
