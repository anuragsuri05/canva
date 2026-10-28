import { useEffect, useRef, useState } from 'react';
import type { Draft } from 'immer';
import type { AudioTrack, ImageFilters, VideoEl } from '../model/types';
import { useEditor, useSelected } from '../store/editor';
import { useApp } from '../store/app';
import { useSrc } from '../store/blobs';
import { uid } from '../model/defaults';
import { FILTER_PRESETS, cssFilter, mergeFilters } from '../render/filters';
import { Icon, Segmented, Toggle } from '../ui/ui';
import { Section, TSlider } from './common';
import { startDrag } from './local';
import './toolbar.css';

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, '0')}`;
};

/** Two-thumb range used for trimming. */
export function TrimRange({ start, end, max, onChange, testId }: { start: number; end: number; max: number; onChange: (s: number, e: number) => void; testId?: string }) {
  const step = max > 60 ? 0.5 : 0.1;
  return (
    <div>
      <div className="ct-dual" data-testid={testId} onPointerDownCapture={() => startDrag()}>
        <div className="track" />
        <div className="kept" style={{ left: `${(start / max) * 100}%`, width: `${((end - start) / max) * 100}%` }} />
        <input type="range" min={0} max={max} step={step} value={start} aria-label="Trim start" onChange={(e) => onChange(Math.min(Number(e.target.value), end - step), end)} data-testid={testId && testId + '-start'} />
        <input type="range" min={0} max={max} step={step} value={end} aria-label="Trim end" onChange={(e) => onChange(start, Math.max(Number(e.target.value), start + step))} data-testid={testId && testId + '-end'} />
      </div>
      <div className="row faint" style={{ justifyContent: 'space-between' }}>
        <span>Start {fmt(start)}</span>
        <span>{fmt(end - start)} kept</span>
        <span>End {fmt(end)}</span>
      </div>
    </div>
  );
}

const ADJ: { key: keyof ImageFilters; label: string }[] = [
  { key: 'brightness', label: 'Brightness' },
  { key: 'contrast', label: 'Contrast' },
  { key: 'saturation', label: 'Saturation' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'tint', label: 'Tint' },
  { key: 'vignette', label: 'Vignette' },
  { key: 'blur', label: 'Blur' },
];

export default function VideoPanel() {
  const el = useSelected().find((e): e is VideoEl => e.type === 'video');
  const url = useSrc(el?.src);
  const ref = useRef<HTMLVideoElement>(null);
  const [tab, setTab] = useState<'edit' | 'filters' | 'adjust'>('edit');
  useEffect(() => {
    const v = ref.current;
    if (!v || !el) return;
    v.playbackRate = el.speed;
    v.volume = el.volume;
    if (v.currentTime < el.trimStart || v.currentTime > el.trimEnd) v.currentTime = el.trimStart;
  }, [el?.speed, el?.volume, el?.trimStart, el?.trimEnd]);
  if (!el) return <div className="empty">Select a video to edit it.</div>;
  const upd = (fn: (v: Draft<VideoEl>) => void, c?: string) => useEditor.getState().updateEl(el.id, (e) => fn(e as Draft<VideoEl>), c ? { coalesce: c } : undefined);
  const dur = Math.max(0.1, el.duration || el.trimEnd || 1);
  const f = mergeFilters(el.filters);

  return (
    <div data-testid="video-panel">
      <div style={{ borderRadius: 8, overflow: 'hidden', background: '#000', marginBottom: 12, aspectRatio: `${el.naturalW || 16} / ${el.naturalH || 9}` }}>
        <video
          ref={ref}
          src={url}
          poster={el.poster}
          controls
          muted={el.volume === 0}
          style={{ width: '100%', height: '100%', display: 'block', filter: cssFilter(f) }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.currentTime >= el.trimEnd) {
              v.currentTime = el.trimStart;
              if (!el.loop) v.pause();
            }
          }}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && Math.abs(d - el.duration) > 0.2) upd((v) => {
              v.duration = d;
              if (!v.trimEnd || v.trimEnd > d) v.trimEnd = d;
            });
          }}
        />
      </div>
      <div className="tabs">
        {(['edit', 'filters', 'adjust'] as const).map((t) => (
          <button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)} data-testid={`video-tab-${t}`}>
            {t === 'edit' ? 'Edit' : t === 'filters' ? 'Filters' : 'Adjust'}
          </button>
        ))}
      </div>
      {tab === 'edit' && (
        <>
          <Section title="Trim">
            <TrimRange start={el.trimStart} end={el.trimEnd} max={dur} onChange={(s, e) => upd((v) => void ((v.trimStart = s), (v.trimEnd = e)), 'trim')} testId="video-trim" />
          </Section>
          <Section title="Playback">
            <Toggle label="Autoplay" on={el.autoplay} onChange={(v) => upd((x) => void (x.autoplay = v))} testId="vp-autoplay" />
            <Toggle label="Loop video" on={el.loop} onChange={(v) => upd((x) => void (x.loop = v))} testId="vp-loop" />
            <div className="label" style={{ margin: '8px 0 6px' }}>Speed</div>
            <Segmented
              value={String(el.speed)}
              options={['0.25', '0.5', '0.75', '1', '1.5', '2'].map((v) => ({ value: v, label: v + '×' }))}
              onChange={(v) => upd((x) => void (x.speed = Number(v)))}
            />
            <TSlider label="Speed" value={el.speed} min={0.25} max={2} step={0.05} onChange={(v) => upd((x) => void (x.speed = v), 'speed')} testId="vp-speed" />
          </Section>
          <Section title="Audio">
            <TSlider label="Volume" value={Math.round(el.volume * 100)} min={0} max={100} onChange={(v) => upd((x) => void (x.volume = v / 100), 'vvol')} testId="vp-volume" />
            <button
              className="btn sm block"
              data-testid="vp-extract-audio"
              onClick={() => {
                const track: AudioTrack = {
                  id: uid(),
                  src: el.src,
                  title: (el.credit?.title ?? 'Video') + ' audio',
                  start: 0,
                  trimStart: el.trimStart,
                  duration: el.trimEnd - el.trimStart,
                  sourceDuration: el.duration,
                  volume: el.volume || 1,
                  fadeIn: 0,
                  fadeOut: 0,
                  credit: el.credit,
                };
                useEditor.getState().update((d) => {
                  d.audio.push(track as Draft<AudioTrack>);
                  const f2 = d.pages.flatMap((p) => p.elements).find((x) => x.id === el.id) as Draft<VideoEl> | undefined;
                  if (f2) f2.volume = 0;
                });
                useEditor.setState({ showTimeline: true });
                useApp.getState().toast('Audio extracted to the timeline', 'success');
              }}
            >
              <Icon name="AudioLines" size={14} /> Extract audio
            </button>
          </Section>
          <Section title="Corners">
            <TSlider label="Corner rounding" value={el.radius ?? 0} min={0} max={Math.round(Math.min(el.w, el.h) / 2)} onChange={(v) => upd((x) => void (x.radius = v), 'vrad')} />
          </Section>
        </>
      )}
      {tab === 'filters' && (
        <div className="ct-tiles">
          <button className={'ct-tile' + (!el.filters || !Object.keys(el.filters).length ? ' active' : '')} onClick={() => upd((x) => void (x.filters = {}))}>
            <span className="ct-tile-box">{el.poster ? <img src={el.poster} alt="" /> : <Icon name="Ban" size={20} />}</span>
            <span className="lbl">None</span>
          </button>
          {Object.keys(FILTER_PRESETS).map((name) => (
            <button key={name} className="ct-tile" onClick={() => upd((x) => void (x.filters = { ...FILTER_PRESETS[name] }))} data-testid={`vfilter-${name}`}>
              <span className="ct-tile-box">
                {el.poster ? <img src={el.poster} alt="" style={{ filter: cssFilter(mergeFilters(undefined, name, 50)) }} /> : <span style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#8b3dff,#ff914d)', filter: cssFilter(mergeFilters(undefined, name, 50)) }} />}
              </span>
              <span className="lbl">{name}</span>
            </button>
          ))}
        </div>
      )}
      {tab === 'adjust' && (
        <div>
          <button className="btn sm block" style={{ marginBottom: 10 }} onClick={() => upd((x) => void (x.filters = {}))}>
            <Icon name="RotateCcw" size={14} /> Reset adjustments
          </button>
          {ADJ.map((a) => (
            <TSlider
              key={a.key}
              label={a.label}
              value={el.filters?.[a.key] ?? 0}
              min={a.key === 'vignette' || a.key === 'blur' ? 0 : -100}
              max={100}
              onChange={(v) => upd((x) => void (x.filters = { ...(x.filters ?? {}), [a.key]: v }), 'vf-' + a.key)}
              testId={`vadjust-${a.key}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
