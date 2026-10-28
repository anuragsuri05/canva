import { useState } from 'react';
import { Icon, Segmented, Spinner } from '../ui/ui';
import { useSrc } from '../store/blobs';
import { useEditor, findEl } from '../store/editor';
import { insertImageSmart, insertSvg, setDragPayload } from '../editor/dnd';
import { makeImage, newPage } from '../model/defaults';
import type { ImageEl } from '../model/types';
import { useApp } from '../store/app';
import { ASPECTS, EngineBadge, ErrorBox, INSPIRE, PromptBox, useRunner } from './common';
import { IMAGE_STYLES, generateImage, generateImageSet, finishBlob, ENGINE_LABEL, type ImageEngine } from './magicTools';
import { useHasKey } from './config';
import { complete } from './providers';
import './ai.css';

export interface GenResult {
  key: string;
  status: 'pending' | 'done' | 'error';
  ref?: string;
  w?: number;
  h?: number;
  prompt: string;
  style: string;
  msg?: string;
  source?: ImageEngine;
}

export function ResultTile({ r, aspect, onClick, testId }: { r: GenResult; aspect: number; onClick: () => void; testId?: string }) {
  const url = useSrc(r.ref);
  if (r.status !== 'done' || !url)
    return (
      <div className="ai-skeleton" style={{ aspectRatio: String(aspect) }} data-testid="ai-result-pending">
        {r.status === 'error' ? (
          <span style={{ color: '#b42318' }}>
            <Icon name="CircleAlert" size={14} />
            <br />
            {r.msg ?? 'Failed'}
          </span>
        ) : (
          r.msg
        )}
      </div>
    );
  return (
    <button
      className="ai-result"
      style={{ aspectRatio: String(aspect) }}
      onClick={onClick}
      draggable
      onDragStart={(e) => setDragPayload(e, { kind: 'image', src: r.ref!, w: r.w, h: r.h, credit: { source: 'pollinations', title: r.prompt, creator: 'Cream AI (Pollinations)' } })}
      title={r.prompt}
      data-testid={testId ?? 'ai-result'}
    >
      <img src={url} alt={r.prompt} />
      <span className="ai-label" title={r.source ? ENGINE_LABEL[r.source] : undefined}>AI</span>
    </button>
  );
}

/** Generate `n` images (engine chain in magicTools: Pollinations → your keys → free community queue). */
export async function generateSet(prompt: string, style: string, size: { w: number; h: number }, n: number, signal: AbortSignal, update: (i: number, r: Partial<GenResult>) => void) {
  const settled = new Set<number>();
  const pending: Promise<unknown>[] = [];
  await generateImageSet(
    prompt,
    n,
    {
      width: size.w,
      height: size.h,
      style,
      signal,
      onStatus: (msg) => {
        for (let i = 0; i < n; i++) if (!settled.has(i)) update(i, { msg });
      },
    },
    (i, r) => {
      settled.add(i);
      pending.push(
        finishBlob(r.blob, r.seed, prompt).then((f) => update(i, { status: 'done', ref: f.ref, w: f.w, h: f.h, source: r.source })),
      );
      const nextIdx = [...Array(n).keys()].find((k) => !settled.has(k));
      if (nextIdx !== undefined) update(nextIdx, { msg: 'Generating…' });
    },
    (i, msg) => {
      settled.add(i);
      update(i, { status: 'error', msg: msg.length > 60 ? 'Failed' : msg });
    },
  );
  await Promise.all(pending);
}

function ImagesTab() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('photo');
  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]['id']>('square');
  const [results, setResults] = useState<GenResult[]>([]);
  const r = useRunner();
  const a = ASPECTS.find((x) => x.id === aspect)!;

  const go = () =>
    r.run(async (signal) => {
      const p = prompt.trim();
      const list: GenResult[] = Array.from({ length: 4 }, (_, i) => ({ key: `${Date.now()}-${i}`, status: 'pending', prompt: p, style, msg: i === 0 ? 'Generating…' : 'Queued' }));
      setResults(list);
      await generateSet(p, style, { w: a.w, h: a.h }, 4, signal, (i, patch) => setResults((cur) => cur.map((x, j) => (j === i ? { ...x, ...patch } : x))));
    });

  return (
    <>
      <PromptBox
        value={prompt}
        onChange={setPrompt}
        onSubmit={go}
        onStop={r.stop}
        busy={r.busy}
        placeholder="Describe what you want to see, e.g. “a corgi astronaut floating above earth”"
        submitTestId="magic-media-generate"
        extra={
          <button className="ai-icon-btn" title="Inspire me" onClick={() => setPrompt(INSPIRE[Math.floor(Math.random() * INSPIRE.length)])} data-testid="ai-inspire">
            <Icon name="Lightbulb" size={16} />
          </button>
        }
      />
      <div className="row" style={{ justifyContent: 'space-between', margin: '8px 0 0' }}>
        <button className="btn sm ghost" onClick={() => setPrompt(INSPIRE[Math.floor(Math.random() * INSPIRE.length)])}>
          <Icon name="Shuffle" size={14} /> Inspire me
        </button>
      </div>
      <div className="ai-section-title">Styles</div>
      <div className="ai-styles">
        {IMAGE_STYLES.slice(0, 12).map((s) => (
          <button key={s.id} className={'ai-style' + (style === s.id ? ' active' : '')} onClick={() => setStyle(s.id)} data-testid={`ai-style-${s.id}`}>
            <div className="sw" style={{ background: s.swatch }} />
            {s.label}
          </button>
        ))}
      </div>
      <div className="ai-section-title">Aspect ratio</div>
      <Segmented value={aspect} onChange={setAspect} options={ASPECTS.map((x) => ({ value: x.id, label: x.label }))} />
      <button className="btn grad block" style={{ marginTop: 14 }} disabled={r.busy || !prompt.trim()} onClick={go} data-testid="magic-media-generate-btn">
        {r.busy ? <Spinner /> : <Icon name="Sparkles" size={16} />} Generate image
      </button>
      <ErrorBox error={r.error} onRetry={go} onClose={() => r.setError(null)} />
      {results.length > 0 && (
        <>
          <div className="section-head">
            <h3>Results</h3>
            {!r.busy && (
              <button onClick={go} data-testid="ai-generate-again">
                Generate again
              </button>
            )}
          </div>
          <div className="ai-results">
            {results.map((x) => (
              <ResultTile key={x.key} r={x} aspect={a.w / a.h} onClick={() => insertImageSmart(x.ref!, { w: x.w, h: x.h, credit: { source: 'pollinations', title: x.prompt, creator: 'Cream AI (Pollinations)' } })} />
            ))}
          </div>
          <div className="faint" style={{ marginTop: 8 }}>
            Click to add, or drag onto a frame. Generated with open models · saved to Uploads.
          </div>
        </>
      )}
    </>
  );
}

interface Graphic {
  id: string;
  svg?: string;
  url?: string;
  title: string;
}

function GraphicsTab() {
  const has = useHasKey();
  const [prompt, setPrompt] = useState('');
  const [items, setItems] = useState<Graphic[]>([]);
  const [source, setSource] = useState<'ai' | 'icons'>(has ? 'ai' : 'icons');
  const r = useRunner();

  const go = () =>
    r.run(async (signal) => {
      setItems([]);
      const p = prompt.trim();
      if (source === 'ai' && has) {
        const text = await complete({
          system:
            'You are an expert vector illustrator. Output 3 different self-contained SVG graphics for the request, separated by a line containing only "---". Each must start with <svg and include xmlns and a viewBox (e.g. 0 0 200 200), use flat shapes with solid fills (no external references, no scripts, no text unless asked), and look polished and balanced. Output only the SVG code.',
          messages: [{ role: 'user', content: p }],
          signal,
          effort: 'low',
        });
        const svgs = (text.match(/<svg[\s\S]*?<\/svg>/gi) ?? []).map((s) => s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, ''));
        if (!svgs.length) throw new Error('The AI did not return any SVG. Try again.');
        setItems(svgs.map((svg, i) => ({ id: 'g' + i, svg, title: p })));
      } else {
        const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(p)}&limit=48`, { signal });
        if (!res.ok) throw new Error('Icon search failed (' + res.status + ')');
        const j = await res.json();
        const icons: string[] = j.icons ?? [];
        if (!icons.length) throw new Error(`No graphics found for “${p}”. Try a simpler word.`);
        setItems(icons.map((id) => ({ id, url: `https://api.iconify.design/${id.replace(':', '/')}.svg?height=96`, title: id })));
      }
    });

  async function add(g: Graphic) {
    let svg = g.svg;
    if (!svg && g.url) {
      try {
        svg = await (await fetch(g.url.replace('?height=96', ''))).text();
      } catch {
        useApp.getState().toast('Could not load graphic', 'error');
        return;
      }
    }
    if (!svg) return;
    insertSvg(svg, { credit: g.url ? { source: 'iconify', title: g.title, landingUrl: `https://icon-sets.iconify.design/${g.title.split(':')[0]}/` } : { source: 'Cream AI', title: g.title } });
  }

  return (
    <>
      <PromptBox value={prompt} onChange={setPrompt} onSubmit={go} onStop={r.stop} busy={r.busy} placeholder="e.g. “a cute cactus mascot” or “rocket”" submitTestId="magic-graphics-generate" />
      <div className="row" style={{ margin: '10px 0', gap: 8 }}>
        <Segmented
          value={source}
          onChange={setSource}
          options={[
            { value: 'ai', label: 'AI graphic' },
            { value: 'icons', label: 'Open icons' },
          ]}
        />
      </div>
      {source === 'ai' && !has && <div className="ai-note">AI-drawn graphics need an AI key. Without one, Cream searches 400k+ open-source icons and illustrations (Iconify) instead.</div>}
      <ErrorBox error={r.error} onRetry={go} onClose={() => r.setError(null)} />
      {r.busy && (
        <div className="ai-results" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginTop: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="ai-skeleton" style={{ aspectRatio: '1' }} />
          ))}
        </div>
      )}
      <div className="asset-grid" style={{ marginTop: 10 }}>
        {items.map((g) => (
          <button
            key={g.id}
            className="asset-tile contain"
            style={{ aspectRatio: '1', border: 0, background: 'var(--surface-2)', cursor: 'pointer', padding: 0 }}
            title={g.title}
            onClick={() => add(g)}
            draggable={!!g.svg}
            onDragStart={(e) => g.svg && setDragPayload(e, { kind: 'svg', svg: g.svg })}
            data-testid="ai-graphic"
          >
            {g.svg ? <img src={'data:image/svg+xml;utf8,' + encodeURIComponent(g.svg)} alt="" /> : <img src={g.url} alt={g.title} loading="lazy" />}
          </button>
        ))}
      </div>
    </>
  );
}

function VideosTab() {
  const sel = useEditor((s) => (s.selection.length === 1 && s.design ? (findEl(s.design, s.selection[0])?.el.type === 'image' ? s.selection[0] : null) : null));
  const [prompt, setPrompt] = useState('');
  const r = useRunner();

  async function animate(src: string, w: number, h: number) {
    const s = useEditor.getState();
    const d = s.design!;
    const k = Math.max(d.width / w, d.height / h);
    const iw = w * k;
    const ih = h * k;
    const el = makeImage(src, w, h, (d.width - iw) / 2, (d.height - ih) / 2, iw, { anim: { name: 'photo-zoom', duration: 4, on: 'enter' } } as Partial<ImageEl>);
    el.h = ih;
    const page = newPage({ elements: [el], duration: 4, transition: { type: 'dissolve', duration: 0.6 } });
    s.addPage(s.pageId ?? undefined, page);
    useApp.getState().toast('Added an animated page — press Play to preview', 'success');
  }

  const fromPrompt = () =>
    r.run(async (signal) => {
      const d = useEditor.getState().design!;
      const portrait = d.height > d.width;
      const g = await generateImage(prompt.trim(), { width: portrait ? 768 : 1344, height: portrait ? 1344 : 768, style: 'cinematic', signal });
      await animate(g.ref!, g.w, g.h);
    });

  return (
    <>
      <div className="ai-note warn" style={{ marginBottom: 12 }}>
        <b>Text-to-video isn’t available for free.</b> There’s no open, keyless video generation service that runs reliably in the browser, so Cream doesn’t pretend to have one. Instead, <b>Animate image</b> turns a picture into a short Ken Burns–style clip (slow zoom) on a new page — export it as MP4/GIF from Download.
      </div>
      <div className="ai-section-title">Animate the selected image</div>
      <button
        className="btn block"
        disabled={!sel}
        onClick={() => {
          const s = useEditor.getState();
          const el = findEl(s.design!, sel!)?.el as ImageEl;
          animate(el.src, el.naturalW, el.naturalH);
        }}
        data-testid="ai-animate-selected"
      >
        <Icon name="Clapperboard" size={16} /> {sel ? 'Animate selected image' : 'Select an image on the page first'}
      </button>
      <div className="ai-section-title">Or generate a scene and animate it</div>
      <PromptBox value={prompt} onChange={setPrompt} onSubmit={fromPrompt} onStop={r.stop} busy={r.busy} placeholder="e.g. “drone shot over a misty forest at dawn”" submitTestId="ai-animate-generate" />
      {r.busy && (
        <div className="faint" style={{ marginTop: 8 }}>
          Generating the image… this can take 10–40 seconds on the free engine.
        </div>
      )}
      <ErrorBox error={r.error} onRetry={fromPrompt} onClose={() => r.setError(null)} />
    </>
  );
}

export default function MagicMediaPanel() {
  const [tab, setTab] = useState<'images' | 'graphics' | 'videos'>('images');
  return (
    <div data-testid="magic-media-panel">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          <span className="ai-grad-text">Magic Media</span>
        </div>
        <EngineBadge freeLabel="Free" />
      </div>
      <div className="tabs">
        {(['images', 'graphics', 'videos'] as const).map((t) => (
          <button key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)} data-testid={`magic-media-tab-${t}`}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'images' && <ImagesTab />}
      {tab === 'graphics' && <GraphicsTab />}
      {tab === 'videos' && <VideosTab />}
    </div>
  );
}
