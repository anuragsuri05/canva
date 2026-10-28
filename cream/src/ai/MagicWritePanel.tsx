import { useState } from 'react';
import { Icon, Spinner } from '../ui/ui';
import { useSelected, useEditor } from '../store/editor';
import { useApp } from '../store/app';
import { escapeHtml, htmlToText, uid } from '../model/defaults';
import type { El, TextEl } from '../model/types';
import { ErrorBox, KeyNotice, EngineBadge, useRunner } from './common';
import { useHasKey, memoryNote } from './config';
import { complete } from './providers';
import './ai.css';

const ACTIONS: { id: string; label: string; icon: string; instr: string }[] = [
  { id: 'continue', label: 'Continue writing', icon: 'PenLine', instr: 'Continue the text naturally with one or two more sentences. Return the original text followed by the continuation.' },
  { id: 'rewrite', label: 'Rewrite', icon: 'RefreshCw', instr: 'Rewrite the text with fresh wording, same meaning and similar length.' },
  { id: 'shorten', label: 'Shorten', icon: 'Minimize2', instr: 'Make the text noticeably shorter while keeping the key message.' },
  { id: 'expand', label: 'Expand', icon: 'Maximize2', instr: 'Expand the text with more detail (about twice as long).' },
  { id: 'summarize', label: 'Summarize', icon: 'ListCollapse', instr: 'Summarize the text in one concise sentence.' },
  { id: 'spelling', label: 'Fix spelling', icon: 'SpellCheck', instr: 'Fix spelling, grammar and punctuation only. Change nothing else.' },
  { id: 'formal', label: 'More formal', icon: 'Briefcase', instr: 'Rewrite the text in a more formal, professional tone.' },
  { id: 'fun', label: 'More fun', icon: 'PartyPopper', instr: 'Rewrite the text in a more fun, playful tone (an emoji is OK).' },
];

const OFFLINE: { id: string; label: string; fn: (t: string) => string }[] = [
  { id: 'first', label: 'Shorten to first sentence', fn: (t) => (t.match(/^[\s\S]*?[.!?](\s|$)/)?.[0] ?? t).trim() },
  { id: 'title', label: 'Title Case', fn: (t) => t.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()) },
  { id: 'sentence', label: 'Sentence case', fn: (t) => t.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (_m, a, b) => a + b.toUpperCase()) },
  { id: 'upper', label: 'UPPERCASE', fn: (t) => t.toUpperCase() },
  { id: 'lower', label: 'lowercase', fn: (t) => t.toLowerCase() },
  { id: 'spaces', label: 'Tidy spaces', fn: (t) => t.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').trim() },
];

type Writable = El & { html: string };
const isWritable = (e?: El): e is Writable => !!e && (e.type === 'text' || e.type === 'sticky' || (e.type === 'shape' && !!e.html));

export default function MagicWritePanel() {
  const sel = useSelected();
  const el = sel.find(isWritable);
  const has = useHasKey();
  const voice = useApp((s) => s.brandKits[0]?.voice ?? '');
  const [voiceOn, setVoiceOn] = useState(false);
  const [custom, setCustom] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [last, setLast] = useState<{ instr: string } | null>(null);
  const r = useRunner();
  const source = el ? htmlToText(el.html) : '';

  const run = (instr: string) =>
    r.run(async (signal) => {
      setLast({ instr });
      setResult('');
      const v = voiceOn && voice ? ` Write in this brand voice: ${voice}.` : '';
      const out = await complete({
        system: `You are Magic Write in Cream, a design tool. ${instr}${v} Keep it suitable for a design (concise). Preserve line breaks where sensible. Reply with ONLY the resulting text — no quotes, no preamble.${memoryNote()}`,
        messages: [{ role: 'user', content: source || custom }],
        signal,
        onText: (_d, full) => setResult(full),
        effort: 'low',
      });
      setResult(out.trim().replace(/^"(.*)"$/s, '$1'));
    });

  function replace(text: string) {
    if (!el) return;
    useEditor.getState().updateEl(el.id, { html: escapeHtml(text).replace(/\n/g, '<br>') } as Partial<El>);
    setResult(null);
  }

  function insertBelow(text: string) {
    const s = useEditor.getState();
    if (el && el.type === 'text') {
      const t = el as TextEl;
      const c: TextEl = { ...structuredClone(t), id: uid(), y: t.y + t.h + Math.round(t.fontSize * 0.6), html: escapeHtml(text).replace(/\n/g, '<br>'), groupId: undefined, anim: undefined };
      s.addElements([c]);
    } else if (el) {
      const c = { ...structuredClone(el), id: uid(), y: el.y + el.h + 20, html: escapeHtml(text).replace(/\n/g, '<br>'), groupId: undefined } as El;
      s.addElements([c]);
    }
    setResult(null);
  }

  return (
    <div data-testid="magic-write-panel">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="faint">Write and rewrite with AI</div>
        <EngineBadge freeLabel="Offline tools" />
      </div>
      {!el ? (
        <div className="empty" style={{ padding: '18px 6px' }}>
          <Icon name="TextCursorInput" size={22} />
          <div style={{ marginTop: 8 }}>Select a text box to continue, rewrite, shorten or translate its tone.</div>
        </div>
      ) : (
        <div className="ai-note" style={{ marginBottom: 10, maxHeight: 110, overflow: 'auto', whiteSpace: 'pre-wrap' }} data-testid="magic-write-source">
          {source || <i>Empty text</i>}
        </div>
      )}

      {!has && (
        <KeyNotice feature="Magic Write">
          Without a key you can still use the simple offline text tools below (spelling fixes and rewriting need an AI model).
        </KeyNotice>
      )}

      {has && el && (
        <>
          <div className="col" style={{ gap: 4, marginTop: 4 }}>
            {ACTIONS.map((a) => (
              <button key={a.id} className="btn ghost" style={{ justifyContent: 'flex-start' }} disabled={r.busy} onClick={() => run(a.instr)} data-testid={`magic-write-${a.id}`}>
                <Icon name={a.icon} size={16} /> {a.label}
              </button>
            ))}
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Custom instruction</label>
            <div className="row" style={{ gap: 6 }}>
              <input
                className="input"
                value={custom}
                placeholder="e.g. make it rhyme"
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && custom.trim() && run(`Apply this instruction to the text: ${custom.trim()}`)}
                data-testid="magic-write-custom"
              />
              <button className="btn primary" disabled={!custom.trim() || r.busy} onClick={() => run(`Apply this instruction to the text: ${custom.trim()}`)}>
                Go
              </button>
            </div>
          </div>
          <label className="row" style={{ gap: 6, cursor: voice ? 'pointer' : 'default', fontSize: 13 }} title={voice ? voice : 'Add a brand voice in Brand Kit'}>
            <input type="checkbox" disabled={!voice} checked={voiceOn && !!voice} onChange={(e) => setVoiceOn(e.target.checked)} data-testid="magic-write-voice" />
            Use brand voice {!voice && <span className="faint">(set one in Brand Kit)</span>}
          </label>
        </>
      )}

      {!has && el && (
        <>
          <div className="ai-section-title">Offline tools</div>
          <div className="chips">
            {OFFLINE.map((o) => (
              <button key={o.id} className="chip" onClick={() => setResult(o.fn(source))} data-testid={`magic-write-offline-${o.id}`}>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}

      <ErrorBox error={r.error} onRetry={last ? () => run(last.instr) : undefined} onClose={() => r.setError(null)} />

      {result !== null && (
        <div className="ai-card" style={{ marginTop: 12, padding: 12 }} data-testid="magic-write-result">
          <div className="ai-section-title" style={{ marginTop: 0 }}>
            Result {r.busy && <Spinner />}
          </div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.5, marginBottom: 10 }}>{result || '…'}</div>
          <div className="ai-row">
            <button className="btn sm primary" disabled={r.busy || !result} onClick={() => replace(result)} data-testid="magic-write-replace">
              Replace
            </button>
            <button className="btn sm" disabled={r.busy || !result} onClick={() => insertBelow(result)} data-testid="magic-write-insert">
              Insert below
            </button>
            {last && has && (
              <button className="btn sm ghost" disabled={r.busy} onClick={() => run(last.instr)} data-testid="magic-write-retry">
                <Icon name="RotateCcw" size={14} /> Try again
              </button>
            )}
            <button className="btn sm ghost" onClick={() => setResult(null)}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
