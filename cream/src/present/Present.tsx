import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store/app';
import type { Design, Page } from '../model/types';
import { Icon } from '../ui/ui';
import { PageView } from '../render/PageView';
import { recordPresent } from '../export/shareLinks';
import { useDesignById, visiblePages, pageShowTime, fmtClock, playBeep } from './shared';
import { SlideStage, AudioTracks, useViewport, useSize } from './Stage';
import { MagicLayer, useMagic, MAGIC_SHORTCUTS } from './magic';
import { RecordStudio } from './RecordStudio';
import './present.css';

type Mode = 'full' | 'presenter' | 'autoplay' | 'record';

/** Shared slide index with BroadcastChannel sync between presenter and audience windows. */
function useSyncedIndex(designId: string, count: number) {
  const [index, setIndexRaw] = useState(0);
  const chan = useMemo(() => (typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cream-present-' + designId) : null), [designId]);
  useEffect(() => {
    if (!chan) return;
    chan.onmessage = (e) => {
      if (e.data?.type === 'goto' && typeof e.data.index === 'number') setIndexRaw(Math.max(0, Math.min(count - 1, e.data.index)));
      if (e.data?.type === 'hello') chan.postMessage({ type: 'goto', index: indexRef.current });
    };
    chan.postMessage({ type: 'hello' });
    return () => chan.close();
  }, [chan, count]);
  const indexRef = useRef(0);
  indexRef.current = index;
  const setIndex = useCallback(
    (i: number | ((x: number) => number)) => {
      setIndexRaw((cur) => {
        const n = Math.max(0, Math.min(count - 1, typeof i === 'function' ? i(cur) : i));
        if (n !== cur) chan?.postMessage({ type: 'goto', index: n });
        return n;
      });
    },
    [chan, count],
  );
  return [index, setIndex, chan] as const;
}

function exitTo(designId: string, local: boolean) {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  const app = useApp.getState();
  if (local) app.navigate({ name: 'editor', id: designId });
  else app.navigate({ name: 'view', id: designId });
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

export default function Present({ designId, mode }: { designId: string; mode: Mode }) {
  const { design, local } = useDesignById(designId);
  useEffect(() => {
    if (design) recordPresent(design.id);
  }, [design?.id]);
  if (!design) {
    return (
      <div className="pr-root" style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p>This design couldn't be found.</p>
          <button className="btn" onClick={() => useApp.getState().navigate({ name: 'home', section: 'home' })}>
            Go home
          </button>
        </div>
      </div>
    );
  }
  if (mode === 'presenter') return <PresenterView design={design} routeId={designId} local={local} />;
  if (mode === 'record') return <RecordStudio design={design} onExit={() => exitTo(designId, local)} />;
  return <FullPresent design={design} routeId={designId} local={local} autoplay={mode === 'autoplay'} />;
}

/* ---------------- shared keyboard handling ---------------- */

function useDeckKeys(opts: { next: () => void; prev: () => void; first: () => void; last: () => void; exit: () => void; magic?: (k: string) => boolean; togglePlay?: () => void; menu?: () => void }) {
  const ref = useRef(opts);
  ref.current = opts;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input,textarea,[contenteditable=true],select')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const o = ref.current;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
        case 'Enter':
          e.preventDefault();
          return o.next();
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
        case 'Backspace':
          e.preventDefault();
          return o.prev();
        case 'Home':
          return o.first();
        case 'End':
          return o.last();
        case 'Escape':
          if (document.fullscreenElement) return; // browser exits fullscreen first
          return o.exit();
        case 'f':
        case 'F':
          return toggleFullscreen();
        case 'p':
        case 'P':
          return o.togglePlay?.();
        case '?':
          return o.menu?.();
      }
      if (o.magic?.(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/* ---------------- Full screen / autoplay ---------------- */

function FullPresent({ design, routeId, local, autoplay }: { design: Design; routeId: string; local: boolean; autoplay: boolean }) {
  const pages = useMemo(() => visiblePages(design), [design]);
  const [index, setIndex] = useSyncedIndex(design.id, pages.length);
  const vp = useViewport();
  const { fx, trigger } = useMagic();
  const [playing, setPlaying] = useState(autoplay);
  const [barVisible, setBarVisible] = useState(true);
  const [menu, setMenu] = useState(false);
  const [time, setTime] = useState(0); // timeline seconds (autoplay + audio)
  const hideTimer = useRef(0);

  const starts = useMemo(() => {
    const s: number[] = [];
    let acc = 0;
    for (const p of pages) {
      s.push(acc);
      acc += pageShowTime(p);
    }
    return { s, total: acc };
  }, [pages]);

  const go = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(pages.length - 1, i));
      setIndex(n);
      setTime(starts.s[n] ?? 0);
    },
    [pages.length, starts],
  );

  // In-design links ("#page=<id>") jump to that page.
  useEffect(() => {
    const h = (e: Event) => {
      const i = pages.findIndex((p) => p.id === (e as CustomEvent).detail);
      if (i >= 0) go(i);
    };
    window.addEventListener('cream:goto-page', h);
    return () => window.removeEventListener('cream:goto-page', h);
  }, [pages, go]);

  // Autoplay clock.
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      setTime((t) => {
        let nt = t + dt;
        if (nt >= starts.total) nt = 0; // loop
        return nt;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, starts.total]);
  useEffect(() => {
    if (!playing) return;
    let i = starts.s.length - 1;
    while (i > 0 && starts.s[i] > time) i--;
    if (i !== index) setIndex(i);
  }, [time, playing]);

  const showBar = () => {
    setBarVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setBarVisible(false), 2600);
  };
  useEffect(() => {
    showBar();
    return () => clearTimeout(hideTimer.current);
  }, []);

  const next = () => (index < pages.length - 1 ? go(index + 1) : autoplay ? go(0) : undefined);
  useDeckKeys({
    next,
    prev: () => go(index - 1),
    first: () => go(0),
    last: () => go(pages.length - 1),
    exit: () => exitTo(routeId, local),
    magic: trigger,
    togglePlay: () => setPlaying((p) => !p),
    menu: () => setMenu((m) => !m),
  });

  return (
    <div className={'pr-root' + (barVisible ? '' : ' hide-cursor')} onMouseMove={showBar} data-testid="present-root" data-mode={autoplay ? 'autoplay' : 'full'}>
      <div
        className={'pr-stage' + (fx.blur ? ' pr-blur' : '')}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a,button,video,iframe')) return;
          next();
        }}
      >
        <SlideStage design={design} pages={pages} index={index} w={vp.w} h={vp.h} testId="present-stage" />
      </div>
      <AudioTracks design={design} time={time} playing={playing} />
      <MagicLayer fx={fx} />
      {menu && (
        <div className="pr-menu" data-testid="magic-menu" onMouseMove={(e) => e.stopPropagation()}>
          <h4>Magic Shortcuts</h4>
          {MAGIC_SHORTCUTS.map((m) => (
            <div key={m.key} className="pr-kv" onClick={() => (trigger(m.key === '1–9' ? '1' : m.key), setMenu(false))}>
              <span>{m.label}</span>
              <kbd>{m.key}</kbd>
            </div>
          ))}
        </div>
      )}
      <div className={'pr-bar' + (barVisible || menu ? '' : ' hidden')} data-testid="present-bar" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => go(index - 1)} title="Previous (←)" data-testid="present-prev" disabled={index === 0}>
          <Icon name="ChevronLeft" size={18} />
        </button>
        <span className="pr-count" data-testid="present-count">
          {index + 1} / {pages.length}
        </span>
        <button onClick={next} title="Next (→)" data-testid="present-next">
          <Icon name="ChevronRight" size={18} />
        </button>
        <span className="pr-sep" />
        <button onClick={() => setPlaying((p) => !p)} title={playing ? 'Pause autoplay' : 'Autoplay'} className={playing ? 'on' : ''} data-testid="present-play">
          <Icon name={playing ? 'Pause' : 'Play'} size={16} />
        </button>
        <button onClick={toggleFullscreen} title="Full screen (F)" data-testid="present-fullscreen">
          <Icon name="Maximize" size={16} />
        </button>
        <button onClick={() => setMenu((m) => !m)} title="Magic Shortcuts (?)" className={menu ? 'on' : ''} data-testid="present-magic">
          <Icon name="Sparkles" size={16} />
        </button>
        <span className="pr-sep" />
        <button onClick={() => exitTo(routeId, local)} title="Exit (Esc)" data-testid="present-exit">
          <Icon name="X" size={16} /> Exit
        </button>
      </div>
    </div>
  );
}

/* ---------------- Presenter view ---------------- */

function PresenterView({ design, routeId, local }: { design: Design; routeId: string; local: boolean }) {
  const pages = useMemo(() => visiblePages(design), [design]);
  const [index, setIndex] = useSyncedIndex(design.id, pages.length);
  const [ref, size] = useSize<HTMLDivElement>();
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('cream-notes-size')) || 18);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [countdown, setCountdown] = useState<{ total: number; left: number; running: boolean } | null>(null);
  const [clock, setClock] = useState(new Date());
  const [audience, setAudience] = useState<Window | null>(null);
  const { fx, trigger } = useMagic();

  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date());
      if (running) setElapsed((e) => e + 1);
      setCountdown((c) => {
        if (!c || !c.running || c.left <= 0) return c;
        const left = c.left - 1;
        if (left === 0) playBeep(880, 0.25, 3);
        return { ...c, left };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => localStorage.setItem('cream-notes-size', String(fontSize)), [fontSize]);

  const openAudience = () => {
    const w = window.open(`${location.origin}${location.pathname}#/present/${routeId}/full`, 'cream-audience-' + design.id, 'popup,width=1280,height=720');
    if (!w) useApp.getState().toast('Allow pop-ups to open the audience window', 'error');
    setAudience(w);
  };
  useEffect(() => {
    openAudience();
    return () => {
      /* leave audience window open; it closes when the presenter exits */
    };
  }, []);
  const exit = () => {
    audience?.close();
    exitTo(routeId, local);
  };

  useDeckKeys({
    next: () => setIndex((i) => i + 1),
    prev: () => setIndex((i) => i - 1),
    first: () => setIndex(0),
    last: () => setIndex(pages.length - 1),
    exit,
    magic: trigger,
  });

  const cur = pages[index];
  const nxt: Page | undefined = pages[index + 1];
  const thumbScale = 340 / design.width;
  return (
    <div className="pv-root" data-testid="presenter-root">
      <div className="pv-top">
        <span className="vw-logo" style={{ fontSize: 18 }}>
          Cream
        </span>
        <span className="muted" style={{ color: '#a7a1b8' }}>
          Presenter view · {design.title}
        </span>
        <span className="grow" style={{ flex: 1 }} />
        <span title="Elapsed time" className="pv-time" data-testid="presenter-elapsed">
          {fmtClock(elapsed)}
        </span>
        <button className="pv-btn" onClick={() => setRunning((r) => !r)} title={running ? 'Pause timer' : 'Resume timer'}>
          <Icon name={running ? 'Pause' : 'Play'} size={14} />
        </button>
        <button className="pv-btn" onClick={() => setElapsed(0)} title="Reset timer">
          <Icon name="RotateCcw" size={14} />
        </button>
        <span style={{ width: 1, height: 22, background: '#3b3650' }} />
        {countdown ? (
          <>
            <span className="pv-time" style={{ color: countdown.left === 0 ? '#ff6b6b' : '#ffd43b' }} data-testid="presenter-countdown">
              {fmtClock(countdown.left)}
            </span>
            <button className="pv-btn" onClick={() => setCountdown((c) => c && { ...c, running: !c.running })}>
              <Icon name={countdown.running ? 'Pause' : 'Play'} size={14} />
            </button>
            <button className="pv-btn" onClick={() => setCountdown(null)}>
              <Icon name="X" size={14} />
            </button>
          </>
        ) : (
          <select className="pv-btn" value="" onChange={(e) => e.target.value && setCountdown({ total: Number(e.target.value) * 60, left: Number(e.target.value) * 60, running: true })} data-testid="presenter-countdown-select">
            <option value="">Countdown…</option>
            {[1, 2, 3, 5, 10, 15, 20, 30].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        )}
        <span className="pv-time" style={{ fontSize: 16, opacity: 0.8 }} title="Clock">
          {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button className="pv-btn" onClick={openAudience} title="Open audience window">
          <Icon name="MonitorUp" size={14} /> Audience window
        </button>
        <button className="pv-btn primary" onClick={exit} data-testid="presenter-exit">
          End
        </button>
      </div>
      <div className="pv-body">
        <div className="pv-main">
          <div className="pv-cur" ref={ref}>
            {size.w > 0 && <SlideStage design={design} pages={pages} index={index} w={size.w} h={size.h} testId="presenter-current" />}
            <MagicLayer fx={fx} />
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
            <button className="pv-btn" onClick={() => setIndex((i) => i - 1)} data-testid="presenter-prev">
              <Icon name="ChevronLeft" size={16} /> Previous
            </button>
            <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 70, textAlign: 'center' }} data-testid="presenter-count">
              {index + 1} / {pages.length}
            </span>
            <button className="pv-btn primary" onClick={() => setIndex((i) => i + 1)} data-testid="presenter-next">
              Next <Icon name="ChevronRight" size={16} />
            </button>
          </div>
        </div>
        <div className="pv-side">
          <div className="pv-card">
            <h4>Next</h4>
            {nxt ? (
              <div style={{ borderRadius: 6, overflow: 'hidden', width: 340 }} data-testid="presenter-next-preview">
                <PageView design={design} page={nxt} scale={thumbScale} ctx={{ mode: 'static', pageIndex: design.pages.indexOf(nxt), pageCount: design.pages.length }} />
              </div>
            ) : (
              <div style={{ color: '#a7a1b8', fontSize: 13 }}>End of presentation</div>
            )}
          </div>
          <div className="pv-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h4>Notes</h4>
              <div className="row" style={{ gap: 4 }}>
                <button className="pv-btn" onClick={() => setFontSize((f) => Math.max(10, f - 2))} title="Smaller text" data-testid="notes-smaller">
                  A−
                </button>
                <button className="pv-btn" onClick={() => setFontSize((f) => Math.min(48, f + 2))} title="Larger text" data-testid="notes-larger">
                  A+
                </button>
              </div>
            </div>
            <div className="pv-notes" style={{ fontSize }} data-testid="presenter-notes">
              {cur?.notes?.trim() ? cur.notes : <span style={{ color: '#8a849a' }}>No notes for this page.</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
