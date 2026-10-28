// Insertion + drag-and-drop API used by every side panel (assets, templates, AI, uploads).
import type { Draft } from 'immer';
import type { AudioTrack, ChartEl, Credit, El, FrameEl, GridEl, ShapeKind, TextEl } from '../model/types';
import { makeChart, makeFrame, makeGrid, makeImage, makeLine, makeShape, makeSticky, makeSvg, makeTable, makeText, makeVideo, uid } from '../model/defaults';
import { currentPage, findEl, useEditor } from '../store/editor';
import { useApp } from '../store/app';
import { loadImageSize, loadMediaInfo, resolveSrc } from '../store/blobs';
import { ensureFont } from '../assets/fonts';

export const DRAG_MIME = 'application/x-cream';

export type DragPayload =
  | { kind: 'image'; src: string; w?: number; h?: number; credit?: Credit }
  | { kind: 'svg'; svg: string; credit?: Credit; w?: number; h?: number }
  | { kind: 'video'; src: string; duration?: number; w?: number; h?: number; credit?: Credit; poster?: string }
  | { kind: 'audio'; src: string; title: string; duration?: number; credit?: Credit }
  | { kind: 'elements'; elements: El[] }
  | { kind: 'text'; preset: 'heading' | 'subheading' | 'body' }
  | { kind: 'shape'; shape: ShapeKind };

export function setDragPayload(e: React.DragEvent, p: DragPayload) {
  e.dataTransfer.setData(DRAG_MIME, JSON.stringify(p));
  e.dataTransfer.effectAllowed = 'copy';
}

function design() {
  return useEditor.getState().design!;
}

/** Fit a w×h box inside the page at `frac` of its size, centred (or at a point). */
export function placeBox(w: number, h: number, frac = 0.5, at?: { x: number; y: number }) {
  const d = design();
  const maxW = d.width * frac;
  const maxH = d.height * frac;
  const k = Math.min(maxW / w, maxH / h);
  const nw = Math.max(20, w * k);
  const nh = Math.max(20, h * k);
  const x = at ? at.x - nw / 2 : (d.width - nw) / 2;
  const y = at ? at.y - nh / 2 : (d.height - nh) / 2;
  return { x, y, w: nw, h: nh };
}

export function insertElements(els: El[], pageId?: string) {
  useEditor.getState().addElements(els, { pageId });
}

export async function insertImage(src: string, opts: { w?: number; h?: number; credit?: Credit; pageId?: string; at?: { x: number; y: number }; frac?: number } = {}) {
  let { w, h } = opts;
  if (!w || !h) {
    try {
      const s = await loadImageSize(await resolveSrc(src));
      w = s.w;
      h = s.h;
    } catch {
      w = 800;
      h = 600;
    }
  }
  const b = placeBox(w!, h!, opts.frac ?? 0.6, opts.at);
  const el = makeImage(src, w!, h!, b.x, b.y, b.w, { credit: opts.credit });
  insertElements([el], opts.pageId);
  return el;
}

export function insertSvg(svg: string, opts: { credit?: Credit; pageId?: string; at?: { x: number; y: number }; w?: number; h?: number; frac?: number; keepRatio?: boolean } = {}) {
  const vb = /viewBox="([\d.\-\s]+)"/.exec(svg)?.[1].split(/\s+/).map(Number);
  const w = opts.w ?? vb?.[2] ?? 100;
  const h = opts.h ?? vb?.[3] ?? 100;
  const b = placeBox(w, h, opts.frac ?? 0.3, opts.at);
  const el = makeSvg(svg, b.x, b.y, b.w, b.h, { credit: opts.credit, keepRatio: opts.keepRatio ?? true });
  insertElements([el], opts.pageId);
  return el;
}

export async function insertVideo(src: string, opts: { duration?: number; w?: number; h?: number; credit?: Credit; pageId?: string; at?: { x: number; y: number }; poster?: string } = {}) {
  let { w, h, duration } = opts;
  if (!w || !h || !duration) {
    try {
      const m = await loadMediaInfo(await resolveSrc(src), 'video');
      w = w || m.w || 1280;
      h = h || m.h || 720;
      duration = duration || m.duration;
    } catch {
      w = w || 1280;
      h = h || 720;
      duration = duration || 10;
    }
  }
  const d = design();
  const fill = d.category === 'video';
  const b = fill ? { x: 0, y: 0, w: d.width, h: (d.width * h!) / w! } : placeBox(w!, h!, 0.6, opts.at);
  if (fill && b.h < d.height) {
    b.h = d.height;
    b.w = (d.height * w!) / h!;
    b.x = (d.width - b.w) / 2;
  }
  if (fill) b.y = (d.height - b.h) / 2;
  const el = makeVideo(src, duration!, w!, h!, b.x, b.y, b.w, { credit: opts.credit, poster: opts.poster });
  insertElements([el], opts.pageId);
  // Video pages default to the clip length.
  if (fill) {
    const pid = opts.pageId ?? useEditor.getState().pageId!;
    useEditor.getState().patchPage(pid, { duration: Math.min(60, Math.max(1, Math.round(duration! * 10) / 10)) });
  }
  return el;
}

export async function insertAudio(src: string, title: string, opts: { duration?: number; credit?: Credit } = {}) {
  let duration = opts.duration;
  if (!duration) {
    try {
      duration = (await loadMediaInfo(await resolveSrc(src), 'audio')).duration;
    } catch {
      duration = 30;
    }
  }
  const total = design().pages.reduce((a, p) => a + p.duration, 0);
  const track: AudioTrack = {
    id: uid(),
    src,
    title,
    start: 0,
    trimStart: 0,
    duration: Math.min(duration!, Math.max(total, 5)),
    sourceDuration: duration!,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    credit: opts.credit,
  };
  useEditor.getState().update((d) => {
    d.audio.push(track);
  });
  useEditor.setState({ showTimeline: true });
  useApp.getState().toast(`Added "${title}" to the timeline`);
  return track;
}

export function insertText(preset: 'heading' | 'subheading' | 'body' | TextEl, at?: { x: number; y: number }) {
  const d = design();
  const kits = useApp.getState().brandKits;
  const kit = kits.find((k) => k.id === d.brandKitId) ?? kits[0];
  let el: TextEl;
  if (typeof preset === 'object') {
    el = { ...structuredClone(preset), id: uid() };
  } else {
    const scale = Math.max(0.4, Math.min(d.width, d.height * 1.4) / 1080);
    const cfg = {
      heading: { text: 'Add a heading', size: 96, weight: 800, family: kit?.fonts.heading.family ?? 'Inter' },
      subheading: { text: 'Add a subheading', size: 56, weight: 600, family: kit?.fonts.subheading.family ?? 'Inter' },
      body: { text: 'Add a little bit of body text', size: 32, weight: 400, family: kit?.fonts.body.family ?? 'Inter' },
    }[preset];
    const size = Math.round(cfg.size * scale);
    const w = Math.min(d.width * 0.8, cfg.text.length * size * 0.55 + 20);
    el = makeText(cfg.text, (d.width - w) / 2, d.height / 2 - size / 2, w, { fontSize: size, fontWeight: cfg.weight, fontFamily: cfg.family, align: 'center' }, preset);
  }
  if (at) {
    el.x = at.x - el.w / 2;
    el.y = at.y - el.h / 2;
  }
  ensureFont(el.fontFamily, el.fontWeight);
  insertElements([el]);
  useEditor.setState({ editingId: null });
  return el;
}

export function insertShape(shape: ShapeKind, at?: { x: number; y: number }, color?: string) {
  const d = design();
  const s = Math.min(d.width, d.height) * 0.3;
  const el = makeShape(shape, (at?.x ?? d.width / 2) - s / 2, (at?.y ?? d.height / 2) - s / 2, s, s, color ?? '#c4c4c4');
  insertElements([el]);
  return el;
}

export function insertLine(opts: Partial<import('../model/types').LineEl> = {}) {
  const d = design();
  const len = d.width * 0.35;
  const el = makeLine(d.width / 2 - len / 2, d.height / 2, d.width / 2 + len / 2, d.height / 2, { width: Math.max(2, Math.round(d.width / 270)), ...opts });
  insertElements([el]);
  return el;
}

export function insertChart(type: ChartEl['chartType']) {
  const d = design();
  const w = Math.min(d.width * 0.6, 900);
  const h = type === 'progress-bar' ? w * 0.12 : type === 'number' ? w * 0.35 : w * 0.66;
  const el = makeChart(type, (d.width - w) / 2, (d.height - h) / 2, w, h);
  el.options.fontSize = Math.max(10, Math.round(w / 45));
  insertElements([el]);
  return el;
}

export function insertTable(rows = 3, cols = 3) {
  const d = design();
  const w = Math.min(d.width * 0.7, 900);
  const el = makeTable(rows, cols, (d.width - w) / 2, d.height / 2 - rows * 22, w);
  el.fontSize = Math.max(12, Math.round(w / 45));
  el.rowHeights = el.rowHeights.map(() => el.fontSize * 2.6);
  el.h = el.rowHeights.reduce((a, b) => a + b, 0);
  insertElements([el]);
  return el;
}

export function insertFrame(shape: FrameEl['frameShape'], letter?: string) {
  const d = design();
  const s = Math.min(d.width, d.height) * 0.45;
  const ratio = shape === 'phone' ? 2 : shape === 'polaroid' ? 1.2 : shape === 'laptop' ? 0.66 : shape === 'browser' ? 0.7 : shape === 'film' ? 0.66 : 1;
  const w = shape === 'phone' ? s / 2 : s;
  const el = makeFrame(shape, (d.width - w) / 2, (d.height - w * ratio) / 2, w, w * ratio, letter);
  insertElements([el]);
  return el;
}

export function insertGrid(layout: string) {
  const d = design();
  const el = makeGrid(layout, 0, 0, d.width, d.height);
  el.gap = Math.round(Math.min(d.width, d.height) / 100);
  insertElements([el]);
  return el;
}

export function insertSticky(color?: string) {
  const d = design();
  const el = makeSticky(d.width / 2 - 120, d.height / 2 - 120, color, useApp.getState().settings.userName);
  insertElements([el]);
  useEditor.setState({ editingId: el.id });
  return el;
}

/** "Set image as background" for the current page. */
export function setPageBackgroundImage(src: string, credit?: Credit) {
  const pid = useEditor.getState().pageId!;
  useEditor.getState().update((d) => {
    const p = d.pages.find((x) => x.id === pid)!;
    p.backgroundImage = { src, credit };
  });
}

/** Put media into a frame / grid cell (drag-drop or click while frame selected). */
export function fillFrame(elId: string, media: { src: string; kind: 'image' | 'video'; w: number; h: number; credit?: Credit }, cell?: number) {
  useEditor.getState().update((d) => {
    const f = findEl(d, elId);
    if (!f) return;
    const el = f.page.elements[f.index] as Draft<El>;
    const fit = { src: media.src, kind: media.kind, naturalW: media.w, naturalH: media.h, scale: 1, offsetX: 0, offsetY: 0, credit: media.credit };
    if (el.type === 'frame') el.media = fit;
    else if (el.type === 'grid') {
      const g = el as Draft<GridEl>;
      const idx = cell ?? g.cells.findIndex((c) => !c.src);
      g.cells[idx < 0 ? 0 : idx] = fit;
    } else if (el.type === 'image' && media.kind === 'image') {
      el.src = media.src;
      el.naturalW = media.w;
      el.naturalH = media.h;
      el.crop = undefined;
      const r = media.w / media.h;
      el.h = el.w / r;
    }
  });
}

/** If a frame/grid is selected, clicking an image fills it instead of adding a new element. */
export async function insertImageSmart(src: string, opts: { w?: number; h?: number; credit?: Credit } = {}) {
  const s = useEditor.getState();
  const sel = s.selection.length === 1 && s.design ? findEl(s.design, s.selection[0])?.el : null;
  if (sel && (sel.type === 'frame' || sel.type === 'grid')) {
    let { w, h } = opts;
    if (!w || !h) {
      const sz = await loadImageSize(await resolveSrc(src)).catch(() => ({ w: 800, h: 600 }));
      w = sz.w;
      h = sz.h;
    }
    fillFrame(sel.id, { src, kind: 'image', w: w!, h: h!, credit: opts.credit });
    return;
  }
  return insertImage(src, opts);
}

/** Handle anything dropped onto the canvas (panel payloads or files from the OS). */
export async function dropOnCanvas(dt: DataTransfer, pageId: string, at?: { x: number; y: number }, targetElId?: string, gridCell?: string | null) {
  const raw = dt.getData(DRAG_MIME);
  const s = useEditor.getState();
  s.setPage(pageId);
  const target = targetElId && s.design ? findEl(s.design, targetElId)?.el : undefined;
  if (raw) {
    const p = JSON.parse(raw) as DragPayload;
    if ((p.kind === 'image' || p.kind === 'video') && target && (target.type === 'frame' || target.type === 'grid')) {
      let w = p.w;
      let h = p.h;
      if (!w || !h) {
        const sz = p.kind === 'image' ? await loadImageSize(await resolveSrc(p.src)).catch(() => ({ w: 800, h: 600 })) : await loadMediaInfo(await resolveSrc(p.src), 'video').catch(() => ({ w: 1280, h: 720 }));
        w = sz.w;
        h = sz.h;
      }
      fillFrame(target.id, { src: p.src, kind: p.kind, w: w!, h: h!, credit: p.credit }, gridCell != null ? Number(gridCell) : undefined);
      return;
    }
    switch (p.kind) {
      case 'image':
        return insertImage(p.src, { w: p.w, h: p.h, credit: p.credit, pageId, at });
      case 'svg':
        return insertSvg(p.svg, { credit: p.credit, pageId, at, w: p.w, h: p.h });
      case 'video':
        return insertVideo(p.src, { duration: p.duration, w: p.w, h: p.h, credit: p.credit, pageId, at, poster: p.poster });
      case 'audio':
        return insertAudio(p.src, p.title, { duration: p.duration, credit: p.credit });
      case 'text':
        return insertText(p.preset, at);
      case 'shape':
        return insertShape(p.shape, at);
      case 'elements': {
        const els = p.elements.map((e) => ({ ...structuredClone(e), id: uid() }));
        if (at && els.length) {
          const minX = Math.min(...els.map((e) => e.x));
          const minY = Math.min(...els.map((e) => e.y));
          els.forEach((e) => {
            e.x += at.x - minX;
            e.y += at.y - minY;
          });
        }
        return insertElements(els, pageId);
      }
    }
  }
  // Files from the OS
  const files = [...dt.files];
  for (const file of files) {
    const { ref, asset } = await useApp.getState().addAssetFromFile(file);
    if (asset.kind === 'image') {
      if (target && (target.type === 'frame' || target.type === 'grid')) fillFrame(target.id, { src: ref, kind: 'image', w: asset.width ?? 800, h: asset.height ?? 600 }, gridCell != null ? Number(gridCell) : undefined);
      else await insertImage(ref, { w: asset.width, h: asset.height, pageId, at });
    } else if (asset.kind === 'video') await insertVideo(ref, { w: asset.width, h: asset.height, duration: asset.duration, pageId, at });
    else if (asset.kind === 'audio') await insertAudio(ref, asset.name, { duration: asset.duration });
    else if (asset.kind === 'font') useApp.getState().toast(`Font "${asset.fontFamily}" uploaded`);
  }
}

export function pageCenter() {
  const p = currentPage(useEditor.getState());
  const d = design();
  return { x: d.width / 2, y: (p?.height ?? d.height) / 2 };
}
