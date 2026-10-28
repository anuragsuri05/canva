import { launch, makeRichDesign } from './export-fixture.mjs';
const out = process.argv[2];
const { b, ctx, p, errs } = await launch();
const log = (...a) => console.log(...a);
const id = await makeRichDesign(p);
await p.evaluate((id) => { const app = window.cream.app.getState(); const d = app.designs[id]; app.patchDesign(id, { share: { access: 'private', role: 'edit', people: [{ name: 'Alex Rivera', role: 'edit' }] } }); }, id);
await p.goto('http://localhost:5400/#/design/' + id);
await p.waitForSelector('[data-testid=editor]');
await p.waitForTimeout(1200);
const right = async (r) => { await p.evaluate((r) => window.cream.editor.setState({ right: r }), r); await p.waitForTimeout(600); };

// --- Comments: canvas click in comment mode
await p.evaluate(() => window.cream.editor.setState({ mode: 'comment', right: 'comments' }));
await p.waitForSelector('[data-testid=comments-panel]');
const fr = await p.locator('.page-frame').first().boundingBox();
await p.mouse.click(fr.x + fr.width * 0.7, fr.y + fr.height * 0.8);
await p.waitForSelector('[data-testid=comment-draft]');
await p.type('[data-testid=comment-input]', 'Can we change this @Al');
await p.waitForSelector('[data-testid=mention-list]');
await p.keyboard.press('Enter');
await p.type('[data-testid=comment-input]', 'please?');
await p.click('[data-testid=comment-assign]');
await p.click('[data-testid=comment-submit]');
await p.waitForTimeout(300);
await p.type('[data-testid=comment-reply-input]', 'Sure, on it');
await p.click('[data-testid=comment-reply-send]');
await p.click('[data-testid=comment-react]');
await p.click('.cm-emoji-pop button >> nth=0');
await p.waitForTimeout(300);
await p.screenshot({ path: out + '/comments.png' });
log('comments', JSON.stringify(await p.evaluate(() => window.cream.editor.getState().design.comments.map((c) => ({ t: c.text, a: c.assignee, r: c.replies.length, re: c.reactions, x: Math.round(c.x) })))));
await p.click('[data-testid=comment-resolve]');
await p.waitForTimeout(200);
log('after resolve visible threads', await p.locator('[data-testid=comment-thread]').count());
await p.selectOption('[data-testid=comments-filter]', 'resolved');
await p.click('[data-testid=comment-restore]');
await p.selectOption('[data-testid=comments-filter]', 'all');
log('after restore threads', await p.locator('[data-testid=comment-thread]').count());
// context-menu style event while panel closed (lazy) — buffered
await p.evaluate(() => { window.cream.editor.setState({ right: null, mode: 'edit' }); });
await p.waitForTimeout(200);
await p.evaluate(() => { const s = window.cream.editor.getState(); window.dispatchEvent(new CustomEvent('cream:add-comment', { detail: { pageId: s.pageId } })); window.cream.editor.setState({ right: 'comments' }); });
await p.waitForTimeout(600);
log('draft after event with closed panel', await p.locator('[data-testid=comment-draft]').count());

// --- Versions
await right('versions');
await p.fill('[data-testid=version-name]', 'Before edits');
await p.click('[data-testid=version-save]');
await p.waitForTimeout(500);
await p.evaluate(() => window.cream.editor.getState().update((d) => { d.title = 'Changed title'; d.pages[0].elements = []; }));
await p.waitForTimeout(300);
await p.click('[data-testid=version-item] >> nth=0');
await p.waitForSelector('[data-testid=version-preview]');
await p.screenshot({ path: out + '/version-preview.png' });
await p.click('[data-testid=version-restore]');
await p.waitForTimeout(500);
log('restored', JSON.stringify(await p.evaluate(() => { const d = window.cream.editor.getState().design; return [d.title, d.pages[0].elements.length]; })));
await p.screenshot({ path: out + '/versions.png' });

// --- Accessibility
await p.evaluate(async () => { const D = await import('/src/model/defaults.ts'); const t = D.makeText('Low contrast', 100, 900, 600, { color: '#f0e8f8', fontSize: 40 }); window.cream.editor.getState().addElements([t]); });
await right('accessibility');
log('a11y counts', await p.textContent('[data-testid=a11y-contrast-count]'), await p.textContent('[data-testid=a11y-alt-count]'));
await p.screenshot({ path: out + '/a11y.png' });
await p.click('[data-testid=a11y-fix-contrast] >> nth=0');
await p.waitForTimeout(300);
await p.fill('[data-testid=a11y-alt-input] >> nth=0', 'A mountain at sunset');
await p.click('[data-testid=a11y-alt-save] >> nth=0');
await p.waitForTimeout(300);
log('a11y after fix', await p.textContent('[data-testid=a11y-contrast-count]'), await p.textContent('[data-testid=a11y-alt-count]'));

// --- Find & replace
await right('find-replace');
await p.fill('[data-testid=find-input]', 'slide');
await p.waitForTimeout(200);
log('find count', await p.textContent('[data-testid=find-count]'));
await p.click('[data-testid=find-next]');
await p.fill('[data-testid=replace-input]', 'page');
await p.click('[data-testid=replace-all]');
await p.waitForTimeout(300);
log('after replace', await p.evaluate(() => window.cream.editor.getState().design.pages[1].elements.find((e) => e.type === 'text').html));
await p.screenshot({ path: out + '/find.png' });

// --- Notes
await right('notes');
await p.fill('[data-testid=notes-input]', 'Hello presenter notes');
log('notes', await p.evaluate(() => { const s = window.cream.editor.getState(); return s.design.pages.find((x) => x.id === s.pageId).notes; }));
// --- Timer
await right('timer');
await p.screenshot({ path: out + '/timer-pre.png' });
log('right state', await p.evaluate(() => window.cream.editor.getState().right), JSON.stringify(errs));
await p.click('[data-testid=timer-preset-1]');
await p.click('[data-testid=timer-start]');
await p.waitForTimeout(2200);
log('timer', await p.textContent('[data-testid=timer-display]'));
await p.screenshot({ path: out + '/timer.png' });
await p.click('[data-testid=timer-pause]');
// --- Insights
await right('insights');
log('insights', await p.textContent('[data-testid=insights-views]'), await p.textContent('[data-testid=insights-pages]'), await p.textContent('[data-testid=insights-words]'));
await p.screenshot({ path: out + '/insights.png' });

// --- Record
await p.evaluate(() => window.cream.editor.setState({ modal: 'present-record', right: null }));
await p.waitForSelector('[data-testid=record-modal]');
await p.waitForTimeout(1200);
await p.screenshot({ path: out + '/record-modal.png' });
await p.click('[data-testid=record-go]');
await p.waitForSelector('[data-testid=record-start]', { timeout: 30000 });
await p.waitForTimeout(800);
await p.click('[data-testid=record-start]');
await p.waitForTimeout(1500);
await p.click('[data-testid=record-next]');
await p.waitForTimeout(1500);
await p.screenshot({ path: out + '/record-studio.png' });
await p.click('[data-testid=record-end]');
await p.waitForSelector('[data-testid=record-done]');
const [rd] = await Promise.all([p.waitForEvent('download'), p.click('[data-testid=record-download]')]);
const path = out + '/recording-' + rd.suggestedFilename().replace(/ /g, '_');
await rd.saveAs(path);
log('recording', rd.suggestedFilename());
log('ERRORS', JSON.stringify(errs.slice(0, 10)));
await b.close();
