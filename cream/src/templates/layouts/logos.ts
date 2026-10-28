// Logo layouts (500 × 500).
import { acc, NONE, R, T, centerV, col, ink, inkSoft, on, recipe, type Ctx, type Recipe } from '../kit';
import { initials } from './print';
import { mix } from '../rng';

const bgc = (c: Ctx, color: string) => (c.bg = { kind: 'solid', color });

const emblem = recipe('logo-emblem', 'Emblem logo', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.bg);
  const s = w * 0.78;
  const x = (w - s) / 2;
  const y = (h - s) / 2;
  R(c, x, y, s, s, t.primary, { shape: 'circle' });
  R(c, x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, NONE, { shape: 'circle', stroke: { color: on(c, t.primary), width: u * 0.5 } });
  const fg = on(c, t.primary);
  const items = [
    R(c, w / 2 - u * 5, 0, u * 10, u * 10, acc(c, t.primary), { shape: c.rng.pick(['star5', 'diamond', 'heart', 'cloud'] as const) }),
    T(c, k.brand, x + s * 0.14, 0, s * 0.72, u * 9, { role: 'h', color: fg, align: 'center', maxLines: 2, lh: 1.05 }),
    T(c, `Est. ${k.year - 12}`, x, 0, s, u * 3.2, { role: 'l', color: mix(fg, t.primary, 0.25), align: 'center' }),
  ];
  col(items, 0, u * 3);
  centerV(items, y, s);
});

const monogram = recipe('logo-monogram', 'Monogram logo', (c) => {
  const { w, h, u, t, c: k, rng } = c;
  bgc(c, t.bg);
  const s = w * 0.42;
  const shape = rng.pick(['hexagon', 'rounded', 'diamond', 'circle'] as const);
  const items = [
    R(c, (w - s) / 2, 0, s, s, t.primary, { shape, radius: shape === 'rounded' ? s * 0.24 : undefined }),
    T(c, k.brand, u * 8, 0, w - u * 16, u * 8, { role: 'h', color: ink(c, t.bg), align: 'center', maxLines: 2 }),
    T(c, k.tagline.split(' ').slice(0, 4).join(' '), u * 8, 0, w - u * 16, u * 3.2, { role: 'l', color: inkSoft(c, t.bg), align: 'center', maxLines: 1 }),
  ];
  col(items, 0, [u * 5, u * 1.5, 0]);
  centerV(items, 0, h);
  const ini = T(c, initials(k.brand), (w - s) / 2, 0, s, s * 0.42, { role: 'h', color: on(c, t.primary), align: 'center', upper: true, ls: 0, lh: 1 });
  ini.y = items[0].y + (s - ini.h) / 2;
});

const wordmark = recipe('logo-wordmark', 'Wordmark logo', (c) => {
  const { w, h, u, t, c: k } = c;
  const bg = c.rng.chance(0.5) ? t.primary : t.bg;
  bgc(c, bg);
  const fg = on(c, bg);
  const dot = acc(c, bg);
  const items = [
    T(c, k.brand, u * 8, 0, w - u * 16, u * 14, { role: 'h', color: bg === t.bg ? ink(c, bg) : fg, align: 'center', maxLines: 2, lh: 1 }),
    R(c, w / 2 - u * 12, 0, u * 24, u * 1, dot),
    T(c, k.topic.label, u * 8, 0, w - u * 16, u * 3.4, { role: 'l', color: mix(bg === t.bg ? ink(c, bg) : fg, bg, 0.3), align: 'center', ls: 400 }),
  ];
  col(items, 0, u * 4);
  centerV(items, 0, h);
});

const badge = recipe('logo-badge', 'Badge logo', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.bg);
  const s = w * 0.8;
  const x = (w - s) / 2;
  R(c, x, (h - s) / 2, s, s, t.secondary === t.bg ? mix(t.primary, t.bg, 0.6) : t.secondary, { shape: 'starburst' });
  R(c, x + s * 0.12, (h - s) / 2 + s * 0.12, s * 0.76, s * 0.76, t.primary, { shape: 'circle' });
  const fg = on(c, t.primary);
  const items = [
    T(c, '★ ★ ★', x, 0, s, u * 3.4, { color: acc(c, t.primary), align: 'center', upper: false }),
    T(c, k.brand, x + s * 0.2, 0, s * 0.6, u * 7.5, { role: 'h', color: fg, align: 'center', maxLines: 2, lh: 1.05 }),
    T(c, k.topic.label, x + s * 0.2, 0, s * 0.6, u * 2.8, { role: 'l', color: mix(fg, t.primary, 0.2), align: 'center', maxLines: 1 }),
  ];
  col(items, 0, u * 2);
  centerV(items, (h - s) / 2, s);
});

export const LOGOS: Recipe[] = [emblem, monogram, wordmark, badge];
