import type { CSSProperties } from 'react';
import type { Anim, El } from '../model/types';

export interface AnimDef {
  id: string;
  label: string;
  group: 'basic' | 'exaggerate' | 'photo' | 'text' | 'emphasis';
  directional?: boolean;
  easing?: string;
  // keyframes for the "enter" direction; {D} placeholders replaced by direction vector
  frames: string;
}

const dirVec = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] } as const;

export const ANIMATIONS: AnimDef[] = [
  { id: 'rise', label: 'Rise', group: 'basic', directional: true, frames: 'from{opacity:0;transform:translate({X}px,{Y}px)}to{opacity:1;transform:none}' },
  { id: 'pan', label: 'Pan', group: 'basic', directional: true, frames: 'from{opacity:0;transform:translate({X3}px,{Y3}px)}to{opacity:1;transform:none}' },
  { id: 'fade', label: 'Fade', group: 'basic', frames: 'from{opacity:0}to{opacity:1}' },
  { id: 'pop', label: 'Pop', group: 'basic', easing: 'cubic-bezier(.2,1.6,.4,1)', frames: 'from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}' },
  { id: 'wipe', label: 'Wipe', group: 'basic', directional: true, frames: 'from{clip-path:inset({WIPE})}to{clip-path:inset(0 0 0 0)}' },
  { id: 'blur', label: 'Blur', group: 'basic', frames: 'from{opacity:0;filter:blur(20px)}to{opacity:1;filter:blur(0)}' },
  { id: 'succession', label: 'Succession', group: 'basic', frames: 'from{opacity:0;transform:translateY(30px) scale(.96)}to{opacity:1;transform:none}' },
  { id: 'breathe', label: 'Breathe', group: 'basic', frames: 'from{opacity:0;transform:scale(1.15)}to{opacity:1;transform:scale(1)}' },
  { id: 'baseline', label: 'Baseline', group: 'basic', directional: true, frames: 'from{clip-path:inset(100% 0 0 0);transform:translateY(40px)}to{clip-path:inset(0);transform:none}' },
  { id: 'drift', label: 'Drift', group: 'basic', directional: true, easing: 'cubic-bezier(.2,.8,.2,1)', frames: 'from{opacity:0;transform:translate({X2}px,{Y2}px)}to{opacity:1;transform:none}' },
  { id: 'tectonic', label: 'Tectonic', group: 'basic', directional: true, frames: 'from{opacity:0;transform:translate({X}px,{Y}px) skew(-8deg)}to{opacity:1;transform:none}' },
  { id: 'block', label: 'Block', group: 'text', frames: 'from{clip-path:inset(0 100% 0 0);background:currentColor}60%{clip-path:inset(0 0 0 0)}to{clip-path:inset(0)}' },
  { id: 'ascend', label: 'Ascend', group: 'text', frames: 'from{opacity:0;transform:translateY(60%)}to{opacity:1;transform:none}' },
  { id: 'shift', label: 'Shift', group: 'text', frames: 'from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:none}' },
  { id: 'merge', label: 'Merge', group: 'text', frames: 'from{opacity:0;letter-spacing:.5em}to{opacity:1}' },
  { id: 'typewriter', label: 'Typewriter', group: 'text', easing: 'steps(24,end)', frames: 'from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}' },
  { id: 'spread', label: 'Spread', group: 'text', frames: 'from{opacity:0;letter-spacing:-.3em}to{opacity:1}' },
  { id: 'tumble', label: 'Tumble', group: 'exaggerate', frames: 'from{opacity:0;transform:rotate(-180deg) scale(.2)}to{opacity:1;transform:none}' },
  { id: 'neon', label: 'Neon', group: 'exaggerate', easing: 'linear', frames: '0%{opacity:0}10%{opacity:1}20%{opacity:.2}30%{opacity:1}40%{opacity:.4}55%{opacity:1}to{opacity:1}' },
  { id: 'scrapbook', label: 'Scrapbook', group: 'exaggerate', frames: 'from{opacity:0;transform:rotate(-12deg) scale(1.3)}60%{opacity:1;transform:rotate(4deg) scale(.95)}to{transform:none}' },
  { id: 'stomp', label: 'Stomp', group: 'exaggerate', easing: 'cubic-bezier(.5,0,.75,0)', frames: 'from{opacity:0;transform:scale(3)}70%{opacity:1;transform:scale(.92)}to{transform:scale(1)}' },
  { id: 'bounce', label: 'Bounce', group: 'exaggerate', directional: true, frames: '0%{opacity:0;transform:translate({X3}px,{Y3}px)}60%{opacity:1;transform:translate({XN}px,{YN}px)}80%{transform:translate({XN2}px,{YN2}px)}to{transform:none}' },
  { id: 'roll', label: 'Roll', group: 'exaggerate', directional: true, frames: 'from{opacity:0;transform:translate({X3}px,{Y3}px) rotate(-360deg)}to{opacity:1;transform:none}' },
  { id: 'skate', label: 'Skate', group: 'exaggerate', directional: true, frames: 'from{opacity:0;transform:translate({X3}px,{Y3}px) skewX(25deg)}70%{opacity:1;transform:skewX(-8deg)}to{transform:none}' },
  { id: 'burst', label: 'Burst', group: 'exaggerate', easing: 'cubic-bezier(.2,1.8,.4,1)', frames: 'from{opacity:0;transform:scale(0) rotate(30deg)}to{opacity:1;transform:none}' },
  { id: 'clarify', label: 'Clarify', group: 'exaggerate', frames: 'from{opacity:0;filter:blur(30px);transform:scale(1.4)}to{opacity:1;filter:none;transform:none}' },
  { id: 'photo-zoom', label: 'Photo zoom', group: 'photo', frames: 'from{transform:scale(1.35)}to{transform:scale(1)}' },
  { id: 'photo-rise', label: 'Photo rise', group: 'photo', frames: 'from{opacity:0;transform:translateY(25%) scale(1.1)}to{opacity:1;transform:none}' },
  { id: 'photo-flow', label: 'Photo flow', group: 'photo', directional: true, frames: 'from{transform:translate({X2}px,{Y2}px) scale(1.15)}to{transform:none}' },
  { id: 'photo-slide', label: 'Photo slide', group: 'photo', directional: true, frames: 'from{clip-path:inset({WIPE});transform:scale(1.1)}to{clip-path:inset(0);transform:none}' },
  // Emphasis (loops while on screen)
  { id: 'pulse', label: 'Pulse', group: 'emphasis', frames: '0%,100%{transform:scale(1)}50%{transform:scale(1.08)}' },
  { id: 'wiggle', label: 'Wiggle', group: 'emphasis', frames: '0%,100%{transform:rotate(0)}25%{transform:rotate(-5deg)}75%{transform:rotate(5deg)}' },
  { id: 'flicker', label: 'Flicker', group: 'emphasis', frames: '0%,100%{opacity:1}45%{opacity:1}50%{opacity:.3}55%{opacity:1}' },
  { id: 'rotate', label: 'Rotate', group: 'emphasis', frames: 'from{transform:rotate(0)}to{transform:rotate(360deg)}' },
  { id: 'hop', label: 'Hop', group: 'emphasis', frames: '0%,100%{transform:translateY(0)}50%{transform:translateY(-12%)}' },
  { id: 'float', label: 'Float', group: 'emphasis', frames: '0%,100%{transform:translateY(0)}50%{transform:translateY(-4%)}' },
];

export const animById = (id?: string) => ANIMATIONS.find((a) => a.id === id);

const DIRS = ['up', 'down', 'left', 'right'] as const;

function framesFor(def: AnimDef, dir: (typeof DIRS)[number]) {
  const [vx, vy] = dirVec[dir];
  const wipe = { up: '100% 0 0 0', down: '0 0 100% 0', left: '0 0 0 100%', right: '0 100% 0 0' }[dir];
  return def.frames
    .replace(/\{X\}/g, String(vx * 40))
    .replace(/\{Y\}/g, String(vy * 40))
    .replace(/\{X2\}/g, String(vx * 120))
    .replace(/\{Y2\}/g, String(vy * 120))
    .replace(/\{X3\}/g, String(vx * 300))
    .replace(/\{Y3\}/g, String(vy * 300))
    .replace(/\{XN\}/g, String(vx * -20))
    .replace(/\{YN\}/g, String(vy * -20))
    .replace(/\{XN2\}/g, String(vx * 8))
    .replace(/\{YN2\}/g, String(vy * 8))
    .replace(/\{WIPE\}/g, wipe);
}

let injected = false;
/** Inject @keyframes for every animation × direction (once). */
export function ensureAnimCss() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const css: string[] = [];
  for (const def of ANIMATIONS) {
    if (def.directional) for (const d of DIRS) css.push(`@keyframes cream-${def.id}-${d}{${framesFor(def, d)}}`);
    else css.push(`@keyframes cream-${def.id}{${def.frames}}`);
  }
  const st = document.createElement('style');
  st.id = 'cream-anim-css';
  st.textContent = css.join('\n');
  document.head.appendChild(st);
}

export function animKeyframesCss(): string {
  ensureAnimCss();
  return document.getElementById('cream-anim-css')?.textContent ?? '';
}

/**
 * CSS animation for an element when its page is shown.
 * `index` staggers elements; `pageAnim` applies when the element has none of its own.
 */
export function animStyle(el: El, index: number, pageAnim?: Anim, opts: { exit?: boolean; paused?: boolean; delayBase?: number } = {}): CSSProperties {
  const a = el.anim ?? pageAnim;
  if (!a) return {};
  ensureAnimCss();
  const parts: string[] = [];
  const def = animById(a.name);
  const dur = Math.max(0.1, Math.min(10, a.duration || 0.8));
  const delay = (opts.delayBase ?? 0) + index * 0.12 + (el.timing?.start ?? 0);
  if (def && def.group !== 'emphasis' && (a.on === 'enter' || a.on === 'both') && !opts.exit) {
    const name = def.directional ? `cream-${def.id}-${a.direction ?? 'up'}` : `cream-${def.id}`;
    parts.push(`${name} ${dur}s ${def.easing ?? 'cubic-bezier(.22,.9,.3,1)'} ${delay}s both`);
  }
  if (def && opts.exit && (a.on === 'exit' || a.on === 'both')) {
    const name = def.directional ? `cream-${def.id}-${a.direction ?? 'up'}` : `cream-${def.id}`;
    parts.push(`${name} ${dur}s ${def.easing ?? 'ease-in'} 0s both reverse`);
  }
  const emph = animById(a.emphasis ?? (def?.group === 'emphasis' ? def.id : undefined));
  if (emph) parts.push(`cream-${emph.id} ${emph.id === 'rotate' ? 4 : 1.6}s ease-in-out ${delay + (def?.group === 'emphasis' ? 0 : dur)}s infinite`);
  if (!parts.length) return {};
  return { animation: parts.join(', '), animationPlayState: opts.paused ? 'paused' : 'running' };
}

/** Total time (s) for all entrance animations on a page — used by autoplay/video export. */
export function pageAnimEnd(elements: El[], pageAnim?: Anim) {
  let t = 0;
  elements.forEach((e, i) => {
    const a = e.anim ?? pageAnim;
    if (!a) return;
    t = Math.max(t, i * 0.12 + (e.timing?.start ?? 0) + (a.duration || 0.8));
  });
  return t;
}
