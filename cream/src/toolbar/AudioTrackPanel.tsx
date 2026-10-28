import { useState } from 'react';
import type { Draft } from 'immer';
import type { AudioTrack } from '../model/types';
import { useEditor } from '../store/editor';
import { useApp } from '../store/app';
import { resolveSrc } from '../store/blobs';
import { Icon, Toggle } from '../ui/ui';
import { Section, TSlider } from './common';
import { TrimRange } from './VideoPanel';
import './toolbar.css';

/** Rough tempo estimate from onset energy peaks (falls back to 120 BPM). */
async function estimateBeat(src: string): Promise<number> {
  try {
    const url = await resolveSrc(src);
    const buf = await (await fetch(url)).arrayBuffer();
    const ctx = new OfflineAudioContext(1, 44100, 44100);
    const audio = await ctx.decodeAudioData(buf);
    const data = audio.getChannelData(0);
    const rate = audio.sampleRate;
    const win = Math.floor(rate / 20); // 50 ms windows
    const n = Math.min(Math.floor(data.length / win), 20 * 60 * 2);
    const energy: number[] = [];
    for (let i = 0; i < n; i++) {
      let e = 0;
      for (let j = i * win; j < (i + 1) * win; j++) e += data[j] * data[j];
      energy.push(e);
    }
    const onsets: number[] = [];
    for (let i = 8; i < energy.length; i++) {
      const avg = energy.slice(i - 8, i).reduce((a, b) => a + b, 0) / 8;
      if (energy[i] > avg * 1.6 && (!onsets.length || i - onsets[onsets.length - 1] > 4)) onsets.push(i);
    }
    const hist = new Map<number, number>();
    for (let i = 1; i < onsets.length; i++) {
      const d = onsets[i] - onsets[i - 1];
      if (d >= 6 && d <= 24) hist.set(d, (hist.get(d) ?? 0) + 1);
    }
    const best = [...hist.entries()].sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] * 0.05 : 0.5;
  } catch {
    return 0.5;
  }
}

export default function AudioTrackPanel() {
  const audioId = useEditor((s) => (s as any).audioId as string | undefined);
  const tracks = useEditor((s) => s.design?.audio);
  const [beat, setBeat] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  if (!tracks) return null;
  const track = tracks.find((t) => t.id === audioId) ?? (tracks.length === 1 ? tracks[0] : undefined);
  if (!track)
    return (
      <div data-testid="audio-panel">
        {tracks.length ? (
          <Section title="Choose a track">
            {tracks.map((t) => (
              <button key={t.id} className="btn sm block" style={{ marginBottom: 6, justifyContent: 'flex-start' }} onClick={() => useEditor.setState({ audioId: t.id } as any)}>
                <Icon name="Music" size={14} /> {t.title}
              </button>
            ))}
          </Section>
        ) : (
          <div className="empty">
            No audio yet. Add music from the <b>Audio</b> tab.
            <br />
            <button className="btn sm" style={{ marginTop: 10 }} onClick={() => useEditor.setState({ side: 'audio' })}>
              Browse audio
            </button>
          </div>
        )}
      </div>
    );

  const upd = (fn: (t: Draft<AudioTrack>) => void, c?: string) =>
    useEditor.getState().update(
      (d) => {
        const t = d.audio.find((x) => x.id === track.id);
        if (t) fn(t);
      },
      c ? { coalesce: c } : undefined,
    );
  const beatSync = !!(track as any).beatSync;
  const src = Math.max(track.sourceDuration || track.duration, 0.1);

  const syncNow = async (on: boolean) => {
    upd((t) => void ((t as any).beatSync = on));
    if (!on) return;
    setBusy(true);
    const b = beat ?? (await estimateBeat(track.src));
    setBeat(b);
    setBusy(false);
    useEditor.getState().update((d) => {
      d.pages.forEach((p) => {
        p.duration = Math.max(b * 2, Math.round(p.duration / b) * b);
      });
    });
    useApp.getState().toast(`Synced page durations to the beat (${Math.round(60 / b)} BPM)`, 'success');
  };

  return (
    <div data-testid="audio-panel">
      <div className="field">
        <label>Title</label>
        <input className="input" value={track.title} onChange={(e) => upd((t) => void (t.title = e.target.value), 'atitle')} onKeyDown={(e) => e.stopPropagation()} data-testid="audio-title" />
      </div>
      <Section title="Trim">
        <TrimRange
          start={track.trimStart}
          end={Math.min(src, track.trimStart + track.duration)}
          max={src}
          onChange={(s, e) => upd((t) => void ((t.trimStart = s), (t.duration = e - s)), 'atrim')}
          testId="audio-trim"
        />
      </Section>
      <Section title="Timing">
        <TSlider label="Start at (s)" value={track.start} min={0} max={Math.max(60, track.start + 10)} step={0.1} onChange={(v) => upd((t) => void (t.start = v), 'astart')} testId="audio-start" />
        <TSlider label="Duration (s)" value={track.duration} min={0.5} max={Math.max(0.5, src - track.trimStart)} step={0.1} onChange={(v) => upd((t) => void (t.duration = v), 'adur')} testId="audio-duration" />
      </Section>
      <Section title="Volume">
        <TSlider value={Math.round(track.volume * 100)} min={0} max={100} onChange={(v) => upd((t) => void (t.volume = v / 100), 'avol')} testId="audio-volume" />
        <button className="btn sm block" onClick={() => useEditor.getState().update((d) => d.audio.forEach((t) => (t.volume = track.volume)))}>
          Balance all tracks to {Math.round(track.volume * 100)}%
        </button>
      </Section>
      <Section title="Fade">
        <TSlider label="Fade in (s)" value={track.fadeIn} min={0} max={10} step={0.1} onChange={(v) => upd((t) => void (t.fadeIn = v), 'afi')} testId="audio-fade-in" />
        <TSlider label="Fade out (s)" value={track.fadeOut} min={0} max={10} step={0.1} onChange={(v) => upd((t) => void (t.fadeOut = v), 'afo')} testId="audio-fade-out" />
      </Section>
      <Section title="Beat Sync">
        <Toggle label={busy ? 'Detecting beat…' : beat ? `Sync to beat (${Math.round(60 / beat)} BPM)` : 'Sync page durations to the beat'} on={beatSync} onChange={syncNow} testId="audio-beat-sync" />
      </Section>
      <button
        className="btn block"
        style={{ color: 'var(--danger)' }}
        onClick={() => {
          useEditor.getState().update((d) => void (d.audio = d.audio.filter((t) => t.id !== track.id)));
          useEditor.setState({ right: null });
        }}
        data-testid="audio-delete"
      >
        <Icon name="Trash2" size={14} /> Delete audio
      </button>
    </div>
  );
}
