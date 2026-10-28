// Panel-level insertion helpers: wrap the core insert API (editor/dnd.ts) with
// recently-used tracking, Iconify/Wikimedia fetching and drag payloads.
import type React from 'react';
import type { El, ShapeKind } from '../model/types';
import { makeLine, makeShape, uid, cloneElements } from '../model/defaults';
import {
  fillFrame,
  insertAudio,
  insertChart,
  insertElements,
  insertFrame,
  insertGrid,
  insertImageSmart,
  insertShape,
  insertSvg,
  insertTable,
  insertVideo,
  setDragPayload,
} from '../editor/dnd';
import { findEl, useEditor } from '../store/editor';
import { useApp } from '../store/app';
import { addRecent, type RecentItem } from '../assets/recent';
import type { AudioItem, PhotoItem } from '../assets/openverse';
import { iconCredit, iconSvg, peekIconSvg, uniquifySvgIds, type IconItem } from '../assets/iconify';
import { playableSrc, type VideoItem } from '../assets/wikimedia';
import { GRADIENTS, LINE_PRESETS } from './catalog';

const toast = (t: string, kind?: 'info' | 'error' | 'success') => useApp.getState().toast(t, kind);
const hasDesign = () => !!useEditor.getState().design;

/* ---------- Photos ---------- */
export async function insertPhoto(p: PhotoItem) {
  if (!hasDesign()) return;
  addRecent({ kind: 'photo', key: 'photo:' + p.id, item: p });
  await insertImageSmart(p.src, { w: p.w, h: p.h, credit: p.credit });
}
export const photoDrag = (e: React.DragEvent, p: PhotoItem) => setDragPayload(e, { kind: 'image', src: p.src, w: p.w, h: p.h, credit: p.credit });

/* ---------- Icons / graphics / stickers ---------- */
export async function insertIcon(id: string) {
  if (!hasDesign()) return;
  try {
    const [svg, credit] = await Promise.all([iconSvg(id), iconCredit(id)]);
    insertSvg(uniquifySvgIds(svg), { credit, keepRatio: true });
    addRecent({ kind: 'icon', key: 'icon:' + id, id });
  } catch {
    toast('Could not load that graphic. Check your connection and try again.', 'error');
  }
}
export function iconDrag(e: React.DragEvent, i: IconItem) {
  const svg = i.svg ?? peekIconSvg(i.id);
  if (svg) setDragPayload(e, { kind: 'svg', svg: uniquifySvgIds(svg), credit: { title: i.name, source: 'iconify', landingUrl: `https://icon-sets.iconify.design/${i.prefix}/${i.name}/` } });
  else setDragPayload(e, { kind: 'image', src: i.url, w: 512, h: 512, credit: { title: i.name, source: 'iconify' } });
}

/* ---------- Videos ---------- */
export async function insertVideoItem(v: VideoItem) {
  if (!hasDesign()) return;
  addRecent({ kind: 'video', key: 'video:' + v.id, item: v });
  toast('Adding video…');
  const src = await playableSrc(v);
  const s = useEditor.getState();
  const sel = s.selection.length === 1 && s.design ? findEl(s.design, s.selection[0])?.el : null;
  if (sel && (sel.type === 'frame' || sel.type === 'grid')) {
    fillFrame(sel.id, { src, kind: 'video', w: v.w, h: v.h, credit: v.credit });
    return;
  }
  await insertVideo(src, { duration: v.duration, w: v.w, h: v.h, credit: v.credit, poster: v.posterLarge });
}
export const videoDrag = (e: React.DragEvent, v: VideoItem) =>
  setDragPayload(e, { kind: 'video', src: v.original, duration: v.duration, w: v.w, h: v.h, credit: v.credit, poster: v.posterLarge });

/* ---------- Audio ---------- */
export async function insertAudioItem(a: AudioItem) {
  if (!hasDesign()) return;
  addRecent({ kind: 'audio', key: 'audio:' + a.id, item: a });
  await insertAudio(a.src, a.title, { duration: a.duration || undefined, credit: a.credit });
}
export const audioDrag = (e: React.DragEvent, a: AudioItem) => setDragPayload(e, { kind: 'audio', src: a.src, title: a.title, duration: a.duration, credit: a.credit });

/* ---------- Shapes / lines / gradients ---------- */
export function insertShapeKind(shape: ShapeKind) {
  if (!hasDesign()) return;
  insertShape(shape);
  addRecent({ kind: 'shape', key: 'shape:' + shape, shape });
}

export function buildLine(presetId: string): El {
  const d = useEditor.getState().design!;
  const p = LINE_PRESETS.find((x) => x.id === presetId) ?? LINE_PRESETS[0];
  const len = d.width * 0.35;
  const width = Math.max(2, Math.round(d.width / 270)) * (p.thick ?? 1);
  const cy = d.height / 2;
  const dy = p.bend ? len * 0.4 : 0;
  return makeLine(d.width / 2 - len / 2, cy - dy / 2, d.width / 2 + len / 2, cy + dy / 2, { width, ...p.opts });
}
export function insertLinePreset(presetId: string) {
  if (!hasDesign()) return;
  insertElements([buildLine(presetId)]);
  addRecent({ kind: 'line', key: 'line:' + presetId, preset: presetId });
}

export function buildGradient(idx: number, shape: ShapeKind = 'rect'): El {
  const d = useEditor.getState().design!;
  const s = Math.min(d.width, d.height) * 0.4;
  const el = makeShape(shape, (d.width - s) / 2, (d.height - s) / 2, s, s);
  el.fill = structuredClone(GRADIENTS[idx % GRADIENTS.length].fill);
  return el;
}
export function insertGradient(idx: number, shape: ShapeKind = 'rect') {
  if (!hasDesign()) return;
  insertElements([buildGradient(idx, shape)]);
  addRecent({ kind: 'gradient', key: `gradient:${idx}:${shape}`, idx, shape });
}

/** Drag payload for anything we can build as a ready element. */
export function elementsDrag(e: React.DragEvent, build: () => El | El[]) {
  if (!hasDesign()) return;
  const els = ([] as El[]).concat(build());
  setDragPayload(e, { kind: 'elements', elements: els });
}

/* ---------- Re-run a recent item ---------- */
export function runRecent(r: RecentItem) {
  switch (r.kind) {
    case 'shape':
      return insertShapeKind(r.shape);
    case 'icon':
      return insertIcon(r.id);
    case 'photo':
      return insertPhoto(r.item);
    case 'video':
      return insertVideoItem(r.item);
    case 'audio':
      return insertAudioItem(r.item);
    case 'line':
      return insertLinePreset(r.preset);
    case 'chart':
      insertChart(r.chart);
      return addRecent(r);
    case 'frame':
      insertFrame(r.frame, r.letter);
      return addRecent(r);
    case 'grid':
      insertGrid(r.layout);
      return addRecent(r);
    case 'table':
      insertTable(r.rows, r.cols);
      return addRecent(r);
    case 'gradient':
      return insertGradient(r.idx, r.shape);
  }
}

/** Insert a set of elements (e.g. another design's page) as one group, scaled to fit the current page. */
export function insertAsGroup(els: El[], srcW: number, srcH: number, frac = 0.8) {
  const d = useEditor.getState().design;
  if (!d || !els.length) return;
  const k = Math.min((d.width * frac) / srcW, (d.height * frac) / srcH);
  const ox = (d.width - srcW * k) / 2;
  const oy = (d.height - srcH * k) / 2;
  const gid = uid();
  const out = cloneElements(els).map((e) => {
    e.groupId = gid;
    if (e.type === 'line') {
      e.x1 = ox + e.x1 * k;
      e.x2 = ox + e.x2 * k;
      e.y1 = oy + e.y1 * k;
      e.y2 = oy + e.y2 * k;
      e.width *= k;
    }
    e.x = ox + e.x * k;
    e.y = oy + e.y * k;
    e.w *= k;
    e.h *= k;
    if (e.type === 'text') e.fontSize = Math.max(1, Math.round(e.fontSize * k * 10) / 10);
    if (e.type === 'shape' && e.fontSize) e.fontSize *= k;
    if (e.type === 'sticky' || e.type === 'table') e.fontSize *= k;
    return e;
  });
  insertElements(out);
}
