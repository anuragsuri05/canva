// More aspect-adaptive single-page layouts.
import type { GridEl } from '../../model/types';
import { makeGrid } from '../../model/defaults';
import { acc, B, BS, F, HS, L, NONE, P, R, T, centerV, col, colH, grad, ink, inkSoft, on, photoUrl, rad, recipe, type Ctx, type Recipe } from '../kit';
import { deco } from '../deco';
import { mix, rgba } from '../rng';

const solidBg = (c: Ctx, color: string) => (c.bg = { kind: 'solid', color });

function grid(c: Ctx, layout: string, x: number, y: number, w: number, h: number) {
  const g = makeGrid(layout, x, y, w, h) as GridEl;
  g.gap = Math.round(c.u * 1.2);
  g.radius = rad(c, c.u * 2);
  g.cells = g.cells.map(() => {
    const { src, pw, ph } = photoUrl(c, w / 1.6, h / 1.6);
    return { src, kind: 'image' as const, naturalW: pw, naturalH: ph, scale: 1, offsetX: 0, offsetY: 0 };
  });
  c.els.push(g);
  return g;
}

const collage = recipe('collage', 'Photo collage', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  solidBg(c, t.bg);
  const fg = ink(c, t.bg);
  if (c.land) {
    grid(c, rng.pick(['1-2', 'mosaic', '2x2']), w * 0.45, m * 0.6, w * 0.55 - m * 0.6, h - m * 1.2);
    const items = [
      T(c, k.brand, m, 0, w * 0.45 - m * 1.8, BS(c) * 0.8, { role: 'l', color: t.primary }),
      T(c, k.headline, m, 0, w * 0.45 - m * 1.8, HS(c), { role: 'h', color: fg, maxLines: 3 }),
      T(c, k.tagline, m, 0, w * 0.45 - m * 1.8, BS(c), { color: inkSoft(c, t.bg), maxLines: 3 }),
    ];
    col(items, 0, u * 2.4);
    centerV(items, m, h - m * 2);
    return;
  }
  const head = T(c, k.headline, m, m, w - m * 2, HS(c) * 0.9, { role: 'h', color: fg, align: 'center', maxLines: 2 });
  const sub = T(c, k.tagline, m, head.y + head.h + u * 1.5, w - m * 2, BS(c), { color: inkSoft(c, t.bg), align: 'center', maxLines: 2 });
  const top = sub.y + sub.h + u * 4;
  grid(c, rng.pick(['2x2', 'top-1-2', '1-2', 'mosaic']), m, top, w - m * 2, h - top - m * 1.6);
  T(c, k.brand.toUpperCase() + '  ·  ' + 'reallygreatsite.com', m, h - m * 1.1, w - m * 2, BS(c) * 0.7, { role: 'l', color: inkSoft(c, t.bg), align: 'center' });
});

const minimalCenter = recipe('minimal-center', 'Minimal', (c) => {
  const { w, h, m, u, t, c: k } = c;
  solidBg(c, t.bg);
  deco(c, t.deco === 'none' ? 'frame' : t.deco, t.bg, 0.7);
  const fg = ink(c, t.bg);
  const tw = w - m * 2.6;
  const x = (w - tw) / 2;
  const scr = t.script ? T(c, k.tagline.split(' ').slice(0, 3).join(' '), x, 0, tw, HS(c) * 0.75, { role: 's', color: t.primary, align: 'center', maxLines: 1, upper: false }) : null;
  const head = T(c, k.headline, x, 0, tw, HS(c) * 1.1, { role: 'h', color: fg, align: 'center', maxLines: 3 });
  const rule = L(c, w / 2 - u * 6, 0, w / 2 + u * 6, 0, t.secondary, Math.max(1, u * 0.3));
  rule.h = u * 0.3;
  const body = T(c, k.body, x + tw * 0.08, 0, tw * 0.84, BS(c), { color: inkSoft(c, t.bg), align: 'center', maxLines: 4 });
  const foot = T(c, `${k.date}  ·  ${k.brand}`, x, 0, tw, BS(c) * 0.75, { role: 'l', color: t.primary, align: 'center', maxLines: 2 });
  const items = [...(scr ? [scr] : []), head, rule, body, foot];
  col(items, 0, u * 3);
  centerV(items, m, h - m * 2);
});

const gradientGlass = recipe('gradient-glass', 'Gradient card', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  c.bg = grad(t.primary, t.dark ? t.bg : t.secondary, rng.pick([135, 160, 200]));
  R(c, -w * 0.15, -h * 0.1, w * 0.6, w * 0.6, rgba(t.accent, 0.55), { shape: 'blob2' });
  R(c, w * 0.6, h * 0.65, w * 0.55, w * 0.55, rgba('#ffffff', 0.18), { shape: 'blob1' });
  const cw = c.land ? w * 0.6 : w - m * 2;
  const pad = u * 5;
  const label = T(c, k.brand, 0, 0, cw - pad * 2, BS(c) * 0.8, { role: 'l', color: '#ffffff' });
  const head = T(c, k.headline, 0, 0, cw - pad * 2, HS(c), { role: 'h', color: '#ffffff', maxLines: 3 });
  const body = T(c, k.tagline, 0, 0, cw - pad * 2, BS(c) * 1.05, { color: 'rgba(255,255,255,0.86)', maxLines: 3 });
  const btn = B(c, k.cta, 0, 0, BS(c) * 0.85, { fill: '#ffffff', color: t.primary });
  const inner = [label, head, body, btn];
  const ch = colH(inner, u * 2.4) + pad * 2;
  const cx = (w - cw) / 2;
  const cy = (h - ch) / 2;
  const card = R(c, cx, cy, cw, ch, rgba('#ffffff', 0.16), { radius: rad(c, u * 4) || u, stroke: { color: rgba('#ffffff', 0.4), width: Math.max(1, u * 0.2) } });
  c.els.splice(c.els.indexOf(card), 1);
  c.els.splice(c.els.indexOf(label), 0, card);
  for (const e of inner) e.x = cx + pad;
  col(inner, cy + pad, u * 2.4);
});

const polaroid = recipe('polaroid', 'Polaroids', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  solidBg(c, t.surface === '#ffffff' ? t.bg : t.surface);
  deco(c, t.deco, t.bg, 0.5);
  const fg = ink(c, t.bg);
  const n = c.land ? 3 : 2;
  const pw = c.land ? (w - m * 2) / 3.4 : (w - m * 2) / 2.1;
  const ph = pw * 1.18;
  const top = c.land ? h * 0.38 : h * 0.42;
  for (let i = 0; i < n; i++) {
    const x = m + i * (c.land ? pw * 1.15 : pw * 1.05) + (c.land ? 0 : 0);
    const fr = F(c, 'polaroid', x, top + rng.range(-u * 3, u * 3), pw, ph);
    fr.rotation = rng.range(-8, 8);
  }
  const scr = T(c, k.headline, m, m, w - m * 2, HS(c) * (t.script ? 1.1 : 0.9), { role: t.script ? 's' : 'h', color: fg, align: 'center', maxLines: 2, upper: false });
  T(c, k.tagline, m, scr.y + scr.h + u * 1.2, w - m * 2, BS(c), { color: inkSoft(c, t.bg), align: 'center', maxLines: 2 });
});

const productFeature = recipe('product-feature', 'Product feature', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  solidBg(c, t.bg);
  const fg = ink(c, t.bg);
  const s = c.land ? h * 0.82 : Math.min(w * 0.78, h * 0.5);
  const fx = c.land ? w - m - s : (w - s) / 2;
  const fy = c.land ? (h - s) / 2 : m * 0.8;
  R(c, fx - s * 0.06, fy + s * 0.05, s * 1.08, s * 1.02, mix(t.secondary, t.bg, 0.35), { shape: rng.pick(['blob1', 'blob2', 'blob3'] as const) });
  F(c, rng.pick(['circle', 'blob', 'arch'] as const), fx, fy, s, s);
  const cs = s * 0.32;
  const price = R(c, fx + (c.land ? -cs * 0.3 : s - cs * 0.8), fy + s - cs * 0.9, cs, cs, t.accent, { shape: 'circle' });
  price.html = k.stats[0][0];
  price.fontFamily = t.heading.family;
  price.fontWeight = t.heading.weight;
  price.fontSize = cs * 0.22;
  price.color = on(c, t.accent);
  const tx = c.land ? m : m;
  const tw = c.land ? w - s - m * 3 : w - m * 2;
  const items = [
    T(c, k.headline, tx, 0, tw, HS(c) * 0.9, { role: 'h', color: fg, align: c.land ? 'left' : 'center', maxLines: 2 }),
    T(c, k.items.slice(0, 3).join('  ·  '), tx, 0, tw, BS(c) * 0.9, { color: inkSoft(c, t.bg), align: c.land ? 'left' : 'center', maxLines: 2 }),
    B(c, k.cta, c.land ? tx : w / 2, 0, BS(c) * 0.85, { align: c.land ? 'left' : 'center' }),
  ];
  col(items, 0, u * 2.6);
  if (c.land) centerV(items, m, h - m * 2);
  else centerV(items, fy + s + u * 3, h - fy - s - m);
});

const testimonial = recipe('testimonial', 'Testimonial', (c) => {
  const { w, h, m, u, t, c: k } = c;
  solidBg(c, t.bg);
  deco(c, t.deco, t.bg, 0.5);
  const fg = ink(c, t.bg);
  const cw = c.land ? w * 0.7 : w - m * 2;
  const cx = (w - cw) / 2;
  const av = Math.min(w, h) * 0.2;
  const stars = T(c, '★★★★★', cx, 0, cw, BS(c) * 1.4, { color: acc(c, t.bg), align: 'center', ls: 200, upper: false });
  const q = T(c, `“${k.quote[0]}”`, cx + u * 3, 0, cw - u * 6, HS(c) * 0.5, { role: 'h', color: fg, align: 'center', maxLines: 5, lh: 1.3, upper: false });
  const fr = F(c, 'circle', (w - av) / 2, 0, av, av, { color: t.primary, width: u * 0.6 });
  fr.h = av;
  const name = T(c, k.people[0], cx, 0, cw, BS(c) * 1.1, { role: 'h', color: fg, align: 'center', upper: false });
  const role = T(c, `${k.roles[0]}, ${k.brand}`, cx, 0, cw, BS(c) * 0.8, { role: 'l', color: inkSoft(c, t.bg), align: 'center' });
  const items = [fr, stars, q, name, role];
  col(items, 0, [u * 3, u * 2, u * 3, u * 0.8, 0]);
  centerV(items, m, h - m * 2);
});

const bandOverlay = recipe('band-overlay', 'Color band', (c) => {
  const { w, h, m, u, t, c: k } = c;
  P(c, 0, 0, w, h);
  const bw = c.land ? w * 0.5 : w;
  const items = [
    T(c, k.headline, 0, 0, bw - m * 2, HS(c), { role: 'h', color: on(c, t.primary), maxLines: 3 }),
    T(c, k.tagline, 0, 0, bw - m * 2, BS(c), { color: rgba(on(c, t.primary), 0.85), maxLines: 2 }),
    T(c, k.cta + '  →', 0, 0, bw - m * 2, BS(c) * 0.9, { role: 'l', color: acc(c, t.primary) }),
  ];
  const bh = colH(items, u * 2) + m * 1.6;
  const by = c.land ? h - bh : h - bh - m;
  const band = R(c, c.land ? 0 : m * 0.5, by, c.land ? bw : w - m, c.land ? bh : bh, rgba(t.primary, 0.94), { radius: c.land ? 0 : rad(c, u * 3) });
  c.els.splice(c.els.indexOf(band), 1);
  c.els.splice(c.els.indexOf(items[0]), 0, band);
  for (const e of items) e.x = band.x + m * 0.8;
  for (const e of items) e.w = band.w - m * 1.6;
  col(items, by + m * 0.8, u * 2);
  T(c, k.brand, m, m * 0.7, w - m * 2, BS(c) * 0.8, { role: 'l', color: '#ffffff', align: c.land ? 'left' : 'center' });
});

const magazineCover = recipe('magazine-cover', 'Magazine cover', (c) => {
  const { w, h, m, u, t, c: k } = c;
  P(c, 0, 0, w, h);
  R(c, 0, 0, w, h * 0.45, grad('rgba(0,0,0,0.55)', 'rgba(0,0,0,0)', 180));
  R(c, 0, h * 0.55, w, h * 0.45, grad('rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 180));
  const mast = T(c, k.brand, m * 0.6, m * 0.6, w - m * 1.2, Math.min(w * 0.16, h * 0.16), { role: 'h', color: '#ffffff', align: 'center', maxLines: 1, lh: 1.05, minSize: 8 });
  T(c, `Issue ${1 + (c.photoN % 9)}  ·  ${k.date}`, m, mast.y + mast.h + u, w - m * 2, BS(c) * 0.7, { role: 'l', color: 'rgba(255,255,255,0.85)', align: 'center' });
  const lines = [
    T(c, k.headline, m, 0, c.land ? w * 0.5 : w - m * 2, HS(c) * 0.85, { role: 'h', color: '#ffffff', maxLines: 2 }),
    T(c, k.items.slice(0, 3).join('\n'), m, 0, c.land ? w * 0.5 : w * 0.6, BS(c) * 0.95, { color: 'rgba(255,255,255,0.9)', lh: 1.5 }),
  ];
  col(lines, h - m - colH(lines, u * 2), u * 2);
  R(c, m, lines[0].y - u * 2.5, u * 12, Math.max(2, u * 0.6), t.accent);
});

const circlePhoto = recipe('circle-photo', 'Circle photo', (c) => {
  const { w, h, m, u, t, c: k } = c;
  const bg = t.primary;
  solidBg(c, bg);
  deco(c, t.deco, bg, 0.4);
  const fg = on(c, bg);
  const s = c.land ? h * 0.7 : Math.min(w * 0.7, h * 0.45);
  const ring = R(c, 0, 0, s * 1.1, s * 1.1, NONE, { shape: 'circle', stroke: { color: t.accent, width: u * 0.5, style: 'dashed' } });
  const fr = F(c, 'circle', 0, 0, s, s);
  if (c.land) {
    fr.x = w - m - s;
    fr.y = (h - s) / 2;
  } else {
    fr.x = (w - s) / 2;
    fr.y = m;
  }
  ring.x = fr.x - s * 0.05;
  ring.y = fr.y - s * 0.05;
  const tx = m;
  const tw = c.land ? w - s - m * 3 : w - m * 2;
  const items = [
    T(c, k.headline, tx, 0, tw, HS(c) * 0.95, { role: 'h', color: fg, align: c.land ? 'left' : 'center', maxLines: 2 }),
    T(c, k.body, tx, 0, tw, BS(c), { color: mix(fg, bg, 0.2), align: c.land ? 'left' : 'center', maxLines: 3 }),
    T(c, k.cta.toUpperCase() + '  ·  reallygreatsite.com', tx, 0, tw, BS(c) * 0.75, { role: 'l', color: acc(c, bg), align: c.land ? 'left' : 'center' }),
  ];
  col(items, 0, u * 2.6);
  if (c.land) centerV(items, m, h - m * 2);
  else centerV(items, fr.y + s + u * 4, h - fr.y - s - u * 4 - m);
});

/** Closing scene for videos. */
const ctaEnd = recipe('cta-end', 'Call to action', (c) => {
  const { w, h, m, u, t, c: k } = c;
  const bg = t.dark ? t.bg : t.primary;
  solidBg(c, bg);
  deco(c, t.deco, bg, 0.5);
  const fg = on(c, bg);
  const tw = w - m * 2;
  const items = [
    T(c, k.headline2, m, 0, tw, HS(c) * 1.1, { role: 'h', color: fg, align: 'center', maxLines: 3 }),
    B(c, k.cta, w / 2, 0, BS(c) * 1.1, { fill: t.accent, align: 'center' }),
    T(c, 'reallygreatsite.com', m, 0, tw, BS(c) * 0.9, { role: 'l', color: mix(fg, bg, 0.25), align: 'center' }),
  ];
  col(items, 0, u * 4);
  centerV(items, m, h - m * 2);
});

/** Services flyer: header photo + 2-col list of services + contact footer. */
const flyerServices = recipe('flyer-services', 'Services flyer', (c) => {
  const { w, h, m, u, t, c: k } = c;
  solidBg(c, t.bg);
  const ph = h * 0.36;
  P(c, 0, 0, w, ph);
  R(c, 0, 0, w, ph, grad('rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)', 180));
  const head = T(c, k.headline, m, 0, w - m * 2, HS(c) * 0.95, { role: 'h', color: '#ffffff', maxLines: 2 });
  head.y = ph - head.h - m * 0.6;
  const fg = ink(c, t.bg);
  const intro = T(c, k.body, m, ph + m * 0.7, w - m * 2, BS(c), { color: inkSoft(c, t.bg), maxLines: 3 });
  const top = intro.y + intro.h + u * 4;
  const cw = (w - m * 2 - u * 4) / 2;
  const ch = u * 13;
  k.items.slice(0, 6).forEach((it, i) => {
    const x = m + (i % 2) * (cw + u * 4);
    const y = top + Math.floor(i / 2) * (ch + u * 2.5);
    R(c, x, y, cw, ch, t.surface === t.bg ? mix(t.bg, t.primary, 0.07) : t.surface, { radius: rad(c, u * 2.5) });
    R(c, x + u * 2.5, y + ch / 2 - u * 2, u * 4, u * 4, t.primary, { shape: 'circle' });
    const tx = T(c, it, x + u * 8.5, y, cw - u * 10, BS(c) * 1.05, { role: 'h', color: fg, upper: false, weight: 600, maxLines: 2 });
    tx.y = y + (ch - tx.h) / 2;
  });
  const fy = h - m * 1.5;
  R(c, 0, fy - u * 2, w, h - fy + u * 2, t.primary);
  const f = T(c, `${k.cta}  ·  +123-456-7890  ·  reallygreatsite.com`, m, 0, w - m * 2, BS(c) * 0.85, { role: 'l', color: on(c, t.primary), align: 'center', maxLines: 2 });
  f.y = fy - u * 2 + (h - fy + u * 2 - f.h) / 2;
});

/** Virtual meeting background: clean wall with brand mark in the corner. */
const zoomBg = recipe('zoom-bg', 'Virtual background', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  if (rng.chance(0.5)) {
    P(c, 0, 0, w, h, { filters: { blur: 10, brightness: -5 } });
    R(c, 0, 0, w, h, rgba(t.bg, 0.25));
  } else {
    c.bg = grad(t.bg, mix(t.bg, t.primary, 0.25), 135);
    deco(c, t.deco, t.bg, 0.6);
  }
  const card = R(c, w - m - w * 0.26, m, w * 0.26, h * 0.12, rgba(t.primary, 0.92), { radius: rad(c, u * 2) });
  const tx = T(c, k.brand, card.x + u * 2, 0, card.w - u * 4, BS(c) * 1.1, { role: 'h', color: on(c, t.primary), align: 'center', maxLines: 1 });
  tx.y = card.y + (card.h - tx.h) / 2;
});

export const SOCIAL_B: Recipe[] = [collage, minimalCenter, gradientGlass, polaroid, productFeature, testimonial, bandOverlay, magazineCover, circlePhoto, ctaEnd, flyerServices, zoomBg];
