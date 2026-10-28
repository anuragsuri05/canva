import fs from 'node:fs';
import { launch, makeRichDesign } from './export-fixture.mjs';
const out = process.argv[2];
const { b, ctx, p, errs } = await launch();
const log = (...a) => console.log(...a);
const id = await makeRichDesign(p);
await p.goto('http://localhost:5400/#/design/' + id);
await p.waitForSelector('[data-testid=editor]');
await p.waitForTimeout(1200);
const modal = async (m) => { await p.evaluate((m) => window.cream.editor.setState({ modal: m }), m); await p.waitForTimeout(500); };
const close = async () => { await p.evaluate(() => window.cream.editor.setState({ modal: null })); await p.waitForTimeout(200); };

// Share
await p.click('[data-testid=share-btn]');
await p.waitForSelector('[data-testid=share-modal]');
await p.fill('[data-testid=share-add-input]', 'Alex Rivera');
await p.click('[data-testid=share-add-btn]');
await p.selectOption('[data-testid=share-access]', 'link');
await p.click('[data-testid=share-copy-link]');
await p.waitForTimeout(300);
const link = await p.evaluate(() => navigator.clipboard.readText());
log('copied link length', link.length, link.slice(0, 60));
log('share people', JSON.stringify(await p.evaluate(() => window.cream.editor.getState().design.share)));
await p.screenshot({ path: out + '/share.png' });
await p.click('[data-testid=share-tile-qr]');
await p.waitForSelector('[data-testid=share-qr-img]');
await p.screenshot({ path: out + '/share-qr.png' });
const [qrd] = await Promise.all([p.waitForEvent('download'), p.click('[data-testid=share-qr-download]')]);
log('qr download', qrd.suggestedFilename());
await p.click('[data-testid=share-back]');
await p.click('[data-testid=share-tile-template]');
const tlink = await p.inputValue('[data-testid=share-template-copy-input]');
log('template link ok', tlink.includes('?template=1'));
await close();

// Embed
await modal('embed');
log('embed code has iframe', (await p.textContent('[data-testid=embed-code]')).includes('embed=1'));
await p.screenshot({ path: out + '/embed.png' });
await close();
// Schedule
await modal('schedule');
await p.fill('[data-testid=schedule-caption]', 'Launch day! #cream');
await p.click('[data-testid=schedule-submit]');
await p.waitForTimeout(300);
log('planner', await p.evaluate(() => localStorage.getItem('cream-planner')));
// Approval
await modal('request-approval');
await p.fill('[data-testid=approval-reviewer]', 'Jordan');
await p.fill('[data-testid=approval-notes]', 'Please check the numbers');
await p.click('[data-testid=approval-submit]');
await p.waitForTimeout(300);
log('approval', JSON.stringify(await p.evaluate(() => window.cream.editor.getState().design.approval)));
// Brand template
await modal('brand-template');
await p.click('[data-testid=brand-template-publish]');
await p.waitForTimeout(300);
log('isBrandTemplate', await p.evaluate(() => window.cream.editor.getState().design.isBrandTemplate));
// Publish
await modal('publish-website');
await p.fill('[data-testid=publish-seo-desc]', 'Our quarterly review');
const popupP = ctx.waitForEvent('page');
await p.click('[data-testid=publish-submit]');
const site = await popupP;
await site.waitForSelector('[data-testid=view-page]');
await site.waitForTimeout(1200);
await site.screenshot({ path: out + '/published-site.png' });
log('site title', await site.title());
await site.close();
await p.screenshot({ path: out + '/publish.png' });
await close();
// Print
await modal('print');
await p.click('[data-testid=print-product-flyers]');
await p.waitForTimeout(300);
await p.screenshot({ path: out + '/print-options.png' });
await p.click('[data-testid=print-to-checkout]');
await p.fill('[data-testid=print-name]', 'Sam Lee');
await p.fill('[data-testid=print-address]', '1 Main St');
await p.fill('[data-testid=print-city]', 'Springfield');
await p.fill('[data-testid=print-zip]', '12345');
await p.click('[data-testid=print-ship-express]');
log('print total', await p.textContent('[data-testid=print-total]'));
await p.screenshot({ path: out + '/print-checkout.png' });
await p.click('[data-testid=print-place-order]');
await p.waitForTimeout(300);
log('notifs', JSON.stringify(await p.evaluate(() => window.cream.app.getState().notifications.slice(0, 4).map((n) => n.text))));
// Resize copy
await modal('resize');
await p.fill('[data-testid=resize-search]', 'instagram story');
await p.click('[data-testid=resize-preset-instagram-story] input');
await p.screenshot({ path: out + '/resize.png' });
await p.click('[data-testid=resize-continue]');
await p.click('[data-testid=resize-copy]');
await p.waitForTimeout(1500);
const nid = await p.evaluate(() => window.cream.editor.getState().design?.id);
log('resized design', nid !== id, JSON.stringify(await p.evaluate(() => { const d = window.cream.editor.getState().design; return [d.width, d.height, d.title]; })));
await p.waitForTimeout(800);
await p.screenshot({ path: out + '/resized-editor.png' });
// view link in fresh context (another "device")
const ctx2 = await b.newContext({ viewport: { width: 1280, height: 800 } });
const v = await ctx2.newPage();
v.on('pageerror', (e) => errs.push('view: ' + e.message));
await v.goto(tlink);
await v.waitForSelector('[data-testid=view-page]', { timeout: 20000 });
await v.waitForTimeout(1500);
await v.screenshot({ path: out + '/view-template.png' });
await v.click('[data-testid=view-use-template]');
await v.waitForSelector('[data-testid=editor]', { timeout: 20000 });
log('template imported designs', await v.evaluate(() => Object.keys(window.cream.app.getState().designs).length));
await ctx2.close();
log('ERRORS', JSON.stringify(errs.slice(0, 10)));
await b.close();
