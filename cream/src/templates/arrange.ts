// "Layouts" tab: rearrange the current page's existing texts and images into slot layouts.
import type { El, Page, TextEl } from '../model/types';
import { makeShape, newPage, solid } from '../model/defaults';
import type { Box } from '../model/geometry';
import { useEditor } from '../store/editor';
import { coverCrop } from './apply';
import { estLines } from './kit';

export interface LayoutDef {
  id: string;
  name: string;
  images: number;
  slots: (w: number, h: number) => { text: Box & { align: 'left' | 'center' }; images: Box[] };
}

const L = (id: string, name: string, images: number, slots: LayoutDef['slots']): LayoutDef => ({ id, name, images, slots });

export const LAYOUTS: LayoutDef[] = [
  L('text-center', 'Centered text', 0, (w, h) => {
    const m = Math.min(w, h) * 0.1;
    return { text: { x: m, y: m, w: w - m * 2, h: h - m * 2, align: 'center' }, images: [] };
  }),
  L('text-left', 'Left text', 0, (w, h) => {
    const m = Math.min(w, h) * 0.1;
    return { text: { x: m, y: m, w: (w - m * 2) * 0.75, h: h - m * 2, align: 'left' }, images: [] };
  }),
  L('img-left', 'Image left', 1, (w, h) => {
    const m = Math.min(w, h) * 0.08;
    return w >= h
      ? { text: { x: w / 2 + m, y: m, w: w / 2 - m * 2, h: h - m * 2, align: 'left' }, images: [{ x: 0, y: 0, w: w / 2, h }] }
      : { text: { x: m, y: h * 0.5 + m, w: w - m * 2, h: h * 0.5 - m * 2, align: 'left' }, images: [{ x: 0, y: 0, w, h: h * 0.5 }] };
  }),
  L('img-right', 'Image right', 1, (w, h) => {
    const m = Math.min(w, h) * 0.08;
    return w >= h
      ? { text: { x: m, y: m, w: w / 2 - m * 2, h: h - m * 2, align: 'left' }, images: [{ x: w / 2, y: 0, w: w / 2, h }] }
      : { text: { x: m, y: m, w: w - m * 2, h: h * 0.5 - m * 2, align: 'left' }, images: [{ x: 0, y: h * 0.5, w, h: h * 0.5 }] };
  }),
  L('img-top', 'Image top', 1, (w, h) => {
    const m = Math.min(w, h) * 0.08;
    return { text: { x: m, y: h * 0.58 + m * 0.5, w: w - m * 2, h: h * 0.42 - m * 1.5, align: 'center' }, images: [{ x: 0, y: 0, w, h: h * 0.58 }] };
  }),
  L('img-inset', 'Inset image', 1, (w, h) => {
    const m = Math.min(w, h) * 0.08;
    return w >= h
      ? { text: { x: m, y: m, w: w * 0.42 - m, h: h - m * 2, align: 'left' }, images: [{ x: w * 0.48, y: m, w: w * 0.52 - m, h: h - m * 2 }] }
      : { text: { x: m, y: m, w: w - m * 2, h: h * 0.35 - m, align: 'left' }, images: [{ x: m, y: h * 0.4, w: w - m * 2, h: h * 0.6 - m }] };
  }),
  L('two-row', 'Two images', 2, (w, h) => {
    const m = Math.min(w, h) * 0.07;
    const iw = (w - m * 3) / 2;
    return { text: { x: m, y: h * 0.58, w: w - m * 2, h: h * 0.42 - m, align: 'center' }, images: [{ x: m, y: m, w: iw, h: h * 0.58 - m * 1.5 }, { x: m * 2 + iw, y: m, w: iw, h: h * 0.58 - m * 1.5 }] };
  }),
  L('two-side', 'Stacked images', 2, (w, h) => {
    const m = Math.min(w, h) * 0.07;
    const ih = (h - m * 3) / 2;
    return { text: { x: m, y: m, w: w * 0.5 - m * 1.5, h: h - m * 2, align: 'left' }, images: [{ x: w * 0.5, y: m, w: w * 0.5 - m, h: ih }, { x: w * 0.5, y: m * 2 + ih, w: w * 0.5 - m, h: ih }] };
  }),
  L('three-row', 'Three images', 3, (w, h) => {
    const m = Math.min(w, h) * 0.07;
    const iw = (w - m * 4) / 3;
    return {
      text: { x: m, y: m, w: w - m * 2, h: h * 0.35 - m, align: 'center' },
      images: [0, 1, 2].map((i) => ({ x: m + i * (iw + m), y: h * 0.4, w: iw, h: h * 0.6 - m })),
    };
  }),
  L('mosaic', 'Mosaic', 3, (w, h) => {
    const m = Math.min(w, h) * 0.06;
    const g = m * 0.4;
    const bw = w * 0.42;
    return {
      text: { x: w * 0.62 + m * 2, y: m, w: w - (w * 0.62 + m * 3), h: h - m * 2, align: 'left' },
      images: [
        { x: m, y: m, w: bw, h: h - m * 2 },
        { x: m + bw + g, y: m, w: w * 0.2, h: (h - m * 2 - g) / 2 },
        { x: m + bw + g, y: m + (h - m * 2 + g) / 2, w: w * 0.2, h: (h - m * 2 - g) / 2 },
      ],
    };
  }),
];

const isMedia = (e: El) => e.type === 'image' || e.type === 'frame' || e.type === 'video' || e.type === 'grid';

/** Place texts (largest first) in a column inside `area`, and media into image slots. */
export function arrangeElements(els: El[], def: LayoutDef, w: number, h: number) {
  const { text: area, images } = def.slots(w, h);
  const u = Math.min(w, h) / 100;
  const texts = els.filter((e): e is TextEl => e.type === 'text' && !e.hidden).sort((a, b) => b.fontSize - a.fontSize);
  const media = els.filter(isMedia);
  media.slice(0, images.length).forEach((e, i) => {
    const s = images[i];
    Object.assign(e, { x: s.x, y: s.y, w: s.w, h: s.h, rotation: 0 });
    if (e.type === 'image') coverCrop(e);
  });
  const sizes = [Math.min(u * 8, area.w * 0.1), u * 3.6, u * 2.8];
  const gap = u * 2.2;
  let y = 0;
  for (const [i, t] of texts.entries()) {
    let s = Math.min(t.fontSize, sizes[Math.min(i, 2)] * (i === 0 ? 1.4 : 1.2));
    if (i === 0) s = Math.max(s, sizes[0] * 0.6);
    const plain = t.html.replace(/<[^>]+>/g, ' ');
    while (s > u * 1.6 && estLines(plain, s, area.w, t.fontFamily, t.uppercase) > (i === 0 ? 3 : 5)) s *= 0.92;
    t.fontSize = Math.round(s);
    t.x = area.x;
    t.w = area.w;
    t.rotation = 0;
    t.align = area.align;
    t.h = Math.ceil(estLines(plain, t.fontSize, area.w, t.fontFamily, t.uppercase) * t.fontSize * t.lineHeight);
    t.y = y;
    y += t.h + gap;
  }
  const total = Math.max(0, y - gap);
  const off = area.y + Math.max(0, (area.h - total) / 2);
  for (const t of texts) t.y += off;
}

export function applyLayout(id: string) {
  const def = LAYOUTS.find((l) => l.id === id);
  const ed = useEditor.getState();
  if (!def || !ed.design) return;
  const { width: w, height: h } = ed.design;
  ed.update((d) => {
    const p = d.pages.find((x) => x.id === ed.pageId) ?? d.pages[0];
    arrangeElements(p.elements as El[], def, w, p.height ?? h);
  });
}

/** Schematic preview page for the Layouts tab. */
export function layoutPreview(def: LayoutDef, w: number, h: number): Page {
  const { text, images } = def.slots(w, h);
  const els: El[] = images.map((b) => {
    const s = makeShape('rect', b.x, b.y, b.w, b.h, '#c9c3dc');
    return s;
  });
  const u = Math.min(w, h) / 100;
  const bars = [
    [text.w * 0.8, u * 6],
    [text.w * 0.6, u * 2.4],
    [text.w * 0.7, u * 2.4],
  ];
  const total = bars.reduce((s, b) => s + b[1] + u * 3, 0);
  let y = text.y + (text.h - total) / 2;
  for (const [bw, bh] of bars) {
    const x = text.align === 'center' ? text.x + (text.w - bw) / 2 : text.x;
    const s = makeShape('rounded', x, y, bw, bh, '#7c4dff');
    s.radius = bh / 2;
    s.opacity = bh > u * 3 ? 0.9 : 0.45;
    els.push(s);
    y += bh + u * 3;
  }
  return newPage({ background: solid('#f4f2fa'), elements: els });
}
