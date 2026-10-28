// Magic Shortcuts while presenting: B blur, C confetti, D drumroll, M mic drop, O bubbles,
// Q quiet, U curtain call, 1–9 countdown timer, X clear.

import { useCallback, useEffect, useRef, useState } from 'react';
import { fmtClock, playBeep, playBoom, playDrumroll, playShh } from './shared';

export interface MagicState {
  blur: boolean;
  banner: { kind: 'drum' | 'quiet'; key: number } | null;
  confetti: number;
  bubbles: number;
  mic: number;
  curtain: boolean;
  countdown: { end: number; key: number } | null;
}

const EMPTY: MagicState = { blur: false, banner: null, confetti: 0, bubbles: 0, mic: 0, curtain: false, countdown: null };

export const MAGIC_SHORTCUTS = [
  { key: 'B', label: 'Blur' },
  { key: 'C', label: 'Confetti' },
  { key: 'D', label: 'Drumroll' },
  { key: 'M', label: 'Mic drop' },
  { key: 'O', label: 'Bubbles' },
  { key: 'Q', label: 'Quiet' },
  { key: 'U', label: 'Curtain call' },
  { key: '1–9', label: 'Timer (minutes)' },
  { key: 'X', label: 'Clear all effects' },
];

export function useMagic() {
  const [fx, setFx] = useState<MagicState>(EMPTY);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const trigger = useCallback((k: string): boolean => {
    const key = k.toLowerCase();
    const now = Date.now();
    switch (key) {
      case 'b':
        setFx((f) => ({ ...f, blur: !f.blur }));
        return true;
      case 'c':
        setFx((f) => ({ ...f, confetti: now }));
        return true;
      case 'd':
        playDrumroll(2.6);
        setFx((f) => ({ ...f, banner: { kind: 'drum', key: now } }));
        later(() => setFx((f) => (f.banner?.key === now ? { ...f, banner: null } : f)), 3600);
        return true;
      case 'm':
        playBoom(1.05);
        setFx((f) => ({ ...f, mic: now }));
        return true;
      case 'o':
        setFx((f) => ({ ...f, bubbles: now }));
        later(() => setFx((f) => (f.bubbles === now ? { ...f, bubbles: 0 } : f)), 9000);
        return true;
      case 'q':
        playShh();
        setFx((f) => ({ ...f, banner: { kind: 'quiet', key: now } }));
        later(() => setFx((f) => (f.banner?.key === now ? { ...f, banner: null } : f)), 3000);
        return true;
      case 'u':
        setFx((f) => ({ ...f, curtain: !f.curtain }));
        return true;
      case 'x':
      case '0':
        setFx(EMPTY);
        return true;
    }
    if (/^[1-9]$/.test(key)) {
      setFx((f) => ({ ...f, countdown: { end: now + Number(key) * 60000, key: now } }));
      return true;
    }
    return false;
  }, []);

  return { fx, trigger, clear: () => setFx(EMPTY) };
}

function Confetti({ seed }: { seed: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const g = c.getContext('2d')!;
    const W = (c.width = window.innerWidth);
    const H = (c.height = window.innerHeight);
    const colors = ['#ff5c8a', '#ffd43b', '#4dabf7', '#69db7c', '#9775fa', '#ff922b'];
    const parts = Array.from({ length: 320 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3,
      y: H + 10,
      vx: (Math.random() - 0.5) * 18,
      vy: -(14 + Math.random() * 16),
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 10,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let raf = 0;
    const t0 = performance.now();
    const step = () => {
      g.clearRect(0, 0, W, H);
      const age = (performance.now() - t0) / 1000;
      for (const p of parts) {
        p.vy += 0.42;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        g.save();
        g.globalAlpha = Math.max(0, Math.min(1, 5 - age));
        g.translate(p.x, p.y);
        g.rotate(p.r);
        g.fillStyle = p.c;
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
        g.restore();
      }
      if (age < 5) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seed]);
  return <canvas ref={ref} className="pr-fx" data-testid="fx-confetti" />;
}

function Bubbles({ seed }: { seed: number }) {
  const items = useRef(
    Array.from({ length: 36 }, (_, i) => ({
      left: Math.random() * 100,
      size: 20 + Math.random() * 70,
      dur: 4 + Math.random() * 4,
      delay: Math.random() * 2.5,
      drift: (Math.random() - 0.5) * 160,
      i,
    })),
  ).current;
  return (
    <div className="pr-fx" key={seed} data-testid="fx-bubbles">
      {items.map((b) => (
        <span
          key={b.i}
          className="pr-bubble"
          style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`, ['--drift' as any]: `${b.drift}px` }}
        />
      ))}
    </div>
  );
}

function Countdown({ end }: { end: number }) {
  const [now, setNow] = useState(Date.now());
  const beeped = useRef(false);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, (end - now) / 1000);
  useEffect(() => {
    if (left === 0 && !beeped.current) {
      beeped.current = true;
      playBeep(880, 0.25, 3);
    }
  }, [left]);
  return (
    <div className={'pr-countdown' + (left === 0 ? ' done' : '')} data-testid="fx-countdown">
      {fmtClock(Math.ceil(left))}
    </div>
  );
}

export function MagicLayer({ fx }: { fx: MagicState }) {
  return (
    <>
      {fx.confetti > 0 && <Confetti key={fx.confetti} seed={fx.confetti} />}
      {fx.bubbles > 0 && <Bubbles seed={fx.bubbles} />}
      {fx.banner?.kind === 'drum' && (
        <div className="pr-fx" key={fx.banner.key} data-testid="fx-drumroll">
          <div className="pr-banner pr-drum">
            🥁<small>Drumroll please…</small>
          </div>
        </div>
      )}
      {fx.banner?.kind === 'quiet' && (
        <div className="pr-fx" key={fx.banner.key} style={{ background: 'rgba(0,0,0,.55)' }} data-testid="fx-quiet">
          <div className="pr-banner">
            🤫<small>Shh…</small>
          </div>
        </div>
      )}
      {fx.mic > 0 && (
        <div className="pr-fx" key={fx.mic} data-testid="fx-micdrop">
          <div className="pr-darken" />
          <div className="pr-mic">🎤</div>
        </div>
      )}
      {fx.curtain && (
        <div className="pr-fx" data-testid="fx-curtain">
          <div className="pr-curtain l" />
          <div className="pr-curtain r" />
          <div className="pr-banner" style={{ animationDelay: '1.3s', fontSize: 'min(9vw,110px)' }}>
            👏 Bravo!
          </div>
        </div>
      )}
      {fx.countdown && <Countdown key={fx.countdown.key} end={fx.countdown.end} />}
    </>
  );
}
