// Presentation slides (designed for 16:9, adapt to 4:3 and vertical).
import { makeChart } from '../../model/defaults';
import { acc, B, BS, F, HS, L, P, R, T, centerV, col, ink, inkSoft, on, rad, recipe, type Ctx, type Recipe } from '../kit';
import { deco } from '../deco';
import { mix } from '../rng';

const bgc = (c: Ctx, color: string) => (c.bg = { kind: 'solid', color });

/** Small brand label + page number. */
export function chrome(c: Ctx, bg: string) {
  const { w, h, m, u, c: k } = c;
  T(c, k.brand, m, m * 0.5, w * 0.4, BS(c) * 0.7, { role: 'l', color: inkSoft(c, bg) });
  const n = T(c, String(c.page + 1).padStart(2, '0'), w - m - u * 10, 0, u * 10, BS(c) * 0.7, { role: 'l', color: inkSoft(c, bg), align: 'right' });
  n.y = h - m * 0.5 - n.h;
}

const title = recipe('slide-title', 'Title slide', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  const v = rng.int(3);
  const fg0 = ink(c, t.bg);
  c.notes = `Welcome everyone. Introduce ${k.brand} and the purpose of this presentation.`;
  if (v === 0 && c.land) {
    bgc(c, t.bg);
    P(c, w * 0.52, 0, w * 0.48, h);
    const items = [
      T(c, k.brand, m, 0, w * 0.42, BS(c) * 0.85, { role: 'l', color: t.primary }),
      T(c, k.headline, m, 0, w * 0.42, HS(c) * 0.95, { role: 'h', color: fg0, maxLines: 3 }),
      T(c, k.tagline, m, 0, w * 0.4, BS(c) * 1.2, { color: inkSoft(c, t.bg), maxLines: 2 }),
      T(c, `Presented by ${k.people[0]}  ·  ${k.year}`, m, 0, w * 0.42, BS(c) * 0.8, { color: inkSoft(c, t.bg) }),
    ];
    col(items, 0, u * 3);
    centerV(items, m, h - m * 2);
    return;
  }
  if (v === 1) {
    P(c, 0, 0, w, h);
    R(c, 0, 0, w, h, mix(t.primary, '#000000', 0.35), { opacity: 0.72 });
    const items = [
      T(c, k.headline, m, 0, w - m * 2, HS(c) * 1.1, { role: 'h', color: '#ffffff', align: 'center', maxLines: 2 }),
      T(c, k.tagline, m * 2, 0, w - m * 4, BS(c) * 1.3, { color: 'rgba(255,255,255,0.88)', align: 'center', maxLines: 2 }),
      T(c, k.brand, m, 0, w - m * 2, BS(c) * 0.8, { role: 'l', color: t.accent, align: 'center' }),
    ];
    col(items, 0, u * 3);
    centerV(items, m, h - m * 2);
    return;
  }
  const bg = t.primary;
  bgc(c, bg);
  deco(c, t.deco, bg, 0.6);
  const fg = on(c, bg);
  const items = [
    T(c, k.brand, m, 0, w - m * 2, BS(c) * 0.85, { role: 'l', color: mix(fg, bg, 0.25) }),
    T(c, k.headline, m, 0, c.land ? w * 0.7 : w - m * 2, HS(c) * 1.2, { role: 'h', color: fg, maxLines: 3 }),
    R(c, m, 0, u * 14, Math.max(3, u * 0.6), t.accent),
    T(c, k.tagline, m, 0, c.land ? w * 0.55 : w - m * 2, BS(c) * 1.2, { color: mix(fg, bg, 0.15), maxLines: 2 }),
  ];
  col(items, 0, u * 3);
  centerV(items, m, h - m * 2);
});

const agenda = recipe('slide-agenda', 'Agenda', (c) => {
  const { w, h, m, u, t, c: k } = c;
  bgc(c, t.bg);
  chrome(c, t.bg);
  const fg = ink(c, t.bg);
  const secs = k.sections.slice(0, 5);
  c.notes = 'Walk through the agenda so the audience knows what to expect.';
  const lw = c.land ? w * 0.35 : w - m * 2;
  const head = T(c, 'Agenda', m, m * 1.3, lw, HS(c) * 0.9, { role: 'h', color: fg, maxLines: 2 });
  T(c, k.tagline, m, head.y + head.h + u * 2, lw, BS(c), { color: inkSoft(c, t.bg), maxLines: 3 });
  const x0 = c.land ? w * 0.45 : m;
  const top = c.land ? m * 1.3 : head.y + head.h + u * 14;
  const rh = ((c.land ? h - m * 2.6 : h - top - m * 1.4) - u * 1.5 * (secs.length - 1)) / secs.length;
  secs.forEach((s, i) => {
    const y = top + i * (rh + u * 1.5);
    const num = T(c, String(i + 1).padStart(2, '0'), x0, y, u * 12, Math.min(rh * 0.55, HS(c) * 0.5), { role: 'h', color: t.primary, upper: false });
    num.y = y + (rh - num.h) / 2;
    const tx = T(c, s, x0 + u * 13, y, w - x0 - m - u * 13, Math.min(rh * 0.38, BS(c) * 1.5), { role: 'h', color: fg, upper: false, weight: 600, maxLines: 1 });
    tx.y = y + (rh - tx.h) / 2;
    if (i < secs.length - 1) L(c, x0, y + rh + u * 0.75, w - m, y + rh + u * 0.75, mix(fg, t.bg, 0.82), Math.max(1, u * 0.15));
  });
});

const section = recipe('slide-section', 'Section header', (c) => {
  const { w, h, m, u, t, c: k } = c;
  const idx = c.page < 4 ? 0 : 1;
  const bg = t.dark ? t.surface : t.primary;
  bgc(c, bg);
  const fg = on(c, bg);
  deco(c, t.deco, bg, 0.4);
  const num = T(c, String(idx + 1).padStart(2, '0'), m, 0, w - m * 2, HS(c) * 1.6, { role: 'h', color: acc(c, bg), upper: false, lh: 1 });
  const head = T(c, k.sections[idx + 1] ?? k.headline2, m, 0, c.land ? w * 0.6 : w - m * 2, HS(c) * 1.05, { role: 'h', color: fg, maxLines: 2 });
  const sub = T(c, k.tagline, m, 0, c.land ? w * 0.5 : w - m * 2, BS(c) * 1.1, { color: mix(fg, bg, 0.2), maxLines: 2 });
  const items = [num, head, sub];
  col(items, 0, u * 2.4);
  centerV(items, m, h - m * 2);
});

const content = recipe('slide-content', 'Bulleted content', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  bgc(c, t.bg);
  chrome(c, t.bg);
  const fg = ink(c, t.bg);
  c.notes = 'Explain each point briefly and share an example for the most important one.';
  const head = T(c, k.headline2, m, m * 1.3, c.land ? w * 0.8 : w - m * 2, HS(c) * 0.75, { role: 'h', color: fg, maxLines: 2 });
  R(c, m, head.y + head.h + u * 2, u * 10, Math.max(3, u * 0.5), t.accent);
  const top = head.y + head.h + u * 6;
  const twoCol = c.land && rng.chance(0.5);
  const cw = twoCol ? (w - m * 2 - u * 6) / 2 : c.land ? w * 0.62 : w - m * 2;
  T(c, k.body, m, top, cw, BS(c) * 1.1, { color: inkSoft(c, t.bg), maxLines: 5 });
  const bx = twoCol ? m + cw + u * 6 : m;
  const by = twoCol ? top : top + BS(c) * 1.1 * 1.45 * 3 + u * 4;
  T(c, k.items.slice(0, 4).join('\n'), bx, by, cw, BS(c) * 1.05, { color: fg, list: 'bullet', lh: 1.8 });
  if (c.land && !twoCol) F(c, 'rounded', w * 0.7, top, w * 0.3 - m, h - top - m * 1.3);
});

const imageText = recipe('slide-image-text', 'Image and text', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  bgc(c, t.surface === '#ffffff' && !t.dark ? t.bg : t.surface);
  const fg = ink(c, t.bg);
  const left = rng.chance(0.5);
  if (c.land) {
    if (rng.chance(0.5)) P(c, left ? 0 : w * 0.5, 0, w * 0.5, h);
    else F(c, 'rounded', left ? m : w * 0.5, m, w * 0.5 - m, h - m * 2);
  } else P(c, 0, 0, w, h * 0.45);
  const tx = c.land ? (left ? w * 0.5 + m : m) : m;
  const tw = c.land ? w * 0.5 - m * 2 : w - m * 2;
  const items = [
    T(c, k.sections[2] ?? k.brand, tx, 0, tw, BS(c) * 0.8, { role: 'l', color: t.primary }),
    T(c, k.headline, tx, 0, tw, HS(c) * 0.7, { role: 'h', color: fg, maxLines: 3 }),
    T(c, k.body, tx, 0, tw, BS(c) * 1.05, { color: inkSoft(c, t.bg), maxLines: 5 }),
    T(c, k.body2, tx, 0, tw, BS(c) * 1.05, { color: inkSoft(c, t.bg), maxLines: 4 }),
  ];
  col(items, 0, u * 2.5);
  centerV(items, c.land ? m : h * 0.45 + m * 0.5, c.land ? h - m * 2 : h * 0.55 - m * 1.5);
});

const stats = recipe('slide-stats', 'Key numbers', (c) => {
  const { w, h, m, u, t, c: k } = c;
  bgc(c, t.bg);
  chrome(c, t.bg);
  const fg = ink(c, t.bg);
  c.notes = 'Highlight the numbers that matter most and what they mean for us.';
  const head = T(c, 'Key Results', m, m * 1.3, w - m * 2, HS(c) * 0.75, { role: 'h', color: fg, maxLines: 1, align: c.land ? 'left' : 'center' });
  const n = c.land ? 4 : 3;
  const top = head.y + head.h + u * 6;
  const gap = u * 3;
  const sts = k.stats.slice(0, n);
  sts.forEach(([v, l], i) => {
    const cw = c.land ? (w - m * 2 - gap * (n - 1)) / n : w - m * 2;
    const ch = c.land ? h - top - m * 1.4 : (h - top - m * 1.4 - gap * (n - 1)) / n;
    const x = c.land ? m + i * (cw + gap) : m;
    const y = c.land ? top : top + i * (ch + gap);
    const fill = i === 0 ? t.primary : t.surface === t.bg ? mix(t.bg, t.primary, 0.08) : t.surface;
    R(c, x, y, cw, ch, fill, { radius: rad(c, u * 3) });
    const f = ink(c, fill);
    const vv = T(c, v, x + u * 3, 0, cw - u * 6, Math.min(HS(c) * 0.9, cw * 0.28), { role: 'h', color: i === 0 ? f : t.primary, upper: false, maxLines: 1 });
    const ll = T(c, l, x + u * 3, 0, cw - u * 6, BS(c), { color: i === 0 ? f : inkSoft(c, fill), maxLines: 2 });
    col([vv, ll], 0, u * 1.5);
    centerV([vv, ll], y, ch);
  });
});

const closing = recipe('slide-closing', 'Thank you', (c) => {
  const { w, h, m, u, t, c: k } = c;
  const bg = t.dark ? t.bg : t.primary;
  bgc(c, bg);
  deco(c, t.deco, bg, 0.6);
  const fg = on(c, bg);
  c.notes = 'Thank the audience and invite questions.';
  const items = [
    T(c, 'Thank You', m, 0, w - m * 2, HS(c) * 1.4, { role: t.script ? 's' : 'h', color: fg, align: 'center', maxLines: 1, upper: t.script ? false : undefined }),
    T(c, k.tagline, m * 2, 0, w - m * 4, BS(c) * 1.2, { color: mix(fg, bg, 0.2), align: 'center', maxLines: 2 }),
    T(c, 'hello@reallygreatsite.com  ·  +123-456-7890  ·  reallygreatsite.com', m, 0, w - m * 2, BS(c) * 0.8, { role: 'l', color: acc(c, bg), align: 'center', maxLines: 2 }),
  ];
  col(items, 0, u * 3.5);
  centerV(items, m, h - m * 2);
});

const chart = recipe('slide-chart', 'Chart', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  bgc(c, t.bg);
  chrome(c, t.bg);
  const fg = ink(c, t.bg);
  const head = T(c, 'Growth Overview', m, m * 1.3, c.land ? w * 0.34 : w - m * 2, HS(c) * 0.7, { role: 'h', color: fg, maxLines: 2 });
  const body = T(c, k.body, m, head.y + head.h + u * 3, c.land ? w * 0.32 : w - m * 2, BS(c), { color: inkSoft(c, t.bg), maxLines: 6 });
  const x = c.land ? w * 0.42 : m;
  const y = c.land ? m * 1.3 : body.y + body.h + u * 4;
  const ch = makeChart(rng.pick(['column', 'line', 'bar', 'area'] as const), x, y, w - x - m, h - y - m * 1.3);
  ch.labels = ['Q1', 'Q2', 'Q3', 'Q4'];
  ch.series = [
    { name: String(k.year - 1), values: [12, 18, 15, 22].map((v) => v + rng.int(6)), color: t.secondary === t.bg ? mix(t.primary, t.bg, 0.5) : t.secondary },
    { name: String(k.year), values: [16, 22, 27, 34].map((v) => v + rng.int(6)), color: t.primary },
  ];
  ch.options = { ...ch.options, fontFamily: t.body.family, fontSize: Math.round(BS(c) * 0.7), textColor: inkSoft(c, t.bg), gridColor: mix(fg, t.bg, 0.88), rounding: Math.round(t.radius * 10) };
  c.els.push(ch);
});

export const SLIDES_A: Recipe[] = [title, agenda, section, content, imageText, stats, closing, chart];
