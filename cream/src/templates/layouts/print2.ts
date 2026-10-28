// Print layouts: resumes and menus.
import { F, L, P, R, T, ink, inkSoft, on, recipe, type Ctx, type Recipe } from '../kit';
import { deco } from '../deco';
import { CONTACT } from '../content';
import { mix } from '../rng';

const bgc = (c: Ctx, color: string) => (c.bg = { kind: 'solid', color });

const JOBS = [
  ['Senior Specialist', '2022 – Present', 'Led cross-functional projects, improved team processes and mentored new colleagues.'],
  ['Specialist', '2019 – 2022', 'Delivered client work on time and on budget while building long-term relationships.'],
  ['Junior Associate', '2017 – 2019', 'Supported daily operations, research and reporting for a fast-growing team.'],
];
export const SCRIPTY = /Vibes|Script|Sacramento|Satisfy|Caveat|Amatic|Marker/;
const SKILLS = ['Leadership', 'Communication', 'Project Management', 'Problem Solving', 'Teamwork', 'Time Management'];

function sectionHead(c: Ctx, text: string, x: number, y: number, w: number, color: string, rule: string) {
  const el = T(c, text, x, y, w, c.u * 2.1, { role: 'l', color, ls: 200 });
  L(c, x, el.y + el.h + c.u * 0.6, x + w, el.y + el.h + c.u * 0.6, rule, 1);
  return el.y + el.h + c.u * 2;
}

function experience(c: Ctx, x: number, y: number, w: number, fg: string, soft: string, accent: string) {
  const { u, c: k } = c;
  let cy = y;
  JOBS.forEach(([role, dates, desc], i) => {
    const r = T(c, `${role}`, x, cy, w * 0.68, u * 2.2, { role: 'h', color: fg, upper: false, weight: 700 });
    T(c, dates, x + w * 0.68, cy + u * 0.2, w * 0.32, u * 1.7, { color: soft, align: 'right' });
    const co = T(c, i === 0 ? k.brand : ['Fauget Studio', 'Larana Inc.', 'Borcelle Co.'][i], x, r.y + r.h + u * 0.3, w, u * 1.75, { role: 'l', color: accent });
    const d = T(c, desc, x, co.y + co.h + u * 0.5, w, u * 1.75, { color: soft, maxLines: 3 });
    cy = d.y + d.h + u * 2.4;
  });
  return cy;
}

const resumeSidebar = recipe('resume-sidebar', 'Sidebar resume', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, '#ffffff');
  const sw = w * 0.34;
  const side = t.dark ? t.bg : mix(t.primary, '#ffffff', 0.06);
  const sbg = t.dark ? t.bg : t.primary;
  R(c, 0, 0, sw, h, sbg);
  const sfg = on(c, sbg);
  const soft = mix(sfg, sbg, 0.25);
  const ph = sw * 0.6;
  F(c, 'circle', (sw - ph) / 2, u * 7, ph, ph, { color: t.accent, width: u * 0.5 });
  const px = u * 4;
  const pw = sw - px * 2;
  let y = u * 7 + ph + u * 5;
  y = sectionHead(c, 'Contact', px, y, pw, sfg, soft);
  const ct = T(c, `${CONTACT.phone}\n${CONTACT.email}\n${CONTACT.address}\n${CONTACT.web}`, px, y, pw, u * 1.75, { color: soft, lh: 1.8 });
  y = ct.y + ct.h + u * 4;
  y = sectionHead(c, 'Skills', px, y, pw, sfg, soft);
  const sk = T(c, SKILLS.join('\n'), px, y, pw, u * 1.8, { color: soft, list: 'bullet', lh: 1.8 });
  y = sk.y + sk.h + u * 4;
  y = sectionHead(c, 'Languages', px, y, pw, sfg, soft);
  T(c, 'English\nSpanish\nFrench', px, y, pw, u * 1.8, { color: soft, lh: 1.8 });
  void side;
  const x = sw + u * 5;
  const mw = w - x - u * 5;
  const fg = '#1f1f1f';
  const msoft = '#5c5c66';
  const nm = T(c, k.people[0], x, u * 7, mw, u * 5.5, { role: 'h', color: t.dark ? '#1f1f1f' : t.primary, maxLines: 2 });
  const rl = T(c, k.roles[0], x, nm.y + nm.h + u, mw, u * 2.2, { role: 'l', color: msoft, ls: 260 });
  y = rl.y + rl.h + u * 5;
  y = sectionHead(c, 'Profile', x, y, mw, fg, '#d9d9de');
  const pr = T(c, `${k.body} Passionate about clear communication, thoughtful planning and measurable results.`, x, y, mw, u * 1.85, { color: msoft, maxLines: 5 });
  y = pr.y + pr.h + u * 4;
  y = sectionHead(c, 'Experience', x, y, mw, fg, '#d9d9de');
  y = experience(c, x, y, mw, fg, msoft, t.dark ? t.accent : t.primary);
  y = sectionHead(c, 'Education', x, y + u, mw, fg, '#d9d9de');
  const ed = T(c, 'Bachelor of Business Administration', x, y, mw, u * 2.1, { role: 'h', color: fg, upper: false, weight: 700 });
  T(c, 'Northwood University  ·  2013 – 2017', x, ed.y + ed.h + u * 0.4, mw, u * 1.75, { color: msoft });
});

const resumeClassic = recipe('resume-classic', 'Classic resume', (c) => {
  const { w, u, t, c: k } = c;
  bgc(c, t.dark ? '#ffffff' : t.bg);
  const bg = '#ffffff';
  const m = u * 8;
  const fg = t.dark ? '#1f1f1f' : ink(c, t.bg);
  const soft = t.dark ? '#5c5c66' : inkSoft(c, t.bg);
  const acc = t.dark ? '#1f1f1f' : t.primary;
  const nm = T(c, k.people[0], m, u * 8, w - m * 2, u * 6.5, { role: 'h', color: acc, align: 'center', maxLines: 1 });
  const rl = T(c, k.roles[0], m, nm.y + nm.h + u, w - m * 2, u * 2.2, { role: 'l', color: soft, align: 'center', ls: 300 });
  const ct = T(c, `${CONTACT.phone}   |   ${CONTACT.email}   |   ${CONTACT.address}`, m, rl.y + rl.h + u * 2, w - m * 2, u * 1.75, { color: soft, align: 'center' });
  L(c, m, ct.y + ct.h + u * 3, w - m, ct.y + ct.h + u * 3, acc, 2);
  let y = ct.y + ct.h + u * 6;
  const lw = (w - m * 2) * 0.34;
  const rx = m + lw + u * 5;
  const rw = w - m - rx;
  let ly = sectionHead(c, 'About Me', m, y, lw, fg, mix(fg, bg, 0.8));
  const ab = T(c, k.body, m, ly, lw, u * 1.8, { color: soft, maxLines: 7 });
  ly = sectionHead(c, 'Skills', m, ab.y + ab.h + u * 4, lw, fg, mix(fg, bg, 0.8));
  const sk = T(c, SKILLS.join('\n'), m, ly, lw, u * 1.8, { color: soft, list: 'bullet', lh: 1.8 });
  ly = sectionHead(c, 'Education', m, sk.y + sk.h + u * 4, lw, fg, mix(fg, bg, 0.8));
  T(c, 'Bachelor of Arts\nNorthwood University\n2013 – 2017', m, ly, lw, u * 1.8, { color: soft, lh: 1.6 });
  y = sectionHead(c, 'Work Experience', rx, y, rw, fg, mix(fg, bg, 0.8));
  y = experience(c, rx, y, rw, fg, soft, acc);
  y = sectionHead(c, 'References', rx, y, rw, fg, mix(fg, bg, 0.8));
  T(c, `${k.people[1]}  ·  ${k.roles[1]}\n${CONTACT.phone}`, rx, y, rw, u * 1.8, { color: soft, lh: 1.6 });
});

/* ---------- Menus (8.5 × 11 in) ---------- */

function menuItems(c: Ctx, items: [string, string, string][], x: number, y: number, w: number, fg: string, soft: string, accent: string, size: number) {
  let cy = y;
  for (const [name, desc, price] of items) {
    const role = SCRIPTY.test(c.t.heading.family) ? 'b' : 'h';
    const n = T(c, name, x, cy, w * 0.78, size, { role, color: fg, upper: false, weight: 700, maxLines: 1 });
    T(c, '$' + price, x + w * 0.78, cy, w * 0.22, size, { role, color: accent, align: 'right', upper: false, weight: 700 });
    const d = T(c, desc, x, n.y + n.h + c.u * 0.3, w * 0.85, size * 0.72, { color: soft, maxLines: 2 });
    cy = d.y + d.h + c.u * 2.2;
  }
  return cy;
}

const menuList = recipe('menu-list', 'Menu list', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.bg);
  deco(c, t.deco === 'grid' ? 'frame' : t.deco, t.bg, 0.5);
  const m = u * 10;
  const fg = ink(c, t.bg);
  const soft = inkSoft(c, t.bg);
  const br = T(c, k.brand, m, u * 8, w - m * 2, u * 2.2, { role: 'l', color: t.primary, align: 'center' });
  const ti = T(c, 'Menu', m, br.y + br.h + u, w - m * 2, u * 11, { role: t.script ? 's' : 'h', color: fg, align: 'center', maxLines: 1, upper: false });
  const tg = T(c, k.tagline, m, ti.y + ti.h + u, w - m * 2, u * 2, { color: soft, align: 'center' });
  let y = tg.y + tg.h + u * 5;
  const names = k.topic.id === 'coffee' ? ['Coffee', 'Specialty Drinks', 'Bakery'] : ['Starters', 'Mains', 'Desserts & Drinks'];
  const groups: [string, number, number][] = [
    [names[0], 0, 2],
    [names[1], 2, 5],
    [names[2], 5, 8],
  ];
  for (const [g, a, b] of groups) {
    const gh = T(c, g, m, y, w - m * 2, u * 2.4, { role: 'l', color: t.primary, align: 'center', ls: 300 });
    L(c, w / 2 - u * 5, gh.y + gh.h + u * 0.8, w / 2 + u * 5, gh.y + gh.h + u * 0.8, t.accent, 1.5);
    y = menuItems(c, k.menu.slice(a, b), m + u * 4, gh.y + gh.h + u * 3, w - m * 2 - u * 8, fg, soft, t.primary, u * 2.3) + u * 1.5;
  }
  T(c, `${CONTACT.address}  ·  ${CONTACT.phone}`, m, h - u * 8, w - m * 2, u * 1.7, { role: 'l', color: soft, align: 'center' });
});

const menuPhoto = recipe('menu-photo', 'Photo menu', (c) => {
  const { w, h, u, t, c: k } = c;
  bgc(c, t.bg);
  const ph = h * 0.3;
  P(c, 0, 0, w, ph);
  R(c, 0, 0, w, ph, 'rgba(0,0,0,0.38)');
  const ti = T(c, k.brand, u * 6, 0, w - u * 12, u * 8, { role: 'h', color: '#ffffff', align: 'center', maxLines: 2 });
  ti.y = ph / 2 - ti.h / 2 - u * 1.5;
  T(c, 'Seasonal Menu', u * 6, ti.y + ti.h + u, w - u * 12, u * 2.2, { role: 'l', color: '#ffffff', align: 'center', ls: 300 });
  const fg = ink(c, t.bg);
  const soft = inkSoft(c, t.bg);
  const m = u * 7;
  const cw = (w - m * 2 - u * 6) / 2;
  const top = ph + u * 6;
  [0, 1].forEach((i) => {
    const x = m + i * (cw + u * 6);
    const gh = T(c, k.topic.id === 'coffee' ? (i === 0 ? 'Coffee' : 'Treats') : i === 0 ? 'To Start' : 'To Share', x, top, cw, u * 2.4, { role: 'l', color: t.primary, ls: 250 });
    menuItems(c, k.menu.slice(i * 4, i * 4 + 4), x, gh.y + gh.h + u * 2.5, cw, fg, soft, t.primary, u * 2.2);
  });
  const fy = h - u * 12;
  R(c, m, fy, w - m * 2, u * 7, t.primary, { radius: Math.round(t.radius * u * 3.5) });
  const ft = T(c, `Open daily  ·  ${CONTACT.phone}  ·  ${CONTACT.web}`, m, 0, w - m * 2, u * 1.9, { role: 'l', color: on(c, t.primary), align: 'center' });
  ft.y = fy + (u * 7 - ft.h) / 2;
});

export const PRINT_B: Recipe[] = [resumeSidebar, resumeClassic, menuList, menuPhoto];
