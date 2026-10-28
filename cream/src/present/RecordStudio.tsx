// "Present and record" recording studio: slides + webcam bubble composited on a canvas and
// recorded with the microphone via MediaRecorder.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Design } from '../model/types';
import { Icon, Spinner } from '../ui/ui';
import { useApp } from '../store/app';
import { pageImages, pickVideoMime, downloadBlob, safeName } from '../export/exporters';
import { visiblePages, fmtClock } from './shared';
import { SlideStage, useSize } from './Stage';

export interface RecordPrefs {
  camera: boolean;
  mic: boolean;
  cameraId?: string;
  micId?: string;
}

export const RECORD_PREFS_KEY = 'cream-record-devices';

export function loadRecordPrefs(): RecordPrefs {
  try {
    return { camera: true, mic: true, ...JSON.parse(sessionStorage.getItem(RECORD_PREFS_KEY) || localStorage.getItem(RECORD_PREFS_KEY) || '{}') };
  } catch {
    return { camera: true, mic: true };
  }
}

type Phase = 'loading' | 'ready' | 'recording' | 'paused' | 'done';

export function RecordStudio({ design, onExit }: { design: Design; onExit: () => void }) {
  const pages = useMemo(() => visiblePages(design), [design]);
  const prefs = useMemo(loadRecordPrefs, []);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [progress, setProgress] = useState('Preparing slides');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camError, setCamError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ url: string; blob: Blob; ext: string } | null>(null);
  const [stageRef, size] = useSize<HTMLDivElement>();
  const images = useRef<HTMLCanvasElement[]>([]);
  const camVideo = useRef<HTMLVideoElement>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const indexRef = useRef(0);
  indexRef.current = index;
  const fade = useRef({ from: 0, to: 0, at: 0 });

  // Load camera / mic and pre-render slide images.
  useEffect(() => {
    let alive = true;
    let ms: MediaStream | null = null;
    (async () => {
      if (prefs.camera || prefs.mic) {
        try {
          ms = await navigator.mediaDevices.getUserMedia({
            video: prefs.camera ? (prefs.cameraId ? { deviceId: { exact: prefs.cameraId } } : { width: 640, height: 480 }) : false,
            audio: prefs.mic ? (prefs.micId ? { deviceId: { exact: prefs.micId } } : true) : false,
          });
          if (!alive) return ms.getTracks().forEach((t) => t.stop());
          setStream(ms);
        } catch (e) {
          setCamError('Camera/microphone unavailable: ' + (e as Error).message);
        }
      }
      try {
        const scale = Math.min(1, 1280 / design.width);
        images.current = await pageImages({ ...design, pages }, scale, (f, l) => alive && setProgress(`${l} (${Math.round(f * 100)}%)`));
      } catch (e) {
        console.error(e);
      }
      if (alive) setPhase('ready');
    })();
    return () => {
      alive = false;
      ms?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (camVideo.current && stream) {
      camVideo.current.srcObject = stream;
      camVideo.current.play().catch(() => {});
    }
  }, [stream, phase]);

  useEffect(() => {
    fade.current = { from: fade.current.to, to: index, at: performance.now() };
  }, [index]);

  useEffect(() => {
    if (phase !== 'recording') return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Keyboard navigation.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        setIndex((i) => Math.min(pages.length - 1, i + 1));
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) setIndex((i) => Math.max(0, i - 1));
      else if (e.key === 'Escape' && phase !== 'recording') onExit();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [pages.length, phase]);

  const start = () => {
    const first = images.current[0];
    const W = 1280;
    const H = Math.round((W * (first?.height ?? 720)) / (first?.width ?? 1280) / 2) * 2;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d')!;
    const out = canvas.captureStream(30);
    stream?.getAudioTracks().forEach((t) => out.addTrack(t));
    const { mime, ext } = pickVideoMime();
    const r = new MediaRecorder(out, { mimeType: mime || undefined, videoBitsPerSecond: 5_000_000 });
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      clearInterval(loop);
      const blob = new Blob(chunks.current, { type: mime.split(';')[0] || 'video/webm' });
      setResult({ url: URL.createObjectURL(blob), blob, ext });
      setPhase('done');
    };
    const loop = window.setInterval(() => {
      const f = fade.current;
      const cur = images.current[indexRef.current];
      const prev = images.current[f.from];
      const t = Math.min(1, (performance.now() - f.at) / 400);
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, H);
      if (prev && t < 1) g.drawImage(prev, 0, 0, W, H);
      if (cur) {
        g.globalAlpha = t;
        g.drawImage(cur, 0, 0, W, H);
        g.globalAlpha = 1;
      }
      const v = camVideo.current;
      if (v && v.videoWidth && prefs.camera) {
        const d = Math.round(Math.min(W, H) * 0.28);
        const x = 24;
        const y = H - d - 24;
        g.save();
        g.beginPath();
        g.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
        g.closePath();
        g.clip();
        const s = Math.max(d / v.videoWidth, d / v.videoHeight);
        const vw = v.videoWidth * s;
        const vh = v.videoHeight * s;
        g.translate(x + d / 2, 0);
        g.scale(-1, 1); // mirror like the preview
        g.drawImage(v, -vw / 2, y + (d - vh) / 2, vw, vh);
        g.restore();
        g.beginPath();
        g.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
        g.lineWidth = 6;
        g.strokeStyle = '#fff';
        g.stroke();
      }
    }, 1000 / 30);
    r.start(500);
    rec.current = r;
    setElapsed(0);
    setPhase('recording');
  };

  const pause = () => {
    if (rec.current?.state === 'recording') {
      rec.current.pause();
      setPhase('paused');
    } else if (rec.current?.state === 'paused') {
      rec.current.resume();
      setPhase('recording');
    }
  };
  const end = () => rec.current?.state !== 'inactive' && rec.current?.stop();
  const restart = () => {
    if (rec.current && rec.current.state !== 'inactive') {
      rec.current.onstop = null;
      rec.current.stop();
    }
    setResult(null);
    setIndex(0);
    setPhase('ready');
  };

  if (phase === 'done' && result) {
    return (
      <div className="pv-root" data-testid="record-done">
        <div className="pv-top">
          <span className="vw-logo" style={{ fontSize: 18 }}>
            Cream
          </span>
          <span style={{ color: '#a7a1b8' }}>Your recording is ready · {fmtClock(elapsed)}</span>
          <span style={{ flex: 1 }} />
          <button className="pv-btn" onClick={restart}>
            <Icon name="RotateCcw" size={14} /> Re-record
          </button>
          <button
            className="pv-btn primary"
            data-testid="record-download"
            onClick={() => {
              downloadBlob(result.blob, `${safeName(design.title)} recording.${result.ext}`);
              useApp.getState().toast('Recording downloaded', 'success');
            }}
          >
            <Icon name="Download" size={14} /> Download
          </button>
          <button className="pv-btn" onClick={onExit}>
            Done
          </button>
        </div>
        <div style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
          <video src={result.url} controls style={{ maxWidth: '90%', maxHeight: '75vh', borderRadius: 12, background: '#000' }} data-testid="record-preview" />
        </div>
      </div>
    );
  }

  return (
    <div className="pv-root" data-testid="record-root">
      <div className="pv-top">
        <span className="vw-logo" style={{ fontSize: 18 }}>
          Cream
        </span>
        <span style={{ color: '#a7a1b8' }}>Recording studio</span>
        {phase === 'recording' && <span className="rs-rec">REC {fmtClock(elapsed)}</span>}
        {phase === 'paused' && <span style={{ color: '#ffd43b', fontWeight: 700 }}>Paused {fmtClock(elapsed)}</span>}
        <span style={{ flex: 1 }} />
        {phase === 'loading' && (
          <span style={{ color: '#a7a1b8', fontSize: 13 }}>
            <Spinner /> {progress}
          </span>
        )}
        {phase === 'ready' && (
          <>
            <button className="pv-btn" onClick={onExit}>
              Cancel
            </button>
            <button className="pv-btn primary" onClick={start} data-testid="record-start">
              <Icon name="Circle" size={14} /> Start recording
            </button>
          </>
        )}
        {(phase === 'recording' || phase === 'paused') && (
          <>
            <button className="pv-btn" onClick={pause} data-testid="record-pause">
              <Icon name={phase === 'paused' ? 'Play' : 'Pause'} size={14} /> {phase === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button className="pv-btn" onClick={restart}>
              <Icon name="RotateCcw" size={14} /> Restart
            </button>
            <button className="pv-btn primary" onClick={end} data-testid="record-end">
              <Icon name="Square" size={14} /> End recording
            </button>
          </>
        )}
      </div>
      <div className="pv-body">
        <div className="pv-main">
          <div className="pv-cur" ref={stageRef}>
            {size.w > 0 && <SlideStage design={design} pages={pages} index={index} w={size.w} h={size.h} />}
            {prefs.camera && (
              <div className="rs-cam" data-testid="record-camera">
                {stream ? <video ref={camVideo} muted playsInline /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 12, padding: 16, textAlign: 'center' }}>{camError || 'Starting camera…'}</div>}
              </div>
            )}
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
            <button className="pv-btn" onClick={() => setIndex((i) => Math.max(0, i - 1))}>
              <Icon name="ChevronLeft" size={16} />
            </button>
            <span data-testid="record-count">
              {index + 1} / {pages.length}
            </span>
            <button className="pv-btn" onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))} data-testid="record-next">
              <Icon name="ChevronRight" size={16} />
            </button>
          </div>
        </div>
        <div className="pv-side">
          <div className="pv-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h4>Notes</h4>
            <div className="pv-notes" style={{ fontSize: 16 }}>
              {pages[index]?.notes || <span style={{ color: '#8a849a' }}>No notes for this page.</span>}
            </div>
          </div>
          {camError && <div className="pv-card" style={{ color: '#ffb4b4', fontSize: 13 }}>{camError}</div>}
        </div>
      </div>
    </div>
  );
}
