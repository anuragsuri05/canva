// Builds template pages from a template id: kind.theme.topic.variant
import type { DesignCategory, El, Page } from '../model/types';
import { newPage, solid } from '../model/defaults';
import { presetById } from '../model/presets';
import { kindById, type Kind } from './catalog';
import { pickCopy, topicById } from './content';
import type { Ctx } from './kit';
import { RECIPES } from './recipes';
import { hashStr, Rng } from './rng';
import { themeById } from './themes';
import { animate } from './motion';

export interface ParsedId {
  kind: Kind;
  themeId: string;
  topicId: string;
  v: number;
}

export function parseId(id: string): ParsedId | null {
  const [k, th, tp, v] = id.split('.');
  const kind = kindById(k);
  if (!kind || !th || !tp) return null;
  return { kind, themeId: th, topicId: tp, v: Number(v) || 0 };
}

/** Which recipe ids each page uses. */
export function pageRecipes(id: string): string[] {
  const p = parseId(id);
  if (!p) return [];
  const rng = new Rng(id + ':seq');
  if (p.kind.seq) return p.kind.seq(p.v, rng);
  const r = p.kind.recipes;
  return [r[(p.v + hashStr(p.kind.id + p.topicId)) % r.length]];
}

export interface Built {
  id: string;
  title: string;
  preset: string;
  category: DesignCategory;
  width: number;
  height: number;
  pages: Page[];
}

function makeCtx(id: string, w: number, h: number, pi: number, pages: number, thumb: boolean, p: ParsedId): Ctx {
  const theme = themeById(p.themeId);
  const topic = topicById(p.topicId);
  const copy = pickCopy(topic, new Rng(id + ':copy'));
  const u = Math.min(w, h) / 100;
  const ar = w / h;
  return {
    w,
    h,
    t: theme,
    c: copy,
    rng: new Rng(`${id}:${pi}`),
    els: [],
    bg: solid(theme.bg),
    u,
    m: Math.round(Math.min(w, h) * (ar > 2.2 || ar < 0.45 ? 0.1 : 0.075)),
    land: ar > 1.15,
    port: ar < 0.87,
    ar,
    seed: String(hashStr(id) % 100000) + 'p' + pi,
    photoN: 0,
    thumb,
    page: pi,
    pages,
  };
}

const cache = new Map<string, Built>();
const CACHE_MAX = 500;

export function build(id: string, thumb = false, onlyFirst = false): Built | null {
  const key = (thumb ? 't:' : 'f:') + (onlyFirst ? '1:' : '') + id;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = parseId(id);
  if (!p) return null;
  const preset = presetById(p.kind.preset);
  if (!preset) return null;
  const { width: w, height: h } = preset;
  let seq = pageRecipes(id);
  const total = seq.length;
  if (onlyFirst) seq = seq.slice(0, 1);
  const animated = p.kind.animated ? new Rng(id + ':anim').next() < p.kind.animated : false;
  const pages = seq.map((rid, pi) => {
    const c = makeCtx(id, w, h, pi, total, thumb, p);
    const rec = RECIPES[rid] ?? RECIPES['bold-type'];
    try {
      rec.fn(c);
    } catch (e) {
      console.warn('template recipe failed', rid, e);
    }
    const els = c.els.map(round);
    if (animated) animate(els, c, pi);
    return newPage({ background: c.bg, elements: els, notes: c.notes ?? '', duration: c.duration ?? (animated ? 4 : 5), ...(animated && pi > 0 ? { transition: { type: 'dissolve', duration: 0.6 } } : {}) });
  });
  const topic = topicById(p.topicId);
  const built: Built = {
    id,
    title: titleFor(p, topic.label),
    preset: preset.id,
    category: preset.category,
    width: w,
    height: h,
    pages,
  };
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, built);
  return built;
}

export function titleFor(p: ParsedId, topicLabel: string) {
  return `${themeById(p.themeId).name} ${topicLabel} ${p.kind.label}`;
}

function round(e: El): El {
  e.x = Math.round(e.x * 10) / 10;
  e.y = Math.round(e.y * 10) / 10;
  e.w = Math.round(e.w * 10) / 10;
  e.h = Math.round(e.h * 10) / 10;
  return e;
}
