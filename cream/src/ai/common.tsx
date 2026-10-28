import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, Modal, Spinner } from '../ui/ui';
import { useHasKey, useActiveLabel } from './config';
import './ai.css';

const AISettings = lazy(() => import('./AISettings'));

/* ---------- voice input (Web Speech API) ---------- */
export function useVoice(onText: (t: string) => void) {
  const [on, setOn] = useState(false);
  const rec = useRef<any>(null);
  const SR = typeof window !== 'undefined' ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition : null;
  const toggle = () => {
    if (!SR) return;
    if (on) {
      rec.current?.stop();
      return;
    }
    const r = new SR();
    r.lang = navigator.language || 'en-US';
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e: any) => onText(Array.from(e.results).map((x: any) => x[0].transcript).join(' '));
    r.onend = () => setOn(false);
    r.onerror = () => setOn(false);
    rec.current = r;
    r.start();
    setOn(true);
  };
  useEffect(() => () => rec.current?.abort?.(), []);
  return { supported: !!SR, on, toggle };
}

/* ---------- prompt box ---------- */
export function PromptBox({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  placeholder,
  extra,
  autoFocus,
  rows = 2,
  testId = 'ai-prompt',
  submitTestId = 'ai-generate',
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  busy?: boolean;
  placeholder?: string;
  extra?: ReactNode;
  autoFocus?: boolean;
  rows?: number;
  testId?: string;
  submitTestId?: string;
}) {
  const voice = useVoice((t) => onChange((value ? value + ' ' : '') + t));
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(180, el.scrollHeight) + 'px';
  }, [value]);
  return (
    <div className="ai-prompt">
      <textarea
        ref={ta}
        rows={rows}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        data-testid={testId}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!busy && value.trim()) onSubmit();
          }
        }}
      />
      <div className="ai-prompt-bar">
        {extra}
        <span className="grow" />
        {voice.supported && (
          <button type="button" className={'ai-icon-btn' + (voice.on ? ' on' : '')} title={voice.on ? 'Stop listening' : 'Voice input'} onClick={voice.toggle} data-testid="ai-mic">
            <Icon name={voice.on ? 'MicOff' : 'Mic'} size={16} />
          </button>
        )}
        {busy && onStop ? (
          <button type="button" className="ai-send stop" title="Stop" onClick={onStop} data-testid="ai-stop">
            <Icon name="Square" size={12} />
          </button>
        ) : (
          <button type="button" className="ai-send" title="Generate" disabled={busy || !value.trim()} onClick={onSubmit} data-testid={submitTestId}>
            {busy ? <Spinner /> : <Icon name="ArrowUp" size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function ErrorBox({ error, onRetry, onClose }: { error: string | null; onRetry?: () => void; onClose?: () => void }) {
  const [settings, setSettings] = useState(false);
  if (!error) return null;
  const keyIssue = /api key|AI settings/i.test(error);
  return (
    <div className="ai-error" role="alert" data-testid="ai-error">
      <Icon name="CircleAlert" size={15} />
      <div style={{ flex: 1 }}>
        {error}
        {keyIssue && (
          <div>
            <button className="btn sm ghost" style={{ padding: 0, height: 22, color: 'inherit', textDecoration: 'underline' }} onClick={() => setSettings(true)}>
              Open AI settings
            </button>
          </div>
        )}
      </div>
      {onRetry && (
        <button className="btn sm" onClick={onRetry}>
          Retry
        </button>
      )}
      {onClose && (
        <button className="ai-icon-btn" onClick={onClose} aria-label="Dismiss">
          <Icon name="X" size={14} />
        </button>
      )}
      {settings && <AISettingsModal onClose={() => setSettings(false)} />}
    </div>
  );
}

export function AISettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Cream AI settings" onClose={onClose} size="wide" testId="ai-settings-modal">
      <Suspense fallback={<Spinner />}>
        <AISettings />
      </Suspense>
    </Modal>
  );
}

/** Small "which engine" pill + link to settings. */
export function EngineBadge({ freeLabel = 'Free mode' }: { freeLabel?: string }) {
  const has = useHasKey();
  const label = useActiveLabel();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="chip" style={{ height: 24, fontSize: 11.5, padding: '0 8px' }} onClick={() => setOpen(true)} title="AI settings" data-testid="ai-engine">
        <Icon name={has ? 'KeyRound' : 'Sparkles'} size={12} />
        {has ? label : freeLabel}
      </button>
      {open && <AISettingsModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function KeyNotice({ feature, children }: { feature: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ai-note" data-testid="ai-key-notice">
      <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
        <Icon name="KeyRound" size={14} /> {feature} works best with an AI key
      </div>
      Connect Claude, ChatGPT or Gemini with your own API key — it stays in this browser. {children}
      <div style={{ marginTop: 8 }}>
        <button className="btn sm primary" onClick={() => setOpen(true)} data-testid="ai-setup-key">
          Set up AI
        </button>
      </div>
      {open && <AISettingsModal onClose={() => setOpen(false)} />}
    </div>
  );
}

export function Thinking({ label = 'Thinking' }: { label?: string }) {
  return (
    <span className="ai-thinking">
      <span className="ai-dots">
        <span />
        <span />
        <span />
      </span>
      {label}
    </span>
  );
}

/** Abortable async runner with error state. */
export function useRunner() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  async function run<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setBusy(true);
    setError(null);
    try {
      return await fn(c.signal);
    } catch (e) {
      const err = e as Error & { kind?: string };
      if (err.name !== 'AbortError' && err.kind !== 'stopped' && !c.signal.aborted) setError(err.message || String(e));
      return undefined;
    } finally {
      if (ctl.current === c) {
        setBusy(false);
        ctl.current = null;
      }
    }
  }
  const stop = () => {
    ctl.current?.abort();
    ctl.current = null;
    setBusy(false);
  };
  return { busy, error, setError, run, stop };
}

export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export const ASPECTS = [
  { id: 'square', label: 'Square', icon: 'Square', w: 1024, h: 1024 },
  { id: 'landscape', label: 'Landscape', icon: 'RectangleHorizontal', w: 1344, h: 768 },
  { id: 'portrait', label: 'Portrait', icon: 'RectangleVertical', w: 768, h: 1344 },
] as const;

export const INSPIRE = [
  'A cozy reading nook by a rainy window, warm lamp light, plants',
  'A tiny astronaut tending a garden on the moon',
  'Isometric coffee shop on a floating island at sunrise',
  'A fox wearing a knitted scarf in a snowy pine forest',
  'Retro diner at night with neon signs reflecting in puddles',
  'Minimal still life of ceramics and dried flowers, soft shadows',
  'A whale swimming through clouds above a quiet city',
  'Colorful hot air balloons over lavender fields',
  'Futuristic greenhouse with glowing bioluminescent plants',
  'A vintage bicycle with a basket of sunflowers against a pastel wall',
  'Mountain cabin under the northern lights',
  'Paper-cut ocean scene with layered waves and a lighthouse',
];
