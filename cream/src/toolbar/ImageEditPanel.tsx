import { useRef, useState, type CSSProperties } from 'react';
import type { Draft } from 'immer';
import type { El, ImageEl, ImageFilters, ImageShadow, Page, VideoEl } from '../model/types';
import { useCurrentPage, useEditor, useSelected } from '../store/editor';
import { useSrc } from '../store/blobs';
import { FILTER_PRESETS, cssFilter, mergeFilters } from '../render/filters';
import { Icon, Toggle } from '../ui/ui';
import { ColorSwatch, Section, TSlider } from './common';
import { ASPECTS, applyAspect, grabText, removeBackground, runMagic } from './imageTools';
import './toolbar.css';

type Tab = 'tools' | 'effects' | 'filters' | 'adjust' | 'crop';

const ADJUST_GROUPS: { title: string; keys: { key: keyof ImageFilters; label: string; min?: number }[] }[] = [
  { title: 'White balance', keys: [{ key: 'temperature', label: 'Temperature' }, { key: 'tint', label: 'Tint' }] },
  {
    title: 'Light',
    keys: [
      { key: 'brightness', label: 'Brightness' },
      { key: 'contrast', label: 'Contrast' },
      { key: 'highlights', label: 'Highlights' },
      { key: 'shadows', label: 'Shadows' },
      { key: 'whites', label: 'Whites' },
      { key: 'blacks', label: 'Blacks' },
    ],
  },
  { title: 'Color', keys: [{ key: 'vibrance', label: 'Vibrance' }, { key: 'saturation', label: 'Saturation' }] },
  {
    title: 'Texture',
    keys: [
      { key: 'clarity', label: 'Clarity' },
      { key: 'sharpness', label: 'Sharpness', min: 0 },
      { key: 'vignette', label: 'Vignette', min: 0 },
      { key: 'fade', label: 'Fade', min: 0 },
      { key: 'blur', label: 'Blur', min: 0 },
    ],
  },
];

const AUTO: Partial<ImageFilters> = { brightness: 6, contrast: 12, vibrance: 18, saturation: 6, highlights: -8, shadows: 10, clarity: 10 };

const DUOTONES: { name: string; highlight: string; shadow: string }[] = [
  { name: 'Peach', highlight: '#ffd3b5', shadow: '#7a2e3a' },
  { name: 'Mint', highlight: '#c8ffe3', shadow: '#16425b' },
  { name: 'Sunset', highlight: '#ffcf5c', shadow: '#b8255f' },
  { name: 'Ocean', highlight: '#9ae6ff', shadow: '#1b1464' },
  { name: 'Berry', highlight: '#ffc2e2', shadow: '#3b0f5c' },
  { name: 'Lime', highlight: '#e6ff8a', shadow: '#1a5e3a' },
  { name: 'Mono', highlight: '#ffffff', shadow: '#222222' },
  { name: 'Gold', highlight: '#ffe9a6', shadow: '#4a3000' },
];

const SHADOWS: { id: ImageShadow['kind']; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'glow', label: 'Glow' },
  { id: 'drop', label: 'Drop' },
  { id: 'angled', label: 'Angled' },
  { id: 'page-lift', label: 'Page lift' },
  { id: 'curved', label: 'Curved' },
  { id: 'backdrop', label: 'Backdrop' },
];

const SHADOW_DEFAULT: Omit<ImageShadow, 'kind'> = { offset: 30, direction: 45, blur: 30, size: 30, color: '#000000', transparency: 50 };

const shadowPreview = (k: ImageShadow['kind']): CSSProperties => {
  switch (k) {
    case 'glow':
      return { boxShadow: '0 0 12px 3px rgba(0,0,0,.45)' };
    case 'drop':
      return { boxShadow: '4px 4px 6px rgba(0,0,0,.45)' };
    case 'angled':
      return { boxShadow: '6px 8px 6px rgba(0,0,0,.35)' };
    case 'page-lift':
      return { boxShadow: '0 10px 10px -4px rgba(0,0,0,.45)' };
    case 'curved':
      return { boxShadow: '0 14px 12px -8px rgba(0,0,0,.5)' };
    case 'backdrop':
      return { boxShadow: '8px 8px 0 rgba(0,0,0,.35)' };
    default:
      return {};
  }
};

export default function ImageEditPanel() {
  const sel = useSelected();
  const page = useCurrentPage();
  const target = useEditor((s) => s.colorTarget);
  const hasMedia = sel.some((e) => e.type === 'image' || e.type === 'video');
  const bgMode = !!page?.backgroundImage && (!sel.length || (target?.kind === 'page-bg-image' && !hasMedia));
  const el = !bgMode ? (sel.find((e) => e.type === 'image' || e.type === 'video') as ImageEl | VideoEl | undefined) : undefined;
  const isImage = el?.type === 'image';
  const [tab, setTab] = useState<Tab>(isImage ? 'tools' : 'filters');
  if (!bgMode && !el) return <div className="empty">Select an image to edit it.</div>;

  const tabs: { id: Tab; label: string }[] = isImage
    ? [
        { id: 'tools', label: 'Tools' },
        { id: 'effects', label: 'Effects' },
        { id: 'filters', label: 'Filters' },
        { id: 'adjust', label: 'Adjust' },
        { id: 'crop', label: 'Crop' },
      ]
    : [
        { id: 'filters', label: 'Filters' },
        { id: 'adjust', label: 'Adjust' },
      ];
  const cur = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;

  const src = bgMode ? page!.backgroundImage!.src : el!.type === 'image' ? el!.src : el!.poster ?? '';
  const filters = (bgMode ? page!.backgroundImage!.filters : el!.filters) ?? {};
  const preset = bgMode ? undefined : (el as ImageEl).preset;
  const presetIntensity = bgMode ? 50 : (el as ImageEl).presetIntensity ?? 50;

  /** Mutate the image element (or page background image). */
  const edit = (fn: (img: Draft<ImageEl>) => void, coalesce?: string) => {
    const s = useEditor.getState();
    if (bgMode) {
      s.update(
        (d) => {
          const p = d.pages.find((x) => x.id === page!.id) as Draft<Page> | undefined;
          if (!p?.backgroundImage) return;
          const fake = { filters: p.backgroundImage.filters ?? {} } as Draft<ImageEl>;
          fn(fake);
          // presets on backgrounds are baked into filters
          p.backgroundImage.filters = fake.preset ? mergeFilters(fake.filters, fake.preset, fake.presetIntensity ?? 50) : fake.filters;
        },
        { coalesce },
      );
    } else s.updateEl(el!.id, (e: Draft<El>) => fn(e as Draft<ImageEl>), { coalesce });
  };
  const setFilter = (k: keyof ImageFilters, v: number) => edit((e) => void (e.filters = { ...(e.filters ?? {}), [k]: v }), 'f-' + k);

  return (
    <div data-testid="image-edit-panel">
      <div className="tabs" style={{ overflowX: 'auto' }}>
        {tabs.map((t) => (
          <button key={t.id} style={{ padding: '8px 7px' }} className={'tab' + (cur === t.id ? ' active' : '')} onClick={() => setTab(t.id)} data-testid={`img-tab-${t.id}`}>
            {t.label}
          </button>
        ))}
      </div>
      {bgMode && <div className="faint" style={{ marginBottom: 10 }}>Editing the page background image</div>}

      {cur === 'tools' && isImage && <ToolsTab el={el as ImageEl} />}

      {cur === 'effects' && isImage && (
        <EffectsTab el={el as ImageEl} edit={edit} />
      )}

      {cur === 'filters' && (
        <div>
          <div className="ct-tiles">
            <FilterTile src={src} name="None" active={!preset} onClick={() => edit((e) => void (delete e.preset))} />
            {Object.keys(FILTER_PRESETS).map((name) => (
              <FilterTile key={name} src={src} name={name} active={preset === name} onClick={() => edit((e) => void ((e.preset = name), (e.presetIntensity = e.presetIntensity ?? 50)))} />
            ))}
          </div>
          {preset && (
            <div className="ct-settings" style={{ position: 'sticky', bottom: 0 }}>
              <TSlider label={`${preset} intensity`} value={presetIntensity} min={0} max={100} onChange={(v) => edit((e) => void (e.presetIntensity = v), 'preset-int')} testId="filter-intensity" />
            </div>
          )}
        </div>
      )}

      {cur === 'adjust' && (
        <div>
          <div className="row" style={{ marginBottom: 12 }}>
            <button className="btn sm grow" onClick={() => edit((e) => void (e.filters = { ...(e.filters ?? {}), ...AUTO }))} data-testid="auto-adjust">
              <Icon name="Wand2" size={14} /> Auto adjust
            </button>
            <button className="btn sm grow" onClick={() => edit((e) => void (e.filters = {}))} data-testid="reset-adjust">
              <Icon name="RotateCcw" size={14} /> Reset adjustments
            </button>
          </div>
          {ADJUST_GROUPS.map((g) => (
            <Section key={g.title} title={g.title}>
              {g.keys.map((k) => (
                <TSlider key={k.key} label={k.label} value={filters[k.key] ?? 0} min={k.min ?? -100} max={100} onChange={(v) => setFilter(k.key, v)} testId={`adjust-${k.key}`} />
              ))}
            </Section>
          ))}
        </div>
      )}

      {cur === 'crop' && isImage && <CropTab el={el as ImageEl} />}
    </div>
  );
}

function FilterTile({ src, name, active, onClick }: { src: string; name: string; active: boolean; onClick: () => void }) {
  const url = useSrc(src);
  const f = name === 'None' ? '' : cssFilter(mergeFilters(undefined, name, 50));
  return (
    <button className={'ct-tile' + (active ? ' active' : '')} onClick={onClick} data-testid={`filter-${name}`}>
      <span className="ct-tile-box">{url ? <img src={url} alt="" style={{ filter: f }} loading="lazy" /> : null}</span>
      <span className="lbl">{name}</span>
    </button>
  );
}

function ToolsTab({ el }: { el: ImageEl }) {
  const [open, setOpen] = useState<null | 'edit' | 'expand' | 'erase'>(null);
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState('page');
  const [gen, setGen] = useState(false);
  const tools = [
    { id: 'bg', label: el.bgRemoved ? 'Restore background' : 'Background Remover', icon: 'Eraser', run: () => removeBackground(el.id) },
    { id: 'erase', label: 'Magic Eraser', icon: 'Brush', run: () => setOpen(open === 'erase' ? null : 'erase') },
    { id: 'edit', label: 'Magic Edit', icon: 'WandSparkles', run: () => setOpen(open === 'edit' ? null : 'edit') },
    { id: 'grab', label: 'Magic Grab', icon: 'Hand', run: () => runMagic('magicGrab', el.id) },
    { id: 'text', label: 'Grab Text', icon: 'ScanText', run: () => grabText(el.id) },
    { id: 'expand', label: 'Magic Expand', icon: 'Expand', run: () => setOpen(open === 'expand' ? null : 'expand') },
  ];
  return (
    <div>
      <Section title="Magic Studio">
        <div className="ct-tools">
          {tools.map((t) => (
            <button key={t.id} className="ct-tool" onClick={t.run} data-testid={`tool-${t.id}`}>
              <span className="ic">
                <Icon name={t.icon} size={18} />
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </Section>
      {open === 'erase' && <ErasePad el={el} />}
      {open === 'edit' && (
        <div className="ct-settings">
          <div className="label" style={{ marginBottom: 6 }}>Describe your edit</div>
          <textarea className="textarea" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="e.g. add a hot air balloon in the sky" />
          <button className="btn primary sm block" style={{ marginTop: 8 }} disabled={!prompt.trim()} onClick={() => runMagic('magicEdit', el.id, { prompt })} data-testid="magic-edit-run">
            Generate
          </button>
        </div>
      )}
      {open === 'expand' && (
        <div className="ct-settings">
          <div className="label" style={{ marginBottom: 6 }}>Expand to</div>
          <div className="chips">
            {['page', 'free', '1:1', '16:9', '9:16', '4:3', '3:2'].map((r) => (
              <button key={r} className={'chip' + (ratio === r ? ' active' : '')} onClick={() => setRatio(r)}>
                {r === 'page' ? 'Whole page' : r === 'free' ? 'Free-form' : r}
              </button>
            ))}
          </div>
          <Toggle label="Generate new content with AI" on={gen} onChange={setGen} />
          {gen && <input className="input sm" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="Describe the surroundings (optional)" />}
          <button className="btn primary sm block" style={{ marginTop: 8 }} onClick={() => runMagic('magicExpand', el.id, { ratio, generate: gen, prompt })} data-testid="magic-expand-run">
            Magic Expand
          </button>
        </div>
      )}
      {el.originalSrc && (
        <button className="btn sm block" style={{ marginTop: 8 }} onClick={() => useEditor.getState().updateEl(el.id, (e) => void (((e as ImageEl).src = el.originalSrc!), ((e as ImageEl).bgRemoved = false)))} data-testid="restore-original">
          <Icon name="Undo2" size={14} /> Restore original image
        </button>
      )}
    </div>
  );
}

function EffectsTab({ el, edit }: { el: ImageEl; edit: (fn: (img: Draft<ImageEl>) => void, coalesce?: string) => void }) {
  const sh = el.shadow;
  const kind = sh?.kind ?? 'none';
  const setSh = (p: Partial<ImageShadow>, c?: string) => edit((e) => void (e.shadow = { kind, ...SHADOW_DEFAULT, ...(e.shadow ?? {}), ...p } as ImageShadow), c);
  const duo = el.duotone;
  return (
    <div>
      <Section title="Shadows">
        <div className="ct-tiles four">
          {SHADOWS.map((s) => (
            <button
              key={s.id}
              className={'ct-tile' + (kind === s.id ? ' active' : '')}
              onClick={() => edit((e) => void (e.shadow = s.id === 'none' ? undefined : { ...SHADOW_DEFAULT, ...(e.shadow ?? {}), kind: s.id }))}
              data-testid={`shadow-${s.id}`}
            >
              <span className="ct-tile-box" style={{ background: 'var(--surface-2)' }}>
                {s.id === 'none' ? <Icon name="Ban" size={22} style={{ color: 'var(--text-3)' }} /> : <span style={{ width: '50%', height: '50%', background: '#c9b8ff', borderRadius: 3, ...shadowPreview(s.id) }} />}
              </span>
              <span className="lbl">{s.label}</span>
            </button>
          ))}
        </div>
        {sh && kind !== 'none' && (
          <div className="ct-settings">
            {kind !== 'glow' && <TSlider label="Offset" value={sh.offset} onChange={(v) => setSh({ offset: v }, 'sh-o')} testId="shadow-offset" />}
            {['drop', 'backdrop'].includes(kind) && <TSlider label="Direction" value={sh.direction} min={-180} max={180} onChange={(v) => setSh({ direction: v }, 'sh-d')} />}
            <TSlider label="Blur" value={sh.blur} onChange={(v) => setSh({ blur: v }, 'sh-b')} testId="shadow-blur" />
            {kind === 'glow' && <TSlider label="Size" value={sh.size} onChange={(v) => setSh({ size: v }, 'sh-s')} />}
            <TSlider label="Transparency" value={sh.transparency} onChange={(v) => setSh({ transparency: v }, 'sh-t')} />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="label">Color</span>
              <ColorSwatch value={sh.color} onChange={(c) => setSh({ color: c }, 'sh-c')} testId="shadow-color" />
            </div>
          </div>
        )}
      </Section>
      <Section title="Duotone" right={duo ? <button className="btn sm ghost" onClick={() => edit((e) => void delete e.duotone)}>Remove</button> : undefined}>
        <div className="ct-tiles four">
          {DUOTONES.map((d) => (
            <button
              key={d.name}
              className={'ct-tile' + (duo?.highlight === d.highlight && duo?.shadow === d.shadow ? ' active' : '')}
              onClick={() => edit((e) => void (e.duotone = { highlight: d.highlight, shadow: d.shadow, intensity: e.duotone?.intensity ?? 100 }))}
              data-testid={`duotone-${d.name}`}
            >
              <span className="ct-tile-box" style={{ background: `linear-gradient(135deg, ${d.highlight} 50%, ${d.shadow} 50%)` }} />
              <span className="lbl">{d.name}</span>
            </button>
          ))}
        </div>
        {duo && (
          <div className="ct-settings">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="label">Highlights</span>
              <ColorSwatch value={duo.highlight} onChange={(c) => edit((e) => void (e.duotone = { ...e.duotone!, highlight: c }), 'duo-h')} testId="duotone-highlight" />
            </div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="label">Shadows</span>
              <ColorSwatch value={duo.shadow} onChange={(c) => edit((e) => void (e.duotone = { ...e.duotone!, shadow: c }), 'duo-s')} testId="duotone-shadow" />
            </div>
            <TSlider label="Intensity" value={duo.intensity} onChange={(v) => edit((e) => void (e.duotone = { ...e.duotone!, intensity: v }), 'duo-i')} />
          </div>
        )}
      </Section>
      <Section title="Blur">
        <TSlider value={el.effectBlur ?? 0} onChange={(v) => edit((e) => void (e.effectBlur = v), 'fx-blur')} testId="effect-blur" />
      </Section>
    </div>
  );
}

function CropTab({ el }: { el: ImageEl }) {
  const s = useEditor.getState();
  const rot = ((((el.rotation ?? 0) + 180) % 360) + 360) % 360 - 180;
  return (
    <div>
      <button className="btn primary sm block" onClick={() => useEditor.setState({ cropId: el.id })} data-testid="crop-on-canvas">
        <Icon name="Crop" size={14} /> Crop on canvas
      </button>
      <Section title="Aspect ratio">
        <div className="ct-row-btns">
          {[{ label: 'Free', value: undefined as number | null | undefined }, ...ASPECTS].map((a) => (
            <button
              key={a.label}
              className="ct-opt"
              style={{ height: 34 }}
              onClick={() => a.value !== undefined && s.updateEl(el.id, (e) => applyAspect(e, a.value as number | null))}
              data-testid={`crop-aspect-${a.label.split(' ')[0].replace(':', 'x')}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Straighten">
        <TSlider value={Math.round(rot)} min={-45} max={45} onChange={(v) => s.updateEl(el.id, { rotation: v } as Partial<El>, { coalesce: 'straighten' })} suffix="°" testId="straighten" />
      </Section>
      <Section title="Flip">
        <div className="row">
          <button className={'btn sm grow' + (el.flipX ? ' active' : '')} onClick={() => s.updateEl(el.id, { flipX: !el.flipX })} data-testid="crop-flip-h">
            <Icon name="FlipHorizontal2" size={14} /> Horizontal
          </button>
          <button className={'btn sm grow' + (el.flipY ? ' active' : '')} onClick={() => s.updateEl(el.id, { flipY: !el.flipY })} data-testid="crop-flip-v">
            <Icon name="FlipVertical2" size={14} /> Vertical
          </button>
        </div>
      </Section>
    </div>
  );
}

/** Magic Eraser brush: paint over what to remove, then Erase. */
function ErasePad({ el }: { el: ImageEl }) {
  const url = useSrc(el.src);
  const ref = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(24);
  const [painted, setPainted] = useState(false);
  const W = 290;
  const H = Math.round((W * el.naturalH) / Math.max(1, el.naturalW));
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current!;
    const g = c.getContext('2d')!;
    const r = c.getBoundingClientRect();
    g.strokeStyle = '#ff4081';
    g.lineWidth = size;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(e.clientX - r.left, e.clientY - r.top);
    g.lineTo(e.clientX - r.left + 0.1, e.clientY - r.top);
    g.stroke();
    const move = (ev: PointerEvent) => {
      g.lineTo(ev.clientX - r.left, ev.clientY - r.top);
      g.stroke();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setPainted(true);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div className="ct-settings">
      <div className="label" style={{ marginBottom: 6 }}>Brush over what you want to erase</div>
      <div style={{ position: 'relative', width: W, height: H, borderRadius: 6, overflow: 'hidden', background: 'var(--surface-3)' }}>
        {url && <img src={url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />}
        <canvas ref={ref} width={W} height={H} onPointerDown={down} style={{ position: 'absolute', inset: 0, opacity: 0.55, cursor: 'crosshair', touchAction: 'none' }} data-testid="erase-pad" />
      </div>
      <TSlider label="Brush size" value={size} min={4} max={80} onChange={setSize} />
      <div className="row">
        <button
          className="btn sm grow"
          disabled={!painted}
          onClick={() => {
            const c = ref.current!;
            c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
            setPainted(false);
          }}
        >
          Reset
        </button>
        <button className="btn primary sm grow" disabled={!painted} onClick={() => runMagic('magicErase', el.id, { mask: ref.current })} data-testid="magic-erase-run">
          Erase
        </button>
      </div>
    </div>
  );
}
