// Background decorations driven by the theme's `deco` style.
import type { Deco } from './themes';
import { L, NONE, R, type Ctx } from './kit';
import { isDark, mix } from './rng';

/** Draw subtle decorations. `bgColor` is the colour underneath (for tinting). */
export function deco(c: Ctx, kind: Deco = c.t.deco, bgColor = c.t.bg, strength = 1) {
  const { w, h, u, t, rng } = c;
  const soft = (col: string, k = 0.55) => mix(col, bgColor, 1 - Math.min(1, k * strength));
  const flip = rng.chance(0.5);
  switch (kind) {
    case 'blobs': {
      const s = Math.max(w, h) * 0.38;
      R(c, flip ? w - s * 0.7 : -s * 0.3, -s * 0.35, s, s, soft(t.secondary), { shape: rng.pick(['blob1', 'blob2', 'blob3'] as const) });
      R(c, flip ? -s * 0.35 : w - s * 0.6, h - s * 0.55, s * 0.9, s * 0.9, soft(t.accent, 0.45), { shape: rng.pick(['blob1', 'blob2', 'blob3'] as const) });
      break;
    }
    case 'circles': {
      const s = Math.min(w, h) * 0.55;
      R(c, flip ? w - s * 0.65 : -s * 0.35, -s * 0.35, s, s, soft(t.secondary, 0.5), { shape: 'circle' });
      R(c, flip ? u * 6 : w - u * 22, h - u * 22, u * 16, u * 16, NONE, { shape: 'circle', stroke: { color: soft(t.primary, 0.8), width: Math.max(1, u * 0.5) } });
      break;
    }
    case 'lines': {
      const y1 = c.m * 0.55;
      L(c, c.m, y1, w - c.m, y1, soft(t.text, 0.35), Math.max(1, u * 0.15));
      L(c, c.m, h - y1, w - c.m, h - y1, soft(t.text, 0.35), Math.max(1, u * 0.15));
      break;
    }
    case 'dots': {
      const n = 4;
      const g = u * 3;
      const x0 = flip ? w - c.m * 0.6 - g * (n - 1) : c.m * 0.6;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) R(c, x0 + i * g, c.m * 0.6 + j * g, u * 0.9, u * 0.9, soft(t.primary, 0.7), { shape: 'circle' });
      break;
    }
    case 'frame': {
      const p = Math.min(c.m * 0.5, u * 4);
      R(c, p, p, w - p * 2, h - p * 2, NONE, { stroke: { color: soft(t.primary, 0.9), width: Math.max(1, u * 0.25) } });
      R(c, p * 1.6, p * 1.6, w - p * 3.2, h - p * 3.2, NONE, { stroke: { color: soft(t.primary, 0.5), width: Math.max(1, u * 0.12) } });
      break;
    }
    case 'geo': {
      const s = u * 18;
      R(c, flip ? w - s * 0.8 : -s * 0.2, -s * 0.2, s, s, soft(t.secondary, 0.6), { shape: 'triangle', rot: 180 });
      R(c, flip ? -s * 0.3 : w - s * 0.7, h - s * 0.7, s, s, soft(t.accent, 0.6), { shape: 'circle' });
      R(c, flip ? u * 8 : w - u * 14, h * 0.5, u * 5, u * 5, soft(t.primary, 0.6), { shape: 'rect', rot: 45 });
      break;
    }
    case 'arches': {
      const s = Math.min(w, h) * 0.32;
      R(c, flip ? w - s * 0.9 : -s * 0.1, h - s * 1.1, s, s * 1.3, soft(t.secondary, 0.5), { shape: 'arch' });
      R(c, flip ? w - s * 0.55 : s * 0.25, h - s * 0.75, s * 0.7, s * 0.95, soft(t.accent, 0.45), { shape: 'arch' });
      break;
    }
    case 'confetti': {
      const cols = [t.primary, t.secondary, t.accent];
      for (let i = 0; i < 14; i++) {
        const edge = rng.chance(0.5);
        const x = edge ? rng.range(0, w) : rng.chance(0.5) ? rng.range(0, c.m * 1.2) : rng.range(w - c.m * 1.2, w);
        const y = edge ? (rng.chance(0.5) ? rng.range(0, c.m) : rng.range(h - c.m, h)) : rng.range(0, h);
        const s = u * rng.range(1.2, 2.6);
        R(c, x, y, s, rng.chance(0.4) ? s * 0.4 : s, soft(rng.pick(cols), 0.85), { shape: rng.pick(['circle', 'rect', 'triangle', 'star5'] as const), rot: rng.range(0, 90) });
      }
      break;
    }
    case 'waves': {
      const s = w * 0.9;
      R(c, -s * 0.25, h - s * 0.12, s, s * 0.5, soft(t.secondary, 0.45), { shape: 'circle' });
      R(c, w * 0.45, h - s * 0.08, s, s * 0.5, soft(t.accent, 0.4), { shape: 'circle' });
      break;
    }
    case 'brackets': {
      const s = u * 8;
      const p = c.m * 0.5;
      const col = soft(t.primary, 0.8);
      const lw = Math.max(1, u * 0.5);
      L(c, p, p, p + s, p, col, lw);
      L(c, p, p, p, p + s, col, lw);
      L(c, w - p, h - p, w - p - s, h - p, col, lw);
      L(c, w - p, h - p, w - p, h - p - s, col, lw);
      break;
    }
    case 'stars': {
      for (let i = 0; i < 5; i++) {
        const s = u * rng.range(2, 5);
        const x = rng.chance(0.5) ? rng.range(u * 2, c.m * 1.5) : rng.range(w - c.m * 1.5, w - u * 6);
        R(c, x, rng.range(u * 2, h - u * 8), s, s, soft(rng.pick([t.accent, t.secondary]), 0.8), { shape: 'star4' });
      }
      break;
    }
    case 'grid': {
      const g = u * 8;
      const col = isDark(bgColor) ? mix(bgColor, '#ffffff', 0.08) : mix(bgColor, '#000000', 0.06);
      for (let x = g; x < w; x += g) L(c, x, 0, x, h, col, Math.max(1, u * 0.1));
      for (let y = g; y < h; y += g) L(c, 0, y, w, y, col, Math.max(1, u * 0.1));
      break;
    }
    default:
      break;
  }
}
