// Colour utilities + colour-target read/write shared by ColorPanel and the toolbar.
import type { Draft } from 'immer';
import type { Design, El, Fill, Page } from '../model/types';
import { findEl, useEditor, currentPage } from '../store/editor';
import { svgColors } from '../render/Elements';
import { execOnSelection } from './local';

export type ColorTarget = { kind: string; key?: string };

/* ---------- Palettes ---------- */

export const DEFAULT_COLORS = [
  '#000000', '#545454', '#737373', '#a6a6a6', '#d9d9d9', '#ffffff',
  '#ff3131', '#ff5757', '#ff66c4', '#cb6ce6', '#8c52ff', '#5e17eb',
  '#0097b2', '#0cc0df', '#5ce1e6', '#38b6ff', '#5271ff', '#004aad',
  '#00bf63', '#7ed957', '#c1ff72', '#ffde59', '#ffbd59', '#ff914d',
];

const g = (a: string, b: string, angle = 90, type: 'linear' | 'radial' = 'linear'): Fill => ({
  kind: 'gradient',
  type,
  angle,
  stops: [
    { color: a, pos: 0 },
    { color: b, pos: 1 },
  ],
});

export const DEFAULT_GRADIENTS: Fill[] = [
  g('#000000', '#737373'), g('#000000', '#c89116'), g('#000000', '#3533cd'), g('#a6a6a6', '#ffffff'),
  g('#fff7ad', '#ffa9f9'), g('#cdffd8', '#94b9ff'), g('#ff3131', '#ff914d'), g('#ff66c4', '#ffde59'),
  g('#8c52ff', '#5ce1e6'), g('#8c52ff', '#ff914d'), g('#5170ff', '#ff66c4'), g('#004aad', '#cb6ce6'),
  g('#0cc0df', '#ffde59'), g('#7ed957', '#0097b2'), g('#ffffff', '#5ce1e6', 0, 'radial'), g('#ffde59', '#ff914d', 0, 'radial'),
];

/* ---------- Conversions ---------- */

let probe: CanvasRenderingContext2D | null = null;
/** Parse any CSS colour (hex, rgb, names) into #rrggbb / #rrggbbaa. */
export function normHex(input: string): string | null {
  if (!input) return null;
  let s = input.trim();
  if (/^[0-9a-f]{3}([0-9a-f]{3})?([0-9a-f]{2})?$/i.test(s)) s = '#' + s;
  if (/^#[0-9a-f]{3}$/i.test(s)) return ('#' + s.slice(1).split('').map((c) => c + c).join('')).toLowerCase();
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(s)) return s.toLowerCase();
  if (!probe) probe = document.createElement('canvas').getContext('2d');
  if (!probe) return null;
  probe.fillStyle = '#010203';
  probe.fillStyle = s;
  const out = String(probe.fillStyle);
  if (out === '#010203' && s.toLowerCase() !== '#010203') return null;
  if (out.startsWith('#')) return out.toLowerCase();
  const m = out.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, gg, b, a] = m[1].split(',').map((x) => parseFloat(x));
  return rgbToHex(r, gg, b, a);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number; a: number } {
  const h = (normHex(hex) ?? '#000000').slice(1);
  const n = parseInt(h.slice(0, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a };
}

export function rgbToHex(r: number, g2: number, b: number, a = 1): string {
  const hx = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return '#' + hx(r) + hx(g2) + hx(b) + (a < 1 ? hx(a * 255) : '');
}

export function rgbToHsv(r: number, g2: number, b: number) {
  r /= 255;
  g2 /= 255;
  b /= 255;
  const max = Math.max(r, g2, b);
  const min = Math.min(r, g2, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g2 - b) / d) % 6;
    else if (max === g2) h = (b - r) / d + 2;
    else h = (r - g2) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

export function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g2 = 0,
    b = 0;
  if (h < 60) [r, g2, b] = [c, x, 0];
  else if (h < 120) [r, g2, b] = [x, c, 0];
  else if (h < 180) [r, g2, b] = [0, c, x];
  else if (h < 240) [r, g2, b] = [0, x, c];
  else if (h < 300) [r, g2, b] = [x, 0, c];
  else [r, g2, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g2 + m) * 255, b: (b + m) * 255 };
}

export const fillCssOf = (f?: Fill | null): string => {
  if (!f) return 'transparent';
  if (f.kind === 'solid') return f.color;
  if (f.kind === 'gradient') {
    const stops = f.stops.map((s) => `${s.color} ${Math.round(s.pos * 100)}%`).join(', ');
    return f.type === 'radial' ? `radial-gradient(circle, ${stops})` : `linear-gradient(${f.angle}deg, ${stops})`;
  }
  return '#ccc';
};

export const fillKey = (f?: Fill | null) => (f ? JSON.stringify(f).toLowerCase() : '');
export const solid = (color: string): Fill => ({ kind: 'solid', color });
export const sameColor = (a?: string, b?: string) => !!a && !!b && (normHex(a) ?? a.toLowerCase()) === (normHex(b) ?? b.toLowerCase());

/* ---------- Target read / write ---------- */

export function targetTitle(t: ColorTarget | null): string {
  switch (t?.kind) {
    case 'page-bg':
      return 'Background color';
    case 'text':
      return 'Text color';
    case 'fill':
      return 'Color';
    case 'stroke':
    case 'border':
      return 'Border color';
    case 'line':
      return 'Line color';
    case 'svg':
      return 'Graphic color';
    case 'chart-series':
      return 'Series color';
    case 'table-cell':
      return 'Cell color';
    case 'sticky':
      return 'Note color';
    default:
      return 'Color';
  }
}

export function allowsGradient(t: ColorTarget | null): boolean {
  return !!t && ['page-bg', 'text', 'fill'].includes(t.kind);
}

function selected(): El[] {
  const s = useEditor.getState();
  if (!s.design) return [];
  return s.selection.map((id) => findEl(s.design!, id)?.el).filter(Boolean) as El[];
}

/** Current value of the target as a Fill (or null if mixed / not applicable). */
export function readTarget(t: ColorTarget | null): Fill | null {
  if (!t) return null;
  const s = useEditor.getState();
  const page = currentPage(s);
  const el = selected()[0];
  switch (t.kind) {
    case 'page-bg':
      return page?.background ?? null;
    case 'text':
      if (!el) return null;
      if (el.type === 'text') return el.gradient ?? solid(el.color);
      if (el.type === 'shape') return solid(el.color ?? '#ffffff');
      if (el.type === 'table') return solid(el.color);
      if (el.type === 'chart') return solid(el.options.textColor);
      return null;
    case 'fill':
      if (!el) return null;
      if (el.type === 'shape') return el.fill;
      if (el.type === 'frame') return solid(el.media.fill ?? '#d9d9d9');
      if (el.type === 'grid') return solid(el.cells[0]?.fill ?? '#d9d9d9');
      if (el.type === 'sticky') return solid(el.color);
      return null;
    case 'stroke':
    case 'border':
      if (!el) return null;
      if (el.type === 'shape') return el.stroke ? solid(el.stroke.color) : null;
      if (el.type === 'image' || el.type === 'frame') return el.border ? solid(el.border.color) : null;
      if (el.type === 'table') return solid(el.borderColor);
      if (el.type === 'draw') return el.paths[0] ? solid(el.paths[0].color) : null;
      return null;
    case 'line':
      return el?.type === 'line' ? solid(el.color) : null;
    case 'svg':
      if (el?.type !== 'svg' || !t.key) return null;
      return solid(el.colorMap?.[t.key] ?? t.key);
    case 'chart-series':
      if (el?.type !== 'chart') return null;
      return solid(el.series[Number(t.key ?? 0)]?.color ?? '#000000');
    case 'table-cell': {
      if (el?.type !== 'table') return null;
      if (t.key === 'header') return el.headerFill ? solid(el.headerFill) : null;
      const [r, c] = (t.key ?? '0,0').split(',').map(Number);
      const f = t.key === 'all' ? el.cells[1]?.[0]?.fill ?? el.cells[0]?.[0]?.fill : el.cells[r]?.[c]?.fill;
      return f ? solid(f) : null;
    }
    case 'sticky':
      return el?.type === 'sticky' ? solid(el.color) : null;
  }
  return null;
}

const firstColor = (f: Fill) => (f.kind === 'solid' ? f.color : f.kind === 'gradient' ? f.stops[0]?.color ?? '#000000' : '#000000');

/** Strip inline colour styles so a whole-element colour change wins (Canva behaviour). */
export const stripInlineColor = (html: string) => html.replace(/(;|\s|")color\s*:\s*[^;"]+;?/gi, '$1').replace(/<font[^>]*color=[^>]*>(.*?)<\/font>/gi, '$1');

/**
 * Write a colour/fill to the target.
 * opts.changeAll — also replace the previous colour everywhere on the current page.
 */
export function applyTarget(t: ColorTarget | null, value: Fill, opts: { changeAll?: boolean; coalesce?: string } = {}) {
  if (!t) return;
  const s = useEditor.getState();
  if (!s.design) return;
  const color = firstColor(value);
  const prev = readTarget(t);
  const ids = new Set(s.selection);

  // Partial text colour while editing a selection.
  if (t.kind === 'text' && value.kind === 'solid' && s.editingId && execOnSelection('foreColor', color)) return;

  const pid = currentPage(s)?.id;
  s.update(
    (d) => {
      const page = d.pages.find((p) => p.id === pid);
      const each = (fn: (e: Draft<El>) => void) => {
        for (const id of ids) {
          const f = findEl(d, id);
          if (f && f.el.locked !== 'full') fn(f.page.elements[f.index] as Draft<El>);
        }
      };
      switch (t.kind) {
        case 'page-bg':
          if (page) page.background = structuredClone(value) as Draft<Fill>;
          break;
        case 'text':
          each((e) => {
            if (e.type === 'text') {
              if (value.kind === 'gradient') e.gradient = structuredClone(value) as Draft<Fill>;
              else {
                delete e.gradient;
                e.color = color;
                e.html = stripInlineColor(e.html);
              }
            } else if (e.type === 'shape') e.color = color;
            else if (e.type === 'table') e.color = color;
            else if (e.type === 'chart') e.options.textColor = color;
          });
          break;
        case 'fill':
          each((e) => {
            if (e.type === 'shape') e.fill = structuredClone(value) as Draft<Fill>;
            else if (e.type === 'frame') e.media.fill = color;
            else if (e.type === 'grid') e.cells.forEach((c) => (c.fill = color));
            else if (e.type === 'sticky') e.color = color;
          });
          break;
        case 'stroke':
        case 'border':
          each((e) => {
            if (e.type === 'shape') e.stroke = { width: 4, style: 'solid', ...(e.stroke ?? {}), color };
            else if (e.type === 'image' || e.type === 'frame') e.border = { width: 4, style: 'solid', ...(e.border ?? {}), color };
            else if (e.type === 'table') e.borderColor = color;
            else if (e.type === 'draw') e.paths.forEach((p) => (p.color = color));
          });
          break;
        case 'line':
          each((e) => {
            if (e.type === 'line') e.color = color;
          });
          break;
        case 'svg':
          each((e) => {
            if (e.type === 'svg' && t.key) e.colorMap = { ...(e.colorMap ?? {}), [t.key]: color };
          });
          break;
        case 'chart-series':
          each((e) => {
            if (e.type === 'chart') {
              const i = Number(t.key ?? 0);
              if (e.series[i]) e.series[i].color = color;
            }
          });
          break;
        case 'table-cell':
          each((e) => {
            if (e.type !== 'table') return;
            if (t.key === 'header') e.headerFill = color;
            else if (t.key === 'all') e.cells.forEach((row) => row.forEach((c) => (c.fill = color)));
            else {
              const [r, c] = (t.key ?? '0,0').split(',').map(Number);
              if (e.cells[r]?.[c]) e.cells[r][c].fill = color;
            }
          });
          break;
        case 'sticky':
          each((e) => {
            if (e.type === 'sticky') e.color = color;
          });
          break;
      }
      if (opts.changeAll && prev && page) {
        const from = firstColor(prev);
        if (from && !sameColor(from, color)) replaceColorOnPage(page as Page, from, color);
      }
    },
    { coalesce: opts.coalesce },
  );
}

/** Replace every use of colour `from` with `to` on a page (draft). Returns number of replacements. */
export function replaceColorOnPage(page: Page, from: string, to: string): number {
  let n = 0;
  const f = normHex(from) ?? from.toLowerCase();
  const visit = (obj: any, key?: string): any => {
    if (typeof obj === 'string') {
      if ((key === 'html' || key === 'svg') && obj.toLowerCase().includes(f)) {
        n++;
        return obj.replace(new RegExp(f.replace(/[#]/g, '\\#'), 'gi'), to);
      }
      if (/^#|^rgb/i.test(obj) && (normHex(obj) ?? obj) === f) {
        n++;
        return to;
      }
      return obj;
    }
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) obj[i] = visit(obj[i]);
      return obj;
    }
    if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        if (k === 'id' || k === 'src' || k === 'colorMap') continue;
        obj[k] = visit(obj[k], k);
      }
      return obj;
    }
    return obj;
  };
  for (const e of page.elements) {
    if (e.type === 'svg') {
      for (const c of svgColors(e.svg)) {
        const eff = e.colorMap?.[c] ?? c;
        if ((normHex(eff) ?? eff.toLowerCase()) === f) {
          e.colorMap = { ...(e.colorMap ?? {}), [c]: to };
          n++;
        }
      }
      continue;
    }
    visit(e);
  }
  page.background = visit(page.background);
  return n;
}

/** Count uses of a colour on the current page. */
export function countColorOnPage(color: string): number {
  const s = useEditor.getState();
  const page = currentPage(s);
  if (!page) return 0;
  const clone = structuredClone(page);
  return replaceColorOnPage(clone, color, '#000001');
}

/** Distinct colours used in the design (Document colours). */
export function documentColors(d: Design | null): string[] {
  if (!d) return [];
  const out = new Map<string, string>();
  const add = (c?: string) => {
    if (!c) return;
    const h = normHex(c);
    if (h && !out.has(h)) out.set(h, h);
  };
  const addFill = (f?: Fill) => {
    if (!f) return;
    if (f.kind === 'solid') add(f.color);
    if (f.kind === 'gradient') f.stops.forEach((s) => add(s.color));
  };
  const fromHtml = (html?: string) => {
    if (!html) return;
    const re = /color\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^)]+\))/gi;
    let m;
    while ((m = re.exec(html))) add(m[1]);
  };
  for (const p of d.pages) {
    addFill(p.background);
    for (const e of p.elements) {
      switch (e.type) {
        case 'text':
          add(e.color);
          addFill(e.gradient);
          fromHtml(e.html);
          break;
        case 'shape':
          addFill(e.fill);
          add(e.stroke?.color);
          if (e.html) add(e.color);
          break;
        case 'line':
          add(e.color);
          break;
        case 'svg':
          svgColors(e.svg).forEach((c) => add(e.colorMap?.[c] ?? c));
          break;
        case 'chart':
          e.series.forEach((s) => add(s.color));
          break;
        case 'table':
          add(e.borderColor);
          add(e.headerFill);
          e.cells.forEach((r) => r.forEach((c) => add(c.fill)));
          break;
        case 'sticky':
          add(e.color);
          break;
        case 'image':
          add(e.border?.color);
          break;
        case 'draw':
          e.paths.forEach((p) => add(p.color));
          break;
      }
    }
  }
  return [...out.values()].slice(0, 40);
}

/** Sample a small palette from an image src (Photo colours). */
export async function samplePalette(src: string, n = 6): Promise<string[]> {
  const { resolveSrc } = await import('../store/blobs');
  const url = await resolveSrc(src);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  try {
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 48;
    c.height = 48;
    const g2 = c.getContext('2d')!;
    g2.drawImage(img, 0, 0, 48, 48);
    const data = g2.getImageData(0, 0, 48, 48).data;
    const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const k = [data[i], data[i + 1], data[i + 2]].map((v) => Math.round(v / 40)).join(',');
      const bk = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
      bk.n++;
      bk.r += data[i];
      bk.g += data[i + 1];
      bk.b += data[i + 2];
      buckets.set(k, bk);
    }
    return [...buckets.values()]
      .sort((a, b) => b.n - a.n)
      .slice(0, n)
      .map((b) => rgbToHex(b.r / b.n, b.g / b.n, b.b / b.n));
  } catch {
    return [];
  }
}
