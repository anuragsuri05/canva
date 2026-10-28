// Assigns entrance animations (ids from render/animation.ts) to template elements.
import type { El } from '../model/types';
import type { Ctx } from './kit';

const HEAD = ['rise', 'baseline', 'ascend', 'pop', 'merge', 'drift', 'tectonic', 'clarify'];
const BODY = ['fade', 'rise', 'succession', 'blur'];
const PHOTO = ['photo-zoom', 'photo-rise', 'photo-flow', 'breathe'];
const SHAPE = ['pop', 'fade', 'wipe', 'burst'];

export function animate(els: El[], c: Ctx, pi: number) {
  const r = c.rng;
  const head = HEAD[(pi + r.int(HEAD.length)) % HEAD.length];
  const body = r.pick(BODY);
  const photo = r.pick(PHOTO);
  const shape = r.pick(SHAPE);
  const area = c.w * c.h;
  for (const e of els) {
    const big = e.w * e.h > area * 0.6;
    if (e.type === 'line' && els.filter((x) => x.type === 'line').length > 6) continue; // grid decorations
    if (e.type === 'text') {
      const isHead = e.role === 'heading';
      e.anim = { name: isHead ? head : body, duration: isHead ? 1 : 0.8, on: 'enter', direction: 'up', by: isHead && head === 'rise' ? 'word' : undefined };
    } else if (e.type === 'image' || e.type === 'frame' || e.type === 'grid') {
      e.anim = { name: big ? 'photo-zoom' : photo, duration: big ? 2.2 : 1.1, on: 'enter', direction: 'left' };
    } else if (e.type === 'shape') {
      e.anim = big ? { name: 'fade', duration: 0.6, on: 'enter' } : { name: shape, duration: 0.7, on: 'enter', direction: 'right' };
      if (e.shape === 'starburst' || e.shape === 'star4') e.anim.emphasis = 'pulse';
    } else if (e.type === 'line') {
      e.anim = { name: 'wipe', duration: 0.7, on: 'enter', direction: 'right' };
    }
  }
}
