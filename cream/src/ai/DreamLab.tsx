import { useState } from 'react';
import { Icon, Modal, Spinner } from '../ui/ui';
import { useApp } from '../store/app';
import { srcToBlob, useSrc } from '../store/blobs';
import { makeImage, newPage, uid } from '../model/defaults';
import { ErrorBox, EngineBadge, INSPIRE, PromptBox, downloadBlob, useRunner } from './common';
import { IMAGE_STYLES, generateImageSet, finishBlob } from './magicTools';
import { activeConfig } from './config';
import { complete } from './providers';
import './ai.css';

interface HistItem {
  id: string;
  prompt: string;
  style: string;
  ref: string;
  w: number;
  h: number;
  createdAt: number;
}

const HIST = 'cream-dreamlab-history';
const loadHist = (): HistItem[] => {
  try {
    return JSON.parse(localStorage.getItem(HIST) || '[]');
  } catch {
    return [];
  }
};
const saveHist = (h: HistItem[]) => {
  try {
    localStorage.setItem(HIST, JSON.stringify(h.slice(0, 200)));
  } catch {
    /* ignore */
  }
};

const RATIOS = [
  { id: '1:1', w: 1024, h: 1024 },
  { id: '16:9', w: 1344, h: 768 },
  { id: '9:16', w: 768, h: 1344 },
  { id: '4:3', w: 1152, h: 864 },
  { id: '3:4', w: 864, h: 1152 },
  { id: '3:2', w: 1216, h: 816 },
  { id: '2:3', w: 816, h: 1216 },
];

/** Reference image → a short style hint (vision LLM if configured, else dominant colours). */
async function referenceHint(file: File, signal: AbortSignal): Promise<string> {
  const bmp = await createImageBitmap(file);
  const c = document.createElement('canvas');
  const k = Math.min(1, 512 / Math.max(bmp.width, bmp.height));
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  if (activeConfig()) {
    try {
      const data = c.toDataURL('image/jpeg', 0.8).split(',')[1];
      const t = await complete({
        system: 'Describe the visual STYLE of the image (medium, color palette, lighting, mood, composition) in under 30 words as comma-separated prompt keywords. No subject description.',
        messages: [{ role: 'user', content: [{ type: 'image', mediaType: 'image/jpeg', data }, { type: 'text', text: 'Style keywords:' }] }],
        signal,
        effort: 'low',
        maxTokens: 400,
      });
      if (t.trim()) return t.trim().replace(/\n/g, ' ');
    } catch {
      /* fall back to colours */
    }
  }
  // dominant colours (coarse histogram)
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const bins = new Map<string, number>();
  for (let i = 0; i < d.length; i += 16) {
    const key = [d[i] >> 5, d[i + 1] >> 5, d[i + 2] >> 5].join(',');
    bins.set(key, (bins.get(key) ?? 0) + 1);
  }
  const top = [...bins.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => '#' + k.split(',').map((v) => ((+v << 5) + 16).toString(16).padStart(2, '0')).join(''));
  return `color palette ${top.join(' ')}`;
}

function Tile({ item, onOpen }: { item: HistItem; onOpen: () => void }) {
  const url = useSrc(item.ref);
  return (
    <button className="ai-result" style={{ aspectRatio: `${item.w}/${item.h}`, marginBottom: 10, width: '100%', breakInside: 'avoid' }} onClick={onOpen} data-testid="dreamlab-history-item">
      {url ? <img src={url} alt={item.prompt} loading="lazy" /> : <div className="ai-skeleton" style={{ height: '100%' }} />}
    </button>
  );
}

function Detail({ item, onClose, onDelete, onReuse }: { item: HistItem; onClose: () => void; onDelete: () => void; onReuse: () => void }) {
  const url = useSrc(item.ref);
  const app = useApp.getState();
  const useInDesign = () => {
    const el = makeImage(item.ref, item.w, item.h, 0, 0, item.w, { credit: { source: 'pollinations', title: item.prompt, creator: 'Cream Dream Lab' } });
    const d = app.createDesign({ title: item.prompt.slice(0, 50) || 'Dream Lab image', width: item.w, height: item.h, pages: [newPage({ elements: [el] })] });
    app.navigate({ name: 'editor', id: d.id });
  };
  return (
    <Modal title="Dream Lab" onClose={onClose} size="wide" testId="dreamlab-detail">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(220px,1fr)', gap: 20 }}>
        <div style={{ background: 'var(--surface-3)', borderRadius: 12, display: 'grid', placeItems: 'center', minHeight: 300 }}>
          {url ? <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: '62vh', borderRadius: 10 }} /> : <Spinner />}
        </div>
        <div className="col" style={{ gap: 10 }}>
          <div className="faint">Prompt</div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>{item.prompt}</div>
          <div className="faint">
            {IMAGE_STYLES.find((s) => s.id === item.style)?.label ?? 'No style'} · {item.w}×{item.h} · {new Date(item.createdAt).toLocaleString()}
          </div>
          <button className="btn grad" onClick={useInDesign} data-testid="dreamlab-use">
            <Icon name="LayoutTemplate" size={16} /> Use in a design
          </button>
          <button className="btn" onClick={async () => downloadBlob(await srcToBlob(item.ref), `dream-lab-${item.id}.${(await srcToBlob(item.ref)).type.includes('png') ? 'png' : 'jpg'}`)} data-testid="dreamlab-download">
            <Icon name="Download" size={16} /> Download
          </button>
          <button className="btn" onClick={() => navigator.clipboard.writeText(item.prompt).then(() => app.toast('Prompt copied'))} data-testid="dreamlab-copy-prompt">
            <Icon name="Copy" size={16} /> Copy prompt
          </button>
          <button className="btn" onClick={onReuse}>
            <Icon name="RotateCcw" size={16} /> Reuse prompt
          </button>
          <button className="btn ghost" style={{ color: '#c0392b' }} onClick={onDelete}>
            <Icon name="Trash2" size={16} /> Remove from history
          </button>
          <div className="faint">Generated with open models via Pollinations. AI-generated content — check before publishing.</div>
        </div>
      </div>
    </Modal>
  );
}

export default function DreamLab(_props: any) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('photo');
  const [ratio, setRatio] = useState('1:1');
  const [count, setCount] = useState(4);
  const [ref, setRef] = useState<{ file: File; url: string } | null>(null);
  const [hist, setHist] = useState<HistItem[]>(loadHist);
  const [pending, setPending] = useState<{ key: string; msg: string; failed?: boolean }[]>([]);
  const [open, setOpen] = useState<HistItem | null>(null);
  const r = useRunner();
  const rt = RATIOS.find((x) => x.id === ratio)!;

  const go = () =>
    r.run(async (signal) => {
      let p = prompt.trim();
      const st = style;
      if (ref) {
        setPending([{ key: 'ref', msg: 'Reading reference…' }]);
        const hint = await referenceHint(ref.file, signal).catch(() => '');
        if (hint) p = `${p}, in the style of the reference: ${hint}`;
      }
      const slots = Array.from({ length: count }, (_, i) => ({ key: uid(), msg: i ? 'Queued' : 'Generating…' }));
      setPending(slots);
      const done = new Set<number>();
      const saves: Promise<unknown>[] = [];
      await generateImageSet(
        p,
        count,
        { width: rt.w, height: rt.h, style: st, signal, onStatus: (msg) => setPending((cur) => cur.map((x, j) => (done.has(j) || x.failed ? x : { ...x, msg }))) },
        (i, r) => {
          done.add(i);
          saves.push(
            finishBlob(r.blob, r.seed, prompt.trim()).then((g) => {
              const item: HistItem = { id: uid(), prompt: prompt.trim(), style: st, ref: g.ref!, w: g.w, h: g.h, createdAt: Date.now() };
              setHist((h) => {
                const n = [item, ...h];
                saveHist(n);
                return n;
              });
              setPending((cur) => cur.filter((x) => x.key !== slots[i].key));
            }),
          );
        },
        (i) => setPending((cur) => cur.map((x) => (x.key === slots[i].key ? { ...x, msg: 'Failed', failed: true } : x))),
      );
      await Promise.all(saves);
    }).finally(() => setPending([]));

  return (
    <div data-testid="dreamlab" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="ai-hero" style={{ marginBottom: 24 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>
              <span className="ai-grad-text">Dream Lab</span>
            </h1>
            <div className="muted" style={{ marginBottom: 18 }}>
              Turn your ideas into images. Describe anything — pick a style, a shape and how many to make.
            </div>
          </div>
          <EngineBadge freeLabel="Free · open models" />
        </div>
        <PromptBox
          value={prompt}
          onChange={setPrompt}
          onSubmit={go}
          onStop={r.stop}
          busy={r.busy}
          rows={3}
          placeholder="A serene Japanese garden in autumn, koi pond, golden hour light…"
          testId="dreamlab-prompt"
          submitTestId="dreamlab-generate"
          extra={
            <>
              <button className="ai-icon-btn" title="Inspire me" onClick={() => setPrompt(INSPIRE[Math.floor(Math.random() * INSPIRE.length)])} data-testid="dreamlab-inspire">
                <Icon name="Lightbulb" size={16} />
              </button>
              <label className="ai-icon-btn" title="Reference image (used as a style hint)" style={{ cursor: 'pointer' }}>
                <Icon name="ImagePlus" size={16} />
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setRef({ file: f, url: URL.createObjectURL(f) });
                    e.target.value = '';
                  }}
                  data-testid="dreamlab-reference"
                />
              </label>
              {ref && (
                <span className="chip" style={{ height: 28, paddingLeft: 3 }}>
                  <img src={ref.url} alt="" style={{ width: 22, height: 22, objectFit: 'cover', borderRadius: 999 }} /> Style reference
                  <button className="ai-icon-btn" style={{ width: 20, height: 20 }} onClick={() => setRef(null)} aria-label="Remove reference">
                    <Icon name="X" size={12} />
                  </button>
                </span>
              )}
            </>
          }
        />
        <div className="ai-section-title">Style</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8 }}>
          {IMAGE_STYLES.map((s) => (
            <button key={s.id} className={'ai-style' + (style === s.id ? ' active' : '')} onClick={() => setStyle(s.id)} data-testid={`dreamlab-style-${s.id}`}>
              <div className="sw" style={{ background: s.swatch, height: 56 }} />
              {s.label}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 24, marginTop: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div className="ai-section-title" style={{ marginTop: 0 }}>
              Aspect ratio
            </div>
            <div className="seg">
              {RATIOS.map((x) => (
                <button key={x.id} className={ratio === x.id ? 'active' : ''} onClick={() => setRatio(x.id)} data-testid={`dreamlab-ratio-${x.id}`}>
                  {x.id}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="ai-section-title" style={{ marginTop: 0 }}>
              Number of images
            </div>
            <div className="seg">
              {[1, 2, 3, 4].map((n) => (
                <button key={n} className={count === n ? 'active' : ''} onClick={() => setCount(n)} data-testid={`dreamlab-count-${n}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <span className="grow" />
          <button className="btn grad lg" disabled={r.busy || !prompt.trim()} onClick={go} data-testid="dreamlab-generate-btn">
            {r.busy ? <Spinner /> : <Icon name="Sparkles" size={18} />} {r.busy ? 'Creating…' : 'Create'}
          </button>
        </div>
        {ref && <div className="faint" style={{ marginTop: 10 }}>The free engine can’t edit images directly, so your reference is turned into a style hint{activeConfig() ? ' (described by your AI model)' : ' (its colour palette)'}.</div>}
        <ErrorBox error={r.error} onRetry={go} onClose={() => r.setError(null)} />
      </div>

      <div className="section-head">
        <h3>{pending.length ? 'Creating…' : 'Your creations'}</h3>
        {hist.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear Dream Lab history? Images stay in Uploads.')) {
                setHist([]);
                saveHist([]);
              }
            }}
          >
            Clear history
          </button>
        )}
      </div>
      {!hist.length && !pending.length && <div className="empty">Your generated images will appear here.</div>}
      <div style={{ columns: '4 220px', columnGap: 10 }}>
        {pending.map((p) => (
          <div key={p.key} className="ai-skeleton" style={{ aspectRatio: `${rt.w}/${rt.h}`, marginBottom: 10, breakInside: 'avoid', color: p.failed ? '#b42318' : undefined }} data-testid="dreamlab-pending">
            {p.msg}
          </div>
        ))}
        {hist.map((h) => (
          <Tile key={h.id} item={h} onOpen={() => setOpen(h)} />
        ))}
      </div>
      {open && (
        <Detail
          item={open}
          onClose={() => setOpen(null)}
          onReuse={() => {
            setPrompt(open.prompt);
            setStyle(open.style);
            setOpen(null);
          }}
          onDelete={() => {
            const n = hist.filter((x) => x.id !== open.id);
            setHist(n);
            saveHist(n);
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}
