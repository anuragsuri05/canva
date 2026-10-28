import { nanoid } from 'nanoid';
import type {
  ChartEl,
  Design,
  DesignCategory,
  DrawEl,
  El,
  EmbedEl,
  Fill,
  FrameEl,
  GridEl,
  ImageEl,
  LineEl,
  Page,
  ShapeEl,
  ShapeKind,
  StickyEl,
  SvgEl,
  TableEl,
  TextEl,
  TextStyle,
  Unit,
  VideoEl,
} from './types';
import { presetById } from './presets';

export const uid = () => nanoid(10);

export const DEFAULT_FONT = 'Inter';

export const solid = (color: string): Fill => ({ kind: 'solid', color });

export function newPage(partial: Partial<Page> = {}): Page {
  return {
    id: uid(),
    background: solid('#ffffff'),
    elements: [],
    notes: '',
    duration: 5,
    ...partial,
  };
}

export function newDesign(opts: {
  title?: string;
  preset?: string;
  width?: number;
  height?: number;
  unit?: Unit;
  category?: DesignCategory;
  pages?: Page[];
  folderId?: string | null;
}): Design {
  const preset = opts.preset ? presetById(opts.preset) : undefined;
  const width = opts.width ?? preset?.width ?? 1080;
  const height = opts.height ?? preset?.height ?? 1080;
  const category = opts.category ?? preset?.category ?? 'custom';
  const now = Date.now();
  return {
    id: uid(),
    title: opts.title ?? (preset ? `Untitled design - ${preset.name}` : 'Untitled design'),
    category,
    preset: preset?.id ?? 'custom',
    width,
    height,
    unit: opts.unit ?? preset?.unit ?? 'px',
    pages: opts.pages ?? [newPage(category === 'whiteboard' ? { background: solid('#f7f5f2') } : {})],
    audio: [],
    comments: [],
    createdAt: now,
    updatedAt: now,
    openedAt: now,
    starred: false,
    folderId: opts.folderId ?? null,
    trashedAt: null,
    share: { access: 'private', role: 'edit', people: [] },
    settings: { snap: true, guides: [] },
  };
}

const base = (type: El['type'], x: number, y: number, w: number, h: number) => ({
  id: uid(),
  type,
  x,
  y,
  w,
  h,
  rotation: 0,
  opacity: 1,
});

export const defaultTextStyle = (over: Partial<TextStyle> = {}): TextStyle => ({
  fontFamily: DEFAULT_FONT,
  fontSize: 32,
  fontWeight: 400,
  italic: false,
  underline: false,
  strike: false,
  color: '#1f1f1f',
  align: 'left',
  lineHeight: 1.4,
  letterSpacing: 0,
  uppercase: false,
  ...over,
});

export function makeText(text: string, x: number, y: number, w: number, style: Partial<TextStyle> = {}, role?: TextEl['role']): TextEl {
  const st = defaultTextStyle(style);
  const lines = Math.max(1, text.split('\n').length);
  return {
    ...base('text', x, y, w, Math.round(st.fontSize * st.lineHeight * lines)),
    ...st,
    type: 'text',
    html: escapeHtml(text).replace(/\n/g, '<br>'),
    autoHeight: true,
    role,
  } as TextEl;
}

export function makeShape(shape: ShapeKind, x: number, y: number, w: number, h: number, color = '#c4c4c4'): ShapeEl {
  return {
    ...base('shape', x, y, w, h),
    type: 'shape',
    shape,
    fill: solid(color),
    radius: shape === 'rounded' ? Math.min(w, h) * 0.15 : 0,
    ...defaultTextStyle({ align: 'center', fontSize: Math.max(16, Math.round(Math.min(w, h) / 8)), color: '#ffffff', anchor: 'middle' }),
  } as ShapeEl;
}

export function makeLine(x1: number, y1: number, x2: number, y2: number, over: Partial<LineEl> = {}): LineEl {
  const el: LineEl = {
    ...base('line', Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)),
    type: 'line',
    x1,
    y1,
    x2,
    y2,
    color: '#1f1f1f',
    width: 4,
    style: 'solid',
    startCap: 'none',
    endCap: 'none',
    lineType: 'straight',
    ...over,
  };
  return el;
}

export function makeImage(src: string, naturalW: number, naturalH: number, x: number, y: number, w: number, over: Partial<ImageEl> = {}): ImageEl {
  const h = Math.round((w * naturalH) / Math.max(1, naturalW));
  return { ...base('image', x, y, w, h), type: 'image', src, naturalW, naturalH, ...over } as ImageEl;
}

export function makeSvg(svg: string, x: number, y: number, w: number, h: number, over: Partial<SvgEl> = {}): SvgEl {
  return { ...base('svg', x, y, w, h), type: 'svg', svg, keepRatio: true, ...over } as SvgEl;
}

export function makeVideo(src: string, duration: number, naturalW: number, naturalH: number, x: number, y: number, w: number, over: Partial<VideoEl> = {}): VideoEl {
  const h = Math.round((w * naturalH) / Math.max(1, naturalW));
  return {
    ...base('video', x, y, w, h),
    type: 'video',
    src,
    duration,
    trimStart: 0,
    trimEnd: duration,
    volume: 1,
    loop: true,
    autoplay: true,
    speed: 1,
    naturalW,
    naturalH,
    ...over,
  } as VideoEl;
}

export const CHART_COLORS = ['#7d5cff', '#22b8cf', '#ff8a4c', '#f06595', '#51cf66', '#fcc419', '#495057'];

export function makeChart(chartType: ChartEl['chartType'], x: number, y: number, w: number, h: number): ChartEl {
  const single = ['pie', 'donut', 'progress-bar', 'progress-ring', 'number', 'funnel', 'pictogram'].includes(chartType);
  return {
    ...base('chart', x, y, w, h),
    type: 'chart',
    chartType,
    labels: chartType.startsWith('progress') || chartType === 'number' ? ['Value'] : ['Item 1', 'Item 2', 'Item 3', 'Item 4'],
    series: single
      ? [{ name: 'Series 1', values: chartType.startsWith('progress') ? [68] : chartType === 'number' ? [1250] : [42, 28, 18, 12], color: CHART_COLORS[0] }]
      : [
          { name: 'Series 1', values: [12, 19, 8, 15], color: CHART_COLORS[0] },
          { name: 'Series 2', values: [7, 11, 14, 9], color: CHART_COLORS[1] },
        ],
    options: {
      legend: !single || chartType === 'pie' || chartType === 'donut',
      labels: true,
      grid: true,
      values: false,
      smooth: false,
      points: true,
      lineWeight: 3,
      spacing: 30,
      rounding: 4,
      fontFamily: DEFAULT_FONT,
      fontSize: 14,
      textColor: '#444444',
      gridColor: '#e6e6e6',
      max: chartType.startsWith('progress') ? 100 : undefined,
      suffix: chartType.startsWith('progress') ? '%' : '',
    },
  };
}

export function makeTable(rows: number, cols: number, x: number, y: number, w: number): TableEl {
  return {
    ...base('table', x, y, w, rows * 44),
    type: 'table',
    colWidths: Array.from({ length: cols }, () => 1 / cols),
    rowHeights: Array.from({ length: rows }, () => 44),
    cells: Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ html: '' }))),
    borderColor: '#bdbdbd',
    borderWidth: 1,
    borderStyle: 'solid',
    cellPadding: 10,
    fontFamily: DEFAULT_FONT,
    fontSize: 16,
    color: '#1f1f1f',
  };
}

export function makeFrame(frameShape: FrameEl['frameShape'], x: number, y: number, w: number, h: number, letter?: string): FrameEl {
  return { ...base('frame', x, y, w, h), type: 'frame', frameShape, letter, media: { scale: 1, offsetX: 0, offsetY: 0, fill: '#d9d9d9' } };
}

export const GRID_LAYOUTS: Record<string, { cols: number; rows: number; areas: [number, number, number, number][] }> = {
  // areas: [col, row, colSpan, rowSpan]
  '1x2': { cols: 2, rows: 1, areas: [[0, 0, 1, 1], [1, 0, 1, 1]] },
  '2x1': { cols: 1, rows: 2, areas: [[0, 0, 1, 1], [0, 1, 1, 1]] },
  '1x3': { cols: 3, rows: 1, areas: [[0, 0, 1, 1], [1, 0, 1, 1], [2, 0, 1, 1]] },
  '3x1': { cols: 1, rows: 3, areas: [[0, 0, 1, 1], [0, 1, 1, 1], [0, 2, 1, 1]] },
  '2x2': { cols: 2, rows: 2, areas: [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1]] },
  '1-2': { cols: 2, rows: 2, areas: [[0, 0, 1, 2], [1, 0, 1, 1], [1, 1, 1, 1]] },
  '2-1': { cols: 2, rows: 2, areas: [[0, 0, 1, 1], [0, 1, 1, 1], [1, 0, 1, 2]] },
  'top-1-2': { cols: 2, rows: 2, areas: [[0, 0, 2, 1], [0, 1, 1, 1], [1, 1, 1, 1]] },
  '3x3': { cols: 3, rows: 3, areas: Array.from({ length: 9 }, (_, i) => [i % 3, Math.floor(i / 3), 1, 1] as [number, number, number, number]) },
  '2x3': { cols: 3, rows: 2, areas: Array.from({ length: 6 }, (_, i) => [i % 3, Math.floor(i / 3), 1, 1] as [number, number, number, number]) },
  '1-3': { cols: 3, rows: 2, areas: [[0, 0, 3, 1], [0, 1, 1, 1], [1, 1, 1, 1], [2, 1, 1, 1]] },
  'mosaic': { cols: 3, rows: 2, areas: [[0, 0, 2, 2], [2, 0, 1, 1], [2, 1, 1, 1]] },
};

export function makeGrid(layout: string, x: number, y: number, w: number, h: number): GridEl {
  const l = GRID_LAYOUTS[layout] ?? GRID_LAYOUTS['2x2'];
  return {
    ...base('grid', x, y, w, h),
    type: 'grid',
    layout,
    gap: 8,
    radius: 0,
    cells: l.areas.map(() => ({ scale: 1, offsetX: 0, offsetY: 0, fill: '#d9d9d9' })),
  };
}

export const STICKY_COLORS = ['#fff3a3', '#ffd5a8', '#ffc2d4', '#cfe8ff', '#c9f2d0', '#e2d4ff', '#ffffff'];

export function makeSticky(x: number, y: number, color = STICKY_COLORS[0], author?: string): StickyEl {
  return { ...base('sticky', x, y, 240, 240), type: 'sticky', html: '', color, author, fontSize: 22 };
}

export function makeDraw(x: number, y: number, w: number, h: number, paths: DrawEl['paths']): DrawEl {
  return { ...base('draw', x, y, w, h), type: 'draw', paths, vbW: w, vbH: h };
}

export function makeEmbed(x: number, y: number, w: number, h: number, over: Partial<EmbedEl>): EmbedEl {
  return { ...base('embed', x, y, w, h), type: 'embed', ...over } as EmbedEl;
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function htmlToText(html: string) {
  const d = document.createElement('div');
  d.innerHTML = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|p|li)>/gi, '\n');
  return (d.textContent ?? '').replace(/\n$/, '');
}

/** Deep clone an element (or list) giving fresh ids; keeps group relationships consistent. */
export function cloneElements(els: El[], dx = 0, dy = 0): El[] {
  const groupMap = new Map<string, string>();
  return els.map((e) => {
    const c = structuredClone(e) as El;
    c.id = uid();
    if (c.groupId) {
      if (!groupMap.has(c.groupId)) groupMap.set(c.groupId, uid());
      c.groupId = groupMap.get(c.groupId);
    }
    c.x += dx;
    c.y += dy;
    if (c.type === 'line') {
      c.x1 += dx;
      c.x2 += dx;
      c.y1 += dy;
      c.y2 += dy;
    }
    return c;
  });
}

export function clonePage(p: Page): Page {
  return { ...structuredClone(p), id: uid(), elements: cloneElements(p.elements) };
}
