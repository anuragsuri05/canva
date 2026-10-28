import { useEffect, useState } from 'react';
import { Icon, fmtDate } from '../ui/ui';
import { PageView } from '../render/PageView';
import { useApp } from '../store/app';
import { PRESETS, presetById } from '../model/presets';
import { makeEmbed, makeImage, newPage, uid } from '../model/defaults';
import { ASPECTS, EngineBadge, ErrorBox, PromptBox, Thinking, useRunner } from './common';
import { ResultTile, generateSet, type GenResult } from './MagicMediaPanel';
import { IMAGE_STYLES } from './magicTools';
import { activeConfig, memoryNote } from './config';
import { complete } from './providers';
import { docBlocksToPages, draftDocKeyless, draftDocLLM, ensureFontsFor, parseMarkdown } from './designGen';
import { candidateToDesign, generateCandidates, sizeForPrompt, type Candidate } from './designActions';
import { extractHtml, pickWidget, WIDGETS } from './widgets';
import { MODES, type ModeId } from './AIPanel';
import './ai.css';

interface HomeHist {
  id: string;
  prompt: string;
  mode: ModeId;
  at: number;
  designId?: string;
}
const HK = 'cream-ai-home-history';
const loadH = (): HomeHist[] => {
  try {
    return JSON.parse(localStorage.getItem(HK) || '[]');
  } catch {
    return [];
  }
};
const saveH = (h: HomeHist[]) => {
  try {
    localStorage.setItem(HK, JSON.stringify(h.slice(0, 40)));
  } catch {
    /* ignore */
  }
};

const HOME_MODES = MODES.filter((m) => m.id !== 'edit');
const SUGGESTIONS: Record<string, string[]> = {
  design: ['Instagram post for a summer jazz night', 'Presentation about renewable energy for high schoolers', 'Poster for a weekend farmers market', 'YouTube thumbnail: 5 tips for better sleep'],
  image: ['A cozy cabin in a snowy forest at dusk', 'Isometric illustration of a tiny coffee shop', 'Studio photo of a sneaker floating in pastel smoke'],
  doc: ['Project brief for a community garden', 'Blog post: 7 habits of productive designers', 'Meeting agenda for a product kickoff'],
  code: ['A quiz about world capitals', 'A countdown to our product launch', 'A tip calculator'],
  brainstorm: ['10 names for a vegan bakery', 'Caption ideas for a beach photo', 'Themes for a team offsite'],
};

export default function AIHome(_props: any) {
  const app = useApp.getState();
  const [prompt, setPrompt] = useState(() => {
    const p = sessionStorage.getItem('cream-ai-prompt') ?? '';
    return p;
  });
  const [mode, setMode] = useState<ModeId>('design');
  const [format, setFormat] = useState<string>('auto');
  const [style, setStyle] = useState('photo');
  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]['id']>('square');
  const [cands, setCands] = useState<{ list: Candidate[]; preset: string } | null>(null);
  const [images, setImages] = useState<GenResult[] | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [hist, setHist] = useState<HomeHist[]>(loadH);
  const r = useRunner();

  useEffect(() => {
    // consume a prompt handed over from the home search bar
    if (sessionStorage.getItem('cream-ai-prompt')) {
      sessionStorage.removeItem('cream-ai-prompt');
      if (prompt.trim()) setTimeout(() => go(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remember = (h: Omit<HomeHist, 'id' | 'at'>) =>
    setHist((cur) => {
      const n = [{ ...h, id: uid(), at: Date.now() }, ...cur];
      saveH(n);
      return n;
    });

  const open = (id: string) => app.navigate({ name: 'editor', id });

  const go = (m: ModeId = mode, text = prompt) =>
    r.run(async (signal) => {
      const t = text.trim();
      if (!t) return;
      setCands(null);
      setImages(null);
      setAnswer(null);
      setStatus('');
      if (m === 'design') {
        const sz = format === 'auto' ? sizeForPrompt(t) : { ...presetById(format)!, preset: format };
        setStatus(activeConfig() ? `Designing a ${sz.name}…` : `Building layouts for a ${sz.name}…`);
        const list = await generateCandidates(t, { width: sz.width, height: sz.height, signal, onText: (full) => setStatus(`Designing a ${sz.name}… ${Math.round(full.length / 100) / 10}k characters`) });
        setCands({ list, preset: sz.preset });
        remember({ prompt: t, mode: m });
      } else if (m === 'image') {
        const a = ASPECTS.find((x) => x.id === aspect)!;
        setImages(Array.from({ length: 4 }, (_, i) => ({ key: `${Date.now()}-${i}`, status: 'pending', prompt: t, style, msg: i ? 'Queued' : 'Generating…' })));
        remember({ prompt: t, mode: m });
        await generateSet(t, style, { w: a.w, h: a.h }, 4, signal, (i, p) => setImages((cur) => cur && cur.map((x, j) => (j === i ? { ...x, ...p } : x))));
      } else if (m === 'doc') {
        setStatus('Writing…');
        const md = activeConfig() ? await draftDocLLM(t, { signal, onText: (full) => setStatus(`Writing… ${full.split(/\s+/).length} words`) }) : draftDocKeyless(t);
        const blocks = parseMarkdown(md);
        const pages = docBlocksToPages(blocks, 816, 1056);
        ensureFontsFor(pages);
        const d = app.createDesign({ preset: 'doc', title: blocks.find((b) => b.kind === 'h1')?.text ?? t.slice(0, 50), pages });
        remember({ prompt: t, mode: m, designId: d.id });
        open(d.id);
      } else if (m === 'code') {
        let html: string | null = null;
        let title = t.slice(0, 40);
        if (activeConfig()) {
          setStatus('Writing code…');
          const reply = await complete({
            system: `You are Cream Code. Build a single-file interactive HTML widget (it runs in a sandboxed iframe about 1200×800). One complete HTML document with inline CSS/JS, no external requests, polished and responsive. Reply with only the HTML in a \`\`\`html block.${memoryNote()}`,
            messages: [{ role: 'user', content: t }],
            signal,
            onText: (_d, full) => setStatus(`Writing code… ${full.length} characters`),
            effort: 'medium',
          });
          html = extractHtml(reply);
        } else {
          const w = pickWidget(t) ?? WIDGETS[0];
          html = w.html;
          title = w.name;
        }
        if (!html) throw new Error('The AI did not return HTML. Try rephrasing.');
        const el = makeEmbed(160, 90, 1600, 900, { html, title });
        const d = app.createDesign({ preset: 'presentation', title: `Code · ${title}`, pages: [newPage({ elements: [el], background: { kind: 'solid', color: '#f4f1fb' } })] });
        remember({ prompt: t, mode: m, designId: d.id });
        open(d.id);
      } else {
        if (!activeConfig()) {
          setAnswer('Brainstorming needs an AI key (Claude, ChatGPT or Gemini) — set one up with the button at the top right. Design for me, Create an image, Draft a doc (outline) and Code (widgets) all work without a key.');
          return;
        }
        setAnswer('');
        await complete({
          system: `You are Cream AI, a friendly creative assistant. Be concise and practical; use short lists.${memoryNote()}`,
          messages: [{ role: 'user', content: t }],
          signal,
          onText: (_d, full) => setAnswer(full),
          effort: 'low',
        });
        remember({ prompt: t, mode: m });
      }
    }).finally(() => setStatus(''));

  const pickCandidate = (c: Candidate) => {
    const d = candidateToDesign(c, cands?.preset);
    setHist((cur) => {
      const n = cur.map((h, i) => (i === 0 && h.mode === 'design' && !h.designId ? { ...h, designId: d.id } : h));
      saveH(n);
      return n;
    });
    open(d.id);
  };

  const imageToDesign = (x: GenResult) => {
    const el = makeImage(x.ref!, x.w!, x.h!, 0, 0, x.w!, { credit: { source: 'pollinations', title: x.prompt, creator: 'Cream AI' } });
    const d = app.createDesign({ title: x.prompt.slice(0, 50), width: x.w, height: x.h, pages: [newPage({ elements: [el] })] });
    open(d.id);
  };

  const modeDef = MODES.find((m) => m.id === mode)!;

  return (
    <div data-testid="ai-home" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="ai-hero">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>
              <span className="ai-grad-text">Cream AI</span>
            </h1>
            <div className="muted" style={{ marginBottom: 18 }}>
              Your creative partner — design, write, imagine and build, just by describing it.
            </div>
          </div>
          <EngineBadge />
        </div>
        <PromptBox value={prompt} onChange={setPrompt} onSubmit={() => go()} onStop={r.stop} busy={r.busy} rows={3} placeholder={modeDef.placeholder} autoFocus />
        <div className="ai-modes" style={{ marginBottom: 0 }}>
          {HOME_MODES.map((m) => (
            <button key={m.id} className={'ai-mode' + (mode === m.id ? ' active' : '')} onClick={() => setMode(m.id)} data-testid={`ai-mode-${m.id}`}>
              <Icon name={m.icon} size={14} /> {m.label}
            </button>
          ))}
          <span className="grow" />
          {mode === 'design' && (
            <select className="select" style={{ width: 'auto', height: 30, fontSize: 12.5 }} value={format} onChange={(e) => setFormat(e.target.value)} data-testid="ai-home-format">
              <option value="auto">Auto format</option>
              {PRESETS.filter((p) => p.category !== 'video' && p.category !== 'whiteboard').map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {mode === 'image' && (
          <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <div className="chips">
              {IMAGE_STYLES.slice(1, 11).map((s) => (
                <button key={s.id} className={'chip' + (style === s.id ? ' active' : '')} style={{ height: 26, fontSize: 12 }} onClick={() => setStyle(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="seg">
              {ASPECTS.map((a) => (
                <button key={a.id} className={aspect === a.id ? 'active' : ''} onClick={() => setAspect(a.id)}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="chips" style={{ marginTop: 14 }}>
          {(SUGGESTIONS[mode] ?? []).map((s) => (
            <button key={s} className="chip" style={{ height: 28, fontSize: 12.5, background: 'transparent' }} onClick={() => setPrompt(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <ErrorBox error={r.error} onRetry={() => go()} onClose={() => r.setError(null)} />
      {r.busy && status && (
        <div style={{ margin: '20px 4px' }}>
          <Thinking label={status} />
        </div>
      )}

      {cands && (
        <>
          <div className="section-head" style={{ marginTop: 24 }}>
            <h3>Pick a design to start editing</h3>
            <button onClick={() => go('design')}>Generate more</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {cands.list.map((c, i) => {
              const tw = 220;
              const sc = Math.min(tw / c.width, 300 / c.height);
              return (
                <button key={c.id} className="ai-cand" style={{ padding: 10 }} onClick={() => pickCandidate(c)} data-testid={`ai-home-candidate-${i}`}>
                  <div className="thumb">
                    <PageView design={{ width: c.width, height: c.height }} page={c.pages[0]} scale={sc} ctx={{ mode: 'static', pageIndex: 0, pageCount: c.pages.length }} />
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.title}</div>
                  <div className="faint">{c.pages.length > 1 ? `${c.pages.length} pages · ` : ''}{c.source === 'ai' ? 'AI design' : c.source === 'template' ? 'Template' : 'Free layout'}</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {images && (
        <>
          <div className="section-head" style={{ marginTop: 24 }}>
            <h3>Click an image to start a design with it</h3>
            <button onClick={() => app.navigate({ name: 'home', section: 'dreamlab' })}>Open Dream Lab</button>
          </div>
          <div className="ai-results" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {images.map((x) => (
              <ResultTile key={x.key} r={x} aspect={(ASPECTS.find((a) => a.id === aspect)!.w) / ASPECTS.find((a) => a.id === aspect)!.h} onClick={() => imageToDesign(x)} />
            ))}
          </div>
        </>
      )}

      {answer !== null && (
        <div className="ai-card" style={{ marginTop: 24, whiteSpace: 'pre-wrap', lineHeight: 1.55, fontSize: 14 }} data-testid="ai-home-answer">
          {answer || <Thinking />}
        </div>
      )}

      {hist.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: 32 }}>
            <h3>Recent AI chats</h3>
            <button
              onClick={() => {
                setHist([]);
                saveH([]);
              }}
            >
              Clear
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
            {hist.slice(0, 12).map((h) => (
              <button
                key={h.id}
                className="ai-history-item"
                onClick={() => {
                  if (h.designId && useApp.getState().designs[h.designId] && !useApp.getState().designs[h.designId].trashedAt) open(h.designId);
                  else {
                    setMode(h.mode === 'edit' ? 'design' : h.mode);
                    setPrompt(h.prompt);
                  }
                }}
                data-testid="ai-home-history"
              >
                <Icon name={MODES.find((m) => m.id === h.mode)?.icon ?? 'Sparkles'} size={16} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.prompt}</span>
                <span className="faint">{fmtDate(h.at)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
