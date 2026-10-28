// Print layouts: invitations, cards, brochures, calendars, labels, merch, letterheads.
import { acc, B, F, L, NONE, P, R, T, centerV, col, ink, inkSoft, on, rad, recipe, type Ctx, type Recipe } from '../kit';
import { deco } from '../deco';
import { CONTACT, DAYS, MONTHS } from '../content';
import { mix, rgba } from '../rng';
import { mark } from './print';

const bgc = (c: Ctx, color: string) => (c.bg = { kind: 'solid', color });

const inviteClassic = recipe('invite-classic', 'Classic invitation', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.bg);
  deco(c, t.deco === 'grid' || t.deco === 'dots' ? 'frame' : t.deco, t.bg, 0.8);
  const fg = ink(c, t.bg);
  const tw = w * 0.76;
  const x = (w - tw) / 2;
  const items = [
    T(c, k.tagline, x, 0, tw, u * 3, { role: 'l', color: inkSoft(c, t.bg), align: 'center', maxLines: 2 }),
    T(c, k.headline, x, 0, tw, u * 13, { role: t.script ? 's' : 'h', color: t.primary, align: 'center', maxLines: 3, upper: t.script ? false : undefined }),
    T(c, k.brand, x, 0, tw, u * 5.5, { role: 'h', color: fg, align: 'center', maxLines: 2, upper: false }),
    L(c, w / 2 - u * 8, 0, w / 2 + u * 8, 0, t.secondary, 1.5),
    T(c, `${k.date}\n${k.time}`, x, 0, tw, u * 3.2, { role: 'l', color: fg, align: 'center', lh: 1.7 }),
    T(c, CONTACT.address, x, 0, tw, u * 3, { color: inkSoft(c, t.bg), align: 'center' }),
    T(c, `${k.cta} by ${MONTHS[(MONTHS.indexOf(k.date.split(' ')[0]) + 11) % 12]} 1`, x, 0, tw, u * 2.6, { role: 'l', color: t.primary, align: 'center' }),
  ];
  items[3].h = 2;
  col(items, 0, [u * 3, u * 3, u * 4, u * 4, u * 2, u * 4, 0]);
  centerV(items, u * 10, h - u * 20);
});

const invitePhoto = recipe('invite-photo', 'Photo invitation', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.bg);
  const ph = h * 0.48;
  F(c, 'arch', w * 0.12, u * 8, w * 0.76, ph);
  const fg = ink(c, t.bg);
  const items = [
    T(c, k.headline, u * 8, 0, w - u * 16, u * 10, { role: t.script ? 's' : 'h', color: t.primary, align: 'center', maxLines: 2, upper: t.script ? false : undefined }),
    T(c, k.brand, u * 8, 0, w - u * 16, u * 4.5, { role: 'h', color: fg, align: 'center', upper: false, maxLines: 1 }),
    T(c, `${k.date}  ·  ${k.time.split(' – ')[0]}`, u * 8, 0, w - u * 16, u * 2.8, { role: 'l', color: inkSoft(c, t.bg), align: 'center' }),
    T(c, CONTACT.address, u * 8, 0, w - u * 16, u * 2.8, { color: inkSoft(c, t.bg), align: 'center' }),
  ];
  col(items, 0, u * 2.4);
  centerV(items, u * 8 + ph + u * 4, h - ph - u * 18);
});

const cardInside = recipe('card-inside', 'Card inside', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.dark ? t.bg : '#ffffff');
  const bg = (c.bg as { color: string }).color;
  const fg = ink(c, bg);
  const tw = w * 0.7;
  const items = [
    T(c, 'Dear friend,', (w - tw) / 2, 0, tw, u * 6, { role: t.script ? 's' : 'h', color: t.primary, align: 'center', upper: false }),
    T(c, k.body + ' ' + k.body2, (w - tw) / 2, 0, tw, u * 3.2, { color: fg, align: 'center', maxLines: 8, lh: 1.6 }),
    T(c, `With love,\n${k.people[0]}`, (w - tw) / 2, 0, tw, u * 3.4, { role: 'h', color: fg, align: 'center', upper: false, weight: 500 }),
  ];
  col(items, 0, u * 6);
  centerV(items, u * 10, h - u * 20);
});

/* ---------- Tri-fold brochure ---------- */

const brochureOutside = recipe('brochure-outside', 'Brochure outside', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.bg);
  const pw = w / 3;
  const pad = u * 6;
  const fg = ink(c, t.bg);
  // Panel 1: inside flap
  const p1 = [
    T(c, 'Why choose us', pad, 0, pw - pad * 2, u * 5, { role: 'h', color: fg, maxLines: 2 }),
    T(c, k.body, pad, 0, pw - pad * 2, u * 2.4, { color: inkSoft(c, t.bg), maxLines: 6 }),
    T(c, k.items.slice(0, 4).join('\n'), pad, 0, pw - pad * 2, u * 2.4, { color: fg, list: 'bullet', lh: 1.8 }),
  ];
  col(p1, 0, u * 3);
  centerV(p1, pad, h - pad * 2);
  // Panel 2: back
  R(c, pw, 0, pw, h, t.surface === t.bg ? mix(t.bg, t.primary, 0.07) : t.surface);
  const bx = pw + pad;
  const p2 = [
    T(c, 'Contact us', bx, 0, pw - pad * 2, u * 4.5, { role: 'h', color: fg }),
    T(c, `${CONTACT.phone}\n${CONTACT.email}\n${CONTACT.web}\n${CONTACT.address}`, bx, 0, pw - pad * 2, u * 2.3, { color: inkSoft(c, t.bg), lh: 1.8 }),
  ];
  col(p2, 0, u * 3);
  centerV(p2, pad, h * 0.6);
  P(c, bx, h * 0.62, pw - pad * 2, h * 0.38 - pad, { radius: rad(c, u * 2) });
  // Panel 3: front cover
  const x3 = pw * 2;
  P(c, x3, 0, pw, h * 0.58);
  R(c, x3, h * 0.58, pw, h * 0.42, t.primary);
  const fgp = on(c, t.primary);
  const s = u * 9;
  mark(c, x3 + (pw - s) / 2, h * 0.58 - s / 2, s, acc(c, t.primary), 'circle');
  const p3 = [
    T(c, k.headline, x3 + pad, 0, pw - pad * 2, u * 5.5, { role: 'h', color: fgp, align: 'center', maxLines: 3 }),
    T(c, k.brand, x3 + pad, 0, pw - pad * 2, u * 2.2, { role: 'l', color: mix(fgp, t.primary, 0.25), align: 'center' }),
  ];
  col(p3, 0, u * 2);
  centerV(p3, h * 0.58 + s / 2, h * 0.42 - s / 2);
});

const brochureInside = recipe('brochure-inside', 'Brochure inside', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.bg);
  const pw = w / 3;
  const pad = u * 6;
  const fg = ink(c, t.bg);
  for (let i = 0; i < 3; i++) {
    const x = i * pw + pad;
    const tw = pw - pad * 2;
    if (i === 1) {
      const items = [
        T(c, 'Our Impact', x, 0, tw, u * 5, { role: 'h', color: fg, align: 'center' }),
        ...k.stats.slice(0, 3).flatMap(([v, l]) => [
          T(c, v, x, 0, tw, u * 7, { role: 'h', color: t.primary, align: 'center', upper: false, lh: 1 }),
          T(c, l, x, 0, tw, u * 2.2, { role: 'l', color: inkSoft(c, t.bg), align: 'center' }),
        ]),
      ];
      col(items, 0, u * 1.6);
      centerV(items, pad, h - pad * 2);
      continue;
    }
    const ph = h * 0.36;
    P(c, x, pad, tw, ph, { radius: rad(c, u * 2) });
    const items = [
      T(c, k.items[i === 0 ? 0 : 1], x, 0, tw, u * 4, { role: 'h', color: fg, maxLines: 2 }),
      T(c, i === 0 ? k.body : k.body2, x, 0, tw, u * 2.3, { color: inkSoft(c, t.bg), maxLines: 6 }),
      T(c, k.items.slice(2, 5).join('\n'), x, 0, tw, u * 2.3, { color: fg, list: 'bullet', lh: 1.7 }),
    ];
    col(items, pad + ph + u * 4, u * 2.4);
  }
  L(c, pw, h * 0.08, pw, h * 0.92, mix(fg, t.bg, 0.85), 1, { style: 'dashed' });
  L(c, pw * 2, h * 0.08, pw * 2, h * 0.92, mix(fg, t.bg, 0.85), 1, { style: 'dashed' });
});

/* ---------- Calendar ---------- */

const calendarMonth = recipe('calendar-month', 'Monthly calendar', (c) => {
  const { w, h, u, t, c: k, rng } = c;
  bgc(c, t.bg);
  const mi = rng.int(12);
  const pw = w * 0.36;
  P(c, 0, 0, pw, h);
  R(c, 0, h - u * 26, pw, u * 26, rgba(t.primary, 0.85));
  const mo = T(c, MONTHS[mi], u * 5, h - u * 22, pw - u * 10, u * 8, { role: 'h', color: on(c, t.primary), maxLines: 1 });
  T(c, `${k.year}  ·  ${k.brand}`, u * 5, mo.y + mo.h + u, pw - u * 10, u * 2.2, { role: 'l', color: on(c, t.primary) });
  const x0 = pw + u * 5;
  const gw = w - x0 - u * 5;
  const top = u * 9;
  const cw = gw / 7;
  const fg = ink(c, t.bg);
  DAYS.forEach((d, i) => T(c, d.slice(0, 3), x0 + i * cw, top, cw, u * 2, { role: 'l', color: t.primary, align: 'center' }));
  const start = new Date(k.year, mi, 1).getDay(); // 0 = Sunday
  const offset = (start + 6) % 7;
  const days = new Date(k.year, mi + 1, 0).getDate();
  const rows = Math.ceil((offset + days) / 7);
  const gy = top + u * 5;
  const rh = (h - gy - u * 6) / rows;
  for (let r = 0; r <= rows; r++) L(c, x0, gy + r * rh, x0 + gw, gy + r * rh, mix(fg, t.bg, 0.85), 1);
  for (let d = 1; d <= days; d++) {
    const i = offset + d - 1;
    const cx = x0 + (i % 7) * cw;
    const cy = gy + Math.floor(i / 7) * rh;
    const wk = i % 7 >= 5;
    T(c, String(d), cx + u, cy + u, cw - u * 2, u * 2.6, { role: 'h', color: wk ? t.primary : fg, upper: false, weight: 600 });
  }
});

/* ---------- Labels, stickers, merch ---------- */

const badgeCircle = recipe('badge-circle', 'Round badge', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.bg);
  const s = Math.min(w, h) * 0.9;
  const x = (w - s) / 2;
  const y = (h - s) / 2;
  R(c, x, y, s, s, t.primary, { shape: 'circle' });
  R(c, x + s * 0.05, y + s * 0.05, s * 0.9, s * 0.9, NONE, { shape: 'circle', stroke: { color: on(c, t.primary), width: u * 0.5, style: 'dashed' } });
  const fg = on(c, t.primary);
  const items = [
    T(c, k.topic.label, x + s * 0.15, 0, s * 0.7, u * 4.5, { role: 'l', color: mix(fg, t.primary, 0.2), align: 'center', maxLines: 1 }),
    T(c, k.brand, x + s * 0.12, 0, s * 0.76, u * 11, { role: 'h', color: fg, align: 'center', maxLines: 2 }),
    T(c, `Est. ${k.year - 10}`, x + s * 0.15, 0, s * 0.7, u * 4, { role: 'l', color: acc(c, t.primary), align: 'center' }),
  ];
  col(items, 0, u * 2);
  centerV(items, y, s);
});

const badgeRect = recipe('badge-rect', 'Product label', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.surface === '#ffffff' ? t.bg : t.surface);
  const p = u * 6;
  R(c, p, p, w - p * 2, h - p * 2, NONE, { radius: rad(c, u * 6), stroke: { color: t.primary, width: u * 0.8 } });
  const fg = ink(c, t.bg);
  const items = [
    T(c, k.brand, p * 2, 0, w - p * 4, u * 4, { role: 'l', color: t.primary, align: 'center' }),
    T(c, k.items[0], p * 2, 0, w - p * 4, u * 12, { role: 'h', color: fg, align: 'center', maxLines: 2 }),
    L(c, w / 2 - u * 10, 0, w / 2 + u * 10, 0, t.accent, u * 0.6),
    T(c, k.tagline, p * 2, 0, w - p * 4, u * 4, { color: inkSoft(c, t.bg), align: 'center', maxLines: 2 }),
  ];
  items[2].h = u * 0.6;
  col(items, 0, u * 4);
  centerV(items, p, h - p * 2);
});

const tshirt = recipe('tshirt-graphic', 'T-shirt graphic', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.bg);
  const s = w * 0.7;
  R(c, (w - s) / 2, h * 0.18, s, s, t.primary, { shape: c.rng.pick(['circle', 'hexagon', 'arch'] as const) });
  const fg = on(c, t.primary);
  const items = [
    T(c, k.headline, (w - s) / 2 + s * 0.08, 0, s * 0.84, u * 16, { role: 'h', color: fg, align: 'center', maxLines: 3, lh: 1 }),
    T(c, `${k.brand}  ·  ${k.year}`, (w - s) / 2, 0, s, u * 4, { role: 'l', color: acc(c, t.primary), align: 'center' }),
  ];
  col(items, 0, u * 3);
  centerV(items, h * 0.18, s);
});

const mugWrap = recipe('mug-wrap', 'Mug wrap', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.bg);
  deco(c, t.deco, t.bg, 0.7);
  const fg = ink(c, t.bg);
  [0.25, 0.75].forEach((cx) => {
    const items = [
      T(c, k.headline, w * cx - w * 0.2, 0, w * 0.4, u * 14, { role: t.script ? 's' : 'h', color: t.primary, align: 'center', maxLines: 2, upper: t.script ? false : undefined }),
      T(c, k.brand, w * cx - w * 0.2, 0, w * 0.4, u * 5, { role: 'l', color: fg, align: 'center' }),
    ];
    col(items, 0, u * 3);
    centerV(items, u * 8, h - u * 16);
  });
});

const letterhead = recipe('letterhead', 'Letterhead', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, '#ffffff');
  const m = u * 9;
  R(c, 0, 0, w, u * 2, t.primary);
  const s = u * 9;
  mark(c, m, u * 7, s, t.primary, 'rounded');
  const br = T(c, k.brand, m + s + u * 3, u * 7, w * 0.5, u * 3.8, { role: 'h', color: '#1f1f1f', maxLines: 1 });
  T(c, k.tagline, m + s + u * 3, br.y + br.h + u * 0.5, w * 0.5, u * 1.8, { color: '#666670', maxLines: 1 });
  T(c, `${CONTACT.phone}\n${CONTACT.email}\n${CONTACT.web}`, w - m - w * 0.3, u * 7, w * 0.3, u * 1.7, { color: '#666670', align: 'right', lh: 1.6 });
  L(c, m, u * 21, w - m, u * 21, mix(t.primary, '#ffffff', 0.5), 1);
  const items = [
    T(c, k.date, m, 0, w - m * 2, u * 1.9, { color: '#666670' }),
    T(c, `Dear ${k.people[1]},`, m, 0, w - m * 2, u * 2.1, { color: '#1f1f1f' }),
    T(c, `${k.body}\n\n${k.body2}\n\nThank you for your time and consideration. We look forward to working together and are happy to answer any questions you may have.`, m, 0, w - m * 2, u * 2.1, { color: '#3a3a40', lh: 1.7 }),
    T(c, `Sincerely,\n\n${k.people[0]}\n${k.roles[0]}, ${k.brand}`, m, 0, w - m * 2, u * 2.1, { color: '#1f1f1f', lh: 1.5 }),
  ];
  col(items, u * 28, u * 4);
  R(c, 0, h - u * 8, w, u * 8, mix(t.primary, '#ffffff', 0.9));
  const f = T(c, CONTACT.address, m, 0, w - m * 2, u * 1.7, { role: 'l', color: t.primary, align: 'center' });
  f.y = h - u * 4 - f.h / 2;
});

export const PRINT_C: Recipe[] = [inviteClassic, invitePhoto, cardInside, brochureOutside, brochureInside, calendarMonth, badgeCircle, badgeRect, tshirt, mugWrap, letterhead];
