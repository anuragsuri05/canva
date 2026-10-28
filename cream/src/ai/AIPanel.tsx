import { useEffect, useRef, useState } from 'react';
import { Icon, Menu, Segmented, Spinner } from '../ui/ui';
import { PageView } from '../render/PageView';
import { useApp } from '../store/app';
import { currentPage, selectedEls, useEditor } from '../store/editor';
import { insertImageSmart } from '../editor/dnd';
import { htmlToText, makeEmbed } from '../model/defaults';
import { ASPECTS, EngineBadge, ErrorBox, KeyNotice, PromptBox, Thinking, useRunner } from './common';
import { ResultTile, generateSet, type GenResult } from './MagicMediaPanel';
import { IMAGE_STYLES } from './magicTools';
import { useHasKey, activeConfig, memoryNote, brandVoice } from './config';
import { complete } from './providers';
import { RULE_EXAMPLES, applyOps, docBlocksToPages, draftDocKeyless, draftDocLLM, llmEditOps, parseMarkdown, ruleEdit, ensureFontsFor, type ImageJob } from './designGen';
import { candidateToDesign, generateCandidates, insertCandidate, upgradeJobs, type Candidate } from './designActions';
import { WIDGETS, extractHtml, pickWidget } from './widgets';
import './ai.css';

export type ModeId = 'design' | 'image' | 'doc' | 'code' | 'edit' | 'brainstorm';
export const MODES: { id: ModeId; label: string; icon: string; placeholder: string }[] = [
  { id: 'design', label: 'Design for me', icon: 'LayoutTemplate', placeholder: 'Describe a design, e.g. “Instagram post for a summer jazz night on June 5”' },
  { id: 'image', label: 'Create an image', icon: 'Image', placeholder: 'Describe an image, e.g. “a lemon tree in a sunny courtyard, watercolor”' },
  { id: 'doc', label: 'Draft a doc', icon: 'FileText', placeholder: 'What should I write? e.g. “a one-page project brief for a community garden”' },
  { id: 'code', label: 'Code', icon: 'Code', placeholder: 'Describe a widget, e.g. “a quiz about the solar system” or “a countdown to launch day”' },
  { id: 'edit', label: 'Edit this design', icon: 'WandSparkles', placeholder: 'Tell me what to change, e.g. “make the headlines blue” or “dark mode”' },
  { id: 'brainstorm', label: 'Brainstorm', icon: 'Lightbulb', placeholder: 'Ask anything — ideas, captions, taglines, outlines…' },
];

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  mode: ModeId;
  text?: string;
  kind?: 'text' | 'designs' | 'images' | 'doc' | 'code' | 'edit' | 'widgets';
  candidates?: Candidate[];
  images?: GenResult[];
  aspect?: number;
  markdown?: string;
  html?: string;
  title?: string;
  canUndo?: boolean;
  keyless?: boolean;
  error?: string;
}

const histKey = (id?: string) => `cream-ai-chat-${id ?? 'none'}`;
function loadHistory(id?: string): ChatMsg[] {
  try {
    return JSON.parse(sessionStorage.getItem(histKey(id)) || '[]');
  } catch {
    return [];
  }
}
function saveHistory(id: string | undefined, msgs: ChatMsg[]) {
  try {
    sessionStorage.setItem(histKey(id), JSON.stringify(msgs.slice(-30).map((m) => ({ ...m, images: m.images?.filter((i) => i.status === 'done') }))));
  } catch {
    /* storage full: keep in memory only */
  }
}

const mid = () => Math.random().toString(36).slice(2, 10);

/* ------------------------------------------------------------------ candidates */

function CandidateCard({ c, onPick, testId }: { c: Candidate; onPick: (c: Candidate, el: HTMLElement) => void; testId: string }) {
  const p = c.pages[0];
  const tw = 136;
  const scale = tw / c.width;
  return (
    <button className="ai-cand" onClick={(e) => onPick(c, e.currentTarget)} data-testid={testId} title={c.title}>
      <div className="thumb">
        <PageView design={{ width: c.width, height: c.height }} page={p} scale={scale} ctx={{ mode: 'static', pageIndex: 0, pageCount: c.pages.length }} />
      </div>
      <div className="faint" style={{ fontSize: 11 }}>
        {c.pages.length > 1 ? `${c.pages.length} pages` : c.source === 'ai' ? 'AI design' : c.source === 'template' ? 'Template' : 'Layout'}
      </div>
    </button>
  );
}

function Candidates({ m }: { m: ChatMsg }) {
  const [menu, setMenu] = useState<{ c: Candidate; el: HTMLElement } | null>(null);
  const [aiImages, setAiImages] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const runUpgrade = async (jobs: ImageJob[]) => {
    if (!aiImages || !jobs.length) return;
    setProgress(`Generating AI images 0/${jobs.length}…`);
    await upgradeJobs(jobs, (d, t) => setProgress(d >= t ? null : `Generating AI images ${d}/${t}…`));
    setProgress(null);
  };
  const hasImages = m.candidates?.some((c) => c.jobs.length);
  return (
    <>
      <div className="ai-results" style={{ alignItems: 'start' }}>
        {m.candidates!.map((c, i) => (
          <CandidateCard key={c.id} c={c} onPick={(cc, el) => setMenu({ c: cc, el })} testId={`ai-candidate-${i}`} />
        ))}
      </div>
      {hasImages && (
        <label className="row faint" style={{ gap: 6, marginTop: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={aiImages} onChange={(e) => setAiImages(e.target.checked)} data-testid="ai-use-ai-images" />
          Replace stock photos with AI-generated images after adding
        </label>
      )}
      {progress && (
        <div className="faint" style={{ marginTop: 6 }}>
          <Spinner /> {progress}
        </div>
      )}
      {menu && (
        <Menu
          anchor={menu.el}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Add as new page' + (menu.c.pages.length > 1 ? 's' : ''), icon: 'FilePlus', testId: 'ai-insert-append', onClick: () => runUpgrade(insertCandidate(menu.c, 'append')) },
            { label: 'Replace current page', icon: 'Replace', testId: 'ai-insert-replace', onClick: () => runUpgrade(insertCandidate(menu.c, 'replace')) },
            {
              label: 'Open as new design',
              icon: 'ExternalLink',
              testId: 'ai-insert-new',
              onClick: () => {
                const d = candidateToDesign(menu.c);
                useApp.getState().navigate({ name: 'editor', id: d.id });
              },
            },
          ]}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ doc + code */

function DocResult({ m }: { m: ChatMsg }) {
  const insert = (newDoc: boolean) => {
    const s = useEditor.getState();
    const d = s.design!;
    const blocks = parseMarkdown(m.markdown ?? '');
    if (newDoc) {
      const pages = docBlocksToPages(blocks, 816, 1056);
      ensureFontsFor(pages);
      const nd = useApp.getState().createDesign({ preset: 'doc', title: blocks.find((b) => b.kind === 'h1')?.text ?? 'AI doc', pages });
      useApp.getState().navigate({ name: 'editor', id: nd.id });
      return;
    }
    const pages = docBlocksToPages(blocks, d.width, d.height, currentPage(s)?.background);
    ensureFontsFor(pages);
    const cur = currentPage(s);
    s.update((dd) => {
      const i = cur ? dd.pages.findIndex((p) => p.id === cur.id) : dd.pages.length - 1;
      if (cur && i >= 0 && dd.pages[i].elements.length === 0) {
        dd.pages[i].elements = pages[0].elements as any;
        dd.pages.splice(i + 1, 0, ...(pages.slice(1) as any));
      } else dd.pages.splice(i + 1, 0, ...(pages as any));
    });
    useApp.getState().toast(`Added ${pages.length} page${pages.length === 1 ? '' : 's'} of text`, 'success');
  };
  return (
    <>
      <div className="ai-code" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12.5, maxHeight: 220 }}>
        {m.markdown}
      </div>
      <div className="ai-row" style={{ marginTop: 8 }}>
        <button className="btn sm primary" onClick={() => insert(false)} data-testid="ai-doc-insert">
          <Icon name="Plus" size={14} /> Add to design
        </button>
        <button className="btn sm" onClick={() => insert(true)} data-testid="ai-doc-new">
          <Icon name="FileText" size={14} /> Open as Doc
        </button>
        <button className="btn sm ghost" onClick={() => navigator.clipboard.writeText(m.markdown ?? '').then(() => useApp.getState().toast('Copied'))}>
          <Icon name="Copy" size={14} />
        </button>
      </div>
    </>
  );
}

export function insertCodeWidget(html: string, title = 'Cream Code') {
  const s = useEditor.getState();
  const d = s.design;
  if (!d) return;
  const w = Math.min(d.width * 0.8, 720);
  const h = Math.min(d.height * 0.8, w * 0.85);
  const el = makeEmbed((d.width - w) / 2, (d.height - h) / 2, w, h, { html, title });
  s.addElements([el]);
}

function CodeResult({ m }: { m: ChatMsg }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <iframe className="ai-preview-frame" title="Preview" sandbox="allow-scripts allow-forms" srcDoc={m.html} style={{ height: 260 }} data-testid="ai-code-preview" />
      <div className="ai-row" style={{ marginTop: 8 }}>
        <button className="btn sm primary" onClick={() => insertCodeWidget(m.html!, m.title)} data-testid="ai-code-use">
          <Icon name="Plus" size={14} /> Use in design
        </button>
        <button className="btn sm" onClick={() => navigator.clipboard.writeText(m.html ?? '').then(() => useApp.getState().toast('Code copied'))} data-testid="ai-code-copy">
          <Icon name="Copy" size={14} /> Copy code
        </button>
        <button className="btn sm ghost" onClick={() => setShow((v) => !v)}>
          <Icon name="Code" size={14} /> {show ? 'Hide' : 'View'} code
        </button>
      </div>
      {show && <div className="ai-code" style={{ marginTop: 8 }}>{m.html}</div>}
    </>
  );
}

/* ------------------------------------------------------------------ panel */

export default function AIPanel() {
  const designId = useEditor((s) => s.design?.id);
  const selCount = useEditor((s) => s.selection.length);
  const has = useHasKey();
  const [mode, setMode] = useState<ModeId>(() => (sessionStorage.getItem('cream-ai-mode') as ModeId) || 'design');
  const [prompt, setPrompt] = useState(() => {
    const p = sessionStorage.getItem('cream-ai-prompt') ?? '';
    if (p) sessionStorage.removeItem('cream-ai-prompt');
    return p;
  });
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => loadHistory(designId));
  const [attach, setAttach] = useState(false);
  const [style, setStyle] = useState('photo');
  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]['id']>('square');
  const [stream, setStream] = useState('');
  const r = useRunner();
  const endRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const [footH, setFootH] = useState(240);
  useEffect(() => {
    const el = footRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFootH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setMsgs(loadHistory(designId));
  }, [designId]);
  useEffect(() => {
    saveHistory(designId, msgs);
  }, [designId, msgs]);
  useEffect(() => {
    try {
      sessionStorage.setItem('cream-ai-mode', mode);
    } catch {
      /* ignore */
    }
  }, [mode]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs.length, stream]);

  const push = (m: ChatMsg) => setMsgs((cur) => [...cur, m]);
  const patch = (id: string, p: Partial<ChatMsg>) => setMsgs((cur) => cur.map((m) => (m.id === id ? { ...m, ...p } : m)));

  function selectionContext(): string {
    const s = useEditor.getState();
    const els = selectedEls(s);
    if (!attach || !els.length) return '';
    return els
      .map((e) => {
        if (e.type === 'text' || e.type === 'sticky') return `[${e.type}] ${htmlToText(e.html)}`;
        if (e.type === 'shape' && e.html) return `[shape] ${htmlToText(e.html)}`;
        if (e.type === 'chart') return `[chart] ${e.labels.join(', ')}: ${e.series.map((x) => x.values.join(', ')).join(' / ')}`;
        if (e.type === 'image') return `[image] ${e.alt ?? e.credit?.title ?? 'photo'}`;
        return `[${e.type}]`;
      })
      .join('\n');
  }

  async function send(text = prompt, m: ModeId = mode) {
    const t = text.trim();
    if (!t) return;
    setPrompt('');
    const ctx = selectionContext();
    push({ id: mid(), role: 'user', mode: m, text: t + (ctx ? `\n📎 ${useEditor.getState().selection.length} selected element(s) attached` : '') });
    const aid = mid();
    push({ id: aid, role: 'assistant', mode: m, text: '' });
    setStream('');
    const d = useEditor.getState().design!;
    await r.run(async (signal) => {
      try {
        if (m === 'design') {
          const cands = await generateCandidates(t, { width: d.width, height: d.height, signal, onText: (full) => setStream(`Designing… ${Math.round(full.length / 100) / 10}k characters`), context: ctx });
          patch(aid, { kind: 'designs', candidates: cands, keyless: !activeConfig(), text: activeConfig() ? `Here are ${cands.length} designs. Click one to add it.` : `Here are ${cands.length} layouts made from your prompt (free mode). Add an AI key for fully custom designs.` });
        } else if (m === 'image') {
          const a = ASPECTS.find((x) => x.id === aspect)!;
          const list: GenResult[] = Array.from({ length: 4 }, (_, i) => ({ key: `${aid}-${i}`, status: 'pending', prompt: t, style, msg: i ? 'Queued' : 'Generating…' }));
          patch(aid, { kind: 'images', images: list, aspect: a.w / a.h, text: `Creating 4 images · ${IMAGE_STYLES.find((s) => s.id === style)?.label ?? ''}` });
          await generateSet(t, style, { w: a.w, h: a.h }, 4, signal, (i, p) =>
            setMsgs((cur) => cur.map((mm) => (mm.id === aid ? { ...mm, images: mm.images!.map((x, j) => (j === i ? { ...x, ...p } : x)) } : mm))),
          );
          patch(aid, { text: 'Click an image to add it to your design, or drag it onto a frame.' });
        } else if (m === 'doc') {
          if (activeConfig()) {
            const md = await draftDocLLM(ctx ? `${t}\n\nUse this content from my design:\n${ctx}` : t, { signal, onText: (full) => setStream(full) });
            patch(aid, { kind: 'doc', markdown: md, text: 'Here’s a draft.' });
          } else patch(aid, { kind: 'doc', markdown: draftDocKeyless(t), keyless: true, text: 'Free mode can’t write the text for you, but here’s a structured outline to fill in. Add an AI key to have Magic Write draft it.' });
        } else if (m === 'code') {
          if (activeConfig()) {
            const reply = await complete({
              system: `You are Cream Code. Build a single-file interactive HTML widget for a design (it will run inside a sandboxed iframe of roughly 700×600 px). Requirements: one complete HTML document with inline CSS and JS, no external requests or libraries, responsive, polished modern styling, accessible. Reply with only the HTML in a \`\`\`html code block.${memoryNote()}`,
              messages: [{ role: 'user', content: ctx ? `${t}\n\nContent to use:\n${ctx}` : t }],
              signal,
              onText: (_d, full) => setStream(`Writing code… ${full.length} characters`),
              effort: 'medium',
            });
            const html = extractHtml(reply);
            if (!html) throw new Error('The AI did not return HTML. Try rephrasing.');
            patch(aid, { kind: 'code', html, title: t.slice(0, 40), text: 'Here’s your widget. Try it below.' });
          } else {
            const w = pickWidget(t);
            if (w) patch(aid, { kind: 'code', html: w.html, title: w.name, keyless: true, text: `Free mode: here’s the built-in ${w.name} widget. Add an AI key to generate custom code from your description.` });
            else patch(aid, { kind: 'widgets', keyless: true, text: 'Free mode includes these ready-made widgets. Add an AI key to build anything you describe.' });
          }
        } else if (m === 'edit') {
          if (activeConfig()) {
            const { summary, ops } = await llmEditOps(ctx ? `${t}\n(Selected: ${ctx})` : t, { signal, selection: useEditor.getState().selection });
            const { applied, jobs } = applyOps(ops);
            patch(aid, { kind: 'edit', text: applied ? summary : 'No changes were needed.', canUndo: applied > 0 });
            if (jobs.length) upgradeJobs(jobs);
          } else {
            const rule = ruleEdit(t);
            if (!rule) {
              patch(aid, { kind: 'edit', keyless: true, text: 'I couldn’t understand that in free mode. Try one of these commands, or add an AI key to edit with any instruction:' });
            } else if (rule.run) {
              patch(aid, { text: rule.summary });
              const out = await rule.run();
              patch(aid, { kind: 'edit', text: out, canUndo: true });
            } else {
              const { applied } = applyOps(rule.ops ?? []);
              patch(aid, { kind: 'edit', text: applied ? rule.summary : 'Nothing on this page matched that command.', canUndo: applied > 0 });
            }
          }
        } else {
          if (!activeConfig()) {
            patch(aid, { keyless: true, text: 'Brainstorming needs an AI key (Claude, ChatGPT or Gemini). Everything else in Cream AI has a free mode — try “Create an image” or “Design for me”.' });
            return;
          }
          const history = msgs
            .filter((x) => x.mode === 'brainstorm' && x.text && !x.error)
            .slice(-10)
            .map((x) => ({ role: x.role, content: x.text! }));
          const voice = brandVoice();
          const reply = await complete({
            system: `You are Cream AI, a friendly creative assistant inside a design tool. Be concise and practical; use short lists. No markdown headings.${voice ? ` Brand voice: ${voice}` : ''}${memoryNote()}`,
            messages: [...history, { role: 'user', content: ctx ? `${t}\n\nContext from my design:\n${ctx}` : t }],
            signal,
            onText: (_d, full) => patch(aid, { text: full }),
            effort: 'low',
          });
          patch(aid, { kind: 'text', text: reply });
        }
      } catch (e) {
        const err = e as Error & { kind?: string };
        if (err.name === 'AbortError' || err.kind === 'stopped') patch(aid, { text: 'Stopped.' });
        else patch(aid, { error: err.message, text: '' });
        throw e;
      } finally {
        setStream('');
      }
    });
  }

  const modeDef = MODES.find((x) => x.id === mode)!;
  const needsKey = !has && (mode === 'brainstorm' || mode === 'doc');

  return (
    <div data-testid="ai-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          <span className="ai-grad-text">Cream AI</span>
        </div>
        <div className="row" style={{ gap: 4 }}>
          {msgs.length > 0 && (
            <button className="ai-icon-btn" title="New chat" onClick={() => setMsgs([])} data-testid="ai-new-chat">
              <Icon name="SquarePen" size={15} />
            </button>
          )}
          <EngineBadge />
        </div>
      </div>

      <div className="ai-chat" style={{ flex: 1 }}>
        {msgs.length === 0 && (
          <div style={{ padding: '18px 4px 6px' }}>
            <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.25, marginBottom: 6 }}>What will we create today?</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Design, write, generate images, build widgets or edit this design by just asking.
            </div>
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={'ai-msg ' + m.role} data-testid={m.role === 'assistant' ? 'ai-reply' : undefined}>
            {m.role === 'user' ? (
              m.text
            ) : (
              <>
                <div className="ai-meta">
                  <Icon name="Sparkles" size={12} /> {MODES.find((x) => x.id === m.mode)?.label}
                  {m.keyless && <span className="badge">Free mode</span>}
                </div>
                {m.error ? (
                  <ErrorBox error={m.error} />
                ) : !m.text && !m.kind ? (
                  <Thinking label={m.mode === 'doc' ? 'Writing' : stream || 'Thinking'} />
                ) : (
                  m.text && <div style={{ marginBottom: m.kind && m.kind !== 'text' ? 8 : 0 }}>{m.text}</div>
                )}
                {m.kind === 'designs' && m.candidates && <Candidates m={m} />}
                {m.kind === 'images' && m.images && (
                  <div className="ai-results">
                    {m.images.map((x) => (
                      <ResultTile key={x.key} r={x} aspect={m.aspect ?? 1} onClick={() => insertImageSmart(x.ref!, { w: x.w, h: x.h, credit: { source: 'pollinations', title: x.prompt, creator: 'Cream AI (Pollinations)' } })} />
                    ))}
                  </div>
                )}
                {m.kind === 'doc' && m.markdown && <DocResult m={m} />}
                {m.kind === 'code' && m.html && <CodeResult m={m} />}
                {m.kind === 'widgets' && (
                  <div className="ai-row">
                    {WIDGETS.map((w) => (
                      <button key={w.id} className="chip" onClick={() => patch(m.id, { kind: 'code', html: w.html, title: w.name })} data-testid={`ai-widget-${w.id}`}>
                        <Icon name={w.icon} size={14} /> {w.name}
                      </button>
                    ))}
                  </div>
                )}
                {m.kind === 'edit' && m.keyless && !m.canUndo && (
                  <div className="ai-row">
                    {RULE_EXAMPLES.map((x) => (
                      <button key={x} className="chip" onClick={() => send(x, 'edit')}>
                        {x}
                      </button>
                    ))}
                  </div>
                )}
                {m.kind === 'edit' && m.canUndo && m.id === msgs[msgs.length - 1]?.id && (
                  <button className="btn sm ghost" style={{ marginTop: 4 }} onClick={() => useEditor.getState().undo()} data-testid="ai-edit-undo">
                    <Icon name="Undo2" size={14} /> Undo
                  </button>
                )}
              </>
            )}
          </div>
        ))}
        {r.busy && stream && mode === 'doc' && <div className="ai-code" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{stream}</div>}
        <div ref={endRef} style={{ scrollMarginBottom: footH + 16 }} />
      </div>

      <div ref={footRef} style={{ position: 'sticky', bottom: -24, background: 'var(--surface)', paddingTop: 8, paddingBottom: 4, marginTop: 10 }}>
        {r.error && !msgs.some((m) => m.error === r.error) && <ErrorBox error={r.error} onClose={() => r.setError(null)} />}
        {needsKey && <KeyNotice feature={modeDef.label} />}
        <div className="ai-modes">
          {MODES.map((x) => (
            <button key={x.id} className={'ai-mode' + (mode === x.id ? ' active' : '')} onClick={() => setMode(x.id)} data-testid={`ai-mode-${x.id}`}>
              <Icon name={x.icon} size={13} /> {x.label}
            </button>
          ))}
        </div>
        {mode === 'image' && (
          <div style={{ marginBottom: 8 }}>
            <div className="chips" style={{ marginBottom: 6 }}>
              {IMAGE_STYLES.slice(1, 10).map((s) => (
                <button key={s.id} className={'chip' + (style === s.id ? ' active' : '')} style={{ height: 26, fontSize: 12 }} onClick={() => setStyle(s.id)} data-testid={`ai-style-${s.id}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <Segmented value={aspect} onChange={setAspect} options={ASPECTS.map((x) => ({ value: x.id, label: x.label }))} />
          </div>
        )}
        {mode === 'edit' && !has && msgs.length === 0 && (
          <div className="chips" style={{ marginBottom: 8 }}>
            {RULE_EXAMPLES.slice(0, 5).map((x) => (
              <button key={x} className="chip" style={{ height: 26, fontSize: 12 }} onClick={() => send(x, 'edit')} data-testid="ai-edit-example">
                {x}
              </button>
            ))}
          </div>
        )}
        <PromptBox
          value={prompt}
          onChange={setPrompt}
          onSubmit={() => send()}
          onStop={r.stop}
          busy={r.busy}
          placeholder={modeDef.placeholder}
          extra={
            <button
              className={'ai-icon-btn' + (attach ? ' active' : '')}
              title={selCount ? (attach ? 'Selection attached' : 'Attach selected elements as context') : 'Select elements on the page to attach them'}
              onClick={() => setAttach((v) => !v)}
              data-testid="ai-attach"
            >
              <Icon name="Paperclip" size={16} />
              {attach && selCount > 0 && <span style={{ fontSize: 10, marginLeft: -2 }}>{selCount}</span>}
            </button>
          }
        />
        <div className="faint" style={{ fontSize: 11, marginTop: 6, textAlign: 'center' }}>
          AI can make mistakes. Review results before sharing.
        </div>
      </div>
    </div>
  );
}
