import { useState } from 'react';
import { useApp } from '../store/app';
import { Icon, Spinner, Toggle } from '../ui/ui';
import { PROVIDERS, getAI, setAI, useSessionKeys, type ProviderId } from './config';
import { chooseModel, listModels } from './providers';
import './ai.css';

type TestState = { state: 'idle' | 'testing' | 'ok' | 'bad'; msg?: string; models?: string[] };

export default function AISettings() {
  // subscribe so the form re-renders when settings change
  useApp((s) => s.settings.ai);
  useSessionKeys((s) => s.keys);
  const ai = getAI();
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [memory, setMemory] = useState(ai.memory ?? '');
  const [polKey, setPolKey] = useState(() => {
    try {
      return localStorage.getItem('cream-pollinations-key') || sessionStorage.getItem('cream-pollinations-key') || '';
    } catch {
      return '';
    }
  });
  const savePolKey = (v: string) => {
    setPolKey(v);
    try {
      localStorage.removeItem('cream-pollinations-key');
      sessionStorage.removeItem('cream-pollinations-key');
      if (v.trim()) (ai.remember ? localStorage : sessionStorage).setItem('cream-pollinations-key', v.trim());
    } catch {
      /* ignore */
    }
  };

  async function test(p: ProviderId) {
    const key = getAI().keys[p];
    if (!key) return;
    setTests((t) => ({ ...t, [p]: { state: 'testing' } }));
    try {
      const models = await listModels(p, key);
      setTests((t) => ({ ...t, [p]: { state: 'ok', msg: `Key works · ${models.length} models available`, models } }));
      const def = PROVIDERS.find((x) => x.id === p)!.defaultModel;
      const cur = getAI().models[p] || def;
      const best = chooseModel(p, cur, models);
      if (best !== cur) setAI({ models: { [p]: best } });
      if (getAI().provider === 'none') setAI({ provider: p });
    } catch (e) {
      setTests((t) => ({ ...t, [p]: { state: 'bad', msg: (e as Error).message } }));
    }
  }

  const configured = PROVIDERS.filter((p) => ai.keys[p.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }} data-testid="ai-settings">
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>
          <span className="ai-grad-text">Cream AI</span>
        </h2>
        <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
          Bring your own key to unlock Magic Write, Design for me, conversational editing, Cream Code and AI translation tones. Your keys are stored only in this browser and are sent directly to the provider you choose — never to a Cream server (there isn’t one).
        </div>
      </div>

      <div className="ai-note">
        <b>Works without any key:</b> image generation (open models via Pollinations or the AI Horde community queue), translation (MyMemory), text recognition / Grab Text (Tesseract OCR), background removal (open-source model running in your browser), Magic Eraser, Magic Expand, upscaling, rule-based design edits and template-based “Design for me”.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
        {PROVIDERS.map((p) => {
          const key = ai.keys[p.id] ?? '';
          const t = tests[p.id] ?? { state: 'idle' };
          const model = ai.models[p.id] || p.defaultModel;
          return (
            <div key={p.id} className="ai-card ai-provider" data-testid={`ai-provider-${p.id}`}>
              <div className="ai-provider-head">
                <div className="ai-provider-logo" style={{ background: p.color }}>
                  {p.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div className="faint">{p.label}</div>
                </div>
                {ai.provider === p.id && key && <span className="badge">Active</span>}
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>API key</label>
                <div className="row" style={{ gap: 4 }}>
                  <input
                    className="input"
                    type={show[p.id] ? 'text' : 'password'}
                    placeholder={p.keyHint}
                    value={key}
                    autoComplete="off"
                    spellCheck={false}
                    data-testid={`ai-key-${p.id}`}
                    onChange={(e) => {
                      setAI({ keys: { [p.id]: e.target.value.trim() } });
                      setTests((x) => ({ ...x, [p.id]: { state: 'idle' } }));
                    }}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <button className="icon-btn" title={show[p.id] ? 'Hide' : 'Show'} onClick={() => setShow((s) => ({ ...s, [p.id]: !s[p.id] }))}>
                    <Icon name={show[p.id] ? 'EyeOff' : 'Eye'} size={16} />
                  </button>
                </div>
                <a className="faint" href={p.keyUrl} target="_blank" rel="noreferrer">
                  Get a key ↗
                </a>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Model</label>
                {t.models?.length ? (
                  <select className="select" value={model} onChange={(e) => setAI({ models: { [p.id]: e.target.value } })} data-testid={`ai-model-${p.id}`}>
                    {!t.models.includes(model) && <option value={model}>{model}</option>}
                    {t.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input className="input" value={model} onChange={(e) => setAI({ models: { [p.id]: e.target.value.trim() } })} data-testid={`ai-model-${p.id}`} />
                )}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn sm" disabled={!key || t.state === 'testing'} onClick={() => test(p.id)} data-testid={`ai-test-${p.id}`}>
                  {t.state === 'testing' ? <Spinner /> : <Icon name="PlugZap" size={14} />} Test
                </button>
                {key && ai.provider !== p.id && (
                  <button className="btn sm ghost" onClick={() => setAI({ provider: p.id })}>
                    Use {p.name}
                  </button>
                )}
              </div>
              {t.state === 'ok' && (
                <div className="ai-status ok">
                  <Icon name="CircleCheck" size={14} /> {t.msg}
                </div>
              )}
              {t.state === 'bad' && (
                <div className="ai-status bad">
                  <Icon name="CircleAlert" size={14} /> {t.msg}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="ai-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Active provider</label>
          <select className="select" value={ai.provider} onChange={(e) => setAI({ provider: e.target.value as any })} data-testid="ai-active-provider">
            <option value="none">{configured.length ? 'Automatic (first configured key)' : 'None — free tools only'}</option>
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id} disabled={!ai.keys[p.id]}>
                {p.name}
                {ai.keys[p.id] ? '' : ' (no key)'}
              </option>
            ))}
          </select>
        </div>
        <Toggle on={ai.remember} onChange={(v) => setAI({ remember: v })} label="Remember keys on this device" testId="ai-remember" />
        <div className="faint" style={{ marginTop: -6 }}>
          {ai.remember ? 'Keys are saved in this browser’s local storage until you remove them.' : 'Keys are kept only for this browser tab session and forgotten when you close it.'}
        </div>
        {configured.length > 0 && (
          <button className="btn sm ghost" style={{ alignSelf: 'flex-start', color: 'var(--danger, #c0392b)' }} onClick={() => setAI({ keys: { anthropic: '', openai: '', gemini: '' }, provider: 'none' })} data-testid="ai-clear-keys">
            <Icon name="Trash2" size={14} /> Remove all keys
          </button>
        )}
      </div>

      <div className="ai-card" data-testid="ai-image-engine">
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Image generation</div>
        <div className="faint" style={{ lineHeight: 1.5, marginBottom: 10 }}>
          Cream tries engines in this order: Pollinations with your key → keyless Pollinations → your OpenAI or Gemini key → the free AI Horde community queue (open models, no key, but it can take several minutes). Pollinations now limits keyless requests from browsers, so a free Pollinations key gives you fast results.
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Pollinations API key (optional)</label>
          <input className="input" type="password" placeholder="sk_…" value={polKey} onChange={(e) => savePolKey(e.target.value)} autoComplete="off" spellCheck={false} data-testid="ai-key-pollinations" />
          <a className="faint" href="https://enter.pollinations.ai" target="_blank" rel="noreferrer">
            Get a free key ↗
          </a>
        </div>
      </div>

      <div className="ai-card">
        <div className="field" style={{ margin: 0 }}>
          <label>About me · Memory</label>
          <textarea
            className="textarea"
            rows={4}
            placeholder="e.g. I run a small bakery in Lisbon. I like warm colors, playful but clean layouts, and short punchy copy."
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
            onBlur={() => setAI({ memory })}
            data-testid="ai-memory"
          />
          <div className="faint">Cream AI adds this to every request so results fit you. Stored locally.</div>
        </div>
      </div>
    </div>
  );
}
