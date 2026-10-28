// Whiteboard layouts (4000 × 2500) built from sticky notes, shapes and connector lines.
import type { ShapeEl, StickyEl } from '../../model/types';
import { makeSticky, STICKY_COLORS } from '../../model/defaults';
import { L, R, T, ink, inkSoft, on, recipe, type Ctx, type Recipe } from '../kit';
import { mix } from '../rng';

const bgc = (c: Ctx, color: string) => (c.bg = { kind: 'solid', color });

function S(c: Ctx, text: string, x: number, y: number, s: number, color: string): StickyEl {
  const el = makeSticky(x, y, color, c.c.people[c.els.length % 6].split(' ')[0]);
  el.w = s;
  el.h = s;
  el.html = text;
  el.fontSize = Math.round(s * 0.1);
  c.els.push(el);
  return el;
}

/** Rounded box with centred label. */
function box(c: Ctx, text: string, x: number, y: number, w: number, h: number, fill: string, shape: ShapeEl['shape'] = 'rounded', size = h * 0.24): ShapeEl {
  const el = R(c, x, y, w, h, fill, { shape, radius: shape === 'rounded' ? Math.min(w, h) * 0.2 : undefined });
  el.html = text;
  el.fontFamily = c.t.body.family;
  el.fontWeight = 600;
  el.fontSize = size;
  el.color = on(c, fill);
  el.align = 'center';
  return el;
}

function arrow(c: Ctx, a: ShapeEl | StickyEl, b: ShapeEl | StickyEl, color: string, curve = false) {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  // clip to box edges
  const clip = (e: { x: number; y: number; w: number; h: number }, x: number, y: number, tx: number, ty: number) => {
    const dx = tx - x;
    const dy = ty - y;
    const sx = dx === 0 ? Infinity : e.w / 2 / Math.abs(dx);
    const sy = dy === 0 ? Infinity : e.h / 2 / Math.abs(dy);
    const s = Math.min(sx, sy);
    return [x + dx * s, y + dy * s];
  };
  const [x1, y1] = clip(a, ax, ay, bx, by);
  const [x2, y2] = clip(b, bx, by, ax, ay);
  return L(c, x1, y1, x2, y2, color, c.u * 0.35, { endCap: 'arrow', lineType: curve ? 'curve' : 'straight', startConnect: a.id, endConnect: b.id });
}

function title(c: Ctx, text: string, sub: string) {
  const { u, m } = c;
  const fg = ink(c, c.t.bg);
  const t = T(c, text, m * 0.6, m * 0.5, c.w * 0.6, u * 7, { role: 'h', color: fg, maxLines: 1 });
  T(c, sub, m * 0.6, t.y + t.h + u, c.w * 0.6, u * 2.6, { color: inkSoft(c, c.t.bg), maxLines: 1 });
  return t.y + t.h + u * 7;
}

const boardBg = (c: Ctx) => bgc(c, c.t.dark ? c.t.bg : mix(c.t.bg, '#ffffff', 0.4));

const brainstorm = recipe('wb-brainstorm', 'Brainstorm', (c) => {
  const { w, h, u, t, c: k } = c;
  boardBg(c);
  const top = title(c, 'Brainstorm', `${k.brand} · ideas session`);
  const cx = w / 2;
  const cy = (top + h) / 2;
  const cs = u * 22;
  const center = box(c, k.headline, cx - cs, cy - cs / 2, cs * 2, cs, t.primary, 'rounded', u * 3.6);
  const n = 6;
  const s = u * 13;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rx = w * 0.33;
    const ry = (h - top) * 0.36;
    const gx = cx + Math.cos(a) * rx;
    const gy = cy + Math.sin(a) * ry;
    const col = STICKY_COLORS[i % 6];
    const first = S(c, k.items[i % k.items.length], gx - s * 1.05, gy - s / 2, s, col);
    S(c, k.sections[i % k.sections.length], gx + s * 0.05, gy - s / 2 + u * 1.5, s, col);
    first.rotation = -3;
    arrow(c, center, first, mix(t.text, t.bg, 0.5), true);
  }
});

const mindmap = recipe('wb-mindmap', 'Mind map', (c) => {
  const { w, h, u, t, c: k } = c;
  boardBg(c);
  const top = title(c, 'Mind Map', k.tagline);
  const cx = w / 2;
  const cy = (top + h) / 2;
  const center = box(c, k.brand, cx - u * 17, cy - u * 7, u * 34, u * 14, t.primary, 'rounded', u * 3.4);
  const cols = [t.secondary, t.accent, mix(t.primary, '#ffffff', 0.35), t.secondary, t.accent, mix(t.primary, '#ffffff', 0.35)];
  const branches = k.sections.slice(0, 4).concat(k.items.slice(0, 2));
  branches.forEach((b, i) => {
    const left = i % 2 === 1;
    const row = Math.floor(i / 2);
    const bx = left ? cx - w * 0.14 - u * 24 : cx + w * 0.14;
    const by = top + u * 4 + row * ((h - top - u * 8) / 3);
    const fill = cols[i];
    const node = box(c, b, bx, by + u * 6, u * 24, u * 10, fill, 'rounded', u * 2.6);
    arrow(c, center, node, mix(fill, t.text, 0.3), true);
    for (let j = 0; j < 2; j++) {
      const lx = left ? bx - u * 26 : bx + u * 28;
      const leaf = box(c, k.items[(i + j + 2) % k.items.length], lx, by + j * u * 12 + u * 1, u * 22, u * 8, mix(fill, '#ffffff', 0.6), 'rounded', u * 2.1);
      leaf.color = ink(c, mix(fill, '#ffffff', 0.6));
      L(c, left ? bx : bx + u * 24, by + u * 11, left ? lx + u * 22 : lx, leaf.y + u * 4, mix(fill, t.text, 0.3), u * 0.25, { lineType: 'curve', startConnect: node.id, endConnect: leaf.id });
    }
  });
});

const kanban = recipe('wb-kanban', 'Kanban board', (c) => {
  const { w, h, u, t, c: k } = c;
  boardBg(c);
  const top = title(c, 'Project Board', `${k.brand} · sprint planning`);
  const cols = ['To Do', 'In Progress', 'Review', 'Done'];
  const gap = u * 5;
  const cw = (w - c.m * 1.2 - gap * 3) / 4;
  cols.forEach((name, i) => {
    const x = c.m * 0.6 + i * (cw + gap);
    const colH = h - top - c.m * 0.6;
    R(c, x, top, cw, colH, t.dark ? t.surface : mix(t.bg, t.primary, 0.08), { radius: u * 3 });
    const hd = box(c, name, x + u * 3, top + u * 3, cw - u * 6, u * 9, [t.primary, t.accent, t.secondary, mix(t.primary, '#ffffff', 0.3)][i], 'rounded', u * 3);
    const n = 4 - (i % 2);
    for (let j = 0; j < n; j++) {
      const card = box(c, k.items[(i * 2 + j) % k.items.length], x + u * 3, hd.y + hd.h + u * 4 + j * u * 22, cw - u * 6, u * 18, '#ffffff', 'rounded', u * 2.6);
      card.color = '#26222f';
      card.stroke = { color: mix(t.primary, '#ffffff', 0.7), width: u * 0.15, style: 'solid' };
      R(c, card.x + u * 2, card.y + u * 2, u * 8, u * 1.6, STICKY_COLORS[(i + j) % 6], { radius: u * 0.8 });
    }
  });
});

const flowchart = recipe('wb-flowchart', 'Flowchart', (c) => {
  const { w, h, u, t, c: k } = c;
  boardBg(c);
  const top = title(c, 'Process Flowchart', k.headline2);
  const y = (top + h) / 2 - u * 8;
  const line = mix(t.text, t.bg, 0.35);
  const bw = u * 21;
  const step = (w - c.m * 1.2 - bw) / 4;
  const x0 = c.m * 0.6;
  const bh = u * 14;
  const start = box(c, 'Start', x0, y, bw, bh, t.primary, 'rounded', u * 3);
  start.radius = bh / 2;
  const p1 = box(c, k.sections[0], x0 + step, y, bw, bh, t.secondary, 'rect', u * 2.6);
  const d = box(c, 'Approved?', x0 + step * 2 - u, y - u * 6, bw + u * 2, bh + u * 12, t.accent, 'diamond', u * 2.6);
  const p2 = box(c, k.sections[1], x0 + step * 3, y, bw, bh, t.secondary, 'rect', u * 2.6);
  const end = box(c, 'Finish', x0 + step * 4, y, bw, bh, t.primary, 'rounded', u * 3);
  end.radius = bh / 2;
  const back = box(c, 'Revise draft', d.x + u, y + u * 36, bw, bh, mix(t.secondary, '#ffffff', 0.4), 'rect', u * 2.6);
  back.color = ink(c, mix(t.secondary, '#ffffff', 0.4));
  arrow(c, start, p1, line);
  arrow(c, p1, d, line);
  arrow(c, d, p2, line);
  arrow(c, p2, end, line);
  arrow(c, d, back, line);
  L(c, back.x, back.y + back.h / 2, p1.x + p1.w / 2, back.y + back.h / 2, line, u * 0.35, { lineType: 'straight' });
  L(c, p1.x + p1.w / 2, back.y + back.h / 2, p1.x + p1.w / 2, p1.y + p1.h, line, u * 0.35, { endCap: 'arrow' });
  T(c, 'Yes', d.x + d.w + u, y - u * 4, u * 10, u * 2.4, { role: 'l', color: line });
  T(c, 'No', d.x + d.w / 2 + u * 2, d.y + d.h + u, u * 10, u * 2.4, { role: 'l', color: line });
});

function columnsBoard(c: Ctx, heading: string, sub: string, names: string[], colors: string[], per = 4) {
  const { w, h, u, t, c: k } = c;
  boardBg(c);
  const top = title(c, heading, sub);
  const gap = u * 6;
  const n = names.length;
  const cw = (w - c.m * 1.2 - gap * (n - 1)) / n;
  const s = Math.min(u * 21, (cw - u * 11) / 2);
  names.forEach((name, i) => {
    const x = c.m * 0.6 + i * (cw + gap);
    R(c, x, top, cw, h - top - c.m * 0.5, t.dark ? t.surface : mix(t.bg, colors[i], 0.18), { radius: u * 3 });
    T(c, name, x + u * 4, top + u * 4, cw - u * 8, u * 4, { role: 'h', color: ink(c, t.dark ? t.surface : t.bg), upper: false });
    for (let j = 0; j < per; j++) {
      const sx = x + u * 4 + (j % 2) * (s + u * 3);
      const sy = top + u * 14 + Math.floor(j / 2) * (s + u * 3);
      S(c, k.items[(i + j) % k.items.length], sx, sy, s, colors[i]).rotation = (j % 2 ? 2 : -2);
    }
  });
}

const retro = recipe('wb-retro', 'Retrospective', (c) =>
  columnsBoard(c, 'Team Retrospective', `${c.c.brand} · ${c.c.date}`, ['Went well', 'To improve', 'Action items'], [STICKY_COLORS[4], STICKY_COLORS[2], STICKY_COLORS[3]]),
);

const journey = recipe('wb-journey', 'Journey map', (c) =>
  columnsBoard(c, 'Customer Journey Map', c.c.tagline, ['Awareness', 'Consideration', 'Purchase', 'Retention', 'Advocacy'], [STICKY_COLORS[0], STICKY_COLORS[1], STICKY_COLORS[2], STICKY_COLORS[3], STICKY_COLORS[5]], 4),
);

const swot = recipe('wb-swot', 'SWOT analysis', (c) => {
  const { w, h, u, t, c: k } = c;
  boardBg(c);
  const top = title(c, 'SWOT Analysis', `${k.brand} · ${k.year}`);
  const names = ['Strengths', 'Weaknesses', 'Opportunities', 'Threats'];
  const fills = [STICKY_COLORS[4], STICKY_COLORS[2], STICKY_COLORS[3], STICKY_COLORS[1]];
  const gap = u * 4;
  const qw = (w - c.m * 1.2 - gap) / 2;
  const qh = (h - top - c.m * 0.5 - gap) / 2;
  names.forEach((n, i) => {
    const x = c.m * 0.6 + (i % 2) * (qw + gap);
    const y = top + Math.floor(i / 2) * (qh + gap);
    R(c, x, y, qw, qh, mix(fills[i], '#ffffff', 0.35), { radius: u * 3 });
    T(c, n[0], x + u * 4, y + u * 2, u * 20, u * 18, { role: 'h', color: mix(fills[i], '#000000', 0.45), upper: true, lh: 1 });
    T(c, n, x + u * 18, y + u * 6, qw - u * 22, u * 4.4, { role: 'h', color: '#2a2633', upper: false });
    const s = Math.min(u * 14, qh - u * 26);
    for (let j = 0; j < 4; j++) S(c, k.items[(i + j) % 6], x + u * 18 + j * (s + u * 3), y + u * 18, s, fills[i]);
  });
});

export const BOARDS: Recipe[] = [brainstorm, mindmap, kanban, flowchart, retro, journey, swot];
