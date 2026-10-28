// Emails, docs and infographics (tall formats).
import { makeChart } from '../../model/defaults';
import type { ImageEl } from '../../model/types';
import { acc, B, BS, F, L, P, R, T, col, coverCrop, ink, inkSoft, on, rad, recipe, type Ctx, type Recipe } from '../kit';
import { deco } from '../deco';
import { CONTACT } from '../content';
import { mix } from '../rng';
import { mark } from './print';

const bgc = (c: Ctx, color: string) => (c.bg = { kind: 'solid', color });

function emailFooter(c: Ctx, y: number) {
  const { w, h, u, t, c: k } = c;
  R(c, 0, y, w, h - y, t.dark ? t.surface : mix(t.primary, '#000000', 0.25));
  const fg = '#ffffff';
  const items = [
    T(c, k.brand, u * 6, 0, w - u * 12, u * 3.6, { role: 'h', color: fg, align: 'center' }),
    T(c, `${CONTACT.address}\n${CONTACT.email}`, u * 6, 0, w - u * 12, u * 2.2, { color: 'rgba(255,255,255,0.75)', align: 'center', lh: 1.6 }),
    T(c, 'Unsubscribe  ·  View in browser', u * 6, 0, w - u * 12, u * 2, { color: 'rgba(255,255,255,0.6)', align: 'center' }),
  ];
  col(items, y + u * 6, u * 2);
}

const newsletter = recipe('email-newsletter', 'Newsletter', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.bg);
  const p = u * 6;
  const fg = ink(c, t.bg);
  T(c, k.brand, p, u * 5, w - p * 2, u * 3.4, { role: 'h', color: t.primary, align: 'center' });
  L(c, p, u * 12, w - p, u * 12, mix(fg, t.bg, 0.85), 1);
  P(c, 0, u * 15, w, u * 52);
  let y = u * 72;
  const items = [
    T(c, `Newsletter · ${k.date.split(' ')[0]} ${k.year}`, p, 0, w - p * 2, BS(c) * 0.8, { role: 'l', color: t.primary }),
    T(c, k.headline, p, 0, w - p * 2, u * 7, { role: 'h', color: fg, maxLines: 2 }),
    T(c, k.body, p, 0, w - p * 2, BS(c), { color: inkSoft(c, t.bg), maxLines: 4 }),
    B(c, k.cta, p, 0, BS(c) * 0.85),
  ];
  y = col(items, y, u * 2.6) + u * 8;
  const cw = (w - p * 2 - u * 4) / 2;
  for (let i = 0; i < 2; i++) {
    const x = p + i * (cw + u * 4);
    P(c, x, y, cw, cw * 0.75, { radius: rad(c, u * 2) });
    const tt = T(c, k.items[i], x, y + cw * 0.75 + u * 2.5, cw, BS(c) * 1.1, { role: 'h', color: fg, upper: false, weight: 700, maxLines: 2 });
    T(c, k.body2.split('. ')[0] + '.', x, tt.y + tt.h + u, cw, BS(c) * 0.8, { color: inkSoft(c, t.bg), maxLines: 4 });
  }
  y += cw * 0.75 + u * 26;
  R(c, p, y, w - p * 2, u * 30, t.surface === t.bg ? mix(t.bg, t.primary, 0.08) : t.surface, { radius: rad(c, u * 3) });
  const q = T(c, `“${k.quote[0]}”`, p + u * 4, y + u * 5, w - p * 2 - u * 8, BS(c) * 1.05, { role: 'h', color: fg, align: 'center', upper: false, maxLines: 4 });
  T(c, k.quote[1], p, q.y + q.h + u * 2, w - p * 2, BS(c) * 0.75, { role: 'l', color: t.primary, align: 'center' });
  emailFooter(c, Math.max(y + u * 36, h - u * 26));
});

const promo = recipe('email-promo', 'Promo email', (c) => {
  const { w, h, u, t, c: k } = c;
  const bg = t.primary;
  bgc(c, t.bg);
  R(c, 0, 0, w, u * 80, bg);
  deco(c, t.deco === 'grid' ? 'circles' : t.deco, bg, 0.3);
  const fg = on(c, bg);
  const items = [
    T(c, k.brand, u * 6, 0, w - u * 12, BS(c) * 0.85, { role: 'l', color: mix(fg, bg, 0.2), align: 'center' }),
    T(c, k.offer, u * 6, 0, w - u * 12, u * 11, { role: 'h', color: fg, align: 'center', maxLines: 3, lh: 1.02 }),
    T(c, k.tagline, u * 8, 0, w - u * 16, BS(c) * 1.1, { color: mix(fg, bg, 0.15), align: 'center', maxLines: 2 }),
    B(c, k.cta, w / 2, 0, BS(c) * 0.95, { fill: acc(c, bg), align: 'center' }),
  ];
  col(items, u * 12, u * 3);
  const g = u * 6;
  const top = u * 88;
  const cw = (w - g * 3) / 2;
  const fg2 = ink(c, t.bg);
  for (let i = 0; i < 4; i++) {
    const x = g + (i % 2) * (cw + g);
    const y = top + Math.floor(i / 2) * (cw + u * 20);
    F(c, 'rounded', x, y, cw, cw * 0.95);
    const n = T(c, k.items[i], x, y + cw * 0.95 + u * 2, cw, BS(c) * 1.05, { role: 'h', color: fg2, align: 'center', upper: false, weight: 700, maxLines: 1 });
    T(c, `$${29 + i * 10}`, x, n.y + n.h + u * 0.5, cw, BS(c) * 0.95, { role: 'l', color: t.primary, align: 'center' });
  }
  emailFooter(c, h - u * 26);
});

const docCover = recipe('doc-cover', 'Doc cover', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.dark ? t.bg : t.primary);
  const bg = (c.bg as { color: string }).color;
  P(c, 0, h * 0.5, w, h * 0.5);
  const fg = on(c, bg);
  const m = u * 10;
  mark(c, m, m, u * 10, acc(c, bg), 'rounded');
  const items = [
    T(c, `${k.brand} · ${k.year}`, m, 0, w - m * 2, u * 2.3, { role: 'l', color: mix(fg, bg, 0.25) }),
    T(c, k.headline, m, 0, w - m * 2, u * 9, { role: 'h', color: fg, maxLines: 3 }),
    T(c, k.tagline, m, 0, w * 0.7, u * 2.8, { color: mix(fg, bg, 0.2), maxLines: 2 }),
  ];
  col(items, h * 0.22, u * 3);
});

const docPage = recipe('doc-page', 'Doc page', (c) => {
  const { w, u, t, c: k } = c;
  bgc(c, '#ffffff');
  const m = u * 11;
  const fg = '#1f1f24';
  const soft = '#55555f';
  const acc = t.dark ? t.accent : t.primary;
  const items = [
    T(c, k.sections[0], m, 0, w - m * 2, u * 2.1, { role: 'l', color: acc }),
    T(c, k.headline, m, 0, w - m * 2, u * 5.5, { role: 'h', color: fg, maxLines: 2 }),
    T(c, `Prepared by ${k.people[0]} · ${k.date}`, m, 0, w - m * 2, u * 1.8, { color: soft }),
    L(c, m, 0, w - m, 0, mix(acc, '#ffffff', 0.6), 1),
    T(c, 'Overview', m, 0, w - m * 2, u * 3, { role: 'h', color: fg, upper: false }),
    T(c, `${k.body} ${k.body2}`, m, 0, w - m * 2, u * 2, { color: soft, lh: 1.7 }),
    T(c, 'Key points', m, 0, w - m * 2, u * 3, { role: 'h', color: fg, upper: false }),
    T(c, k.items.slice(0, 4).join('\n'), m, 0, w - m * 2, u * 2, { color: soft, list: 'bullet', lh: 1.8 }),
    P(c, m, 0, w - m * 2, u * 30, { radius: rad(c, u * 2) }),
    T(c, 'Next steps', m, 0, w - m * 2, u * 3, { role: 'h', color: fg, upper: false }),
    T(c, `${k.body2} Please share feedback with the team by the end of the month.`, m, 0, w - m * 2, u * 2, { color: soft, lh: 1.7 }),
  ];
  const gaps = [u * 1.5, u * 1.5, u * 3, u * 3, u * 1.5, u * 3, u * 1.5, u * 3, u * 3, u * 1.5, 0];
  const end = col(items, u * 11, gaps);
  const over = end - (c.h - u * 8);
  if (over > 0) {
    items[8].h = Math.max(u * 6, items[8].h - over);
    coverCrop(items[8] as ImageEl);
    col(items, u * 11, gaps);
  }
});

const docReport = recipe('doc-report', 'Report page', (c) => {
  const { w, h, u, t, c: k, rng } = c;
  bgc(c, '#ffffff');
  const m = u * 11;
  const fg = '#1f1f24';
  const soft = '#55555f';
  R(c, 0, 0, w, u * 2, t.primary);
  const head = T(c, k.sections[3] ?? 'Results', m, u * 10, w - m * 2, u * 5, { role: 'h', color: fg, maxLines: 1 });
  const intro = T(c, k.body, m, head.y + head.h + u * 2, w - m * 2, u * 2, { color: soft, lh: 1.7, maxLines: 4 });
  const sy = intro.y + intro.h + u * 4;
  const cw = (w - m * 2 - u * 6) / 3;
  k.stats.slice(0, 3).forEach(([v, l], i) => {
    const x = m + i * (cw + u * 3);
    R(c, x, sy, cw, u * 16, i === 0 ? t.primary : mix(t.primary, '#ffffff', 0.9), { radius: rad(c, u * 2) });
    T(c, v, x + u * 2.5, sy + u * 3, cw - u * 5, u * 5, { role: 'h', color: i === 0 ? on(c, t.primary) : t.primary, upper: false, maxLines: 1 });
    T(c, l, x + u * 2.5, sy + u * 10, cw - u * 5, u * 1.8, { color: i === 0 ? on(c, t.primary) : soft, maxLines: 1 });
  });
  const ch = makeChart(rng.pick(['column', 'line', 'area'] as const), m, sy + u * 22, w - m * 2, u * 34);
  ch.labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  ch.series = [{ name: String(k.year), values: [12, 15, 14, 19, 23, 27].map((x) => x + rng.int(5)), color: t.primary }];
  ch.options = { ...ch.options, legend: false, fontFamily: t.body.family, fontSize: Math.round(u * 1.6), textColor: soft, gridColor: '#e7e7ee', rounding: 4 };
  c.els.push(ch);
  const tx = T(c, `${k.body2} ${k.body}`, m, sy + u * 60, w - m * 2, u * 2, { color: soft, lh: 1.7, maxLines: 4 });
  const kt = T(c, 'Key takeaways', m, tx.y + tx.h + u * 4, w - m * 2, u * 3, { role: 'h', color: fg, upper: false });
  const kl = T(c, k.items.slice(0, 3).map((x) => `${x}: steady progress this quarter`).join('\n'), m, kt.y + kt.h + u * 1.5, w - m * 2, u * 2, { color: soft, list: 'bullet', lh: 1.8 });
  if (kl.y + kl.h > h - u * 9) c.els.splice(c.els.indexOf(kt), 2);
  T(c, `${c.page + 1}`, m, h - u * 7, w - m * 2, u * 1.7, { color: soft, align: 'right' });
});

function infoHeader(c: Ctx) {
  const { w, u, t, c: k } = c;
  const bg = t.primary;
  R(c, 0, 0, w, u * 70, bg);
  const fg = on(c, bg);
  const items = [
    T(c, k.brand, u * 8, 0, w - u * 16, u * 3, { role: 'l', color: mix(fg, bg, 0.25), align: 'center' }),
    T(c, k.headline, u * 8, 0, w - u * 16, u * 10, { role: 'h', color: fg, align: 'center', maxLines: 2 }),
    T(c, k.tagline, u * 10, 0, w - u * 20, u * 3.4, { color: mix(fg, bg, 0.15), align: 'center', maxLines: 2 }),
  ];
  col(items, u * 14, u * 3);
  return u * 80;
}

const infoSteps = recipe('info-steps', 'Steps infographic', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.bg);
  let y = infoHeader(c);
  const fg = ink(c, t.bg);
  const n = 5;
  const sh = (h - y - u * 40) / n;
  L(c, u * 18, y + u * 6, u * 18, y + sh * (n - 1) + u * 6, mix(t.primary, t.bg, 0.5), u * 0.6, { style: 'dashed' });
  for (let i = 0; i < n; i++) {
    const cy = y + i * sh;
    R(c, u * 10, cy, u * 16, u * 16, i % 2 ? t.accent : t.primary, { shape: 'circle' });
    T(c, String(i + 1), u * 10, cy + u * 3.5, u * 16, u * 7, { role: 'h', color: on(c, i % 2 ? t.accent : t.primary), align: 'center', upper: false });
    const tt = T(c, k.items[i] ?? k.sections[i], u * 32, cy + u * 1, w - u * 40, u * 4.4, { role: 'h', color: fg, upper: false, maxLines: 1 });
    T(c, i % 2 ? k.body2 : k.body, u * 32, tt.y + tt.h + u * 1.2, w - u * 40, u * 2.8, { color: inkSoft(c, t.bg), maxLines: 3 });
  }
  y = h - u * 30;
  R(c, u * 8, y, w - u * 16, u * 22, t.surface === t.bg ? mix(t.bg, t.primary, 0.08) : t.surface, { radius: rad(c, u * 3) });
  T(c, `${k.cta} · reallygreatsite.com`, u * 12, y + u * 8, w - u * 24, u * 3.4, { role: 'l', color: t.primary, align: 'center' });
});

const infoStats = recipe('info-stats', 'Stats infographic', (c) => {
  const { w, h, u, t, c: k, rng } = c;
  bgc(c, t.bg);
  let y = infoHeader(c);
  const fg = ink(c, t.bg);
  const cw = (w - u * 24) / 2;
  k.stats.slice(0, 4).forEach(([v, l], i) => {
    const x = u * 8 + (i % 2) * (cw + u * 8);
    const yy = y + Math.floor(i / 2) * u * 36;
    R(c, x, yy, cw, u * 30, t.surface === t.bg ? mix(t.bg, t.primary, 0.08) : t.surface, { radius: rad(c, u * 3) });
    T(c, v, x, yy + u * 6, cw, u * 10, { role: 'h', color: t.primary, align: 'center', upper: false, maxLines: 1 });
    T(c, l, x + u * 3, yy + u * 19, cw - u * 6, u * 3, { color: inkSoft(c, t.bg), align: 'center', maxLines: 2 });
  });
  y += u * 75;
  T(c, 'By the numbers', u * 8, y, w - u * 16, u * 5, { role: 'h', color: fg, upper: false });
  const ch = makeChart(rng.pick(['donut', 'pie', 'bar'] as const), u * 8, y + u * 10, w - u * 16, u * 56);
  ch.labels = k.items.slice(0, 4);
  ch.series = [{ name: 'Share', values: [40, 25, 20, 15], color: t.primary }];
  ch.options = { ...ch.options, fontFamily: t.body.family, fontSize: Math.round(u * 2.4), textColor: inkSoft(c, t.bg), gridColor: mix(fg, t.bg, 0.88) };
  c.els.push(ch);
  T(c, k.body, u * 8, h - u * 22, w - u * 16, u * 3, { color: inkSoft(c, t.bg), align: 'center', maxLines: 3 });
});

export const WEB_B: Recipe[] = [newsletter, promo, docCover, docPage, docReport, infoSteps, infoStats];
