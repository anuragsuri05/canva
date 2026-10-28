// More presentation slides: quote, team, timeline, cards, gallery.
import { BS, F, HS, L, P, R, T, centerV, col, ink, inkSoft, on, rad, recipe, type Ctx, type Recipe } from '../kit';
import { chrome } from './slides';
import { mix } from '../rng';

const bgc = (c: Ctx, color: string) => (c.bg = { kind: 'solid', color });

const quote = recipe('slide-quote', 'Quote slide', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  const withPhoto = c.land && rng.chance(0.5);
  const bg = t.surface === '#ffffff' && !t.dark ? mix(t.bg, t.primary, 0.06) : t.surface;
  bgc(c, bg);
  const fg = ink(c, bg);
  if (withPhoto) F(c, 'circle', w - m - h * 0.5, (h - h * 0.5) / 2, h * 0.5, h * 0.5);
  const tw = withPhoto ? w - h * 0.5 - m * 3 : w - m * 4;
  const x = withPhoto ? m : m * 2;
  const al = withPhoto ? 'left' : 'center';
  const mark = T(c, '“', x, 0, tw, HS(c) * 1.8, { role: 'h', color: t.primary, align: al, lh: 0.8, upper: false });
  mark.h *= 0.5;
  const items = [
    mark,
    T(c, k.quote[0], x, 0, tw, HS(c) * 0.55, { role: 'h', color: fg, align: al, maxLines: 4, lh: 1.25, upper: false }),
    T(c, '— ' + k.quote[1], x, 0, tw, BS(c), { role: 'l', color: inkSoft(c, bg), align: al }),
  ];
  col(items, 0, u * 3);
  centerV(items, m, h - m * 2);
});

const team = recipe('slide-team', 'Team', (c) => {
  const { w, h, m, u, t, c: k } = c;
  bgc(c, t.bg);
  chrome(c, t.bg);
  const fg = ink(c, t.bg);
  c.notes = 'Introduce the team members and their roles.';
  const head = T(c, 'Meet Our Team', m, m * 1.3, w - m * 2, HS(c) * 0.75, { role: 'h', color: fg, align: 'center', maxLines: 1 });
  const n = c.land ? 4 : 2;
  const rows = c.land ? 1 : 2;
  const gap = u * 4;
  const cw = (w - m * 2 - gap * (n - 1)) / n;
  const top = head.y + head.h + u * 6;
  const avail = h - top - m * 1.4;
  const ph = Math.min(cw, (avail / rows) * 0.62);
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < n; i++) {
      const idx = r * n + i;
      const x = m + i * (cw + gap);
      const y = top + r * (avail / rows);
      F(c, 'circle', x + (cw - ph) / 2, y, ph, ph, { color: t.primary, width: u * 0.4 });
      const nm = T(c, k.people[idx], x, y + ph + u * 2, cw, BS(c) * 1.05, { role: 'h', color: fg, align: 'center', upper: false, weight: 700, maxLines: 1 });
      T(c, k.roles[idx % k.roles.length], x, nm.y + nm.h + u * 0.6, cw, BS(c) * 0.75, { color: inkSoft(c, t.bg), align: 'center', maxLines: 2 });
    }
  }
});

const timeline = recipe('slide-timeline', 'Timeline', (c) => {
  const { w, h, m, u, t, c: k } = c;
  bgc(c, t.bg);
  chrome(c, t.bg);
  const fg = ink(c, t.bg);
  c.notes = 'Walk through the milestones in order.';
  const head = T(c, 'Project Timeline', m, m * 1.3, w - m * 2, HS(c) * 0.75, { role: 'h', color: fg, maxLines: 1 });
  const steps = k.sections.slice(0, 4);
  const months = ['Jan', 'Mar', 'Jun', 'Sep', 'Dec'];
  if (c.land) {
    const y = head.y + head.h + (h - head.y - head.h) * 0.38;
    L(c, m, y, w - m, y, mix(t.primary, t.bg, 0.4), Math.max(2, u * 0.5));
    const sw = (w - m * 2) / steps.length;
    steps.forEach((s, i) => {
      const x = m + i * sw;
      R(c, x, y - u * 2, u * 4, u * 4, i === 0 ? t.accent : t.primary, { shape: 'circle' });
      const mo = T(c, `${months[i]} ${k.year}`, x, 0, sw - u * 4, BS(c) * 0.8, { role: 'l', color: t.primary });
      mo.y = y - u * 5 - mo.h;
      const st = T(c, s, x, y + u * 5, sw - u * 4, BS(c) * 1.2, { role: 'h', color: fg, upper: false, weight: 700, maxLines: 2 });
      T(c, k.items[i], x, st.y + st.h + u, sw - u * 4, BS(c) * 0.85, { color: inkSoft(c, t.bg), maxLines: 3 });
    });
    return;
  }
  const top = head.y + head.h + u * 8;
  const sh = (h - top - m * 1.5) / steps.length;
  L(c, m + u * 2, top, m + u * 2, top + sh * (steps.length - 0.5), mix(t.primary, t.bg, 0.4), Math.max(2, u * 0.5));
  steps.forEach((s, i) => {
    const y = top + i * sh;
    R(c, m, y, u * 4, u * 4, t.primary, { shape: 'circle' });
    const mo = T(c, `${months[i]} ${k.year}`, m + u * 8, y - u * 0.5, w - m * 2 - u * 8, BS(c) * 0.8, { role: 'l', color: t.primary });
    const st = T(c, s, m + u * 8, mo.y + mo.h + u, w - m * 2 - u * 8, BS(c) * 1.3, { role: 'h', color: fg, upper: false, maxLines: 1 });
    T(c, k.items[i], m + u * 8, st.y + st.h + u, w - m * 2 - u * 8, BS(c) * 0.9, { color: inkSoft(c, t.bg), maxLines: 2 });
  });
});

const threeCards = recipe('slide-three-cards', 'Three columns', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  bgc(c, t.bg);
  chrome(c, t.bg);
  const fg = ink(c, t.bg);
  const head = T(c, k.sections[2] ?? 'Our Approach', m, m * 1.3, w - m * 2, HS(c) * 0.75, { role: 'h', color: fg, align: 'center', maxLines: 1 });
  const sub = T(c, k.tagline, m * 2, head.y + head.h + u * 1.5, w - m * 4, BS(c), { color: inkSoft(c, t.bg), align: 'center', maxLines: 2 });
  const n = 3;
  const gap = u * 3;
  const top = sub.y + sub.h + u * 5;
  const photos = rng.chance(0.5);
  for (let i = 0; i < n; i++) {
    const cw = c.land ? (w - m * 2 - gap * (n - 1)) / n : w - m * 2;
    const ch = c.land ? h - top - m * 1.3 : (h - top - m * 1.3 - gap * (n - 1)) / n;
    const x = c.land ? m + i * (cw + gap) : m;
    const y = c.land ? top : top + i * (ch + gap);
    const fill = t.surface === t.bg ? mix(t.bg, t.primary, 0.07) : t.surface;
    R(c, x, y, cw, ch, fill, { radius: rad(c, u * 3) });
    let iy = y + u * 3;
    if (photos && c.land) {
      P(c, x, y, cw, ch * 0.45, { radius: rad(c, u * 3) });
      iy = y + ch * 0.45 + u * 3;
    } else {
      R(c, x + u * 3, iy, u * 7, u * 7, i === 1 ? t.accent : t.primary, { shape: 'circle' });
      T(c, String(i + 1), x + u * 3, iy + u * 1.3, u * 7, u * 3.4, { role: 'h', color: on(c, i === 1 ? t.accent : t.primary), align: 'center', upper: false });
      iy += u * 10;
    }
    const tt = T(c, k.items[i], x + u * 3, iy, cw - u * 6, BS(c) * 1.2, { role: 'h', color: fg, upper: false, weight: 700, maxLines: 2 });
    T(c, k.body.split('. ')[0] + '.', x + u * 3, tt.y + tt.h + u * 1.2, cw - u * 6, BS(c) * 0.85, { color: inkSoft(c, fill), maxLines: 4 });
  }
});

const gallery = recipe('slide-gallery', 'Gallery', (c) => {
  const { w, h, m, u, t, c: k } = c;
  bgc(c, t.bg);
  const fg = ink(c, t.bg);
  const head = T(c, k.headline2, m, m, w - m * 2, HS(c) * 0.7, { role: 'h', color: fg, maxLines: 1, align: c.land ? 'left' : 'center' });
  const top = head.y + head.h + u * 4;
  const gap = u * 1.5;
  const gh = h - top - m;
  if (c.land) {
    const bw = (w - m * 2) * 0.5;
    P(c, m, top, bw, gh, { radius: rad(c, u * 2) });
    const sw = (w - m * 2 - bw - gap * 2) / 2;
    const sh = (gh - gap) / 2;
    for (let i = 0; i < 4; i++) P(c, m + bw + gap + (i % 2) * (sw + gap), top + Math.floor(i / 2) * (sh + gap), sw, sh, { radius: rad(c, u * 2) });
  } else {
    const sh = (gh - gap * 2) / 3;
    for (let i = 0; i < 3; i++) P(c, m, top + i * (sh + gap), w - m * 2, sh, { radius: rad(c, u * 2) });
  }
});

export const SLIDES_B: Recipe[] = [quote, team, timeline, threeCards, gallery];
