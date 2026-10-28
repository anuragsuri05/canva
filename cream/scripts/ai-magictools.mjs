// magicTools.ts: OCR, upscale, erase, expand, background removal, keyless generation.
import { chromium } from '@playwright/test';
const out = process.argv[2] || '.';
const only = process.argv[3] || 'ocr,upscale,erase,expand,grab,bg,gen';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:5400/');
await p.waitForFunction(() => window.cream?.app.getState().ready);
// test image: a scene with text, a red circle "subject" on a gradient
await p.evaluate(async () => {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 420;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 640, 420); g.addColorStop(0, '#9fd3ff'); g.addColorStop(1, '#ffe2b0');
  x.fillStyle = g; x.fillRect(0, 0, 640, 420);
  x.fillStyle = '#d92b2b'; x.beginPath(); x.arc(470, 250, 90, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#1a1a1a'; x.font = 'bold 44px Arial'; x.fillText('Hello Cream', 40, 90);
  x.font = '28px Arial'; x.fillText('Grab this text please', 40, 150);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const { ref } = await window.cream.app.getState().addAssetFromBlob(blob, 'test.png', 'image');
  window.__src = ref;
});
const results = {};
const run = async (name, fn, timeout = 120000) => {
  if (!only.includes(name)) return;
  const t0 = Date.now();
  try {
    results[name] = await Promise.race([p.evaluate(fn), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + timeout)), timeout))]);
  } catch (e) { results[name] = 'ERROR ' + e.message.slice(0, 300); }
  console.log(name, ((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(results[name]).slice(0, 400));
};
const show = async (name, ref) => {
  if (typeof ref !== 'string' || !ref.startsWith('asset:')) return;
  await p.evaluate(async (r) => {
    const { resolveSrc } = await import('/src/store/blobs.ts');
    const url = await resolveSrc(r);
    document.body.innerHTML = `<div style="background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/20px 20px;display:inline-block"><img id="im" src="${url}" style="max-width:1100px;max-height:740px;display:block"></div>`;
    await new Promise((res) => { const i = document.getElementById('im'); i.complete ? res() : (i.onload = res); });
  }, ref);
  await p.screenshot({ path: `${out}/magic-${name}.png` });
};
await run('ocr', async () => { const m = await import('/src/ai/magicTools.ts'); const r = await m.grabText(window.__src); return { text: r.text, boxes: r.boxes.map((b) => [b.text, b.x, b.y, b.w, b.h, b.color]) }; }, 180000);
await run('upscale', async () => { const m = await import('/src/ai/magicTools.ts'); const ref = await m.upscale(window.__src, 2); const a = window.cream.app.getState().assets[0]; return { ref, w: a.width, h: a.height }; });
await run('erase', async () => {
  const m = await import('/src/ai/magicTools.ts');
  const mask = document.createElement('canvas'); mask.width = 640; mask.height = 420; const x = mask.getContext('2d'); x.fillStyle = '#000'; x.beginPath(); x.arc(470, 250, 96, 0, Math.PI * 2); x.fill();
  return { ref: await m.magicErase(window.__src, mask) };
});
if (typeof results.erase?.ref === 'string') await show('erase', results.erase.ref);
await run('expand', async () => { const m = await import('/src/ai/magicTools.ts'); return await m.magicExpand(window.__src, { targetW: 1000, targetH: 640 }); });
if (results.expand?.ref) await show('expand', results.expand.ref);
await run('bg', async () => { const m = await import('/src/ai/magicTools.ts'); return { ref: await m.removeBackground(window.__src) }; }, 300000);
if (results.bg?.ref) await show('bg', results.bg.ref);
await run('grab', async () => { const m = await import('/src/ai/magicTools.ts'); return await m.magicGrab(window.__src, { x: 340, y: 130, w: 260, h: 250 }); }, 300000);
if (results.grab?.backgroundRef) await show('grab-bg', results.grab.backgroundRef);
await run('gen', async () => { const m = await import('/src/ai/magicTools.ts'); const r = await m.generateImage('a small red lighthouse on a rocky coast, watercolor', { width: 768, height: 512, onStatus: (s) => console.log(s) }); return { ref: r.ref, w: r.w, h: r.h }; }, 200000);
if (results.gen?.ref) await show('gen', results.gen.ref);
console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
await b.close();
