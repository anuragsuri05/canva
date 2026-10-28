import { useEffect, useRef, useState } from 'react';
import { Icon, Toggle } from '../ui/ui';
import { playBeep, audioCtx, fmtClock } from '../present/shared';
import './collab.css';

// Module-level timer state so it keeps running when the panel is closed and reopened.
const timer = { total: 300, left: 300, running: false, endAt: 0, listeners: new Set<() => void>(), beeped: false, music: false };
let tickId = 0;
let musicNodes: { stop: () => void } | null = null;

function emit() {
  timer.listeners.forEach((l) => l());
}

function startMusic() {
  try {
    const c = audioCtx();
    const g = c.createGain();
    g.gain.value = 0.05;
    g.connect(c.destination);
    // A gentle looping arpeggio.
    const notes = [261.6, 329.6, 392, 523.3, 392, 329.6];
    let i = 0;
    let stopped = false;
    const play = () => {
      if (stopped) return;
      const o = c.createOscillator();
      const eg = c.createGain();
      o.type = 'triangle';
      o.frequency.value = notes[i++ % notes.length];
      eg.gain.setValueAtTime(0.0001, c.currentTime);
      eg.gain.exponentialRampToValueAtTime(1, c.currentTime + 0.02);
      eg.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.45);
      o.connect(eg).connect(g);
      o.start();
      o.stop(c.currentTime + 0.5);
      id = window.setTimeout(play, 400);
    };
    let id = window.setTimeout(play, 0);
    musicNodes = { stop: () => ((stopped = true), clearTimeout(id), g.disconnect()) };
  } catch {
    /* audio unavailable */
  }
}
function stopMusic() {
  musicNodes?.stop();
  musicNodes = null;
}

function tick() {
  if (!timer.running) return;
  timer.left = Math.max(0, (timer.endAt - Date.now()) / 1000);
  if (timer.left <= 0) {
    timer.running = false;
    clearInterval(tickId);
    stopMusic();
    if (!timer.beeped) {
      timer.beeped = true;
      playBeep(880, 0.25, 4);
    }
  }
  emit();
}

export const timerApi = {
  start() {
    if (timer.left <= 0) timer.left = timer.total;
    timer.running = true;
    timer.beeped = false;
    timer.endAt = Date.now() + timer.left * 1000;
    clearInterval(tickId);
    tickId = window.setInterval(tick, 200);
    if (timer.music) startMusic();
    emit();
  },
  pause() {
    timer.running = false;
    clearInterval(tickId);
    stopMusic();
    emit();
  },
  reset() {
    timerApi.pause();
    timer.left = timer.total;
    emit();
  },
  set(secs: number) {
    timerApi.pause();
    timer.total = timer.left = Math.max(1, Math.round(secs));
    emit();
  },
  add(secs: number) {
    timer.total = Math.max(1, timer.total + secs);
    timer.left = Math.max(0, timer.left + secs);
    if (timer.running) timer.endAt += secs * 1000;
    emit();
  },
};

function useTimer() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    timer.listeners.add(l);
    return () => void timer.listeners.delete(l);
  }, []);
  return timer;
}

export default function TimerPanel() {
  const t = useTimer();
  const [custom, setCustom] = useState('');
  const [music, setMusic] = useState(t.music);
  const r = 100;
  const circ = 2 * Math.PI * r;
  const frac = t.total ? t.left / t.total : 0;
  const shown = Math.ceil(t.left);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    timer.music = music;
    if (timer.running) (music ? startMusic : stopMusic)();
  }, [music]);
  return (
    <div data-testid="timer-panel">
      <div className="tm-ring">
        <svg width={220} height={220} viewBox="0 0 220 220">
          <circle cx={110} cy={110} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={10} />
          <circle cx={110} cy={110} r={r} fill="none" stroke={t.left <= 0 ? 'var(--danger)' : 'var(--primary)'} strokeWidth={10} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} style={{ transition: 'stroke-dashoffset .2s linear' }} />
        </svg>
        <div className={'tm-display' + (t.left <= 0 ? ' done' : '')} data-testid="timer-display">
          {fmtClock(shown)}
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'center', margin: '14px 0' }}>
        <button className="btn" onClick={() => timerApi.add(-60)} title="−1 min">
          −1m
        </button>
        {t.running ? (
          <button className="btn primary lg" onClick={timerApi.pause} data-testid="timer-pause">
            <Icon name="Pause" size={18} /> Pause
          </button>
        ) : (
          <button className="btn primary lg" onClick={timerApi.start} data-testid="timer-start">
            <Icon name="Play" size={18} /> {t.left > 0 && t.left < t.total ? 'Resume' : 'Start'}
          </button>
        )}
        <button className="btn" onClick={() => timerApi.add(60)} title="+1 min">
          +1m
        </button>
      </div>
      <button className="btn block" onClick={timerApi.reset} data-testid="timer-reset">
        <Icon name="RotateCcw" size={16} /> Reset
      </button>
      <div className="xp-section" style={{ fontWeight: 600, fontSize: 13, margin: '16px 0 8px' }}>
        Presets
      </div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        {[1, 2, 3, 5, 10].map((m) => (
          <button key={m} className={'chip' + (t.total === m * 60 ? ' active' : '')} onClick={() => timerApi.set(m * 60)} data-testid={'timer-preset-' + m}>
            {m} min
          </button>
        ))}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <input className="input grow" type="number" min={0.1} step={0.5} placeholder="Custom minutes" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.stopPropagation()} data-testid="timer-custom" />
        <button className="btn" onClick={() => Number(custom) > 0 && timerApi.set(Number(custom) * 60)} data-testid="timer-custom-set">
          Set
        </button>
      </div>
      <div style={{ marginTop: 12 }}>
        <Toggle label="Play music while timer runs" on={music} onChange={setMusic} testId="timer-music" />
      </div>
      <div className="faint">A chime plays when time is up.</div>
    </div>
  );
}
