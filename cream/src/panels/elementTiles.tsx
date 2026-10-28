// Tiles for the built-in element catalogues (shapes, lines, charts, tables, frames, grids, gradients, mockups),
// plus the "Recently used" tile renderer. Previews use the real renderer so they match what gets inserted.
import { memo, useEffect, useMemo, useState } from 'react';
import type { ChartType, El, FrameShape, ShapeKind } from '../model/types';
import { makeChart, makeFrame, makeGrid, makeLine, makeTable, GRID_LAYOUTS } from '../model/defaults';
import { SHAPE_LIST } from '../render/shapes';
import { fillCss } from '../render/textEffects';
import { insertChart, insertFrame, insertGrid, insertTable, setDragPayload } from '../editor/dnd';
import { useEditor } from '../store/editor';
import { Icon } from '../ui/ui';
import { addRecent, type RecentItem } from '../assets/recent';
import { loadIcons, peekIconSvg, svgDataUrl } from '../assets/iconify';
import { CHARTS, FRAMES, GRADIENTS, LETTERS, LINE_PRESETS, MOCKUPS, TABLE_PRESETS, gridLabel } from './catalog';
import { ElPreview, ShapeSvg } from './common';
import { buildGradient, buildLine, elementsDrag, insertGradient, insertLinePreset, insertShapeKind, runRecent } from './insert';

const dz = () => useEditor.getState().design;

/* ---------- builders (used for drag payloads; mirror the core insert* sizing) ---------- */
function buildChart(type: ChartType): El {
  const d = dz()!;
  const w = Math.min(d.width * 0.6, 900);
  const h = type === 'progress-bar' ? w * 0.12 : type === 'number' ? w * 0.35 : w * 0.66;
  const el = makeChart(type, 0, 0, w, h);
  el.options.fontSize = Math.max(10, Math.round(w / 45));
  return el;
}
function buildFrame(shape: FrameShape, letter?: string): El {
  const d = dz()!;
  const s = Math.min(d.width, d.height) * 0.45;
  const ratio = shape === 'phone' ? 2 : shape === 'polaroid' ? 1.2 : shape === 'laptop' ? 0.66 : shape === 'browser' ? 0.7 : shape === 'film' ? 0.66 : 1;
  const w = shape === 'phone' ? s / 2 : s;
  return makeFrame(shape, 0, 0, w, w * ratio, letter);
}
function buildTable(r: number, c: number): El {
  const d = dz()!;
  const w = Math.min(d.width * 0.7, 900);
  const el = makeTable(r, c, 0, 0, w);
  el.fontSize = Math.max(12, Math.round(w / 45));
  el.rowHeights = el.rowHeights.map(() => el.fontSize * 2.6);
  el.h = el.rowHeights.reduce((a, b) => a + b, 0);
  return el;
}

/* ---------- static preview elements (module-level so they're created once) ---------- */
const chartPrev = new Map<ChartType, El[]>();
const chartEls = (t: ChartType) => {
  if (!chartPrev.has(t)) {
    const h = t === 'progress-bar' ? 60 : t === 'number' ? 140 : 220;
    const el = makeChart(t, 10, (240 - h) / 2, 300, h);
    el.options.fontSize = 16;
    chartPrev.set(t, [el]);
  }
  return chartPrev.get(t)!;
};
const frameRatio = (s: FrameShape) => (s === 'phone' ? 2 : s === 'polaroid' ? 1.2 : s === 'laptop' ? 0.66 : s === 'browser' ? 0.7 : s === 'film' ? 0.66 : 1);
const framePrev = new Map<string, El[]>();
const frameEls = (s: FrameShape, letter?: string) => {
  const k = s + (letter ?? '');
  if (!framePrev.has(k)) {
    const r = frameRatio(s);
    const w = r > 1 ? 100 / r : 100;
    const h = w * r;
    framePrev.set(k, [makeFrame(s, (100 - w) / 2, (100 - h) / 2, w, h, letter)]);
  }
  return framePrev.get(k)!;
};
const gridPrev = new Map<string, El[]>();
const gridEls = (l: string) => {
  if (!gridPrev.has(l)) {
    const g = makeGrid(l, 0, 0, 100, 100);
    g.gap = 4;
    gridPrev.set(l, [g]);
  }
  return gridPrev.get(l)!;
};
const tablePrev = new Map<string, El[]>();
const tableEls = (r: number, c: number) => {
  const k = `${r}x${c}`;
  if (!tablePrev.has(k)) {
    const t = makeTable(r, c, 5, 0, 110);
    t.rowHeights = t.rowHeights.map(() => 100 / Math.max(r, c));
    t.h = t.rowHeights.reduce((a, b) => a + b, 0);
    t.y = (120 - t.h) / 2;
    t.borderWidth = 1.5;
    t.borderColor = '#9a96a6';
    t.headerFill = '#e6e1f5';
    t.cells[0] = t.cells[0].map((c0) => ({ ...c0, fill: '#e6e1f5' }));
    tablePrev.set(k, [t]);
  }
  return tablePrev.get(k)!;
};
const linePrev = new Map<string, El[]>();
const lineEls = (id: string) => {
  if (!linePrev.has(id)) {
    const p = LINE_PRESETS.find((x) => x.id === id)!;
    const dy = p.bend ? 40 : 0;
    linePrev.set(id, [makeLine(14, 50 - dy / 2, 86, 50 + dy / 2, { width: 4 * (p.thick ?? 1), color: '#2b2838', ...p.opts })]);
  }
  return linePrev.get(id)!;
};

/* ---------- tiles ---------- */
export const ShapeTile = memo(function ShapeTile({ kind, label }: { kind: ShapeKind; label: string }) {
  return (
    <button
      type="button"
      className="pn-tile sq"
      title={label}
      aria-label={label}
      data-testid={`shape-${kind}`}
      draggable
      onDragStart={(e) => setDragPayload(e, { kind: 'shape', shape: kind })}
      onClick={() => insertShapeKind(kind)}
    >
      <ShapeSvg kind={kind} size={44} fill="#b9b6c2" />
    </button>
  );
});

export function LineTile({ id }: { id: string }) {
  const p = LINE_PRESETS.find((x) => x.id === id)!;
  return (
    <button type="button" className="pn-tile sq" title={p.label} aria-label={p.label} data-testid={`line-${id}`} draggable onDragStart={(e) => elementsDrag(e, () => buildLine(id))} onClick={() => insertLinePreset(id)}>
      <ElPreview els={lineEls(id)} w={100} h={100} size={64} />
    </button>
  );
}

export function ChartTile({ type, wide }: { type: ChartType; wide?: boolean }) {
  const c = CHARTS.find((x) => x.type === type)!;
  return (
    <button
      type="button"
      className={'pn-tile ' + (wide ? 'wide' : 'sq')}
      title={c.label}
      aria-label={c.label}
      data-testid={`chart-${type}`}
      draggable
      onDragStart={(e) => elementsDrag(e, () => buildChart(type))}
      onClick={() => {
        insertChart(type);
        addRecent({ kind: 'chart', key: 'chart:' + type, chart: type });
      }}
    >
      <ElPreview els={chartEls(type)} w={320} h={240} size={wide ? 120 : 66} />
      {wide && <span className="lbl" style={{ opacity: 1, position: 'static' }}>{c.label}</span>}
    </button>
  );
}

export function TableTile({ r, c }: { r: number; c: number }) {
  return (
    <button
      type="button"
      className="pn-tile sq"
      title={`${r} × ${c} table`}
      aria-label={`${r} by ${c} table`}
      data-testid={`table-${r}x${c}`}
      draggable
      onDragStart={(e) => elementsDrag(e, () => buildTable(r, c))}
      onClick={() => {
        insertTable(r, c);
        addRecent({ kind: 'table', key: `table:${r}x${c}`, rows: r, cols: c });
      }}
    >
      <ElPreview els={tableEls(r, c)} w={120} h={120} size={62} />
      <span className="lbl">
        {r} × {c}
      </span>
    </button>
  );
}

export function FrameTile({ shape, letter, label }: { shape: FrameShape; letter?: string; label?: string }) {
  const name = label ?? (letter ? `Letter ${letter} frame` : FRAMES.find((f) => f.shape === shape)?.label ?? shape);
  return (
    <button
      type="button"
      className="pn-tile sq"
      title={name}
      aria-label={name}
      data-testid={`frame-${shape}${letter ?? ''}`}
      draggable
      onDragStart={(e) => elementsDrag(e, () => buildFrame(shape, letter))}
      onClick={() => {
        insertFrame(shape, letter);
        addRecent({ kind: 'frame', key: `frame:${shape}:${letter ?? ''}`, frame: shape, letter });
      }}
    >
      <ElPreview els={frameEls(shape, letter)} w={100} h={100} size={58} />
    </button>
  );
}

export function GridTile({ layout }: { layout: string }) {
  const label = gridLabel(layout);
  return (
    <button
      type="button"
      className="pn-tile sq"
      title={label}
      aria-label={label}
      data-testid={`grid-${layout}`}
      draggable
      onDragStart={(e) => elementsDrag(e, () => makeGrid(layout, 0, 0, dz()!.width, dz()!.height))}
      onClick={() => {
        insertGrid(layout);
        addRecent({ kind: 'grid', key: 'grid:' + layout, layout });
      }}
    >
      <ElPreview els={gridEls(layout)} w={100} h={100} size={58} />
    </button>
  );
}

export function GradientTile({ idx, shape = 'rect' }: { idx: number; shape?: ShapeKind }) {
  const g = GRADIENTS[idx];
  return (
    <button
      type="button"
      className="pn-tile sq"
      title={`${g.name} gradient`}
      aria-label={`${g.name} gradient`}
      data-testid={`gradient-${idx}`}
      draggable
      onDragStart={(e) => elementsDrag(e, () => buildGradient(idx, shape))}
      onClick={() => insertGradient(idx, shape)}
    >
      <span style={{ width: '72%', height: '72%', borderRadius: shape === 'circle' ? '50%' : 4, background: fillCss(g.fill) }} />
    </button>
  );
}

/* ---------- full catalogues ---------- */
export const ALL_SHAPES = SHAPE_LIST;
export const ALL_FRAMES = [...FRAMES.map((f) => ({ shape: f.shape, label: f.label, letter: undefined as string | undefined })), ...LETTERS.map((l) => ({ shape: 'letter' as FrameShape, label: `Letter ${l}`, letter: l }))];
export const ALL_GRIDS = Object.keys(GRID_LAYOUTS);
export { CHARTS, LINE_PRESETS, TABLE_PRESETS, MOCKUPS, GRADIENTS };

/* ---------- Recently used ---------- */
function RecentIcon({ id }: { id: string }) {
  const [svg, setSvg] = useState(() => peekIconSvg(id));
  useEffect(() => {
    if (!svg) loadIcons([id]).then(() => setSvg(peekIconSvg(id))).catch(() => {});
  }, [id, svg]);
  return svg ? <img src={svgDataUrl(svg)} alt="" /> : <Icon name="Shapes" size={20} />;
}

export function RecentTile({ r }: { r: RecentItem }) {
  const body = useMemo(() => {
    switch (r.kind) {
      case 'shape':
        return <ShapeSvg kind={r.shape} size={40} fill="#b9b6c2" />;
      case 'icon':
        return <RecentIcon id={r.id} />;
      case 'photo':
        return <img src={r.item.thumb} alt="" style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: 'cover' }} />;
      case 'video':
        return <img src={r.item.poster} alt="" style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', objectFit: 'cover' }} />;
      case 'audio':
        return <Icon name="Music" size={24} />;
      case 'line':
        return <ElPreview els={lineEls(r.preset)} w={100} h={100} size={56} />;
      case 'chart':
        return <ElPreview els={chartEls(r.chart)} w={320} h={240} size={58} />;
      case 'frame':
        return <ElPreview els={frameEls(r.frame, r.letter)} w={100} h={100} size={50} />;
      case 'grid':
        return <ElPreview els={gridEls(r.layout)} w={100} h={100} size={50} />;
      case 'table':
        return <ElPreview els={tableEls(r.rows, r.cols)} w={120} h={120} size={54} />;
      case 'gradient':
        return <span style={{ width: '70%', height: '70%', borderRadius: r.shape === 'circle' ? '50%' : 4, background: fillCss(GRADIENTS[r.idx]?.fill) }} />;
    }
  }, [r]);
  const title = r.kind === 'audio' || r.kind === 'photo' || r.kind === 'video' ? r.item.title : r.key.split(':').slice(1).join(' ');
  return (
    <button type="button" className="pn-tile sq" title={title} data-testid="recent-tile" onClick={() => runRecent(r)} style={{ width: 70 }}>
      {body}
    </button>
  );
}
