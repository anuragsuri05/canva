import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, useSelected } from '../store/editor';
import { useApp } from '../store/app';
import { ensureFont, loadCatalogue, POPULAR_FONTS, SYSTEM_FONTS, type FontMeta } from '../assets/fonts';
import { Icon, useDebounced } from '../ui/ui';
import { execOnSelection } from './local';
import './toolbar.css';

const RECENT_KEY = 'cream-recent-fonts';
const ROW = 40;

const CATS = [
  { id: 'all', label: 'All' },
  { id: 'sans-serif', label: 'Sans serif' },
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'handwriting', label: 'Handwriting' },
  { id: 'monospace', label: 'Monospace' },
];

const WEIGHT_NAMES: Record<number, string> = { 100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' };

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function pushRecent(f: string) {
  try {
    const list = [f, ...readRecent().filter((x) => x !== f)].slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/** Apply a font family (+ optional weight/italic) to the selection. */
export function applyFont(family: string, weight?: number, italic?: boolean) {
  const s = useEditor.getState();
  ensureFont(family, weight ?? 400, !!italic);
  pushRecent(family);
  if (s.editingId && weight === undefined && execOnSelection('fontName', family)) return;
  s.updateSelected((e) => {
    if (e.type === 'text' || e.type === 'shape') {
      e.fontFamily = family;
      if (weight !== undefined) e.fontWeight = weight;
      if (italic !== undefined) e.italic = italic;
      if (e.html) e.html = e.html.replace(/font-family\s*:\s*[^;"]+;?/gi, '').replace(/<font[^>]*face=[^>]*>(.*?)<\/font>/gi, '$1');
    } else if (e.type === 'table') e.fontFamily = family;
    else if (e.type === 'chart') e.options.fontFamily = family;
  });
}

type Row =
  | { kind: 'head'; label: string }
  | { kind: 'font'; family: string; meta?: FontMeta; key: string }
  | { kind: 'variant'; family: string; weight: number; italic: boolean; key: string };

export default function FontPanel() {
  const sel = useSelected();
  const kits = useApp((s) => s.brandKits);
  const assets = useApp((s) => s.assets);
  const [cat, setCat] = useState('all');
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim().toLowerCase(), 150);
  const [catalogue, setCatalogue] = useState<FontMeta[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [recent, setRecent] = useState(readRecent);
  const listRef = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState(0);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    loadCatalogue().then(setCatalogue);
  }, []);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const el = sel[0];
  const current = el?.type === 'text' || el?.type === 'shape' ? el.fontFamily : el?.type === 'table' ? el.fontFamily : el?.type === 'chart' ? el.options.fontFamily : undefined;
  const curWeight = el?.type === 'text' || el?.type === 'shape' ? el.fontWeight ?? 400 : 400;
  const metaOf = useMemo(() => {
    const m = new Map<string, FontMeta>();
    catalogue?.forEach((f) => m.set(f.family, f));
    return m;
  }, [catalogue]);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    const pushFonts = (families: string[], prefix: string) => {
      for (const f of families) {
        const meta = metaOf.get(f);
        if (cat !== 'all' && meta && meta.category !== cat) continue;
        if (cat !== 'all' && !meta) continue;
        out.push({ kind: 'font', family: f, meta, key: prefix + f });
        if (expanded === prefix + f) {
          const weights = meta?.weights ?? [400, 700];
          const italics = meta?.styles?.includes('italic');
          for (const w of weights) {
            out.push({ kind: 'variant', family: f, weight: w, italic: false, key: prefix + f + w });
            if (italics) out.push({ kind: 'variant', family: f, weight: w, italic: true, key: prefix + f + w + 'i' });
          }
        }
      }
    };
    if (q || cat !== 'all') {
      const all = catalogue ?? POPULAR_FONTS.map((f) => ({ family: f } as FontMeta));
      const matches = all.filter((f) => (!q || f.family.toLowerCase().includes(q)) && (cat === 'all' || f.category === cat));
      // Popular first, then alphabetical
      const pop = new Set(POPULAR_FONTS);
      matches.sort((a, b) => Number(pop.has(b.family)) - Number(pop.has(a.family)) || a.family.localeCompare(b.family));
      if (q) {
        const sys = SYSTEM_FONTS.filter((f) => f.toLowerCase().includes(q));
        if (sys.length) {
          out.push({ kind: 'head', label: 'System fonts' });
          pushFonts(sys, 'sys:');
        }
      }
      out.push({ kind: 'head', label: matches.length ? `${matches.length} fonts` : 'No fonts found' });
      pushFonts(
        matches.map((m) => m.family),
        'all:',
      );
      return out;
    }
    const brand = new Set<string>();
    kits.forEach((k) => {
      [k.fonts.heading, k.fonts.subheading, k.fonts.body, ...k.fonts.extra].forEach((r) => r?.family && brand.add(r.family));
    });
    if (brand.size) {
      out.push({ kind: 'head', label: 'Brand fonts' });
      pushFonts([...brand], 'brand:');
    }
    const uploaded = assets.filter((a) => a.kind === 'font' && !a.trashedAt && a.fontFamily).map((a) => a.fontFamily!);
    if (uploaded.length) {
      out.push({ kind: 'head', label: 'Uploaded fonts' });
      pushFonts([...new Set(uploaded)], 'up:');
    }
    if (current) {
      out.push({ kind: 'head', label: 'Document fonts' });
      pushFonts([current], 'doc:');
    }
    if (recent.length) {
      out.push({ kind: 'head', label: 'Recently used' });
      pushFonts(recent, 'recent:');
    }
    out.push({ kind: 'head', label: 'Popular fonts' });
    pushFonts(POPULAR_FONTS, 'pop:');
    if (catalogue) {
      out.push({ kind: 'head', label: `All fonts (${catalogue.length})` });
      pushFonts(
        catalogue.map((c) => c.family).filter((f) => !POPULAR_FONTS.includes(f)).sort((a, b) => a.localeCompare(b)),
        'all:',
      );
    }
    return out;
  }, [q, cat, catalogue, kits, assets, recent, expanded, current, metaOf]);

  if (!el || !['text', 'shape', 'table', 'chart'].includes(el.type)) {
    return <div className="empty">Select some text to change its font.</div>;
  }

  const start = Math.max(0, Math.floor(scroll / ROW) - 6);
  const end = Math.min(rows.length, Math.ceil((scroll + height) / ROW) + 6);

  return (
    <div data-testid="font-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="search" style={{ marginBottom: 10 }}>
        <Icon name="Search" size={16} />
        <input
          autoFocus
          placeholder="Try “Calligraphy” or “Open Sans”"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            listRef.current?.scrollTo(0, 0);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          data-testid="font-search"
        />
        {query && (
          <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => setQuery('')}>
            <Icon name="X" size={14} />
          </button>
        )}
      </div>
      <div className="chips" style={{ marginBottom: 10 }}>
        {CATS.map((c) => (
          <button key={c.id} className={'chip' + (cat === c.id ? ' active' : '')} onClick={() => setCat(c.id)} data-testid={`font-cat-${c.id}`} style={{ height: 26, fontSize: 12 }}>
            {c.label}
          </button>
        ))}
      </div>
      <div
        ref={listRef}
        className="ct-font-list"
        style={{ height: 'calc(100vh - 290px)', minHeight: 240 }}
        onScroll={(e) => setScroll((e.target as HTMLDivElement).scrollTop)}
        data-testid="font-list"
      >
        <div style={{ height: rows.length * ROW, position: 'relative' }}>
          {rows.slice(start, end).map((r, i) => {
            const top = (start + i) * ROW;
            if (r.kind === 'head')
              return (
                <div key={'h' + r.label + top} className="ct-font-row head" style={{ top }}>
                  {r.label}
                </div>
              );
            if (r.kind === 'variant')
              return (
                <FontRow
                  key={r.key}
                  top={top}
                  family={r.family}
                  weight={r.weight}
                  italic={r.italic}
                  active={current === r.family && curWeight === r.weight}
                  label={`${WEIGHT_NAMES[r.weight] ?? r.weight}${r.italic ? ' Italic' : ''}`}
                  variant
                  onClick={() => {
                    applyFont(r.family, r.weight, r.italic);
                    setRecent(readRecent());
                  }}
                />
              );
            const nW = r.meta?.weights?.length ?? 0;
            return (
              <FontRow
                key={r.key}
                top={top}
                family={r.family}
                active={current === r.family}
                label={r.family}
                onClick={() => {
                  applyFont(r.family);
                  setRecent(readRecent());
                }}
                expandable={nW > 1}
                expanded={expanded === r.key}
                onExpand={() => setExpanded(expanded === r.key ? null : r.key)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FontRow({
  top,
  family,
  weight = 400,
  italic = false,
  label,
  active,
  onClick,
  variant,
  expandable,
  expanded,
  onExpand,
}: {
  top: number;
  family: string;
  weight?: number;
  italic?: boolean;
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
}) {
  // Lazily load the font only while its row is rendered (virtualised = visible).
  useEffect(() => {
    const id = setTimeout(() => ensureFont(family, weight, italic), 60);
    return () => clearTimeout(id);
  }, [family, weight, italic]);
  return (
    <div
      className={'ct-font-row' + (active ? ' active' : '') + (variant ? ' variant' : '')}
      style={{ top, fontFamily: `'${family}', system-ui`, fontWeight: weight, fontStyle: italic ? 'italic' : undefined }}
      onClick={onClick}
      data-testid={variant ? `font-variant-${family}-${weight}${italic ? 'i' : ''}` : `font-${family}`}
      title={family}
    >
      {expandable ? (
        <button
          className="exp"
          onClick={(e) => {
            e.stopPropagation();
            onExpand?.();
          }}
          title="Show weights"
          data-testid={`font-expand-${family}`}
        >
          <Icon name={expanded ? 'ChevronDown' : 'ChevronRight'} size={14} />
        </button>
      ) : (
        !variant && <span style={{ width: 26, flex: 'none' }} />
      )}
      <span className="nm">{label}</span>
      {active && <Icon name="Check" size={16} style={{ color: 'var(--primary)' }} />}
    </div>
  );
}
