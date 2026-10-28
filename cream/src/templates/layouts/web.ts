// Website sections (1366 × 768, one page per section).
import { acc, B, BS, F, HS, P, R, T, centerV, col, grad, ink, inkSoft, on, rad, recipe, type Ctx, type Recipe } from '../kit';
import { deco } from '../deco';
import { CONTACT } from '../content';
import { mix } from '../rng';

const bgc = (c: Ctx, color: string) => (c.bg = { kind: 'solid', color });

function nav(c: Ctx, fg: string) {
  const { w, m, u, c: k } = c;
  T(c, k.brand, m, u * 4, w * 0.3, BS(c) * 1.1, { role: 'h', color: fg, maxLines: 1 });
  const btn = B(c, k.cta, w - m, u * 3, BS(c) * 0.7, { align: 'right', fill: c.t.accent === c.t.bg ? c.t.primary : c.t.accent });
  const links = ['Home', 'About', 'Services', 'Contact'];
  links.forEach((l, i) => T(c, l, btn.x - u * 3 - (links.length - i) * u * 13, btn.y + (btn.h - BS(c) * 0.8 * 1.45) / 2, u * 13, BS(c) * 0.8, { color: fg, align: 'center' }));
}

const hero = recipe('web-hero', 'Website hero', (c) => {
  const { w, h, m, u, t, c: k, rng } = c;
  c.notes = 'Hero section';
  if (rng.chance(0.5)) {
    P(c, 0, 0, w, h);
    R(c, 0, 0, w, h, grad('rgba(0,0,0,0.65)', 'rgba(0,0,0,0.15)', 90));
    nav(c, '#ffffff');
    const items = [
      T(c, k.headline, m, 0, w * 0.55, HS(c) * 1.1, { role: 'h', color: '#ffffff', maxLines: 2 }),
      T(c, k.tagline, m, 0, w * 0.45, BS(c) * 1.3, { color: 'rgba(255,255,255,0.88)', maxLines: 2 }),
      B(c, k.cta, m, 0, BS(c) * 0.95, { fill: t.accent === '#ffffff' ? t.primary : t.accent }),
    ];
    col(items, 0, u * 3.5);
    centerV(items, u * 14, h - u * 20);
    return;
  }
  bgc(c, t.bg);
  deco(c, t.deco, t.bg, 0.5);
  const fg = ink(c, t.bg);
  nav(c, fg);
  F(c, rng.pick(['arch', 'rounded', 'blob'] as const), w * 0.55, u * 16, w * 0.45 - m, h - u * 22);
  const items = [
    T(c, k.brand, m, 0, w * 0.45, BS(c) * 0.85, { role: 'l', color: t.primary }),
    T(c, k.headline, m, 0, w * 0.45, HS(c) * 1.05, { role: 'h', color: fg, maxLines: 3 }),
    T(c, k.body, m, 0, w * 0.4, BS(c) * 1.05, { color: inkSoft(c, t.bg), maxLines: 3 }),
    B(c, k.cta, m, 0, BS(c) * 0.95),
  ];
  col(items, 0, u * 3);
  centerV(items, u * 14, h - u * 20);
});

const features = recipe('web-features', 'Features section', (c) => {
  const { w, h, m, u, t, c: k } = c;
  c.notes = 'Features section';
  bgc(c, t.surface === '#ffffff' && !t.dark ? mix(t.bg, t.primary, 0.04) : t.surface);
  const bg = (c.bg as { color: string }).color;
  const fg = ink(c, bg);
  const head = T(c, 'What We Offer', m, u * 9, w - m * 2, HS(c) * 0.8, { role: 'h', color: fg, align: 'center', maxLines: 1 });
  T(c, k.tagline, m, head.y + head.h + u * 1.5, w - m * 2, BS(c), { color: inkSoft(c, bg), align: 'center' });
  const n = 3;
  const gap = u * 4;
  const cw = (w - m * 2 - gap * (n - 1)) / n;
  const top = head.y + head.h + u * 12;
  for (let i = 0; i < n; i++) {
    const x = m + i * (cw + gap);
    const chh = h - top - u * 8;
    R(c, x, top, cw, chh, t.dark ? mix(bg, '#ffffff', 0.06) : '#ffffff', { radius: rad(c, u * 3) });
    P(c, x + u * 3, top + u * 3, cw - u * 6, chh * 0.45, { radius: rad(c, u * 2) });
    const tt = T(c, k.items[i], x + u * 3, top + u * 6 + chh * 0.45, cw - u * 6, BS(c) * 1.2, { role: 'h', color: t.dark ? '#ffffff' : '#1f1f1f', upper: false, weight: 700, maxLines: 1 });
    T(c, k.body.split('. ')[0] + '.', x + u * 3, tt.y + tt.h + u * 1.5, cw - u * 6, BS(c) * 0.85, { color: t.dark ? '#c9c9d4' : '#5c5c66', maxLines: 3 });
  }
});

const gallery = recipe('web-gallery', 'Gallery section', (c) => {
  const { w, h, m, u, t, c: k } = c;
  c.notes = 'Gallery section';
  bgc(c, t.bg);
  const fg = ink(c, t.bg);
  const head = T(c, 'Our Work', m, u * 8, w * 0.4, HS(c) * 0.8, { role: 'h', color: fg, maxLines: 1 });
  T(c, k.body, w * 0.5, u * 8, w * 0.5 - m, BS(c) * 0.95, { color: inkSoft(c, t.bg), maxLines: 3 });
  const top = head.y + head.h + u * 6;
  const gap = u * 2;
  const gw = (w - m * 2 - gap * 3) / 4;
  const gh = h - top - u * 7;
  P(c, m, top, gw * 2 + gap, gh, { radius: rad(c, u * 2) });
  P(c, m + (gw + gap) * 2, top, gw, (gh - gap) / 2, { radius: rad(c, u * 2) });
  P(c, m + (gw + gap) * 2, top + (gh + gap) / 2, gw, (gh - gap) / 2, { radius: rad(c, u * 2) });
  P(c, m + (gw + gap) * 3, top, gw, gh, { radius: rad(c, u * 2) });
});

const testimonials = recipe('web-testimonials', 'Testimonials section', (c) => {
  const { w, h, m, u, t, c: k } = c;
  c.notes = 'Testimonials section';
  const bg = t.dark ? t.surface : t.primary;
  bgc(c, bg);
  const fg = on(c, bg);
  const head = T(c, 'What People Say', m, u * 9, w - m * 2, HS(c) * 0.8, { role: 'h', color: fg, align: 'center', maxLines: 1 });
  const gap = u * 4;
  const cw = (w - m * 2 - gap * 2) / 3;
  const top = head.y + head.h + u * 8;
  for (let i = 0; i < 3; i++) {
    const x = m + i * (cw + gap);
    const chh = h - top - u * 9;
    R(c, x, top, cw, chh, mix(bg, '#ffffff', t.dark ? 0.06 : 0.12), { radius: rad(c, u * 3) });
    const q = k.topic.quotes[i % k.topic.quotes.length][0];
    T(c, '★★★★★', x + u * 3, top + u * 3, cw - u * 6, BS(c), { color: acc(c, bg), ls: 150, upper: false });
    T(c, `“${q}”`, x + u * 3, top + u * 8, cw - u * 6, BS(c) * 0.95, { color: fg, maxLines: 5 });
    F(c, 'circle', x + u * 3, top + chh - u * 12, u * 8, u * 8);
    T(c, k.people[i + 1], x + u * 13, top + chh - u * 11, cw - u * 16, BS(c) * 0.9, { role: 'h', color: fg, upper: false, weight: 700 });
    T(c, k.roles[i], x + u * 13, top + chh - u * 7.5, cw - u * 16, BS(c) * 0.7, { color: mix(fg, bg, 0.3) });
  }
});

const contact = recipe('web-contact', 'Contact section', (c) => {
  const { w, h, m, u, t, c: k } = c;
  c.notes = 'Contact section';
  bgc(c, t.bg);
  const fg = ink(c, t.bg);
  P(c, w * 0.55, 0, w * 0.45, h);
  const items = [
    T(c, 'Get in Touch', m, 0, w * 0.42, HS(c) * 0.9, { role: 'h', color: fg, maxLines: 1 }),
    T(c, k.body2, m, 0, w * 0.4, BS(c), { color: inkSoft(c, t.bg), maxLines: 3 }),
    T(c, `${CONTACT.phone}\n${CONTACT.email}\n${CONTACT.address}`, m, 0, w * 0.4, BS(c) * 1.05, { color: fg, lh: 1.9 }),
    B(c, k.cta, m, 0, BS(c) * 0.9),
  ];
  col(items, 0, u * 4);
  centerV(items, m, h - m * 2);
  T(c, `© ${k.year} ${k.brand}. All rights reserved.`, m, h - u * 6, w * 0.4, BS(c) * 0.65, { color: inkSoft(c, t.bg) });
});

export const WEB: Recipe[] = [hero, features, gallery, testimonials, contact];
