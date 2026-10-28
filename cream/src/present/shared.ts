import { useMemo } from 'react';
import { useApp } from '../store/app';
import type { Design, Page, Transition } from '../model/types';
import { decodeDesign } from '../export/shareLinks';
import { pageAnimEnd } from '../render/animation';

/** Split `id?query` (view links can carry `?template=1`). */
export function parseIdParam(raw: string): { id: string; params: URLSearchParams } {
  const [id, q] = raw.split('?');
  return { id, params: new URLSearchParams(q ?? '') };
}

/** Find a design by local id, or decode one carried in a `z…` link. */
export function useDesignById(raw: string): { design: Design | null; local: boolean; params: URLSearchParams } {
  const { id, params } = useMemo(() => parseIdParam(raw), [raw]);
  const localDesign = useApp((s) => s.designs[id]);
  const decoded = useMemo(() => (localDesign ? null : decodeDesign(id)), [id, localDesign]);
  return { design: localDesign ?? decoded, local: !!localDesign, params };
}

export const visiblePages = (d: Design): Page[] => {
  const v = d.pages.filter((p) => !p.hidden);
  return v.length ? v : d.pages;
};

export interface TransitionPlan {
  outAnim?: string;
  inAnim?: string;
  bar?: string; // color-wipe overlay
  ms: number;
}

const flip = { left: 'right', right: 'left', up: 'down', down: 'up' } as const;

/** CSS animations for a page change. `dir` is +1 forward, -1 back. */
export function transitionPlan(tr: Transition | undefined, dir: number): TransitionPlan | null {
  if (!tr || tr.type === 'none') return null;
  const ms = Math.round(Math.max(0.1, Math.min(2.5, tr.duration || 0.6)) * 1000);
  let d: 'left' | 'right' | 'up' | 'down' = tr.direction ?? 'left';
  if (dir < 0) d = flip[d];
  const e = 'cubic-bezier(.65,0,.35,1)';
  const a = (name: string, ease = e) => `${name} ${ms}ms ${ease} both`;
  switch (tr.type) {
    case 'slide':
      return { ms, inAnim: a(`pr-slide-in-${d}`), outAnim: a(`pr-slide-out-${d}`) };
    case 'flow':
      return { ms, inAnim: a(`pr-flow-in`), outAnim: a(`pr-flow-out`) };
    case 'stack':
      return { ms, inAnim: a(`pr-slide-in-${d === 'left' || d === 'right' ? 'up' : d}`), outAnim: a('pr-stack-out') };
    case 'circle-wipe':
      return { ms, inAnim: a('pr-circle-in') };
    case 'line-wipe':
      return { ms, inAnim: a(`pr-wipe-${d}`) };
    case 'color-wipe':
      return { ms, inAnim: `pr-late-in ${ms}ms linear both`, bar: `pr-colorbar ${ms}ms ${e} both` };
    case 'zoom':
      return { ms, inAnim: a('pr-zoom-in'), outAnim: a('pr-zoom-out') };
    case 'dissolve':
    case 'match-move':
    default:
      return { ms, inAnim: a('pr-fade-in', 'ease') };
  }
}

/** How long a page stays on screen in autoplay. */
export const pageShowTime = (p: Page) => Math.max(p.duration || 5, pageAnimEnd(p.elements, p.pageAnim) + 0.5);

/* ---------- tiny WebAudio sound effects for Magic Shortcuts / timers ---------- */
let ac: AudioContext | null = null;
export function audioCtx() {
  if (!ac) ac = new AudioContext();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function noiseBuffer(c: AudioContext, secs: number) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * secs), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

export function playBeep(freq = 880, dur = 0.18, times = 3) {
  try {
    const c = audioCtx();
    for (let i = 0; i < times; i++) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.value = freq;
      o.type = 'sine';
      const t = c.currentTime + i * (dur + 0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  } catch {
    /* audio unavailable */
  }
}

export function playDrumroll(secs = 2.6) {
  try {
    const c = audioCtx();
    const t0 = c.currentTime;
    const hits = Math.floor(secs * 18);
    for (let i = 0; i < hits; i++) {
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(c, 0.06);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1800;
      const g = c.createGain();
      const t = t0 + i / 18;
      const v = 0.15 + (0.5 * i) / hits;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      src.connect(f).connect(g).connect(c.destination);
      src.start(t);
    }
    // crash cymbal
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 1.6);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5000;
    const g = c.createGain();
    const t = t0 + secs;
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    src.connect(hp).connect(g).connect(c.destination);
    src.start(t);
  } catch {
    /* ignore */
  }
}

export function playBoom(delay = 1.05) {
  try {
    const c = audioCtx();
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.8);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 1.1);
  } catch {
    /* ignore */
  }
}

export function playShh() {
  try {
    const c = audioCtx();
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 1.2);
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 3500;
    f.Q.value = 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.35, c.currentTime + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.2);
    src.connect(f).connect(g).connect(c.destination);
    src.start();
  } catch {
    /* ignore */
  }
}

export const fmtClock = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
};
