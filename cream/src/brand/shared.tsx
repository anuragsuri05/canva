// Shared Brand helpers: kit updates, uploaded-font registration, font picker, src images.
import { useEffect, useMemo, useRef, useState } from 'react';
import { produce } from 'immer';
import { useApp } from '../store/app';
import type { BrandKit } from '../model/types';
import { POPULAR_FONTS, ensureFont, getCatalogueSync, loadCatalogue } from '../assets/fonts';
import { resolveSrc, useSrc } from '../store/blobs';
import { Floating, Icon } from '../ui/ui';

export function updateKit(id: string, recipe: (k: BrandKit) => void) {
  const k = useApp.getState().brandKits.find((b) => b.id === id);
  if (!k) return;
  useApp.getState().saveBrandKit(produce(k, recipe));
}

/** Uploaded fonts are only registered with document.fonts on upload; re-register after reloads. */
const registered = new Set<string>();
export async function registerUploadedFonts() {
  const fonts = useApp.getState().assets.filter((a) => a.kind === 'font' && !a.trashedAt && a.fontFamily);
  for (const a of fonts) {
    if (registered.has(a.id)) continue;
    registered.add(a.id);
    try {
      const url = await resolveSrc('asset:' + a.id);
      if (!url) continue;
      const face = new FontFace(a.fontFamily!, `url(${url})`);
      await face.load();
      (document.fonts as any).add(face);
    } catch {
      /* ignore broken font files */
    }
  }
}

export function useUploadedFontFamilies(): string[] {
  const assets = useApp((s) => s.assets);
  return useMemo(() => [...new Set(assets.filter((a) => a.kind === 'font' && !a.trashedAt && a.fontFamily).map((a) => a.fontFamily!))], [assets]);
}

export function SrcImg({ src, alt = '', className, style }: { src: string; alt?: string; className?: string; style?: React.CSSProperties }) {
  const url = useSrc(src);
  return url ? <img src={url} alt={alt} className={className} style={style} draggable={false} /> : <span className={className} style={style} />;
}

function FontRow({ family, active, onPick }: { family: string; active: boolean; onPick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && ensureFont(family, 400));
    io.observe(el);
    return () => io.disconnect();
  }, [family]);
  return (
    <button ref={ref} className={'font-row' + (active ? ' active' : '')} style={{ fontFamily: `'${family}', system-ui` }} onClick={onPick}>
      <span className="grow">{family}</span>
      {active && <Icon name="Check" size={14} />}
    </button>
  );
}

/** Font family picker: popular fonts, uploaded fonts and a search over the full Fontsource catalogue. */
export function FontPicker({ value, onChange, testId }: { value: string; onChange: (f: string) => void; testId?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(getCatalogueSync());
  const btn = useRef<HTMLButtonElement>(null);
  const uploaded = useUploadedFontFamilies();
  useEffect(() => {
    if (open && !cat) loadCatalogue().then(setCat);
  }, [open, cat]);
  useEffect(() => {
    ensureFont(value, 400);
  }, [value]);
  const s = q.trim().toLowerCase();
  const results = s ? (cat ?? POPULAR_FONTS.map((f) => ({ family: f }))).filter((f) => f.family.toLowerCase().includes(s)).slice(0, 80).map((f) => f.family) : null;
  const pick = (f: string) => {
    onChange(f);
    setOpen(false);
  };
  return (
    <>
      <button ref={btn} className="select font-pick" style={{ fontFamily: `'${value}', system-ui` }} onClick={() => setOpen(!open)} data-testid={testId}>
        <span className="grow ellipsis" style={{ textAlign: 'left' }}>
          {value}
        </span>
        <Icon name="ChevronDown" size={14} />
      </button>
      {open && (
        <Floating anchor={btn.current} onClose={() => setOpen(false)} width={300} ignoreRef={btn} className="popover font-pop">
          <div className="search" style={{ height: 36, marginBottom: 8 }}>
            <Icon name="Search" size={15} />
            <input autoFocus placeholder={`Search ${cat ? cat.length.toLocaleString() + ' ' : ''}fonts`} value={q} onChange={(e) => setQ(e.target.value)} data-testid="font-search" />
          </div>
          <div className="font-list">
            {results ? (
              results.length ? (
                results.map((f) => <FontRow key={f} family={f} active={f === value} onPick={() => pick(f)} />)
              ) : (
                <div className="empty">No fonts found</div>
              )
            ) : (
              <>
                {uploaded.length > 0 && <div className="menu-title">Uploaded fonts</div>}
                {uploaded.map((f) => (
                  <FontRow key={'u' + f} family={f} active={f === value} onPick={() => pick(f)} />
                ))}
                <div className="menu-title">Popular fonts</div>
                {POPULAR_FONTS.map((f) => (
                  <FontRow key={f} family={f} active={f === value} onPick={() => pick(f)} />
                ))}
              </>
            )}
          </div>
        </Floating>
      )}
    </>
  );
}

export const FONT_WEIGHTS = [
  [100, 'Thin'],
  [200, 'Extra light'],
  [300, 'Light'],
  [400, 'Regular'],
  [500, 'Medium'],
  [600, 'Semi bold'],
  [700, 'Bold'],
  [800, 'Extra bold'],
  [900, 'Black'],
] as const;
