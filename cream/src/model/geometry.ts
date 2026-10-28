import type { El, LineEl } from './types';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const rad = (deg: number) => (deg * Math.PI) / 180;

export function rotatePoint(px: number, py: number, cx: number, cy: number, deg: number) {
  const a = rad(deg);
  const dx = px - cx;
  const dy = py - cy;
  return { x: cx + dx * Math.cos(a) - dy * Math.sin(a), y: cy + dx * Math.sin(a) + dy * Math.cos(a) };
}

/** Axis-aligned bounding box of an element including rotation. */
export function elBounds(e: El): Box {
  if (e.type === 'line') return lineBox(e);
  if (!e.rotation) return { x: e.x, y: e.y, w: e.w, h: e.h };
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const pts = [
    rotatePoint(e.x, e.y, cx, cy, e.rotation),
    rotatePoint(e.x + e.w, e.y, cx, cy, e.rotation),
    rotatePoint(e.x, e.y + e.h, cx, cy, e.rotation),
    rotatePoint(e.x + e.w, e.y + e.h, cx, cy, e.rotation),
  ];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function lineBox(l: LineEl): Box {
  const pad = Math.max(6, l.width);
  const x = Math.min(l.x1, l.x2);
  const y = Math.min(l.y1, l.y2);
  return { x: x - pad / 2, y: y - pad / 2, w: Math.abs(l.x2 - l.x1) + pad, h: Math.abs(l.y2 - l.y1) + pad };
}

export function syncLineBox(l: LineEl) {
  l.x = Math.min(l.x1, l.x2);
  l.y = Math.min(l.y1, l.y2);
  l.w = Math.abs(l.x2 - l.x1);
  l.h = Math.abs(l.y2 - l.y1);
}

export function unionBox(boxes: Box[]): Box | null {
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const r = Math.max(...boxes.map((b) => b.x + b.w));
  const b = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: r - x, h: b - y };
}

export function moveEl(e: El, dx: number, dy: number) {
  e.x += dx;
  e.y += dy;
  if (e.type === 'line') {
    e.x1 += dx;
    e.x2 += dx;
    e.y1 += dy;
    e.y2 += dy;
  }
}

/** Map an element proportionally from one box to another (used for multi-select resize and design resize). */
export function mapElBox(e: El, from: Box, to: Box) {
  const sx = to.w / Math.max(1e-6, from.w);
  const sy = to.h / Math.max(1e-6, from.h);
  if (e.type === 'line') {
    e.x1 = to.x + (e.x1 - from.x) * sx;
    e.x2 = to.x + (e.x2 - from.x) * sx;
    e.y1 = to.y + (e.y1 - from.y) * sy;
    e.y2 = to.y + (e.y2 - from.y) * sy;
    e.width = Math.max(1, e.width * Math.min(sx, sy));
    syncLineBox(e);
    return;
  }
  e.x = to.x + (e.x - from.x) * sx;
  e.y = to.y + (e.y - from.y) * sy;
  e.w = Math.max(1, e.w * sx);
  e.h = Math.max(1, e.h * sy);
  if (e.type === 'text') {
    e.fontSize = Math.max(1, Math.round(e.fontSize * Math.min(sx, sy) * 10) / 10);
  }
  if (e.type === 'shape' && e.fontSize) e.fontSize = Math.max(1, e.fontSize * Math.min(sx, sy));
  if (e.type === 'sticky') e.fontSize = Math.max(6, e.fontSize * Math.min(sx, sy));
  if (e.type === 'table') e.fontSize = Math.max(4, e.fontSize * Math.min(sx, sy));
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function boxesIntersect(a: Box, b: Box) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
