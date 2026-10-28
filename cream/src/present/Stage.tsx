import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Design, Page } from '../model/types';
import { PageView } from '../render/PageView';
import { useSrc } from '../store/blobs';
import { transitionPlan, type TransitionPlan } from './shared';

interface Shown {
  cur: number;
  out: number | null;
  plan: TransitionPlan | null;
  key: number;
}

/** Renders the current slide scaled to fit `w × h`, with page transitions and entrance animations. */
export function SlideStage({ design, pages, index, w, h, animate = true, testId }: { design: Design; pages: Page[]; index: number; w: number; h: number; animate?: boolean; testId?: string }) {
  const [shown, setShown] = useState<Shown>({ cur: index, out: null, plan: null, key: 0 });
  const timer = useRef(0);
  useLayoutEffect(() => {
    if (index === shown.cur) return;
    const dir = index > shown.cur ? 1 : -1;
    // Forward uses the outgoing page's transition; going back reuses the one between the two pages.
    const tr = dir > 0 ? pages[shown.cur]?.transition : pages[index]?.transition;
    const plan = Math.abs(index - shown.cur) === 1 || (dir > 0 && index === 0) ? transitionPlan(tr, dir) : transitionPlan(tr ? { ...tr, type: 'dissolve' } : undefined, dir);
    setShown((s) => ({ cur: index, out: plan ? s.cur : null, plan, key: s.key + 1 }));
    clearTimeout(timer.current);
    if (plan) timer.current = window.setTimeout(() => setShown((s) => ({ ...s, out: null, plan: null })), plan.ms + 40);
  }, [index]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const page = pages[shown.cur];
  if (!page) return null;
  const ph = page.height ?? design.height;
  const scale = Math.min(w / design.width, h / ph);
  const pw = design.width * scale;
  const phs = ph * scale;
  const outPage = shown.out != null ? pages[shown.out] : null;
  const ctx = (p: Page) => ({ mode: 'present' as const, pageIndex: design.pages.indexOf(p), pageCount: design.pages.length });
  return (
    <div className="pr-slot" style={{ width: pw, height: phs, overflow: 'hidden' }} data-testid={testId} data-page-index={shown.cur}>
      {outPage && (
        <div className="pr-layer" style={{ animation: shown.plan?.outAnim, zIndex: 1 }}>
          <PageView design={design} page={outPage} scale={Math.min(w / design.width, h / (outPage.height ?? design.height))} ctx={ctx(outPage)} />
        </div>
      )}
      <div className="pr-layer" key={'in' + shown.key} style={{ animation: shown.out != null ? shown.plan?.inAnim : undefined, zIndex: 2 }} data-testid="present-current">
        <PageView design={design} page={page} scale={scale} ctx={ctx(page)} animate={animate} animKey={shown.key} />
      </div>
      {shown.plan?.bar && shown.out != null && <div className="pr-layer" style={{ zIndex: 3, background: '#8b3dff', animation: shown.plan.bar }} />}
    </div>
  );
}

/** Plays the design's audio tracks in sync with a timeline clock (seconds). */
export function AudioTracks({ design, time, playing }: { design: Design; time: number; playing: boolean }) {
  return (
    <>
      {design.audio?.map((t) => (
        <Track key={t.id} track={t} time={time} playing={playing} />
      ))}
    </>
  );
}

function Track({ track, time, playing }: { track: Design['audio'][number]; time: number; playing: boolean }) {
  const src = useSrc(track.src);
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const a = ref.current;
    if (!a || !src) return;
    const local = time - track.start;
    const inside = local >= 0 && local < track.duration;
    if (!playing || !inside) {
      if (!a.paused) a.pause();
      return;
    }
    const want = track.trimStart + local;
    if (Math.abs(a.currentTime - want) > 0.6) a.currentTime = want;
    let vol = track.volume;
    if (track.fadeIn && local < track.fadeIn) vol *= local / track.fadeIn;
    if (track.fadeOut && local > track.duration - track.fadeOut) vol *= Math.max(0, (track.duration - local) / track.fadeOut);
    a.volume = Math.max(0, Math.min(1, vol));
    if (a.paused) a.play().catch(() => {});
  }, [time, playing, src]);
  return src ? <audio ref={ref} src={src} preload="auto" /> : null;
}

/** Window size hook. */
export function useViewport() {
  const [s, setS] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const r = () => setS({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);
  return s;
}

/** Element size hook. */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [s, setS] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setS({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setS({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  return [ref, s] as const;
}
