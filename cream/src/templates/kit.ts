// Element-building toolkit shared by every layout recipe. All sizes are in design px.
import type { Anim, El, Fill, FrameEl, ImageEl, LineEl, ShapeEl, ShapeKind, TextEl } from '../model/types';
import { makeFrame, makeImage, makeLine, makeShape, makeText, solid } from '../model/defaults';
import type { Copy } from './content';
import type { FontRole, Theme } from './themes';
import { readable, rgba, type Rng } from './rng';

export interface Ctx {
  w: number;
  h: number;
  t: Theme;
  c: Copy;
  rng: Rng;
  els: El[];
  bg: Fill;
  u: number; // 1% of the short side
  m: number; // outer margin
  land: boolean; // landscape (ar > 1.15)
  port: boolean; // portrait (ar < 0.87)
  ar: number;
  seed: string;
  photoN: number;
  thumb: boolean; // build lightweight photos for thumbnails
  page: number; // page index within the template
  pages: number;
  notes?: string;
  duration?: number;
}

export type Role = 'h' | 'b' | 's' | 'l';

export interface TOpts {
  role?: Role;
  color?: string;
  align?: TextEl['align'];
  weight?: number;
  lh?: number;
  ls?: number;
  upper?: boolean;
  italic?: boolean;
  maxLines?: number;
  minSize?: number;
  font?: string;
  list?: 'bullet' | 'number';
}

export function fontFor(c: Ctx, role: Role): FontRole {
  if (role === 'h') return c.t.heading;
  if (role === 's') return c.t.script ?? c.t.heading;
  return c.t.body;
}

const NARROW = /Bebas|Oswald|Anton|Condensed|Amatic|Teko|Great Vibes|Sacramento|Dancing|Satisfy|Caveat/;
const WIDE = /Archivo Black|Alfa Slab|Abril|Syne|Righteous|Rubik|Fredoka|Permanent Marker|Prata|Yeseva|Cinzel|Monoton|Bungee|Libre Baskerville|Space Mono|Kanit|Urbanist|Sora|Outfit|Poppins|Montserrat|Plus Jakarta|Manrope|Comfortaa/;

const VWIDE = /Archivo Black|Monoton|Bungee|Alfa Slab/;

function charW(font: string, upper: boolean, ls: number, weight = 400) {
  let f = NARROW.test(font) ? 0.44 : /Syne/.test(font) ? 0.8 : VWIDE.test(font) ? 0.7 : WIDE.test(font) ? 0.62 : 0.56;
  if (!/Archivo Black|Alfa Slab|Abril|Anton|Bebas/.test(font)) f *= 1 + Math.max(0, weight - 400) / 1700;
  if (upper) f *= 1.17;
  return f + ls / 1000;
}

/** Rough line count for wrapped text. */
export function estLines(text: string, size: number, w: number, font: string, upper = false, ls = 0, weight = 400) {
  const cw = charW(font, upper, ls, weight) * size;
  const maxChars = Math.max(1, Math.floor(w / cw));
  let lines = 0;
  for (const para of text.split('\n')) {
    let cur = 0;
    let n = 1;
    for (const word of para.split(/\s+/)) {
      const len = word.length;
      if (cur === 0) cur = len;
      else if (cur + 1 + len <= maxChars) cur += 1 + len;
      else {
        n++;
        cur = len;
      }
      while (cur > maxChars) {
        n++;
        cur -= maxChars;
      }
    }
    lines += n;
  }
  return lines;
}

/** Add a text element. Returns it (with an estimated height). */
export function T(c: Ctx, text: string, x: number, y: number, w: number, size: number, o: TOpts = {}): TextEl {
  const role = o.role ?? 'b';
  const fr = fontFor(c, role);
  const font = o.font ?? fr.family;
  const upper = o.upper ?? (role === 'l' ? true : !!fr.uppercase);
  const ls = o.ls ?? (role === 'l' ? 160 : fr.ls ?? 0);
  const lh = o.lh ?? (role === 'h' || role === 's' ? 1.12 : 1.45);
  const weight = o.weight ?? (role === 'l' ? 600 : fr.weight);
  let s = size;
  const longest = Math.max(...text.split(/\s+/).map((x) => x.length));
  // never break inside a word
  while (s > 6 && longest * charW(font, upper, ls, weight) * s > w) s *= 0.94;
  if (o.maxLines) {
    const min = o.minSize ?? size * 0.45;
    while (s > min && estLines(text, s, w, font, upper, ls, weight) > o.maxLines) s *= 0.92;
  }
  s = Math.round(s * 10) / 10;
  const el = makeText(text, x, y, w, {
    fontFamily: font,
    fontSize: s,
    fontWeight: weight,
    color: o.color ?? c.t.text,
    align: o.align ?? 'left',
    lineHeight: lh,
    letterSpacing: ls,
    uppercase: upper,
    italic: o.italic ?? !!fr.italic,
    list: o.list,
  }, role === 'h' || role === 's' ? 'heading' : role === 'l' ? 'subheading' : 'body');
  el.h = Math.ceil(estLines(text, s, w, font, upper, ls, weight) * s * lh) + 2;
  c.els.push(el);
  return el;
}

export const bottom = (e: El) => e.y + e.h;

export interface ROpts {
  shape?: ShapeKind;
  radius?: number;
  opacity?: number;
  stroke?: { color: string; width: number; style?: 'solid' | 'dashed' | 'dotted' };
  rot?: number;
}

export function R(c: Ctx, x: number, y: number, w: number, h: number, fill: string | Fill, o: ROpts = {}): ShapeEl {
  const el = makeShape(o.shape ?? 'rect', x, y, w, h);
  el.fill = typeof fill === 'string' ? solid(fill) : fill;
  el.radius = o.radius ?? (o.shape === 'rounded' ? Math.min(w, h) * 0.15 : 0);
  if (o.shape === 'rounded' && o.radius === undefined) el.radius = Math.min(w, h) * 0.12;
  if (o.radius && !o.shape) el.shape = 'rounded';
  el.opacity = o.opacity ?? 1;
  el.rotation = o.rot ?? 0;
  if (o.stroke) el.stroke = { style: 'solid', ...o.stroke };
  delete (el as Partial<ShapeEl>).html;
  c.els.push(el);
  return el;
}

/** Corner radius from theme roundness. */
export const rad = (c: Ctx, size: number) => Math.round(c.t.radius * size);

export const NONE = 'rgba(0,0,0,0)';

export function grad(a: string, b: string, angle = 180, type: 'linear' | 'radial' = 'linear'): Fill {
  return { kind: 'gradient', type, angle, stops: [{ color: a, pos: 0 }, { color: b, pos: 1 }] };
}

function photoSize(c: Ctx, w: number, h: number) {
  const cap = c.thumb ? 360 : 1600;
  const s = Math.min(1, cap / Math.max(w, h));
  return [Math.max(40, Math.round(w * s)), Math.max(40, Math.round(h * s))];
}

export function photoUrl(c: Ctx, w: number, h: number) {
  const [pw, ph] = photoSize(c, w, h);
  const seed = `${c.c.topic.id}-${c.seed}-${c.photoN++}`.replace(/[^a-z0-9-]/gi, '');
  return { src: `https://picsum.photos/seed/${seed}/${pw}/${ph}`, pw, ph };
}

/** Photo as an image element (cropped exactly to its box). */
export function P(c: Ctx, x: number, y: number, w: number, h: number, o: { radius?: number; filters?: ImageEl['filters'] } = {}): ImageEl {
  const { src, pw, ph } = photoUrl(c, w, h);
  const el = makeImage(src, pw, ph, x, y, w, { radius: o.radius, filters: o.filters, credit: { source: 'picsum', title: 'Photo', landingUrl: 'https://picsum.photos' } });
  el.h = h;
  c.els.push(el);
  return el;
}

/** Photo inside a frame shape. */
export function F(c: Ctx, shape: FrameEl['frameShape'], x: number, y: number, w: number, h: number, border?: { color: string; width: number }): FrameEl {
  const { src, pw, ph } = photoUrl(c, w, h);
  const el = makeFrame(shape, x, y, w, h);
  el.media = { src, kind: 'image', naturalW: pw, naturalH: ph, scale: 1, offsetX: 0, offsetY: 0, credit: { source: 'picsum', landingUrl: 'https://picsum.photos' } };
  if (border) el.border = { ...border, style: 'solid' };
  c.els.push(el);
  return el;
}

export function L(c: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, width = 2, o: Partial<LineEl> = {}): LineEl {
  const el = makeLine(x1, y1, x2, y2, { color, width, ...o });
  c.els.push(el);
  return el;
}

/** Pill / rounded button with a centred label. */
export function B(c: Ctx, label: string, x: number, y: number, size: number, o: { fill?: string; color?: string; w?: number; align?: 'left' | 'center' | 'right'; outline?: boolean } = {}): ShapeEl {
  const fill = o.fill ?? c.t.primary;
  const fr = c.t.body;
  const tw = label.length * size * 0.62 + size * 3.2;
  const w = o.w ?? tw;
  const h = size * 2.6;
  const bx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  const el = R(c, bx, y, w, h, o.outline ? NONE : fill, { radius: Math.max(2, rad(c, h / 2)), stroke: o.outline ? { color: fill, width: Math.max(1, size / 10) } : undefined });
  el.shape = 'rounded';
  el.html = label;
  el.fontFamily = fr.family;
  el.fontSize = size;
  el.fontWeight = 600;
  el.color = o.color ?? (o.outline ? fill : readable(fill, ['#ffffff', c.t.bg, '#111111']));
  el.letterSpacing = 40;
  el.align = 'center';
  return el;
}

/** Text colour that reads well on bg. */
export const ink = (c: Ctx, bg: string) => readable(bg, [c.t.text, '#ffffff', c.t.bg, '#111111']);
export const inkSoft = (c: Ctx, bg: string) => readable(bg, [c.t.muted, rgba(ink(c, bg), 0.75)], 3.2);
/** Accent colour that stays legible on bg (falls back to secondary / plain ink). */
export const acc = (c: Ctx, bg: string) => readable(bg, [c.t.accent, c.t.secondary, on(c, bg)], 3);
export const on = (c: Ctx, bg: string) => readable(bg, ['#ffffff', c.t.bg, c.t.text, '#111111']);

export function anim(el: El, name: string, duration = 0.9, extra: Partial<Anim> = {}) {
  el.anim = { name, duration, on: 'enter', ...extra };
  return el;
}

/** Fit the largest font size such that `text` stays within maxLines at width w. */
export function fit(c: Ctx, text: string, w: number, size: number, maxLines: number, role: Role = 'h') {
  const fr = fontFor(c, role);
  let s = size;
  while (s > size * 0.35 && estLines(text, s, w, fr.family, !!fr.uppercase, fr.ls ?? 0, fr.weight) > maxLines) s *= 0.93;
  return s;
}

/** Vertical stack helper: place items top-down with a gap. */
export function stack(start: number, gap: number) {
  let y = start;
  return {
    get y() {
      return y;
    },
    push(el: El, extra = 0) {
      el.y = y;
      y = el.y + el.h + gap + extra;
      return el;
    },
    skip(n: number) {
      y += n;
    },
  };
}

/** Shift elements vertically so their union is centred within [top, top+height]. */
export function centerV(els: El[], top: number, height: number) {
  if (!els.length) return;
  const y0 = Math.min(...els.map((e) => e.y));
  const y1 = Math.max(...els.map((e) => e.y + e.h));
  const dy = top + (height - (y1 - y0)) / 2 - y0;
  for (const e of els) {
    e.y += dy;
    if (e.type === 'line') {
      e.y1 += dy;
      e.y2 += dy;
    }
  }
}

export interface Recipe {
  id: string;
  name: string;
  fn: (c: Ctx) => void;
}

export const recipe = (id: string, name: string, fn: (c: Ctx) => void): Recipe => ({ id, name, fn });

/** Place elements top-down from y with a gap; returns the y after the last one. */
export function col(els: El[], y: number, gap: number | number[]) {
  let cy = y;
  els.forEach((e, i) => {
    const dy = cy - e.y;
    e.y = cy;
    if (e.type === 'line') {
      e.y1 += dy;
      e.y2 += dy;
    }
    cy = e.y + e.h + (Array.isArray(gap) ? gap[i] ?? 0 : gap);
  });
  return cy - (Array.isArray(gap) ? gap[els.length - 1] ?? 0 : gap);
}

/** Total height of a column of elements with gaps. */
export const colH = (els: El[], gap: number) => els.reduce((s, e) => s + e.h, 0) + gap * Math.max(0, els.length - 1);

/** Base heading size for the canvas. */
export const HS = (c: Ctx) => Math.min(c.w * (c.ar < 0.6 ? 0.125 : 0.105), c.h * (c.ar > 2.5 ? 0.19 : 0.15));
/** Base body size. */
export const BS = (c: Ctx) => Math.max(9, c.u * 2.9 * (c.ar > 2.5 ? 1.35 : c.ar < 0.6 ? 1.15 : 1));

/** Re-crop an image so it covers its (possibly stretched) box without distortion. */
export function coverCrop(e: ImageEl) {
  const na = e.naturalW / Math.max(1, e.naturalH);
  const ba = e.w / Math.max(1, e.h);
  if (Math.abs(na - ba) < 0.01) {
    e.crop = undefined;
    return;
  }
  if (ba > na) {
    const ch = na / ba;
    e.crop = { x: 0, y: (1 - ch) / 2, w: 1, h: ch };
  } else {
    const cw = ba / na;
    e.crop = { x: (1 - cw) / 2, y: 0, w: cw, h: 1 };
  }
}

