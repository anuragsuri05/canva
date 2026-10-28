// Print layouts: business cards, certificates.
import { acc, F, L, NONE, P, R, T, centerV, col, ink, inkSoft, on, rad, recipe, type Ctx, type Recipe } from '../kit';
import { deco } from '../deco';
import { CONTACT } from '../content';
import { mix } from '../rng';

const bgc = (c: Ctx, color: string) => (c.bg = { kind: 'solid', color });

export const initials = (s: string) =>
  s
    .replace(/[^A-Za-z& ]/g, '')
    .split(/\s+|&/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0].toUpperCase())
    .join('');

/** Simple brand mark: shape with initials. */
export function mark(c: Ctx, x: number, y: number, s: number, fill: string, shape: 'circle' | 'hexagon' | 'rounded' | 'diamond' = 'circle') {
  R(c, x, y, s, s, fill, { shape, radius: shape === 'rounded' ? s * 0.22 : undefined });
  const t = T(c, initials(c.c.brand), x, y, s, s * 0.36, { role: 'h', color: on(c, fill), align: 'center', upper: true, ls: 0, lh: 1 });
  t.y = y + (s - t.h) / 2;
}

/* ---------- Business cards (3.5 × 2 in) ---------- */

function contactLines(c: Ctx, x: number, y: number, w: number, size: number, color: string, dot: string) {
  const lines = [CONTACT.phone, CONTACT.email, CONTACT.web, CONTACT.address];
  return lines.map((l, i) => {
    const yy = y + i * size * 1.9;
    R(c, x, yy + size * 0.3, size * 0.7, size * 0.7, dot, { shape: 'circle' });
    return T(c, l, x + size * 1.4, yy, w - size * 1.4, size, { color, maxLines: 1 });
  });
}

const bcSplit = recipe('bc-split', 'Split business card', (c) => {
  const { w, h, t, c: k } = c;
  bgc(c, t.bg);
  const pw = w * 0.38;
  R(c, 0, 0, pw, h, t.primary);
  const s = h * 0.3;
  mark(c, (pw - s) / 2, h * 0.24, s, acc(c, t.primary), 'circle');
  T(c, k.brand, w * 0.03, h * 0.24 + s + h * 0.06, pw - w * 0.06, h * 0.06, { role: 'l', color: on(c, t.primary), align: 'center', maxLines: 2 });
  const x = pw + w * 0.07;
  const tw = w - x - w * 0.06;
  const nm = T(c, k.people[0], x, h * 0.16, tw, h * 0.1, { role: 'h', color: ink(c, t.bg), maxLines: 1, upper: false });
  const rl = T(c, k.roles[0], x, nm.y + nm.h + h * 0.01, tw, h * 0.05, { role: 'l', color: t.primary, maxLines: 1 });
  L(c, x, rl.y + rl.h + h * 0.06, x + tw * 0.3, rl.y + rl.h + h * 0.06, t.accent, 1.5);
  contactLines(c, x, rl.y + rl.h + h * 0.12, tw, h * 0.046, inkSoft(c, t.bg), t.primary);
});

const bcCenter = recipe('bc-center', 'Centered business card', (c) => {
  const { w, h, t, c: k } = c;
  bgc(c, t.bg);
  deco(c, t.deco === 'grid' || t.deco === 'dots' ? 'frame' : t.deco, t.bg, 0.6);
  const s = h * 0.22;
  mark(c, (w - s) / 2, h * 0.12, s, t.primary, 'hexagon');
  const nm = T(c, k.people[0], w * 0.1, h * 0.12 + s + h * 0.06, w * 0.8, h * 0.1, { role: 'h', color: ink(c, t.bg), align: 'center', maxLines: 1, upper: false });
  T(c, k.roles[0] + ' · ' + k.brand, w * 0.1, nm.y + nm.h + h * 0.01, w * 0.8, h * 0.048, { role: 'l', color: t.primary, align: 'center', maxLines: 1 });
  const bt = T(c, `${CONTACT.phone}   ·   ${CONTACT.email}   ·   ${CONTACT.web}`, w * 0.06, 0, w * 0.88, h * 0.042, { color: inkSoft(c, t.bg), align: 'center', maxLines: 2 });
  bt.y = h * 0.86 - bt.h;
});

const bcPhoto = recipe('bc-photo', 'Photo business card', (c) => {
  const { w, h, t, c: k } = c;
  bgc(c, t.surface === '#ffffff' && !t.dark ? t.bg : t.surface);
  P(c, w * 0.6, 0, w * 0.4, h);
  const x = w * 0.07;
  const tw = w * 0.48;
  const items = [
    T(c, k.brand, x, 0, tw, h * 0.05, { role: 'l', color: t.primary, maxLines: 1 }),
    T(c, k.people[0], x, 0, tw, h * 0.11, { role: 'h', color: ink(c, t.bg), maxLines: 2, upper: false }),
    T(c, k.roles[0], x, 0, tw, h * 0.05, { color: inkSoft(c, t.bg), maxLines: 1 }),
    T(c, `${CONTACT.phone}\n${CONTACT.email}\n${CONTACT.web}`, x, 0, tw, h * 0.045, { color: inkSoft(c, t.bg), lh: 1.6 }),
  ];
  col(items, 0, [h * 0.02, h * 0.01, h * 0.08, 0]);
  centerV(items, h * 0.1, h * 0.8);
});

const bcBand = recipe('bc-band', 'Band business card', (c) => {
  const { w, h, t, c: k } = c;
  bgc(c, t.bg);
  const bh = h * 0.36;
  R(c, 0, 0, w, bh, t.primary);
  R(c, 0, bh, w, h * 0.02, t.accent);
  const s = bh * 0.56;
  mark(c, w * 0.07, (bh - s) / 2, s, on(c, t.primary) === '#ffffff' ? '#ffffff' : t.bg, 'rounded');
  const br = T(c, k.brand, w * 0.07 + s + w * 0.04, 0, w * 0.6, h * 0.07, { role: 'h', color: on(c, t.primary), maxLines: 1 });
  br.y = (bh - br.h) / 2;
  const nm = T(c, k.people[0], w * 0.07, bh + h * 0.1, w * 0.5, h * 0.085, { role: 'h', color: ink(c, t.bg), upper: false, maxLines: 1 });
  T(c, k.roles[0], w * 0.07, nm.y + nm.h + h * 0.01, w * 0.5, h * 0.045, { role: 'l', color: t.primary, maxLines: 1 });
  T(c, `${CONTACT.phone}\n${CONTACT.email}\n${CONTACT.web}`, w * 0.58, bh + h * 0.1, w * 0.36, h * 0.042, { color: inkSoft(c, t.bg), lh: 1.6, align: 'right' });
});

const bcBack = recipe('bc-back', 'Business card back', (c) => {
  const { w, h, t, c: k } = c;
  const bg = t.dark ? t.bg : t.primary;
  bgc(c, bg);
  deco(c, t.deco, bg, 0.4);
  const s = h * 0.3;
  const fill = acc(c, bg);
  const items = [
    (() => {
      mark(c, (w - s) / 2, 0, s, fill, 'circle');
      return c.els[c.els.length - 2];
    })(),
    T(c, k.brand, w * 0.1, 0, w * 0.8, h * 0.09, { role: 'h', color: on(c, bg), align: 'center', maxLines: 1 }),
    T(c, k.tagline, w * 0.1, 0, w * 0.8, h * 0.045, { color: mix(on(c, bg), bg, 0.25), align: 'center', maxLines: 2 }),
  ];
  const initialsEl = c.els[c.els.indexOf(items[0]) + 1];
  col(items, 0, h * 0.05);
  centerV(items, 0, h);
  initialsEl.y = items[0].y + (s - initialsEl.h) / 2;
});

/* ---------- Certificates (11 × 8.5 in) ---------- */

const certClassic = recipe('certificate-classic', 'Classic certificate', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.dark ? t.bg : t.surface === '#ffffff' ? '#ffffff' : t.surface);
  const bg = (c.bg as { color: string }).color;
  const p = u * 4;
  R(c, p, p, w - p * 2, h - p * 2, NONE, { stroke: { color: t.primary, width: u * 0.8 } });
  R(c, p * 1.6, p * 1.6, w - p * 3.2, h - p * 3.2, NONE, { stroke: { color: mix(t.primary, bg, 0.4), width: u * 0.2 } });
  const fg = ink(c, bg);
  const tw = w * 0.7;
  const x = (w - tw) / 2;
  const items = [
    T(c, 'Certificate', x, 0, tw, u * 10, { role: 'h', color: t.primary, align: 'center', maxLines: 1 }),
    T(c, `of ${k.topic.id === 'education' ? 'Completion' : 'Achievement'}`, x, 0, tw, u * 2.6, { role: 'l', color: fg, align: 'center', ls: 400 }),
    T(c, 'This certificate is proudly presented to', x, 0, tw, u * 2.4, { color: inkSoft(c, bg), align: 'center' }),
    T(c, k.people[0], x, 0, tw, u * 9, { role: 's', color: fg, align: 'center', maxLines: 1, upper: false }),
    T(c, `In recognition of outstanding dedication and excellence. Awarded by ${k.brand} on ${k.date}.`, x + tw * 0.08, 0, tw * 0.84, u * 2.3, { color: inkSoft(c, bg), align: 'center', maxLines: 3 }),
  ];
  col(items, 0, [u * 1, u * 4, u * 2, u * 3, 0]);
  centerV(items, h * 0.1, h * 0.62);
  const sy = h * 0.8;
  [0, 1].forEach((i) => {
    const sx = i === 0 ? w * 0.16 : w * 0.62;
    L(c, sx, sy, sx + w * 0.22, sy, fg, 1.5);
    T(c, k.people[i + 1], sx, sy + u * 1.2, w * 0.22, u * 2.2, { role: 'h', color: fg, align: 'center', upper: false, weight: 600 });
    T(c, k.roles[i], sx, sy + u * 4.4, w * 0.22, u * 1.8, { color: inkSoft(c, bg), align: 'center' });
  });
  const s = u * 15;
  R(c, (w - s) / 2, sy - s * 0.55, s, s, acc(c, bg), { shape: 'starburst' });
  R(c, (w - s * 0.66) / 2, sy - s * 0.55 + s * 0.17, s * 0.66, s * 0.66, t.primary, { shape: 'circle' });
  const yr = T(c, String(k.year), (w - s) / 2, 0, s, u * 2.6, { role: 'h', color: on(c, t.primary), align: 'center', upper: false });
  yr.y = sy - s * 0.55 + (s - yr.h) / 2;
});

const certModern = recipe('certificate-modern', 'Modern certificate', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.bg);
  const bw = w * 0.3;
  R(c, 0, 0, bw, h, t.primary);
  R(c, bw * 0.15, -h * 0.1, bw * 1.1, bw * 1.1, mix(t.primary, '#ffffff', 0.12), { shape: 'circle' });
  R(c, -bw * 0.3, h * 0.65, bw * 0.9, bw * 0.9, mix(t.primary, '#000000', 0.15), { shape: 'circle' });
  const s = u * 14;
  mark(c, (bw - s) / 2, h * 0.42, s, acc(c, t.primary), 'circle');
  const fg = ink(c, t.bg);
  const x = bw + u * 8;
  const tw = w - x - u * 8;
  const items = [
    T(c, 'Certificate of Appreciation', x, 0, tw, u * 6.5, { role: 'h', color: fg, maxLines: 2 }),
    R(c, x, 0, u * 12, u * 0.6, t.accent),
    T(c, 'Presented to', x, 0, tw, u * 2.4, { role: 'l', color: inkSoft(c, t.bg) }),
    T(c, k.people[0], x, 0, tw, u * 7, { role: t.script ? 's' : 'h', color: t.primary, maxLines: 1, upper: false }),
    T(c, `For exceptional contribution and commitment to ${k.brand}. Thank you for your hard work and inspiring example.`, x, 0, tw * 0.9, u * 2.3, { color: inkSoft(c, t.bg), maxLines: 3 }),
  ];
  col(items, 0, u * 3);
  centerV(items, u * 8, h * 0.68);
  const sy = h * 0.84;
  L(c, x, sy, x + tw * 0.38, sy, fg, 1.5);
  T(c, `${k.people[1]} · ${k.roles[0]}`, x, sy + u * 1.2, tw * 0.45, u * 1.9, { color: inkSoft(c, t.bg) });
  L(c, x + tw * 0.55, sy, x + tw * 0.93, sy, fg, 1.5);
  T(c, k.date, x + tw * 0.55, sy + u * 1.2, tw * 0.4, u * 1.9, { color: inkSoft(c, t.bg) });
});

export const PRINT_A: Recipe[] = [bcSplit, bcCenter, bcPhoto, bcBand, bcBack, certClassic, certModern];
