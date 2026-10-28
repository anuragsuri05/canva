// "Design for me": compact design spec ↔ Cream pages, LLM + keyless generators,
// conversational edit ops, rule-based commands and doc drafting.
import type { Draft } from 'immer';
import type { ChartEl, Design, El, Fill, ImageEl, Page, ShapeKind, TextEl } from '../model/types';
import { escapeHtml, htmlToText, makeChart, makeImage, makeLine, makeShape, makeText, newPage, uid, CHART_COLORS } from '../model/defaults';
import { POPULAR_FONTS, ensureFont } from '../assets/fonts';
import { useApp } from '../store/app';
import { currentPage, useEditor } from '../store/editor';
import { complete, completeJSON } from './providers';
import { activeConfig, memoryNote } from './config';
import { findLanguage } from './languages';

/* ------------------------------------------------------------------ spec */

export interface SpecEl {
  type: 'text' | 'shape' | 'image' | 'line' | 'chart';
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
  opacity?: number;
  // text
  text?: string;
  size?: number;
  weight?: number;
  font?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  italic?: boolean;
  uppercase?: boolean;
  letterSpacing?: number;
  lineHeight?: number;
  role?: 'heading' | 'subheading' | 'body';
  // shape
  shape?: string;
  fill?: string;
  gradient?: string[];
  radius?: number;
  // image
  prompt?: string;
  query?: string;
  // line
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  width?: number;
  // chart
  chartType?: string;
  labels?: string[];
  values?: number[];
}

export interface SpecPage {
  background?: string;
  gradient?: string[];
  backgroundPrompt?: string;
  backgroundQuery?: string;
  elements: SpecEl[];
  notes?: string;
}

export interface DesignSpec {
  title?: string;
  pages: SpecPage[];
}

export const SPEC_SCHEMA = {
  type: 'object',
  properties: {
    designs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          pages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                background: { type: 'string', description: 'hex colour' },
                gradient: { type: 'array', items: { type: 'string' }, description: 'optional 2 hex colours for a linear gradient background' },
                backgroundPrompt: { type: 'string', description: 'optional: full-bleed background photo prompt' },
                backgroundQuery: { type: 'string', description: '1-3 keyword stock photo search for the background' },
                notes: { type: 'string' },
                elements: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { enum: ['text', 'shape', 'image', 'line', 'chart'] },
                      x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' },
                      rotation: { type: 'number' }, opacity: { type: 'number' },
                      text: { type: 'string' }, size: { type: 'number' }, weight: { type: 'number' }, font: { type: 'string' }, color: { type: 'string' },
                      align: { enum: ['left', 'center', 'right'] }, italic: { type: 'boolean' }, uppercase: { type: 'boolean' }, letterSpacing: { type: 'number' }, lineHeight: { type: 'number' },
                      role: { enum: ['heading', 'subheading', 'body'] },
                      shape: { type: 'string' }, fill: { type: 'string' }, gradient: { type: 'array', items: { type: 'string' } }, radius: { type: 'number' },
                      prompt: { type: 'string' }, query: { type: 'string' },
                      x1: { type: 'number' }, y1: { type: 'number' }, x2: { type: 'number' }, y2: { type: 'number' }, width: { type: 'number' },
                      chartType: { type: 'string' }, labels: { type: 'array', items: { type: 'string' } }, values: { type: 'array', items: { type: 'number' } },
                    },
                    required: ['type'],
                  },
                },
              },
              required: ['elements'],
            },
          },
        },
        required: ['pages'],
      },
    },
  },
  required: ['designs'],
};

const SHAPES: ShapeKind[] = ['rect', 'rounded', 'circle', 'triangle', 'diamond', 'hexagon', 'star5', 'star4', 'heart', 'arrow-right', 'blob1', 'blob2', 'blob3', 'ring', 'half-circle', 'arch', 'speech', 'cloud', 'pentagon', 'octagon', 'starburst', 'chevron', 'parallelogram'];
const CHART_TYPES: ChartEl['chartType'][] = ['bar', 'column', 'line', 'area', 'pie', 'donut', 'progress-bar', 'progress-ring', 'number'];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const NAMED: Record<string, string> = {
  red: '#e53935', blue: '#1e63d6', navy: '#1b2a4a', green: '#2e9e5b', yellow: '#f9c80e', orange: '#ff8a1f', purple: '#7d3cff', violet: '#8b5cf6', pink: '#ff5fa2',
  black: '#111111', white: '#ffffff', gray: '#8a8a8a', grey: '#8a8a8a', teal: '#14b8a6', cyan: '#06b6d4', gold: '#d4a017', brown: '#8b5a2b', beige: '#efe3cf',
  cream: '#fff8ef', maroon: '#7b1e2b', lime: '#84cc16', magenta: '#d946ef', coral: '#ff7f61', mint: '#a7f3d0', lavender: '#c4b5fd', indigo: '#4f46e5', turquoise: '#2dd4bf',
  silver: '#c0c0c0', olive: '#708238', peach: '#ffcba4', crimson: '#dc143c', emerald: '#10b981', sky: '#38bdf8', charcoal: '#333842',
};
export function parseColor(c: unknown, fallback = '#1f1f1f'): string {
  if (typeof c !== 'string') return fallback;
  const s = c.trim().toLowerCase();
  if (HEX.test(s)) return s;
  if (NAMED[s]) return NAMED[s];
  if (/^rgba?\(/.test(s)) return s;
  return fallback;
}
const num = (v: unknown, d: number, min = -1e5, max = 1e5) => (typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, v)) : d);
const fontOk = (f: unknown, d: string) => {
  if (typeof f !== 'string') return d;
  const hit = POPULAR_FONTS.find((p) => p.toLowerCase() === f.toLowerCase());
  return hit ?? d;
};

function luminance(hex: string) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((x) => parseInt(x + x, 16)) : [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (v.some(isNaN)) return 0.5;
  return (0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) / 255;
}

const WIDE = /syne|archivo black|montserrat|poppins|abril|space grotesk|righteous|alfa slab|fredoka|work sans|bebas/i;
function estimateTextHeight(text: string, w: number, size: number, lh: number, font = '') {
  const cw = /bebas|anton|oswald|teko|barlow condensed/i.test(font) ? 0.45 : WIDE.test(font) ? 0.68 : 0.56;
  const charsPerLine = Math.max(4, Math.floor(w / (size * cw)));
  const lines = text.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / charsPerLine)), 0);
  return Math.round(lines * size * lh);
}

export interface ImageJob {
  pageId: string;
  elId: string | null; // null = page background
  prompt: string;
  query: string;
  w: number;
  h: number;
}

const PLACEHOLDER = (w: number, h: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(h)}"><rect width="100%" height="100%" fill="#e9e6f2"/><path d="M0 ${h} L${w * 0.35} ${h * 0.55} L${w * 0.6} ${h * 0.8} L${w * 0.78} ${h * 0.62} L${w} ${h} Z" fill="#d6d0e8"/><circle cx="${w * 0.72}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.08}" fill="#d6d0e8"/></svg>`)}`;

/** Convert a (validated) spec into Cream pages for a W×H design. */
export function specToPages(spec: DesignSpec, W: number, H: number): { pages: Page[]; jobs: ImageJob[] } {
  const jobs: ImageJob[] = [];
  const kit = useApp.getState().brandKits[0];
  const defHead = kit?.fonts.heading.family ?? 'Inter';
  const defBody = kit?.fonts.body.family ?? 'Inter';
  const pages = (spec.pages ?? []).slice(0, 12).map((sp) => {
    const bg = parseColor(sp.background, '#ffffff');
    const grad = Array.isArray(sp.gradient) && sp.gradient.length >= 2 ? sp.gradient.slice(0, 3).map((c) => parseColor(c, bg)) : null;
    const page = newPage({
      background: grad ? { kind: 'gradient', type: 'linear', angle: 135, stops: grad.map((c, i) => ({ color: c, pos: i / (grad.length - 1) })) } : { kind: 'solid', color: bg },
      notes: typeof sp.notes === 'string' ? sp.notes : '',
    });
    if (sp.backgroundPrompt || sp.backgroundQuery) {
      page.backgroundImage = { src: PLACEHOLDER(W, H) };
      jobs.push({ pageId: page.id, elId: null, prompt: String(sp.backgroundPrompt || sp.backgroundQuery), query: String(sp.backgroundQuery || sp.backgroundPrompt).split(/[,.]/)[0].slice(0, 60), w: W, h: H });
    }
    for (const e of (sp.elements ?? []).slice(0, 40)) {
      const x = num(e.x, 0, -W, W * 2);
      const y = num(e.y, 0, -H, H * 2);
      const w = num(e.w, W * 0.5, 4, W * 3);
      const h = num(e.h, H * 0.2, 2, H * 3);
      let el: El | null = null;
      if (e.type === 'text' && typeof e.text === 'string' && e.text.trim()) {
        const role = e.role === 'heading' || e.role === 'subheading' || e.role === 'body' ? e.role : undefined;
        const size = num(e.size, role === 'heading' ? W / 12 : W / 30, 6, 600);
        const lh = num(e.lineHeight, size > W / 15 ? 1.1 : 1.4, 0.8, 3);
        const t = makeText(e.text.slice(0, 2000), x, y, w, {
          fontSize: Math.round(size),
          fontWeight: num(e.weight, role === 'heading' ? 700 : 400, 100, 900),
          fontFamily: fontOk(e.font, role === 'heading' ? defHead : defBody),
          color: parseColor(e.color, luminance(bg) < 0.5 ? '#ffffff' : '#1f1f1f'),
          align: e.align === 'center' || e.align === 'right' ? e.align : 'left',
          italic: !!e.italic,
          uppercase: !!e.uppercase,
          letterSpacing: num(e.letterSpacing, 0, -200, 800),
          lineHeight: lh,
        }, role);
        t.h = Math.max(t.h, estimateTextHeight(e.text, w, size, lh, t.fontFamily));
        el = t;
      } else if (e.type === 'shape') {
        const shape = (SHAPES.includes(e.shape as ShapeKind) ? e.shape : e.shape === 'rectangle' ? 'rect' : e.shape === 'ellipse' ? 'circle' : 'rect') as ShapeKind;
        const s = makeShape(shape, x, y, w, h, parseColor(e.fill ?? e.color, '#c4c4c4'));
        if (Array.isArray(e.gradient) && e.gradient.length >= 2) {
          const g = e.gradient.slice(0, 3).map((c) => parseColor(c, '#c4c4c4'));
          s.fill = { kind: 'gradient', type: 'linear', angle: 135, stops: g.map((c, i) => ({ color: c, pos: i / (g.length - 1) })) };
        }
        if (e.radius != null) s.radius = num(e.radius, 0, 0, Math.min(w, h) / 2);
        if (typeof e.text === 'string' && e.text.trim()) {
          s.html = escapeHtml(e.text);
          s.color = parseColor(e.color && e.fill ? e.color : undefined, luminance(typeof s.fill === 'object' && s.fill.kind === 'solid' ? s.fill.color : '#888') < 0.55 ? '#ffffff' : '#1f1f1f');
          s.fontFamily = fontOk(e.font, defBody);
          s.fontSize = Math.round(num(e.size, Math.min(h * 0.4, W / 30), 6, 400));
          s.fontWeight = num(e.weight, 600, 100, 900);
        }
        el = s;
      } else if (e.type === 'image') {
        const im = makeImage(PLACEHOLDER(w, h), Math.round(w), Math.round(h), x, y, w);
        im.h = h;
        if (e.radius) im.radius = num(e.radius, 0, 0, Math.min(w, h) / 2);
        el = im;
        jobs.push({ pageId: page.id, elId: im.id, prompt: String(e.prompt || e.query || 'abstract background'), query: String(e.query || e.prompt || 'abstract').split(/[,.]/)[0].slice(0, 60), w, h });
      } else if (e.type === 'line') {
        el = makeLine(num(e.x1, x, -W, W * 2), num(e.y1, y, -H, H * 2), num(e.x2, x + w, -W, W * 2), num(e.y2, y, -H, H * 2), { color: parseColor(e.color, '#1f1f1f'), width: num(e.width, 4, 1, 80) });
      } else if (e.type === 'chart') {
        const ct = (CHART_TYPES.includes(e.chartType as any) ? e.chartType : 'column') as ChartEl['chartType'];
        const c = makeChart(ct, x, y, w, h);
        if (Array.isArray(e.values) && e.values.length) {
          const vals = e.values.slice(0, 12).map((v) => num(v, 0));
          const labels = Array.isArray(e.labels) ? e.labels.slice(0, vals.length).map(String) : vals.map((_, i) => `Item ${i + 1}`);
          c.labels = labels.length === vals.length ? labels : vals.map((_, i) => labels[i] ?? `Item ${i + 1}`);
          c.series = [{ name: 'Series 1', values: vals, color: parseColor(e.color, CHART_COLORS[0]) }];
        }
        c.options.fontSize = Math.max(10, Math.round(w / 40));
        c.options.textColor = luminance(bg) < 0.5 ? '#eeeeee' : '#444444';
        el = c;
      }
      if (!el) continue;
      if (e.rotation) el.rotation = num(e.rotation, 0, -360, 360);
      if (e.opacity != null) el.opacity = num(e.opacity, 1, 0, 1);
      page.elements.push(el);
    }
    return page;
  });
  return { pages, jobs };
}

/* ------------------------------------------------------------------ images for specs */

const openverseCache = new Map<string, { src: string; credit: ImageEl['credit']; w: number; h: number }[]>();
export async function stockPhotos(query: string, signal?: AbortSignal) {
  const q = query.trim().toLowerCase() || 'abstract';
  const hit = openverseCache.get(q);
  if (hit) return hit;
  try {
    const res = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=20&mature=false`, { signal });
    if (!res.ok) throw new Error('openverse ' + res.status);
    const j = await res.json();
    const out = (j.results ?? []).map((r: any) => ({
      src: `https://api.openverse.org/v1/images/${r.id}/thumb/`,
      credit: { title: r.title, creator: r.creator, license: `${r.license} ${r.license_version ?? ''}`.trim(), licenseUrl: r.license_url, source: 'openverse', landingUrl: r.foreign_landing_url },
      w: r.width || 800,
      h: r.height || 600,
    }));
    openverseCache.set(q, out);
    return out;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return [];
  }
}

/** Fill image placeholders with stock photos (fast, keyless). `variant` picks a different photo per candidate. */
export async function fillStockImages(pages: Page[], jobs: ImageJob[], variant = 0, signal?: AbortSignal) {
  await Promise.all(
    jobs.map(async (j, i) => {
      const list = await stockPhotos(j.query, signal);
      const pick = list[(variant * 3 + i) % Math.max(1, list.length)];
      const src = pick?.src ?? `https://picsum.photos/seed/${encodeURIComponent(j.query + variant + i)}/${Math.round(Math.min(1600, j.w))}/${Math.round(Math.min(1600, j.h))}`;
      const credit = pick?.credit ?? { source: 'picsum', title: 'Picsum photo' };
      const page = pages.find((p) => p.id === j.pageId);
      if (!page) return;
      if (!j.elId) page.backgroundImage = { src, credit };
      else {
        const el = page.elements.find((e) => e.id === j.elId) as ImageEl | undefined;
        if (el) {
          el.src = src;
          el.credit = credit;
          // keep the box: set natural size to the box ratio, crop (cover) the photo
          const r = (pick?.w ?? j.w) / (pick?.h ?? j.h);
          el.naturalW = pick?.w ?? j.w;
          el.naturalH = pick?.h ?? j.h;
          const boxR = el.w / el.h;
          if (r > boxR) {
            const cw = boxR / r;
            el.crop = { x: (1 - cw) / 2, y: 0, w: cw, h: 1 };
          } else {
            const ch = r / boxR;
            el.crop = { x: 0, y: (1 - ch) / 2, w: 1, h: ch };
          }
        }
      }
    }),
  );
}

/** Replace images on inserted pages with AI-generated ones, one by one (Pollinations queue). */
export async function upgradeImagesWithAI(jobs: ImageJob[], style?: string, onProgress?: (done: number, total: number) => void, signal?: AbortSignal) {
  const { generateImage } = await import('./magicTools');
  let done = 0;
  for (const j of jobs) {
    if (signal?.aborted) return;
    try {
      const g = await generateImage(j.prompt, { width: Math.min(1280, Math.round(j.w)), height: Math.min(1280, Math.round(j.h)), style, signal });
      const ed = useEditor.getState();
      ed.update(
        (d) => {
          const page = d.pages.find((p) => p.id === j.pageId);
          if (!page) return;
          if (!j.elId) page.backgroundImage = { src: g.url, credit: { source: 'pollinations', title: j.prompt } };
          else {
            const el = page.elements.find((e) => e.id === j.elId) as Draft<ImageEl> | undefined;
            if (el && el.type === 'image') {
              el.src = g.url;
              el.naturalW = g.w;
              el.naturalH = g.h;
              const r = g.w / g.h;
              const boxR = el.w / el.h;
              el.crop = r > boxR ? { x: (1 - boxR / r) / 2, y: 0, w: boxR / r, h: 1 } : { x: 0, y: (1 - r / boxR) / 2, w: 1, h: r / boxR };
              el.credit = { source: 'pollinations', title: j.prompt };
            }
          }
        },
        { history: false },
      );
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    onProgress?.(++done, jobs.length);
  }
}

/* ------------------------------------------------------------------ formats */

export function detectFormat(prompt: string): string | null {
  const p = prompt.toLowerCase();
  const rules: [RegExp, string][] = [
    [/instagram stor|ig stor|\bstory\b|reel/, 'instagram-story'],
    [/instagram|insta\b|\big\b/, 'instagram-square'],
    [/presentation|slides?\b|deck|pitch/, 'presentation'],
    [/youtube thumb|thumbnail/, 'youtube-thumbnail'],
    [/youtube banner|channel art/, 'youtube-banner'],
    [/facebook cover/, 'facebook-cover'],
    [/facebook/, 'facebook-post'],
    [/linkedin banner/, 'linkedin-banner'],
    [/linkedin/, 'linkedin-post'],
    [/pinterest|\bpin\b/, 'pinterest-pin'],
    [/tweet|twitter|\bx post/, 'x-post'],
    [/business card/, 'business-card'],
    [/invitation|invite/, 'invitation'],
    [/certificate/, 'certificate'],
    [/resume|cv\b/, 'resume'],
    [/menu/, 'menu'],
    [/flyer/, 'flyer-letter'],
    [/poster/, 'poster'],
    [/\bdoc\b|document|report|essay|article|blog/, 'doc'],
    [/logo/, 'logo'],
    [/infographic/, 'infographic'],
    [/email header/, 'email-header'],
    [/newsletter|email/, 'email'],
    [/wallpaper/, 'phone-wallpaper'],
    [/postcard/, 'postcard'],
    [/banner/, 'facebook-cover'],
    [/card/, 'card'],
  ];
  for (const [re, id] of rules) if (re.test(p)) return id;
  return null;
}

/* ------------------------------------------------------------------ LLM generation */

function brandNote() {
  const kit = useApp.getState().brandKits[0];
  if (!kit) return '';
  const colors = kit.palettes.flatMap((p) => p.colors).slice(0, 8).join(', ');
  return `\nBrand kit (use when it fits): colors ${colors}; heading font ${kit.fonts.heading.family}; body font ${kit.fonts.body.family}.${kit.voice ? ` Brand voice: ${kit.voice}` : ''}`;
}

export async function generateDesignSpecsLLM(prompt: string, o: { width: number; height: number; count: number; pages?: number; signal?: AbortSignal; onText?: (t: string) => void; context?: string }): Promise<DesignSpec[]> {
  const multi = o.pages ?? (o.width > o.height * 1.3 && /presentation|slides|deck|pitch/i.test(prompt) ? 5 : 1);
  const system = `You are Cream AI, a world-class graphic designer. You create layered, editable designs as JSON.
Canvas: ${o.width}×${o.height} px (x right, y down, origin top-left). Each design has ${multi} page(s).
Return {"designs":[...]} with ${o.count} clearly different design directions (different layouts, palettes and font pairings).
Element types:
- text: {type:"text", text, x, y, w, size (px), weight (100-900), font, color, align, role ("heading"|"subheading"|"body"), uppercase?, letterSpacing? (1/1000 em), lineHeight?}. Height is automatic. Use \\n for line breaks.
- shape: {type:"shape", shape (rect|rounded|circle|triangle|diamond|hexagon|star5|heart|blob1|blob2|blob3|ring|arch|half-circle|speech|starburst), x,y,w,h, fill (hex), gradient? [hex,hex], radius?, opacity?, text? (label inside)}
- image: {type:"image", x,y,w,h, prompt (detailed image-generation prompt), query (1-3 keyword stock photo search), radius?}
- line: {type:"line", x1,y1,x2,y2, color, width}
- chart: {type:"chart", chartType (column|bar|line|pie|donut|progress-ring|number), x,y,w,h, labels, values, color}
Page: {background (hex), gradient? [hex,hex], backgroundPrompt? + backgroundQuery? (full-bleed photo), notes? (speaker notes), elements:[...]} — elements are drawn in order (first = back).
Rules: fonts ONLY from: ${POPULAR_FONTS.slice(0, 50).join(', ')}. Keep everything inside the canvas with generous margins (≥ ${Math.round(Math.min(o.width, o.height) * 0.06)}px). Strong hierarchy: a big heading (${Math.round(o.width / 14)}–${Math.round(o.width / 8)}px), readable body (≥ ${Math.round(Math.max(16, o.width / 45))}px). Ensure text contrast (dark overlay shape with opacity 0.4–0.6 over photos when text sits on them). Write real, specific, concise copy — never lorem ipsum. Use 1–2 images per page at most.${brandNote()}${memoryNote()}`;
  const res = await completeJSON<{ designs: DesignSpec[] }>({
    system,
    messages: [{ role: 'user', content: (o.context ? `Context:\n${o.context}\n\n` : '') + `Design request: ${prompt}` }],
    json: SPEC_SCHEMA,
    strictSchema: false,
    signal: o.signal,
    onText: o.onText ? (_d, full) => o.onText!(full) : undefined,
    effort: 'low',
  });
  const designs = (Array.isArray(res.designs) ? res.designs : Array.isArray((res as any).pages) ? [res as any] : []).filter((d) => Array.isArray(d?.pages) && d.pages.length);
  if (!designs.length) throw new Error('The AI returned no usable designs. Try rephrasing.');
  return designs.slice(0, 4);
}

/* ------------------------------------------------------------------ keyless generation */

const PALETTES = [
  { bg: '#0f172a', fg: '#ffffff', accent: '#f59e0b', soft: '#1e293b' },
  { bg: '#fff8ef', fg: '#2b2140', accent: '#e2557a', soft: '#ffe3d3' },
  { bg: '#f1f5f9', fg: '#0f172a', accent: '#2563eb', soft: '#dbeafe' },
  { bg: '#1a1a2e', fg: '#f8f8ff', accent: '#e94560', soft: '#16213e' },
  { bg: '#fef9c3', fg: '#1c1917', accent: '#ea580c', soft: '#fde68a' },
  { bg: '#ecfdf5', fg: '#064e3b', accent: '#10b981', soft: '#a7f3d0' },
  { bg: '#faf5ff', fg: '#3b0764', accent: '#a855f7', soft: '#e9d5ff' },
  { bg: '#111111', fg: '#f5f5f5', accent: '#d4ff3a', soft: '#262626' },
  { bg: '#fdf2f8', fg: '#500724', accent: '#db2777', soft: '#fbcfe8' },
  { bg: '#eff6ff', fg: '#172554', accent: '#f97316', soft: '#bfdbfe' },
];
const PAIRS = [
  { head: 'Playfair Display', body: 'Inter', hw: 700 },
  { head: 'Bebas Neue', body: 'Montserrat', hw: 400 },
  { head: 'Anton', body: 'Poppins', hw: 400 },
  { head: 'Abril Fatface', body: 'Lato', hw: 400 },
  { head: 'Space Grotesk', body: 'DM Sans', hw: 700 },
  { head: 'Syne', body: 'Manrope', hw: 800 },
  { head: 'Archivo Black', body: 'Work Sans', hw: 400 },
  { head: 'Montserrat', body: 'Open Sans', hw: 800 },
];

const FORMAT_WORDS = /\b(make|create|design|generate|build|draft|me|please|an?|the|instagram|insta|ig|facebook|linkedin|pinterest|youtube|twitter|tiktok|post|story|stories|reel|poster|flyer|presentation|slides?|deck|banner|thumbnail|card|invitation|invite|business|social|media|graphic|template|for|about|of|i need|want|some|nice|cool|modern|simple)\b/gi;

export function extractCopy(prompt: string): { title: string; subtitle: string; keywords: string } {
  let p = prompt.replace(/["“”]/g, '').trim();
  const quoted = /["“](.+?)["”]/.exec(prompt)?.[1];
  const rest = p.replace(FORMAT_WORDS, ' ').replace(/\s+/g, ' ').trim();
  const [main, ...tail] = rest.split(/\b(?:on|at|in|with|this|next|from|by)\b|[,.;:–—-]/i);
  const words = (main || rest || 'Your big idea').trim().split(' ').filter(Boolean).slice(0, 6);
  const title = quoted ?? words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  let subtitle = tail.join(' ').replace(/\s+/g, ' ').trim();
  const low = p.toLowerCase();
  if (!subtitle || subtitle.length < 4) {
    subtitle = /sale|discount|offer|deal/.test(low)
      ? 'Up to 50% off · This week only'
      : /party|festival|concert|event|launch|conference|meetup|wedding|birthday/.test(low)
        ? 'Join us · Save the date'
        : /restaurant|cafe|coffee|food|menu|bakery/.test(low)
          ? 'Fresh · Local · Made with love'
          : /hiring|job|career/.test(low)
            ? 'Join our team — apply today'
            : /course|class|workshop|webinar|school/.test(low)
              ? 'Learn something new · Sign up now'
              : /market|fair|festival|show|expo|fest\b|open day/.test(low)
                ? 'Everyone welcome · Free entry'
                : 'Discover more today';
  } else subtitle = subtitle[0].toUpperCase() + subtitle.slice(1);
  const keywords = words.filter((w) => w.length > 2).slice(0, 3).join(' ') || 'abstract';
  return { title, subtitle, keywords };
}

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

/** Template-like designs built from layout recipes. Works with no key and no network (except stock photos). */
export function generateDesignSpecsKeyless(prompt: string, W: number, H: number, count = 4, pagesWanted?: number): DesignSpec[] {
  const { title, subtitle, keywords } = extractCopy(prompt);
  const seed = hashStr(prompt);
  const portrait = H > W * 1.15;
  const landscape = W > H * 1.15;
  const m = Math.round(Math.min(W, H) * 0.08);
  const unit = Math.min(W, H);
  const recipes: ((pal: (typeof PALETTES)[0], pair: (typeof PAIRS)[0]) => SpecPage)[] = [
    // 1. photo hero with overlay
    (pal, pair) => ({
      background: pal.bg,
      backgroundQuery: keywords,
      backgroundPrompt: `${keywords}, ${prompt}`,
      elements: [
        { type: 'shape', shape: 'rect', x: 0, y: H * 0.45, w: W, h: H * 0.55, gradient: ['#00000000', '#000000cc'] },
        { type: 'shape', shape: 'rect', x: m, y: H - m - unit * 0.36, w: unit * 0.12, h: unit * 0.012, fill: pal.accent },
        { type: 'text', role: 'heading', text: title, x: m, y: H - m - unit * 0.33, w: W - m * 2, size: unit * (title.length > 22 ? 0.085 : 0.11), weight: pair.hw, font: pair.head, color: '#ffffff', lineHeight: 1.05 },
        { type: 'text', role: 'body', text: subtitle, x: m, y: H - m - unit * 0.07, w: W - m * 2, size: unit * 0.046, font: pair.body, color: '#f1f1f1' },
      ],
    }),
    // 2. split
    (pal, pair) => {
      const img = landscape ? { x: W / 2, y: 0, w: W / 2, h: H } : { x: 0, y: 0, w: W, h: H * 0.5 };
      const tx = landscape ? m : m;
      const ty = landscape ? H * 0.3 : H * 0.56;
      const tw = landscape ? W / 2 - m * 2 : W - m * 2;
      return {
        background: pal.bg,
        elements: [
          { type: 'image', ...img, query: keywords, prompt: `${keywords}, ${prompt}` },
          { type: 'text', role: 'subheading', text: keywords.toUpperCase(), x: tx, y: ty - unit * 0.07, w: tw, size: unit * 0.028, weight: 700, font: pair.body, color: pal.accent, letterSpacing: 200 },
          { type: 'text', role: 'heading', text: title, x: tx, y: ty, w: tw, size: unit * (title.length > 22 ? 0.075 : 0.095), weight: pair.hw, font: pair.head, color: pal.fg, lineHeight: 1.05 },
          { type: 'text', role: 'body', text: subtitle, x: tx, y: ty + unit * 0.26, w: tw, size: unit * 0.04, font: pair.body, color: pal.fg },
          { type: 'shape', shape: 'rounded', x: tx, y: ty + unit * 0.36, w: unit * 0.3, h: unit * 0.075, fill: pal.accent, radius: unit * 0.04, text: 'Learn more', size: unit * 0.028 },
        ],
      };
    },
    // 3. bold typographic
    (pal, pair) => ({
      background: pal.accent,
      elements: [
        { type: 'shape', shape: 'circle', x: W - unit * 0.45, y: -unit * 0.15, w: unit * 0.6, h: unit * 0.6, fill: pal.soft, opacity: 0.5 },
        { type: 'shape', shape: 'blob2', x: -unit * 0.15, y: H - unit * 0.35, w: unit * 0.5, h: unit * 0.5, fill: pal.bg, opacity: 0.25 },
        { type: 'text', role: 'heading', text: title.toUpperCase(), x: m, y: H * (portrait ? 0.32 : 0.26), w: W - m * 2, size: unit * (title.length > 18 ? 0.1 : 0.14), weight: pair.hw, font: pair.head, color: '#ffffff', align: 'center', lineHeight: 1 },
        { type: 'line', x1: W / 2 - unit * 0.1, y1: H * 0.66, x2: W / 2 + unit * 0.1, y2: H * 0.66, color: '#ffffff', width: Math.max(3, unit * 0.006) },
        { type: 'text', role: 'body', text: subtitle, x: m, y: H * 0.7, w: W - m * 2, size: unit * 0.046, font: pair.body, color: '#ffffff', align: 'center' },
      ],
    }),
    // 4. framed card
    (pal, pair) => {
      const cw = W - m * 2;
      const ch = H - m * 2;
      return {
        background: pal.soft,
        elements: [
          { type: 'shape', shape: 'rounded', x: m, y: m, w: cw, h: ch, fill: '#ffffff', radius: unit * 0.04 },
          { type: 'image', x: m + unit * 0.04, y: m + unit * 0.04, w: cw - unit * 0.08, h: ch * 0.52, query: keywords, prompt: `${keywords}, ${prompt}`, radius: unit * 0.03 },
          { type: 'text', role: 'heading', text: title, x: m + unit * 0.06, y: m + ch * 0.6, w: cw - unit * 0.12, size: unit * (title.length > 22 ? 0.065 : 0.08), weight: pair.hw, font: pair.head, color: '#1f1f1f', align: 'center', lineHeight: 1.1 },
          { type: 'text', role: 'body', text: subtitle, x: m + unit * 0.06, y: m + ch * 0.84, w: cw - unit * 0.12, size: unit * 0.04, font: pair.body, color: '#555555', align: 'center' },
        ],
      };
    },
    // 5. circle photo
    (pal, pair) => {
      const d = unit * 0.55;
      const cx = landscape ? W * 0.68 - d / 2 : W / 2 - d / 2;
      const cy = landscape ? H / 2 - d / 2 : H * 0.12;
      return {
        background: pal.bg,
        elements: [
          { type: 'shape', shape: 'circle', x: cx - unit * 0.03, y: cy - unit * 0.03, w: d + unit * 0.06, h: d + unit * 0.06, fill: pal.accent },
          { type: 'image', x: cx, y: cy, w: d, h: d, radius: d / 2, query: keywords, prompt: `${keywords}, ${prompt}` },
          { type: 'text', role: 'heading', text: title, x: landscape ? m : m, y: landscape ? H * 0.32 : cy + d + unit * 0.08, w: landscape ? W * 0.45 : W - m * 2, size: unit * (title.length > 22 ? 0.07 : 0.09), weight: pair.hw, font: pair.head, color: pal.fg, align: landscape ? 'left' : 'center', lineHeight: 1.05 },
          { type: 'text', role: 'body', text: subtitle, x: m, y: landscape ? H * 0.62 : cy + d + unit * 0.32, w: landscape ? W * 0.45 : W - m * 2, size: unit * 0.042, font: pair.body, color: pal.fg, align: landscape ? 'left' : 'center' },
        ],
      };
    },
    // 6. gradient
    (pal, pair) => ({
      background: pal.bg,
      gradient: [pal.accent, pal.bg],
      elements: [
        { type: 'shape', shape: 'ring', x: W - unit * 0.32, y: m, w: unit * 0.24, h: unit * 0.24, fill: '#ffffff', opacity: 0.35 },
        { type: 'shape', shape: 'star4', x: m, y: m, w: unit * 0.08, h: unit * 0.08, fill: '#ffffff' },
        { type: 'text', role: 'heading', text: title, x: m, y: H * 0.38, w: W - m * 2, size: unit * (title.length > 22 ? 0.08 : 0.11), weight: pair.hw, font: pair.head, color: '#ffffff', lineHeight: 1.05 },
        { type: 'text', role: 'body', text: subtitle, x: m, y: H * 0.38 + unit * 0.3, w: W - m * 2, size: unit * 0.046, font: pair.body, color: '#ffffff' },
      ],
    }),
  ];
  const out: DesignSpec[] = [];
  const nPages = pagesWanted ?? (landscape && /presentation|slides|deck|pitch/i.test(prompt) ? 5 : 1);
  for (let i = 0; i < count; i++) {
    const pal = PALETTES[(seed + i * 3) % PALETTES.length];
    const pair = PAIRS[(seed + i * 5) % PAIRS.length];
    const r = recipes[(seed + i) % recipes.length];
    const pages: SpecPage[] = [r(pal, pair)];
    if (nPages > 1) {
      const sections = ['Overview', 'Key points', 'How it works', 'Next steps', 'Thank you'];
      for (let p = 1; p < nPages; p++) {
        const head = sections[(p - 1) % sections.length];
        const last = p === nPages - 1;
        pages.push({
          background: last ? pal.accent : pal.bg,
          elements: last
            ? [
                { type: 'text', role: 'heading', text: 'Thank you', x: m, y: H * 0.36, w: W - m * 2, size: unit * 0.13, weight: pair.hw, font: pair.head, color: '#ffffff', align: 'center' },
                { type: 'text', role: 'body', text: 'Questions? Let’s talk.', x: m, y: H * 0.6, w: W - m * 2, size: unit * 0.04, font: pair.body, color: '#ffffff', align: 'center' },
              ]
            : [
                { type: 'shape', shape: 'rect', x: 0, y: 0, w: unit * 0.025, h: H, fill: pal.accent },
                { type: 'text', role: 'heading', text: head, x: m * 1.2, y: m, w: W * 0.6, size: unit * 0.08, weight: pair.hw, font: pair.head, color: pal.fg },
                { type: 'text', role: 'body', text: `• Main idea about ${title.toLowerCase()}\n• Supporting detail or example\n• Why it matters to your audience`, x: m * 1.2, y: m + unit * 0.22, w: W * 0.48, size: unit * 0.04, font: pair.body, color: pal.fg, lineHeight: 1.6 },
                { type: 'image', x: W * 0.58, y: m, w: W * 0.42 - m, h: H - m * 2, query: `${keywords} ${head}`, prompt: `${keywords}, ${head}`, radius: unit * 0.02 },
              ],
        });
      }
    }
    pages.forEach((pg) => flowText(pg, H));
    out.push({ title, pages });
  }
  return out;
}

/** Push text blocks (and CTA pills) down so stacked items in the same column never overlap. */
function flowText(page: SpecPage, H: number) {
  const items = page.elements.filter((e) => e.type === 'text' || (e.type === 'shape' && e.text));
  const hOf = (e: SpecEl) => (e.type === 'text' ? estimateTextHeight(e.uppercase ? (e.text ?? '').toUpperCase() : e.text ?? '', e.w ?? 100, e.size ?? 20, e.lineHeight ?? (e.size && e.w && e.size > e.w / 15 ? 1.1 : 1.4), e.font) : e.h ?? 40);
  const sorted = [...items].sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    for (let j = 0; j < i; j++) {
      const prev = sorted[j];
      const overlapX = (cur.x ?? 0) < (prev.x ?? 0) + (prev.w ?? 0) && (prev.x ?? 0) < (cur.x ?? 0) + (cur.w ?? 0);
      if (!overlapX) continue;
      const bottom = (prev.y ?? 0) + hOf(prev) + (prev.size ?? 20) * 0.35;
      if ((cur.y ?? 0) < bottom) cur.y = bottom;
    }
  }
  // keep the stack on the page: shift it up if the flow pushed it past the bottom
  const maxBottom = Math.max(0, ...items.map((e) => (e.y ?? 0) + hOf(e)));
  const limit = H * 0.95;
  if (maxBottom > limit) {
    const top = Math.min(...items.map((e) => e.y ?? 0));
    const shift = Math.min(maxBottom - limit, top - H * 0.04);
    if (shift > 0) items.forEach((e) => (e.y = (e.y ?? 0) - shift));
  }
}

/* ------------------------------------------------------------------ templates (optional module) */

/** If a templates module exposing searchTemplates exists, use it for keyless results. */
export async function templateDesigns(prompt: string, preset?: string): Promise<Design[]> {
  try {
    const m = await import('../templates');
    const words = prompt.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3);
    let res = m.searchTemplates({ query: prompt, preset, pageSize: 8 });
    // Fall back to looser matches (single keywords), then to the preset alone.
    for (const w of words) {
      if (res.items.length >= 4) break;
      const more = m.searchTemplates({ query: w, preset, pageSize: 8 });
      res = { ...res, items: [...res.items, ...more.items.filter((x: any) => !res.items.some((y: any) => y.id === x.id))] };
    }
    if (!res.items.length && preset) res = m.searchTemplates({ preset, pageSize: 8 });
    return res.items.slice(0, 4).map((t: any) => m.instantiateTemplate(t.id) as Design);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ insertion */

export function ensureFontsFor(pages: Page[]) {
  for (const p of pages)
    for (const e of p.elements) {
      if (e.type === 'text') ensureFont(e.fontFamily, e.fontWeight);
      if (e.type === 'shape' && e.fontFamily) ensureFont(e.fontFamily, e.fontWeight ?? 400);
    }
}

/** Scale pages from one size to another (keeps proportions, centred). */
export function fitPages(pages: Page[], fromW: number, fromH: number, toW: number, toH: number): Page[] {
  if (fromW === toW && fromH === toH) return pages;
  const k = Math.min(toW / fromW, toH / fromH);
  const dx = (toW - fromW * k) / 2;
  const dy = (toH - fromH * k) / 2;
  return pages.map((p) => ({
    ...p,
    elements: p.elements.map((e) => {
      const c = structuredClone(e) as any;
      c.x = c.x * k + dx;
      c.y = c.y * k + dy;
      c.w *= k;
      c.h *= k;
      if (c.type === 'line') {
        c.x1 = c.x1 * k + dx;
        c.x2 = c.x2 * k + dx;
        c.y1 = c.y1 * k + dy;
        c.y2 = c.y2 * k + dy;
        c.width *= k;
      }
      if ('fontSize' in c && typeof c.fontSize === 'number') c.fontSize = Math.round(c.fontSize * k);
      return c;
    }),
  }));
}

/* ------------------------------------------------------------------ conversational edit */

export type EditOp =
  | { op: 'update'; id: string; patch: Record<string, unknown> }
  | { op: 'add'; element: SpecEl }
  | { op: 'delete'; id: string }
  | { op: 'background'; color?: string; gradient?: string[] };

export function pageToCompact(page: Page, W: number, H: number) {
  return {
    width: W,
    height: page.height ?? H,
    background: page.background.kind === 'solid' ? page.background.color : page.background.kind === 'gradient' ? page.background.stops.map((s) => s.color) : 'image',
    elements: page.elements.map((e) => {
      const b: Record<string, unknown> = { id: e.id, type: e.type, x: Math.round(e.x), y: Math.round(e.y), w: Math.round(e.w), h: Math.round(e.h) };
      if (e.rotation) b.rotation = e.rotation;
      if (e.opacity !== 1) b.opacity = e.opacity;
      if (e.type === 'text') Object.assign(b, { text: htmlToText(e.html), size: e.fontSize, font: e.fontFamily, weight: e.fontWeight, color: e.color, align: e.align, role: e.role, uppercase: e.uppercase || undefined });
      if (e.type === 'shape') Object.assign(b, { shape: e.shape, fill: e.fill.kind === 'solid' ? e.fill.color : e.fill.kind, text: e.html ? htmlToText(e.html) : undefined });
      if (e.type === 'image') Object.assign(b, { alt: e.alt, radius: e.radius });
      if (e.type === 'line') Object.assign(b, { color: e.color, width: e.width });
      if (e.type === 'sticky') Object.assign(b, { text: htmlToText(e.html), color: e.color });
      if (e.type === 'chart') Object.assign(b, { chartType: e.chartType, labels: e.labels, values: e.series[0]?.values });
      return b;
    }),
  };
}

const EDIT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    ops: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          op: { enum: ['update', 'add', 'delete', 'background'] },
          id: { type: 'string' },
          patch: { type: 'object' },
          element: { type: 'object' },
          color: { type: 'string' },
          gradient: { type: 'array', items: { type: 'string' } },
        },
        required: ['op'],
      },
    },
  },
  required: ['summary', 'ops'],
};

export async function llmEditOps(instruction: string, o: { signal?: AbortSignal; selection?: string[] }): Promise<{ summary: string; ops: EditOp[] }> {
  const s = useEditor.getState();
  const d = s.design!;
  const page = currentPage(s)!;
  const compact = pageToCompact(page, d.width, d.height);
  const system = `You are Cream AI editing a design page. You receive the page as JSON (coordinates in px) and an instruction.
Respond with {"summary": "<one short sentence of what you changed>", "ops": [...]} using ONLY these ops:
- {"op":"update","id":"<element id>","patch":{...}} — patch keys: x,y,w,h,rotation,opacity,text,size,font,weight,color,align,uppercase,italic,fill (hex for shapes),letterSpacing,lineHeight
- {"op":"add","element":{type:"text"|"shape"|"image"|"line"|"chart", ...same fields as the page JSON; image uses prompt+query}}
- {"op":"delete","id":"<element id>"}
- {"op":"background","color":"#hex"} or {"op":"background","gradient":["#hex","#hex"]}
Change only what the instruction asks; keep layout tidy and inside the ${compact.width}×${compact.height} canvas. Fonts only from: ${POPULAR_FONTS.slice(0, 50).join(', ')}.${memoryNote()}`;
  const sel = o.selection?.length ? `\nSelected element ids (focus on these if relevant): ${o.selection.join(', ')}` : '';
  const res = await completeJSON<{ summary: string; ops: EditOp[] }>({
    system,
    messages: [{ role: 'user', content: `Page JSON:\n${JSON.stringify(compact)}${sel}\n\nInstruction: ${instruction}` }],
    json: EDIT_SCHEMA,
    strictSchema: false,
    signal: o.signal,
    effort: 'low',
  });
  return { summary: String(res.summary ?? 'Done'), ops: Array.isArray(res.ops) ? res.ops : [] };
}

/** Apply ops to the current page as ONE undo step. Returns number of applied ops. */
export function applyOps(ops: EditOp[]): { applied: number; jobs: ImageJob[] } {
  const s = useEditor.getState();
  const d = s.design;
  if (!d) return { applied: 0, jobs: [] };
  const pid = currentPage(s)!.id;
  let applied = 0;
  const added: Page[] = [];
  const jobs: ImageJob[] = [];
  // pre-build added elements outside the draft
  for (const op of ops) {
    if (op.op === 'add' && op.element) {
      const { pages, jobs: j } = specToPages({ pages: [{ background: '#ffffff', elements: [op.element] }] }, d.width, d.height);
      pages[0].id = pid;
      j.forEach((x) => (x.pageId = pid));
      added.push(pages[0]);
      jobs.push(...j);
    }
  }
  ensureFontsFor(added);
  s.update((dd) => {
    const page = dd.pages.find((p) => p.id === pid);
    if (!page) return;
    for (const op of ops) {
      if (op.op === 'delete') {
        const n = page.elements.length;
        page.elements = page.elements.filter((e) => e.id !== op.id);
        if (page.elements.length !== n) applied++;
      } else if (op.op === 'background') {
        if (Array.isArray(op.gradient) && op.gradient.length >= 2) {
          page.background = { kind: 'gradient', type: 'linear', angle: 135, stops: op.gradient.slice(0, 3).map((c, i, a) => ({ color: parseColor(c, '#ffffff'), pos: i / (a.length - 1) })) };
          applied++;
        } else if (op.color) {
          page.background = { kind: 'solid', color: parseColor(op.color, '#ffffff') };
          applied++;
        }
      } else if (op.op === 'update') {
        const el = page.elements.find((e) => e.id === op.id) as Draft<El> | undefined;
        if (!el || !op.patch || typeof op.patch !== 'object') continue;
        patchElement(el, op.patch);
        applied++;
      }
    }
    for (const p of added) {
      page.elements.push(...(p.elements as Draft<El>[]));
      applied += p.elements.length;
    }
  });
  return { applied, jobs };
}

function patchElement(el: Draft<El>, p: Record<string, unknown>) {
  const n = (k: string) => (typeof p[k] === 'number' && isFinite(p[k] as number) ? (p[k] as number) : undefined);
  for (const k of ['x', 'y', 'w', 'h', 'rotation', 'opacity'] as const) {
    const v = n(k);
    if (v !== undefined) (el as any)[k] = k === 'opacity' ? Math.max(0, Math.min(1, v)) : v;
  }
  if (el.type === 'line') {
    if (typeof p.color === 'string') el.color = parseColor(p.color, el.color);
    if (n('width')) el.width = n('width')!;
    return;
  }
  if (el.type === 'text' || el.type === 'shape') {
    const t = el as Draft<TextEl>;
    if (typeof p.text === 'string') t.html = escapeHtml(p.text).replace(/\n/g, '<br>');
    const size = n('size') ?? n('fontSize');
    if (size) t.fontSize = Math.max(4, Math.min(800, size));
    const font = p.font ?? p.fontFamily;
    if (typeof font === 'string') {
      t.fontFamily = fontOk(font, t.fontFamily ?? 'Inter');
      ensureFont(t.fontFamily, t.fontWeight ?? 400);
    }
    const weight = n('weight') ?? n('fontWeight');
    if (weight) t.fontWeight = Math.max(100, Math.min(900, weight));
    if (p.align === 'left' || p.align === 'center' || p.align === 'right' || p.align === 'justify') t.align = p.align;
    if (typeof p.uppercase === 'boolean') t.uppercase = p.uppercase;
    if (typeof p.italic === 'boolean') t.italic = p.italic;
    if (n('letterSpacing') !== undefined) t.letterSpacing = n('letterSpacing')!;
    if (n('lineHeight')) t.lineHeight = n('lineHeight')!;
    if (typeof p.color === 'string') {
      t.color = parseColor(p.color, t.color ?? '#1f1f1f');
      if (t.html) t.html = t.html.replace(/(;|")\s*color:\s*[^;"]+;?/gi, '$1');
      delete t.gradient;
    }
  }
  if (el.type === 'shape' && typeof p.fill === 'string') el.fill = { kind: 'solid', color: parseColor(p.fill, '#c4c4c4') };
  if (el.type === 'sticky' && typeof p.text === 'string') el.html = escapeHtml(p.text);
  if (el.type === 'image' && n('radius') !== undefined) el.radius = n('radius');
}

/* ------------------------------------------------------------------ rule-based (keyless) edits */

export interface RuleResult {
  summary: string;
  ops?: EditOp[];
  run?: () => Promise<string>; // async actions (translate)
}

let lastColorName = '';
function findColor(text: string): string | null {
  const hex = /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/i.exec(text)?.[0];
  if (hex) {
    lastColorName = hex;
    return hex;
  }
  const words = text.toLowerCase().split(/[^a-z]+/);
  for (const w of words.reverse())
    if (NAMED[w]) {
      lastColorName = w;
      return NAMED[w];
    }
  return null;
}

/** Interpret simple design commands without an LLM. Returns null when not understood. */
export function ruleEdit(cmd: string): RuleResult | null {
  const s = useEditor.getState();
  const d = s.design;
  const page = d && currentPage(s);
  if (!d || !page) return null;
  const c = cmd.toLowerCase().trim();
  const texts = page.elements.filter((e): e is TextEl => e.type === 'text');
  const maxSize = Math.max(0, ...texts.map((t) => t.fontSize));
  const headings = texts.filter((t) => t.role === 'heading' || t.fontSize >= maxSize * 0.75);
  const sel = new Set(s.selection);
  const scope = (list: TextEl[]) => (sel.size ? list.filter((t) => sel.has(t.id)) : list);
  const color = findColor(c);

  const tr = /translate(?: (?:it|this|everything|the page|page|text|all))?(?: in)? ?(?:to|into) ([a-z\- ()]+)/.exec(c);
  if (tr) {
    const lang = findLanguage(tr[1]);
    if (!lang) return { summary: `I don't know the language "${tr[1]}".` };
    return {
      summary: `Translating to ${lang.name}…`,
      run: async () => {
        const { translateHtml } = await import('./translate');
        const targets = page.elements.filter((e) => (e.type === 'text' || e.type === 'sticky' || (e.type === 'shape' && e.html)) && !e.locked);
        const out = await translateHtml(targets.map((e) => (e as any).html as string), lang.code);
        useEditor.getState().update((dd) => {
          const pg = dd.pages.find((p) => p.id === page.id)!;
          targets.forEach((t, i) => {
            const el = pg.elements.find((e) => e.id === t.id) as any;
            if (el) el.html = out[i];
          });
        });
        return `Translated ${targets.length} text element${targets.length === 1 ? '' : 's'} to ${lang.name}.`;
      },
    };
  }
  if (/dark mode|make it dark|dark theme/.test(c)) {
    const ops: EditOp[] = [{ op: 'background', color: '#121212' }];
    for (const t of texts) ops.push({ op: 'update', id: t.id, patch: { color: luminance(t.color) < 0.6 ? '#f5f5f5' : t.color } });
    for (const e of page.elements) if (e.type === 'shape' && e.fill.kind === 'solid' && luminance(e.fill.color) > 0.85) ops.push({ op: 'update', id: e.id, patch: { fill: '#262626' } });
    return { summary: 'Switched the page to dark mode.', ops };
  }
  if (/light mode|make it light|light theme/.test(c)) {
    const ops: EditOp[] = [{ op: 'background', color: '#ffffff' }];
    for (const t of texts) ops.push({ op: 'update', id: t.id, patch: { color: luminance(t.color) > 0.5 ? '#1f1f1f' : t.color } });
    return { summary: 'Switched the page to light mode.', ops };
  }
  if (/background/.test(c) && color) return { summary: `Changed the background to ${lastColorName}.`, ops: [{ op: 'background', color }] };
  if (/(headline|heading|title)s?/.test(c) && color && !/font/.test(c))
    return { summary: `Made ${scope(headings).length} headline${scope(headings).length === 1 ? '' : 's'} ${lastColorName}.`, ops: scope(headings).map((t) => ({ op: 'update', id: t.id, patch: { color } })) };
  if (/(text|everything|all|words|fonts?)\b/.test(c) && color && /(make|color|colour|change|turn|set)/.test(c))
    return { summary: `Changed text color to ${lastColorName}.`, ops: scope(texts).map((t) => ({ op: 'update', id: t.id, patch: { color } })) };
  if (/(bigger|larger|increase|enlarge)/.test(c)) {
    const list = /(headline|heading|title)/.test(c) ? scope(headings) : scope(texts);
    return { summary: `Made ${list.length} text element${list.length === 1 ? '' : 's'} bigger.`, ops: list.map((t) => ({ op: 'update', id: t.id, patch: { size: Math.round(t.fontSize * 1.15) } })) };
  }
  if (/(smaller|decrease|shrink|reduce)/.test(c)) {
    const list = /(headline|heading|title)/.test(c) ? scope(headings) : scope(texts);
    return { summary: `Made ${list.length} text element${list.length === 1 ? '' : 's'} smaller.`, ops: list.map((t) => ({ op: 'update', id: t.id, patch: { size: Math.max(6, Math.round(t.fontSize * 0.87)) } })) };
  }
  if (/cent(er|re)/.test(c)) {
    const els = page.elements.filter((e) => !e.locked && (!sel.size || sel.has(e.id)));
    return {
      summary: `Centered ${els.length} element${els.length === 1 ? '' : 's'} horizontally.`,
      ops: els.map((e) => ({ op: 'update', id: e.id, patch: { x: Math.round((d.width - e.w) / 2), ...(e.type === 'text' ? { align: 'center' } : {}) } })),
    };
  }
  if (/upper ?case|all caps|capitali[sz]e/.test(c)) {
    const list = /(headline|heading|title)/.test(c) ? scope(headings) : scope(texts);
    return { summary: 'Set text to uppercase.', ops: list.map((t) => ({ op: 'update', id: t.id, patch: { uppercase: true } })) };
  }
  if (/\bbold\b/.test(c)) {
    const list = /(headline|heading|title)/.test(c) ? scope(headings) : scope(texts);
    return { summary: 'Made text bold.', ops: list.map((t) => ({ op: 'update', id: t.id, patch: { weight: 700 } })) };
  }
  const fontM = /(?:font|typeface)(?: to| as)? ([a-z0-9 ]+)$/.exec(c) ?? /use ([a-z0-9 ]+?) (?:font|for)/.exec(c);
  if (fontM) {
    const f = POPULAR_FONTS.find((p) => p.toLowerCase() === fontM[1].trim());
    if (f) {
      const list = /(headline|heading|title)/.test(c) ? scope(headings) : scope(texts);
      return { summary: `Changed font to ${f}.`, ops: list.map((t) => ({ op: 'update', id: t.id, patch: { font: f } })) };
    }
  }
  if (/(remove|delete) (all )?(the )?(images|photos|pictures)/.test(c)) {
    const imgs = page.elements.filter((e) => e.type === 'image');
    return { summary: `Removed ${imgs.length} image${imgs.length === 1 ? '' : 's'}.`, ops: imgs.map((e) => ({ op: 'delete', id: e.id })) };
  }
  const addText = /add (?:a )?(?:title|heading|headline|text)(?: that says| saying|:)? ["“]?(.+?)["”]?$/.exec(cmd.trim());
  if (addText) {
    const size = Math.round(Math.min(d.width, d.height) / 12);
    return { summary: 'Added a heading.', ops: [{ op: 'add', element: { type: 'text', role: 'heading', text: addText[1], x: d.width * 0.1, y: d.height * 0.1, w: d.width * 0.8, size, weight: 700, align: 'center' } }] };
  }
  if (/(new|shuffle|change|different|random) (color|colour) ?(palette|scheme|colors|colours)?/.test(c) || /recolou?r/.test(c)) {
    const pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const ops: EditOp[] = [{ op: 'background', color: pal.bg }];
    for (const t of texts) ops.push({ op: 'update', id: t.id, patch: { color: headings.includes(t) ? pal.accent : pal.fg } });
    for (const e of page.elements) if (e.type === 'shape') ops.push({ op: 'update', id: e.id, patch: { fill: Math.random() > 0.5 ? pal.accent : pal.soft } });
    return { summary: 'Applied a new color palette.', ops };
  }
  return null;
}

export const RULE_EXAMPLES = ['Make headlines blue', 'Bigger text', 'Dark mode', 'Center everything', 'Translate to Spanish', 'Change background to cream', 'New color palette', 'Change font to Poppins'];

/* ------------------------------------------------------------------ docs (Draft a doc) */

export interface DocBlock {
  kind: 'h1' | 'h2' | 'h3' | 'p' | 'li';
  text: string;
}

export function parseMarkdown(md: string): DocBlock[] {
  const out: DocBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ kind: 'p', text: para.join(' ').trim() });
    para = [];
  };
  for (const raw of md.replace(/\r/g, '').split('\n')) {
    const line = raw.trim().replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/(^|\s)\*(\S.+?)\*/g, '$1$2');
    if (!line) {
      flush();
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      out.push({ kind: (['h1', 'h2', 'h3'] as const)[h[1].length - 1], text: h[2] });
    } else if (/^([-*•]|\d+[.)])\s+/.test(line)) {
      flush();
      out.push({ kind: 'li', text: line.replace(/^([-*•]|\d+[.)])\s+/, '') });
    } else para.push(line);
  }
  flush();
  return out;
}

/** Lay out doc blocks as text elements over as many pages as needed. */
export function docBlocksToPages(blocks: DocBlock[], W: number, H: number, background: Fill = { kind: 'solid', color: '#ffffff' }): Page[] {
  const k = W / 816;
  const margin = Math.round(72 * k);
  const kit = useApp.getState().brandKits[0];
  const head = kit?.fonts.heading.family ?? 'Inter';
  const body = kit?.fonts.body.family ?? 'Inter';
  const styles = {
    h1: { size: 34 * k, weight: 700, font: head, gap: 18 * k, lh: 1.2 },
    h2: { size: 24 * k, weight: 700, font: head, gap: 12 * k, lh: 1.25 },
    h3: { size: 19 * k, weight: 600, font: body, gap: 8 * k, lh: 1.3 },
    p: { size: 15 * k, weight: 400, font: body, gap: 12 * k, lh: 1.55 },
    li: { size: 15 * k, weight: 400, font: body, gap: 6 * k, lh: 1.5 },
  };
  const pages: Page[] = [];
  let page = newPage({ background: structuredClone(background) });
  pages.push(page);
  let y = margin;
  const w = W - margin * 2;
  // merge consecutive list items into one bullet list element
  const merged: DocBlock[] = [];
  for (const b of blocks) {
    const last = merged[merged.length - 1];
    if (b.kind === 'li' && last?.kind === 'li') last.text += '\n' + b.text;
    else merged.push({ ...b });
  }
  for (const b of merged) {
    const st = styles[b.kind];
    const size = Math.round(st.size);
    const est = estimateTextHeight(b.kind === 'li' ? b.text.replace(/^/gm, '•  ') : b.text, w, size, st.lh);
    if (y + est > H - margin && y > margin) {
      page = newPage({ background: structuredClone(background) });
      pages.push(page);
      y = margin;
    }
    const t = makeText(b.text, margin, y, w, { fontSize: size, fontWeight: st.weight, fontFamily: st.font, color: b.kind.startsWith('h') ? '#1b1b1f' : '#2c2c33', lineHeight: st.lh, list: b.kind === 'li' ? 'bullet' : undefined }, b.kind === 'h1' ? 'heading' : b.kind === 'p' || b.kind === 'li' ? 'body' : 'subheading');
    t.h = est;
    page.elements.push(t);
    y += est + st.gap + (b.kind.startsWith('h') ? 4 * k : 0);
  }
  return pages;
}

export async function draftDocLLM(prompt: string, o: { signal?: AbortSignal; onText?: (full: string) => void }): Promise<string> {
  const voice = useApp.getState().brandKits[0]?.voice;
  return complete({
    system: `You are Cream AI's Magic Write. Write a well-structured document in Markdown: one "# " title, "## " section headings, short paragraphs and "- " bullet lists where helpful. No tables, no code fences, no images. Be specific and useful.${voice ? ` Brand voice: ${voice}` : ''}${memoryNote()}`,
    messages: [{ role: 'user', content: prompt }],
    signal: o.signal,
    onText: o.onText ? (_d, full) => o.onText!(full) : undefined,
    effort: 'low',
  });
}

export function draftDocKeyless(prompt: string): string {
  const { title } = extractCopy(prompt);
  return `# ${title}\n\n[Write a one-paragraph introduction: what this document is about and who it is for.]\n\n## Background\n\n[Explain the context and why this matters now.]\n\n## Goals\n\n- [First goal]\n- [Second goal]\n- [Third goal]\n\n## Details\n\n[Describe the plan, the key ideas or the main argument.]\n\n## Next steps\n\n- [Owner — action — date]\n- [Owner — action — date]\n\n## Summary\n\n[Wrap up in two or three sentences.]`;
}

export const hasLLM = () => !!activeConfig();
export { uid };
