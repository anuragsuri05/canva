import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../store/editor';
import { Icon } from '../ui/ui';
import { useSrc } from '../store/blobs';
import type { AudioTrack } from '../model/types';

const PX_PER_S = 40;

/** Multi-track timeline: page clips (scenes) + audio tracks, playhead, play/pause, split. */
export function Timeline() {
  const design = useEditor((s) => s.design)!;
  const pageId = useEditor((s) => s.pageId);
  const playing = useEditor((s) => s.playing);
  const time = useEditor((s) => s.time);
  const [scale, setScale] = useState(1);
  const pps = PX_PER_S * scale;
  const total = design.pages.reduce((a, p) => a + (p.hidden ? 0 : p.duration), 0);
  const raf = useRef(0);

  // Playback clock: advances time and follows the active page.
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      const s = useEditor.getState();
      let t = s.time + (now - last) / 1000;
      last = now;
      const d = s.design!;
      const tot = d.pages.reduce((a, p) => a + (p.hidden ? 0 : p.duration), 0);
      if (t >= tot) {
        useEditor.setState({ playing: false, time: 0 });
        return;
      }
      let acc = 0;
      let pid = d.pages[0].id;
      for (const p of d.pages) {
        if (p.hidden) continue;
        if (t < acc + p.duration) {
          pid = p.id;
          break;
        }
        acc += p.duration;
      }
      useEditor.setState({ time: t, pageId: pid });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const pageStart = (id: string) => {
    let acc = 0;
    for (const p of design.pages) {
      if (p.id === id) return acc;
      if (!p.hidden) acc += p.duration;
    }
    return acc;
  };

  const startResize = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const p = design.pages.find((x) => x.id === id)!;
    const x0 = e.clientX;
    const d0 = p.duration;
    useEditor.getState().begin();
    const mv = (ev: PointerEvent) => {
      const nd = Math.max(0.5, Math.min(120, Math.round((d0 + (ev.clientX - x0) / pps) * 10) / 10));
      useEditor.getState().patchPage(id, { duration: nd });
    };
    const up = () => {
      useEditor.getState().commit();
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };

  const splitAtPlayhead = () => {
    const s = useEditor.getState();
    const p = design.pages.find((x) => x.id === s.pageId);
    if (!p) return;
    const local = s.time - pageStart(p.id);
    if (local <= 0.2 || local >= p.duration - 0.2) return;
    s.duplicatePage(p.id);
    const nd = useEditor.getState().design!;
    const i = nd.pages.findIndex((x) => x.id === p.id);
    s.patchPage(p.id, { duration: Math.round(local * 10) / 10 });
    s.patchPage(nd.pages[i + 1].id, { duration: Math.round((p.duration - local) * 10) / 10 });
  };

  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = Math.max(0, Math.min(total, (e.clientX - r.left + e.currentTarget.scrollLeft) / pps));
    let acc = 0;
    let pid = design.pages[0].id;
    for (const p of design.pages) {
      if (p.hidden) continue;
      if (t < acc + p.duration) {
        pid = p.id;
        break;
      }
      acc += p.duration;
    }
    useEditor.setState({ time: t, pageId: pid });
  };

  return (
    <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '6px 12px 10px', flex: 'none' }} data-testid="timeline">
      <div className="row" style={{ marginBottom: 6 }}>
        <button className="icon-btn" title={playing ? 'Pause (Space)' : 'Play (Space)'} onClick={() => useEditor.setState({ playing: !playing })} data-testid="timeline-play">
          <Icon name={playing ? 'Pause' : 'Play'} />
        </button>
        <span className="faint" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {fmt(time)} / {fmt(total)}
        </span>
        <button className="btn ghost sm" onClick={splitAtPlayhead} title="Split page at playhead (S)">
          <Icon name="Scissors" size={15} /> Split
        </button>
        <span className="grow" />
        <button className="icon-btn" onClick={() => setScale((v) => Math.max(0.25, v / 1.4))} title="Zoom out timeline">
          <Icon name="ZoomOut" size={16} />
        </button>
        <button className="icon-btn" onClick={() => setScale((v) => Math.min(6, v * 1.4))} title="Zoom in timeline">
          <Icon name="ZoomIn" size={16} />
        </button>
        <button className="icon-btn" onClick={() => useEditor.setState({ showTimeline: false })} title="Hide timeline">
          <Icon name="ChevronDown" size={16} />
        </button>
      </div>
      <div style={{ position: 'relative', overflowX: 'auto' }} onPointerDown={seek}>
        <div style={{ position: 'relative', width: Math.max(total * pps + 120, 400), minHeight: 40 }}>
          <div className="row" style={{ gap: 2, height: 52 }}>
            {design.pages.map((p, i) =>
              p.hidden ? null : (
                <div
                  key={p.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    useEditor.setState({ pageId: p.id, time: pageStart(p.id) });
                  }}
                  style={{
                    width: p.duration * pps - 2,
                    height: 52,
                    borderRadius: 8,
                    background: 'var(--surface-3)',
                    border: p.id === pageId ? '2px solid var(--primary)' : '1px solid var(--border)',
                    position: 'relative',
                    overflow: 'hidden',
                    flex: 'none',
                    fontSize: 11,
                    padding: '4px 8px',
                    cursor: 'pointer',
                  }}
                  data-testid={`clip-${i}`}
                >
                  <b>{i + 1}</b> {p.title} <span className="faint">{p.duration.toFixed(1)}s</span>
                  {p.transition && p.transition.type !== 'none' && <Icon name="ArrowRightLeft" size={11} style={{ position: 'absolute', right: 12, top: 4 }} />}
                  <div onPointerDown={(e) => startResize(p.id, e)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', background: 'rgba(139,61,255,.25)' }} title="Drag to change duration" />
                </div>
              ),
            )}
            <button className="btn sm" style={{ height: 52 }} onPointerDown={(e) => e.stopPropagation()} onClick={() => useEditor.getState().addPage()}>
              <Icon name="Plus" size={15} />
            </button>
          </div>
          {design.audio.map((a) => (
            <AudioRow key={a.id} track={a} pps={pps} />
          ))}
          <div style={{ position: 'absolute', left: time * pps, top: -4, bottom: 0, width: 2, background: 'var(--accent)', pointerEvents: 'none' }} />
        </div>
      </div>
    </div>
  );
}

function AudioRow({ track, pps }: { track: AudioTrack; pps: number }) {
  const playing = useEditor((s) => s.playing);
  const time = useEditor((s) => s.time);
  const src = useSrc(track.src);
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.volume = track.volume;
    const local = time - track.start;
    if (playing && local >= 0 && local < track.duration) {
      if (a.paused) {
        a.currentTime = track.trimStart + local;
        a.play().catch(() => {});
      }
    } else if (!a.paused) a.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, Math.floor(time * 4)]);
  return (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        useEditor.setState({ right: 'audio', audioId: track.id } as any);
      }}
      style={{
        marginTop: 4,
        marginLeft: track.start * pps,
        width: track.duration * pps,
        height: 26,
        borderRadius: 6,
        background: 'linear-gradient(90deg,#c9b8ff,#a78bfa)',
        color: '#2b1d5c',
        fontSize: 11,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 8px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,.35) 0 2px, transparent 2px 5px)',
      }}
      data-testid="audio-track"
    >
      <Icon name="Music" size={12} /> {track.title}
      <audio ref={ref} src={src} preload="auto" crossOrigin="anonymous" />
    </div>
  );
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}.${Math.floor((t % 1) * 10)}`;
