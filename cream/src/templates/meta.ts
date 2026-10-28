// Lazily generated metadata index for every reachable template (no elements are built here).
import type { DesignCategory } from '../model/types';
import { presetById } from '../model/presets';
import { KINDS, TEMPLATE_CATEGORIES } from './catalog';
import { TOPICS } from './content';
import { pageRecipes, parseId, titleFor } from './build';
import { colorName, hashStr, Rng } from './rng';
import { THEMES } from './themes';

export interface TemplateMeta {
  id: string;
  title: string;
  kind: string;
  kindLabel: string;
  preset: string;
  group: string;
  category: DesignCategory;
  topic: string;
  topicLabel: string;
  theme: string;
  themeName: string;
  styles: string[];
  colors: string[];
  swatch: string[];
  pages: number;
  animated: boolean;
  pro: boolean;
  width: number;
  height: number;
  keywords: string;
  order: number;
}

let INDEX: TemplateMeta[] | null = null;
const BY_ID = new Map<string, TemplateMeta>();

export function metaFor(id: string): TemplateMeta | null {
  getIndex();
  const hit = BY_ID.get(id);
  if (hit) return hit;
  const m = makeMeta(id);
  if (m) BY_ID.set(id, m);
  return m;
}

function makeMeta(id: string): TemplateMeta | null {
  const p = parseId(id);
  if (!p) return null;
  const preset = presetById(p.kind.preset);
  const theme = THEMES.find((t) => t.id === p.themeId);
  const topic = TOPICS.find((t) => t.id === p.topicId);
  if (!preset || !theme || !topic) return null;
  const pages = p.kind.seq ? pageRecipes(id).length : 1;
  const animated = p.kind.animated ? new Rng(id + ':anim').next() < p.kind.animated : false;
  const colors = [...new Set([colorName(theme.bg), colorName(theme.primary)])];
  const groupLabel = TEMPLATE_CATEGORIES.find((g) => g.id === p.kind.group)?.label ?? '';
  const title = titleFor(p, topic.label);
  const keywords = [
    title, p.kind.label, p.kind.tags ?? '', preset.name, groupLabel, preset.category, topic.id, topic.label, theme.styles.join(' '), colors.join(' '),
    topic.headlines.join(' '), topic.items.join(' '), topic.event, animated ? 'animated motion' : '', pages > 1 ? 'multi-page' : '',
  ].join(' ').toLowerCase();
  return {
    id,
    title,
    kind: p.kind.id,
    kindLabel: p.kind.label,
    preset: preset.id,
    group: p.kind.group,
    category: preset.category,
    topic: topic.id,
    topicLabel: topic.label,
    theme: theme.id,
    themeName: theme.name,
    styles: theme.styles,
    colors,
    swatch: [theme.bg, theme.primary, theme.secondary, theme.accent],
    pages,
    animated,
    pro: hashStr(id) % 4 === 0,
    width: preset.width,
    height: preset.height,
    keywords,
    order: hashStr(id + ':o') % 100000,
  };
}

export function getIndex(): TemplateMeta[] {
  if (INDEX) return INDEX;
  const out: TemplateMeta[] = [];
  for (const kind of KINDS) {
    for (const topic of TOPICS) {
      if (kind.topics && !kind.topics.includes(topic.id)) continue;
      const rng = new Rng(kind.id + '|' + topic.id);
      const suited = rng.shuffle(THEMES.filter((t) => t.topics?.includes(topic.id)));
      const rest = rng.shuffle(THEMES.filter((t) => !t.topics?.includes(topic.id)));
      const order = [...suited, ...rest];
      for (let v = 0; v < kind.per; v++) {
        const theme = order[v % order.length];
        const id = `${kind.id}.${theme.id}.${topic.id}.${v}`;
        const m = makeMeta(id);
        if (m) {
          out.push(m);
          BY_ID.set(id, m);
        }
      }
    }
  }
  out.sort((a, b) => a.order - b.order);
  INDEX = out;
  return out;
}

export interface SearchOpts {
  query?: string;
  category?: string;
  preset?: string;
  kind?: string;
  style?: string;
  theme?: string;
  color?: string;
  topic?: string;
  feature?: 'animated' | 'multi-page' | string;
  price?: 'free' | 'pro' | string;
  page?: number;
  pageSize?: number;
  exclude?: string;
}

function matchFilters(m: TemplateMeta, o: SearchOpts) {
  if (o.category && m.group !== o.category && m.category !== o.category && m.topic !== o.category && m.kind !== o.category) return false;
  if (o.preset && m.preset !== o.preset) return false;
  if (o.kind && m.kind !== o.kind) return false;
  if (o.style && !m.styles.includes(o.style)) return false;
  if (o.theme && m.theme !== o.theme) return false;
  if (o.color && !m.colors.includes(o.color)) return false;
  if (o.topic && m.topic !== o.topic) return false;
  if (o.feature === 'animated' && !m.animated) return false;
  if (o.feature === 'multi-page' && m.pages < 2) return false;
  if (o.price === 'free' && m.pro) return false;
  if (o.price === 'pro' && !m.pro) return false;
  if (o.exclude && m.id === o.exclude) return false;
  return true;
}

export function searchTemplates(o: SearchOpts = {}): { items: TemplateMeta[]; total: number } {
  const idx = getIndex();
  const terms = (o.query ?? '').toLowerCase().split(/\s+/).filter(Boolean).map((t) => t.replace(/s$/, ''));
  let list = idx.filter((m) => {
    if (!matchFilters(m, o)) return false;
    for (const t of terms) if (!m.keywords.includes(t)) return false;
    return true;
  });
  if (terms.length > 1 && list.length < 60) {
    // Loosen multi-word searches: add templates matching most of the terms, ranked after exact matches.
    const have = new Set(list.map((m) => m.id));
    const partial = idx
      .filter((m) => !have.has(m.id) && matchFilters(m, o))
      .map((m) => [m, terms.filter((t) => m.keywords.includes(t)).length] as const)
      .filter(([, n]) => n >= Math.max(1, terms.length - 1))
      .sort((a, b) => b[1] - a[1] || a[0].order - b[0].order)
      .map(([m]) => m);
    list = [...list, ...partial];
  }
  if (terms.length) {
    const score = (m: TemplateMeta) => terms.reduce((s, t) => s + (m.keywords.includes(t) ? 10 : 0) + (m.title.toLowerCase().includes(t) ? 2 : 0), 0);
    list = list.map((m) => [m, score(m)] as const).sort((a, b) => b[1] - a[1] || a[0].order - b[0].order).map((x) => x[0]);
  }
  const size = o.pageSize ?? 30;
  const page = o.page ?? 0;
  return { items: list.slice(page * size, page * size + size), total: list.length };
}

/** Counts per template category / kind (for reports and tiles). */
export function countBy(key: 'group' | 'kind' | 'category' | 'topic'): Record<string, number> {
  const r: Record<string, number> = {};
  for (const m of getIndex()) r[m[key]] = (r[m[key]] ?? 0) + 1;
  return r;
}
