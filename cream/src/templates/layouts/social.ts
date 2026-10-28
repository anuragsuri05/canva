// Aspect-adaptive single-page layouts (social posts, stories, posters, flyers, banners).
import { acc, B, BS, F, HS, L, NONE, P, R, T, centerV, col, colH, grad, ink, inkSoft, on, rad, recipe, type Ctx, type Recipe } from '../kit';
import { deco } from '../deco';
import { mix, rgba } from '../rng';

const solidBg = (c: Ctx, color: string) => (c.bg = { kind: 'solid', color });

/** Full-bleed photo, dark gradient, text anchored bottom-left. */
const heroPhoto = recipe('hero-photo', 'Photo hero', (c) => {
  const { w, h, m, u, t, c: k } = c;
  P(c, 0, 0, w, h);
  R(c, 0, 0, w, h, grad('rgba(0,0,0,0.0)', 'rgba(0,0,0,0.78)', 180));
  const tw = c.land ? w * 0.6 : w - m * 2;
  const label = T(c, k.brand, m, 0, tw, BS(c) * 0.85, { role: 'l', color: t.accent });
  const head = T(c, k.headline, m, 0, tw, HS(c) * 1.05, { role: 'h', color: '#ffffff', maxLines: 3 });
  const sub = T(c, k.tagline, m, 0, tw * 0.9, BS(c) * 1.15, { color: 'rgba(255,255,255,0.88)', maxLines: 2 });
  const btn = B(c, k.cta, m, 0, BS(c) * 0.9, { fill: t.accent === '#ffffff' ? t.primary : t.accent });
  const items = [label, head, sub, btn];
  col(items, h - m - colH(items, u * 2.4), u * 2.4);
});

/** Photo on one half, copy on the other. */
const splitPhoto = recipe('split-photo', 'Split photo', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  solidBg(c, t.bg);
  const flip = rng.chance(0.5);
  let tx: number, ty: number, tw: number, th: number;
  if (c.land || (!c.port && rng.chance(0.5))) {
    const pw = w * 0.5;
    P(c, flip ? w - pw : 0, 0, pw, h);
    tx = flip ? m : pw + m * 0.9;
    tw = w - pw - m * 1.9;
    ty = m;
    th = h - m * 2;
  } else {
    const ph = h * 0.5;
    P(c, 0, 0, w, ph);
    tx = m;
    tw = w - m * 2;
    ty = ph + m * 0.6;
    th = h - ph - m * 1.2;
  }
  const label = T(c, k.brand, tx, 0, tw, BS(c) * 0.8, { role: 'l', color: t.primary });
  const head = T(c, k.headline, tx, 0, tw, HS(c) * 0.9, { role: 'h', color: ink(c, t.bg), maxLines: 3 });
  const rule = R(c, tx, 0, u * 10, Math.max(2, u * 0.5), t.accent);
  const body = T(c, k.body, tx, 0, tw, BS(c), { color: inkSoft(c, t.bg), maxLines: 4 });
  const btn = B(c, k.cta, tx, 0, BS(c) * 0.85);
  const items = [label, head, rule, body, btn];
  col(items, 0, u * 2.4);
  centerV(items, ty, th);
});

/** Big typographic headline with decoration — no photo. */
const boldType = recipe('bold-type', 'Bold type', (c) => {
  const { w, h, m, u, t, c: k } = c;
  const bg = c.rng.chance(0.5) ? t.primary : t.bg;
  solidBg(c, bg);
  deco(c, t.deco, bg, 0.8);
  const fg = on(c, bg);
  const tw = w - m * 2;
  const label = T(c, k.brand, m, 0, tw, BS(c) * 0.85, { role: 'l', color: bg === t.primary ? mix(fg, bg, 0.25) : t.primary, align: 'center' });
  const head = T(c, k.headline, m, 0, tw, HS(c) * 1.45, { role: 'h', color: fg, align: 'center', maxLines: 3, lh: 1.02 });
  const sub = T(c, k.tagline, m + tw * 0.1, 0, tw * 0.8, BS(c) * 1.2, { color: mix(fg, bg, 0.2), align: 'center', maxLines: 2 });
  const btn = B(c, k.cta, w / 2, 0, BS(c) * 0.9, { fill: t.accent, align: 'center' });
  const items = [label, head, sub, btn];
  col(items, 0, u * 3);
  centerV(items, m, h - m * 2);
});

/** Photo in an arch / rounded frame with heading below or beside. */
const framedPhoto = recipe('framed-photo', 'Framed photo', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  solidBg(c, t.bg);
  deco(c, t.deco, t.bg, 0.6);
  const shape = rng.pick(['arch', 'rounded', 'circle'] as const);
  if (c.land) {
    const fh = h - m * 2;
    const fw = shape === 'circle' ? fh : fh * 0.8;
    F(c, shape, w - m - fw, m, fw, fh);
    const tw = w - fw - m * 3;
    const items = [
      T(c, k.headline, m, 0, tw, HS(c), { role: 'h', color: ink(c, t.bg), maxLines: 3 }),
      T(c, k.body, m, 0, tw, BS(c), { color: inkSoft(c, t.bg), maxLines: 3 }),
      T(c, k.brand, m, 0, tw, BS(c) * 0.8, { role: 'l', color: t.primary }),
    ];
    col(items, 0, u * 3);
    centerV(items, m, h - m * 2);
    return;
  }
  const fw = Math.min(w - m * 2.4, (h - m * 2) * 0.62);
  const fh = shape === 'circle' ? fw : fw * (c.port ? 1.15 : 0.85);
  const fx = (w - fw) / 2;
  const label = T(c, k.brand, m, m, w - m * 2, BS(c) * 0.8, { role: 'l', color: t.primary, align: 'center' });
  const fr = F(c, shape, fx, label.y + label.h + u * 3, fw, fh);
  const head = T(c, k.headline, m, fr.y + fh + u * 4, w - m * 2, HS(c) * 0.85, { role: 'h', color: ink(c, t.bg), align: 'center', maxLines: 2 });
  T(c, k.tagline, m, head.y + head.h + u * 1.6, w - m * 2, BS(c), { color: inkSoft(c, t.bg), align: 'center', maxLines: 2 });
});

/** Quote card with big quote mark. */
const quoteCard = recipe('quote-card', 'Quote', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  const bg = rng.pick([t.bg, t.surface, t.primary]);
  solidBg(c, bg);
  deco(c, t.deco, bg, 0.5);
  const fg = ink(c, bg);
  const tw = w - m * 2.6;
  const x = (w - tw) / 2;
  const mark = T(c, '“', x, 0, tw, HS(c) * 2.4, { role: 'h', color: bg === t.primary ? t.accent : t.primary, align: 'center', lh: 0.9, upper: false });
  mark.h *= 0.55;
  const q = T(c, k.quote[0], x, 0, tw, HS(c) * 0.62, { role: 'h', color: fg, align: 'center', maxLines: c.land ? 3 : 6, lh: 1.25, upper: false });
  const rule = R(c, w / 2 - u * 4, 0, u * 8, Math.max(2, u * 0.4), bg === t.primary ? t.accent : t.secondary);
  const by = T(c, k.quote[1], x, 0, tw, BS(c) * 0.9, { role: 'l', color: mix(fg, bg, 0.25), align: 'center' });
  const items = [mark, q, rule, by];
  col(items, 0, u * 3);
  centerV(items, m, h - m * 2);
});

/** Promo with a big offer and starburst. */
const salePromo = recipe('sale-promo', 'Sale promo', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  solidBg(c, t.bg);
  const usePhoto = rng.chance(0.6);
  if (usePhoto) {
    if (c.land) P(c, w * 0.55, 0, w * 0.45, h);
    else P(c, 0, h * 0.58, w, h * 0.42);
  } else deco(c, t.deco, t.bg, 0.8);
  const area = usePhoto ? (c.land ? { x: m, y: m, w: w * 0.55 - m * 1.6, h: h - m * 2 } : { x: m, y: m, w: w - m * 2, h: h * 0.58 - m * 1.4 }) : { x: m, y: m, w: w - m * 2, h: h - m * 2 };
  const s = Math.min(area.w, area.h) * 0.36;
  const burst = R(c, area.x + area.w - s * 0.85, area.y - s * 0.1, s, s, t.accent, { shape: 'starburst', rot: rng.range(-12, 12) });
  burst.html = 'NEW';
  burst.fontFamily = t.heading.family;
  burst.fontWeight = t.heading.weight;
  burst.fontSize = s * 0.2;
  burst.color = on(c, t.accent);
  const label = T(c, k.brand, area.x, 0, area.w * 0.65, BS(c) * 0.8, { role: 'l', color: t.primary });
  const head = T(c, k.offer, area.x, 0, area.w * 0.8, HS(c) * 1.25, { role: 'h', color: t.primary, maxLines: 3, lh: 1.0 });
  const sub = T(c, k.tagline, area.x, 0, area.w * 0.8, BS(c) * 1.1, { color: inkSoft(c, t.bg), maxLines: 2 });
  const btn = B(c, k.cta, area.x, 0, BS(c) * 0.9, { fill: t.secondary === t.bg ? t.primary : t.secondary });
  const items = [label, head, sub, btn];
  col(items, 0, u * 2.4);
  centerV(items, area.y, area.h);
  burst.y = Math.max(u, Math.min(burst.y, head.y - s * 0.6));
});

/** Heading + numbered tips. */
const listTips = recipe('list-tips', 'Tips list', (c) => {
  const { w, h, m, u, t, c: k } = c;
  solidBg(c, t.bg);
  deco(c, t.deco, t.bg, 0.4);
  const n = c.land ? 3 : 4;
  const fg = ink(c, t.bg);
  const lab = T(c, `Top ${n} picks`, m, m, c.land ? w * 0.4 : w - m * 2, BS(c) * 0.85, { role: 'l', color: t.primary });
  const head = T(c, k.headline, m, lab.y + lab.h + u * 1.2, c.land ? w * 0.4 : w - m * 2, HS(c) * 0.8, { role: 'h', color: fg, maxLines: 3 });
  const cards = k.items.slice(0, n);
  if (c.land) {
    const x0 = w * 0.42 + m * 0.5;
    const cw = w - x0 - m;
    const ch = (h - m * 2 - u * 2 * (n - 1)) / n;
    centerV([lab, head], m, h - m * 2);
    cards.forEach((it, i) => {
      const y = m + i * (ch + u * 2);
      R(c, x0, y, cw, ch, t.surface === t.bg ? mix(t.bg, t.primary, 0.08) : t.surface, { radius: rad(c, u * 3) });
      const num = T(c, String(i + 1).padStart(2, '0'), x0 + u * 3, y, ch, Math.min(ch * 0.45, HS(c) * 0.6), { role: 'h', color: t.primary, upper: false });
      num.y = y + (ch - num.h) / 2;
      const tx = T(c, it, x0 + u * 3 + ch * 0.9, y, cw - ch - u * 4, Math.min(BS(c) * 1.3, ch * 0.3), { role: 'h', color: fg, maxLines: 2, upper: false, weight: 600 });
      tx.y = y + (ch - tx.h) / 2;
    });
    return;
  }
  let top = head.y + head.h + u * 4;
  const ch = Math.min(u * (c.ar < 0.7 ? 22 : 16), (h - top - m * 1.6 - u * 2 * (n - 1)) / n);
  const free = h - m * 1.6 - (top + n * ch + (n - 1) * u * 2);
  if (free > u * 8) {
    // vertically centre heading + list when there is spare room
    const shift = free / 2;
    lab.y += shift;
    head.y += shift;
    top += shift;
  }
  cards.forEach((it, i) => {
    const y = top + i * (ch + u * 2);
    R(c, m, y, w - m * 2, ch, t.surface === t.bg ? mix(t.bg, t.primary, 0.08) : t.surface, { radius: rad(c, u * 3) });
    const cs = ch * 0.6;
    R(c, m + u * 3, y + (ch - cs) / 2, cs, cs, t.primary, { shape: 'circle' });
    const num = T(c, String(i + 1), m + u * 3, y, cs, cs * 0.5, { role: 'h', color: on(c, t.primary), align: 'center', upper: false });
    num.y = y + (ch - num.h) / 2;
    const tx = T(c, it, m + u * 6 + cs, y, w - m * 2 - cs - u * 9, Math.min(BS(c) * 1.4, ch * 0.3), { role: 'h', color: fg, maxLines: 2, upper: false, weight: 600 });
    tx.y = y + (ch - tx.h) / 2;
  });
  const ft = T(c, k.brand + '  ·  ' + 'reallygreatsite.com', m, 0, w - m * 2, BS(c) * 0.7, { role: 'l', color: inkSoft(c, t.bg), align: 'center', maxLines: 1 });
  ft.y = h - m * 0.45 - ft.h;
});

/** One big statistic. */
const statHighlight = recipe('stat-highlight', 'Big number', (c) => {
  const { w, h, m, u, t, c: k } = c;
  const bg = t.primary;
  solidBg(c, bg);
  deco(c, t.deco, bg, 0.5);
  const fg = on(c, bg);
  const [val, lab] = k.stats[0];
  const tw = w - m * 2;
  const v = T(c, val, m, 0, tw, HS(c) * 2.4, { role: 'h', color: acc(c, bg), align: 'center', maxLines: 1, lh: 1 });
  const l = T(c, lab, m, 0, tw, HS(c) * 0.6, { role: 'h', color: fg, align: 'center', maxLines: 2 });
  const b = T(c, k.body, m + tw * 0.12, 0, tw * 0.76, BS(c), { color: mix(fg, bg, 0.2), align: 'center', maxLines: 3 });
  const br = T(c, k.brand, m, 0, tw, BS(c) * 0.8, { role: 'l', color: mix(fg, bg, 0.3), align: 'center' });
  const items = [v, l, b, br];
  col(items, 0, u * 3);
  centerV(items, m, h - m * 2);
});

/** Event announcement with date / time / place. */
const eventAnnounce = recipe('event-announce', 'Event', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  const usePhoto = rng.chance(0.55);
  solidBg(c, t.bg);
  let area = { x: m, y: m, w: w - m * 2, h: h - m * 2 };
  if (usePhoto) {
    if (c.land) {
      P(c, 0, 0, w * 0.42, h);
      area = { x: w * 0.42 + m, y: m, w: w * 0.58 - m * 2, h: h - m * 2 };
    } else {
      P(c, 0, 0, w, h * 0.42);
      area = { x: m, y: h * 0.42 + m * 0.6, w: w - m * 2, h: h * 0.58 - m * 1.2 };
    }
  } else deco(c, t.deco, t.bg, 0.7);
  const fg = ink(c, t.bg);
  const label = T(c, 'You are invited', area.x, 0, area.w, BS(c) * 0.85, { role: 'l', color: t.primary });
  const head = T(c, k.event, area.x, 0, area.w, HS(c) * 0.95, { role: 'h', color: fg, maxLines: 3 });
  const rule = L(c, area.x, 0, area.x + area.w * 0.3, 0, t.accent, Math.max(2, u * 0.4));
  rule.h = Math.max(2, u * 0.4);
  const bs = BS(c);
  const wide = c.ar > 2.5;
  const info = T(c, wide ? `${k.date}  ·  ${k.time}` : `${k.date}\n${k.time}\n123 Anywhere St., Any City`, area.x, 0, area.w, bs * 1.05, { color: inkSoft(c, t.bg), maxLines: wide ? 1 : 4, lh: 1.6 });
  const btn = B(c, k.cta, area.x, 0, bs * 0.85, { fill: t.primary });
  if (wide) {
    c.els.splice(c.els.indexOf(btn), 1);
    c.els.splice(c.els.indexOf(rule), 1);
  }
  const items = wide ? [label, head, info] : [label, head, rule, info, btn];
  col(items, 0, u * 2.6);
  centerV(items, area.y, area.h);
});

export const SOCIAL_A: Recipe[] = [heroPhoto, splitPhoto, boldType, framedPhoto, quoteCard, salePromo, listTips, statHighlight, eventAnnounce];
