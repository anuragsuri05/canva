// Shared helpers for export/present/collab Playwright scripts.
import { chromium } from '@playwright/test';

export async function launch(opts = {}) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write', 'camera', 'microphone'], ...opts });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:5400/#/view/__boot');
  await p.addStyleTag({ content: 'vite-error-overlay{display:none!important}' }).catch(() => {});
  await p.waitForFunction(() => window.cream?.app.getState().ready);
  return { b, ctx, p, errs };
}

/** Builds a rich 3-page presentation exercising most element types. Returns design id. */
export async function makeRichDesign(p, preset = 'presentation') {
  return p.evaluate(async (preset) => {
    const D = await import('/src/model/defaults.ts');
    const app = window.cream.app.getState();
    // a local uploaded asset (generated PNG)
    const c = document.createElement('canvas');
    c.width = 400; c.height = 300;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 400, 300); gr.addColorStop(0, '#ff7a59'); gr.addColorStop(1, '#7c4dff');
    g.fillStyle = gr; g.fillRect(0, 0, 400, 300); g.fillStyle = '#fff'; g.font = 'bold 48px sans-serif'; g.fillText('ASSET', 110, 170);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const { ref } = await app.addAssetFromBlob(blob, 'asset.png', 'image');
    const d = app.createDesign({ preset, title: 'Export Test' });
    const W = d.width, H = d.height;
    const p1 = d.pages[0];
    p1.background = { kind: 'gradient', type: 'linear', angle: 135, stops: [{ color: '#fff1e6', pos: 0 }, { color: '#e9e4ff', pos: 1 }] };
    const t1 = D.makeText('Quarterly Review', 120, 100, 1200, { fontFamily: 'Playfair Display', fontSize: 110, fontWeight: 700, color: '#2b2140' });
    t1.h = 160;
    const t2 = D.makeText('Neon effect text', 120, 300, 900, { fontFamily: 'Montserrat', fontSize: 64, fontWeight: 700, color: '#ffffff' });
    t2.effect = { kind: 'neon', intensity: 60 };
    const t3 = D.makeText('Curved text looks great', 1150, 330, 600, { fontFamily: 'Pacifico', fontSize: 48, color: '#e2557a' });
    t3.curve = 60; t3.h = 220;
    const s1 = D.makeShape('star5', 1400, 600, 300, 300, '#ffb37a');
    s1.fill = { kind: 'gradient', type: 'linear', angle: 90, stops: [{ color: '#ffb37a', pos: 0 }, { color: '#e2557a', pos: 1 }] };
    const s2 = D.makeShape('rounded', 120, 450, 500, 200, '#7c4dff'); s2.html = 'Shape text';
    const img = D.makeImage('https://picsum.photos/seed/cream/600/400', 600, 400, 700, 480, 600);
    img.radius = 24; img.preset = 'vivid';
    const img2 = D.makeImage(ref, 400, 300, 120, 720, 400);
    const ch = D.makeChart('column', 1150, 120, 600, 360);
    const ln = D.makeLine(120, 1000, 1000, 1000, { color: '#2b2140', width: 6, endCap: 'arrow' });
    p1.elements.push(s2, t1, t2, t3, s1, img, img2, ch, ln);
    p1.notes = 'Welcome everyone. Mention the quarterly numbers.';
    p1.transition = { type: 'slide', duration: 0.6, direction: 'left' };
    p1.duration = 1.5;
    const p2 = D.newPage({ background: { kind: 'solid', color: '#2b2140' } });
    const fr = D.makeFrame('circle', 200, 200, 600, 600);
    fr.media = { src: 'https://picsum.photos/seed/frame/800/800', kind: 'image', naturalW: 800, naturalH: 800, scale: 1, offsetX: 0, offsetY: 0 };
    const t4 = D.makeText('Second slide', 900, 300, 900, { fontFamily: 'Inter', fontSize: 96, fontWeight: 700, color: '#ffffff' });
    t4.anim = { name: 'rise', duration: 0.8, on: 'enter', direction: 'up' };
    const tb = D.makeTable(3, 3, 900, 500, 800);
    tb.cells[0][0].html = 'Name'; tb.cells[0][1].html = 'Q1'; tb.cells[0][2].html = 'Q2'; tb.color = '#ffffff';
    const pie = D.makeChart('donut', 1500, 700, 300, 300);
    p2.elements.push(fr, t4, tb, pie);
    p2.notes = 'Second slide notes';
    p2.transition = { type: 'circle-wipe', duration: 0.6 };
    p2.duration = 1.5;
    const p3 = D.newPage({ background: { kind: 'solid', color: '#ffffff' } });
    const g3 = D.makeGrid('1x2', 100, 100, 1000, 600);
    g3.cells[0] = { ...g3.cells[0], src: 'https://picsum.photos/seed/g1/600/600', kind: 'image', naturalW: 600, naturalH: 600 };
    g3.cells[1] = { ...g3.cells[1], src: ref, kind: 'image', naturalW: 400, naturalH: 300 };
    const st = D.makeSticky(1300, 200, D.STICKY_COLORS[0], 'You'); st.html = 'Sticky note text';
    const t5 = D.makeText('Thank you!', 1150, 700, 700, { fontFamily: 'Bebas Neue', fontSize: 140, color: '#e2557a' });
    t5.effect = { kind: 'shadow', offset: 40, direction: 45, blur: 20, transparency: 50, color: '#000000' };
    p3.elements.push(g3, st, t5);
    p3.duration = 1.5;
    d.pages.push(p2, p3);
    // scale fixtures to the actual preset size
    const sx = W / 1920, sy = H / 1080;
    if (sx !== 1 || sy !== 1) for (const pg of d.pages) for (const e of pg.elements) { e.x *= sx; e.y *= sy; e.w *= sx; e.h *= sy; if (e.type === 'line') { e.x1 *= sx; e.x2 *= sx; e.y1 *= sy; e.y2 *= sy; } if (e.fontSize) e.fontSize *= Math.min(sx, sy); }
    app.saveDesign(d);
    await new Promise((r) => setTimeout(r, 500));
    return d.id;
  }, preset);
}
