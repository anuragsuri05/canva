// Backgrounds tab: solid colours, gradients and photo backgrounds (Openverse + Picsum) for the current page.
import { useMemo, useRef, useState } from 'react';
import type { Fill } from '../model/types';
import { useEditor, useCurrentPage } from '../store/editor';
import { useApp } from '../store/app';
import { setPageBackgroundImage } from '../editor/dnd';
import { fillCss } from '../render/textEffects';
import { Icon, Segmented, useDebounced } from '../ui/ui';
import { picsumPhotos, type PhotoItem } from '../assets/openverse';
import { GRADIENTS } from './catalog';
import { PanelSearch, PhotoMasonry, SectionHead } from './common';
import { PhotoResults } from './browsers';

const SOLIDS = [
  '#ffffff', '#f8f9fa', '#e9ecef', '#adb5bd', '#495057', '#212529', '#000000',
  '#fff5f5', '#ffc9c9', '#ff6b6b', '#e03131', '#fff0f6', '#faa2c1', '#d6336c',
  '#f3f0ff', '#b98cff', '#7048e8', '#e7f5ff', '#74c0fc', '#1c7ed6', '#0b7285',
  '#e6fcf5', '#63e6be', '#0ca678', '#f4fce3', '#a9e34b', '#fff9db', '#ffd43b',
  '#fff4e6', '#ffa94d', '#e8590c', '#f8f0e3', '#d2b48c', '#8b5e3c', '#2b2140',
];

function setBackground(fill: Fill) {
  const s = useEditor.getState();
  if (!s.design || !s.pageId) return;
  const pid = s.pageId;
  s.update((d) => {
    const p = d.pages.find((x) => x.id === pid);
    if (!p) return;
    p.background = structuredClone(fill) as any;
    delete p.backgroundImage;
  });
}

function setPhoto(p: PhotoItem) {
  if (!useEditor.getState().design) return;
  setPageBackgroundImage(p.src, p.credit);
  useApp.getState().toast('Background updated');
}

export default function BackgroundsPanel() {
  const page = useCurrentPage();
  const brand = useApp((s) => s.brandKits[0]?.palettes[0]?.colors);
  const orientation = useEditor((s) => (s.design ? (s.design.width > s.design.height * 1.15 ? 'wide' : s.design.height > s.design.width * 1.15 ? 'tall' : 'square') : '')) as 'wide' | 'tall' | 'square' | '';
  const [q, setQ] = useState('');
  const [src, setSrc] = useState<'openverse' | 'random'>('openverse');
  const [seed, setSeed] = useState(1);
  const dq = useDebounced(q, 400);
  const custom = useRef<HTMLInputElement>(null);
  const current = page?.background.kind === 'solid' ? page.background.color.toLowerCase() : null;
  const randoms = useMemo(() => picsumPhotos(seed, 16), [seed]);

  return (
    <div className="pn" data-testid="backgrounds-panel">
      {page?.backgroundImage && (
        <button className="btn block" style={{ marginBottom: 8 }} onClick={() => useEditor.getState().update((d) => void delete d.pages.find((p) => p.id === page.id)!.backgroundImage)} data-testid="bg-remove-image">
          <Icon name="ImageOff" size={16} /> Remove background image
        </button>
      )}
      <SectionHead title="Colours" />
      <div className="pn-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        <button className="pn-swatch-sq swatch add" style={{ borderRadius: 6 }} title="Custom colour" aria-label="Custom colour" onClick={() => custom.current?.click()} data-testid="bg-custom" />
        {SOLIDS.map((c) => (
          <button key={c} className="pn-swatch-sq" style={{ background: c, outline: current === c ? '2px solid var(--primary)' : undefined, outlineOffset: 1 }} title={c} aria-label={`Background ${c}`} data-testid="bg-solid" onClick={() => setBackground({ kind: 'solid', color: c })} />
        ))}
      </div>
      <input ref={custom} type="color" hidden onChange={(e) => setBackground({ kind: 'solid', color: e.target.value })} />
      {brand && brand.length > 0 && (
        <>
          <h4>
            <Icon name="Crown" size={13} className="crown" /> Brand colours
          </h4>
          <div className="pn-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {brand.map((c) => (
              <button key={c} className="pn-swatch-sq" style={{ background: c }} title={c} onClick={() => setBackground({ kind: 'solid', color: c })} />
            ))}
          </div>
        </>
      )}
      <SectionHead title="Gradients" />
      <div className="pn-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {GRADIENTS.map((g) => (
          <button key={g.name} className="pn-swatch-sq" style={{ background: fillCss(g.fill) }} title={g.name} aria-label={`${g.name} gradient background`} data-testid="bg-gradient" onClick={() => setBackground(g.fill)} />
        ))}
      </div>
      <SectionHead title="Photos" />
      <div className="row" style={{ marginBottom: 8 }}>
        <Segmented
          value={src}
          onChange={setSrc}
          options={[
            { value: 'openverse', label: 'Search' },
            { value: 'random', label: 'Random' },
          ]}
        />
        {src === 'random' && (
          <button className="btn sm" onClick={() => setSeed((s) => s + 1)} title="Shuffle">
            <Icon name="Shuffle" size={14} /> Shuffle
          </button>
        )}
      </div>
      {src === 'openverse' ? (
        <>
          <PanelSearch value={q} onChange={setQ} placeholder="Search background photos" testId="bg-search" />
          <div style={{ height: 8 }} />
          <PhotoResults query={{ q: dq.trim() || 'texture background', orientation, category: 'photograph' }} onPick={setPhoto} />
        </>
      ) : (
        <PhotoMasonry items={randoms} onPick={setPhoto} />
      )}
    </div>
  );
}
