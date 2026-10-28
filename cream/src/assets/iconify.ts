// Iconify (https://iconify.design) — ~411k open-source icons in 240+ sets, keyless + CORS-enabled.
// Used for Graphics, Stickers (emoji sets), Icons and 3D (Fluent Emoji colour set).
import type { Credit } from '../model/types';
import { getJson, qs } from './http';

const API = 'https://api.iconify.design';

export interface IconItem {
  id: string; // prefix:name
  prefix: string;
  name: string;
  url: string; // thumbnail src: a data: URL built from the icon data once loaded, else the API .svg url
  svg?: string; // full SVG markup (filled by the batched JSON loader)
}

export interface IconSetInfo {
  name: string;
  total?: number;
  author?: { name: string; url?: string };
  license?: { title: string; spdx?: string; url?: string };
  palette?: boolean;
  category?: string;
}

export type IconGroup = 'graphics' | 'stickers' | 'icons' | '3d';

/** Multicolour illustration-style sets → "Graphics". */
export const GRAPHIC_SETS = [
  'streamline-stickies-color',
  'streamline-plump-color',
  'streamline-freehand-color',
  'flat-color-icons',
  'fluent-color',
  'streamline-ultimate-color',
  'icon-park',
  'marketeq',
  'streamline-kameleon-color',
  'streamline-flex-color',
];
/** Emoji sets → "Stickers". */
export const STICKER_SETS = ['fluent-emoji-flat', 'noto', 'twemoji', 'openmoji', 'streamline-emojis', 'emojione'];
/** Monochrome UI icon sets → "Icons". */
export const ICON_SETS = ['lucide', 'mdi', 'ph', 'tabler', 'material-symbols', 'solar', 'heroicons', 'fluent', 'ri', 'bi'];
/** Fluent Emoji colour set (gradient, 3D-look). Not indexed by search, so we search its flat twin and map names. */
export const THREE_D_SET = 'fluent-emoji';

export const GROUP_SETS: Record<IconGroup, string[]> = {
  graphics: GRAPHIC_SETS,
  stickers: STICKER_SETS,
  icons: ICON_SETS,
  '3d': ['fluent-emoji-flat'],
};

export const THREE_D_PICKS = [
  'rocket', 'light-bulb', 'gem-stone', 'trophy', 'money-bag', 'globe-showing-americas', 'red-heart', 'fire', 'glowing-star', 'sparkles',
  'party-popper', 'wrapped-gift', 'laptop', 'mobile-phone', 'camera', 'alarm-clock', 'crown', 'hundred-points', 'thumbs-up', 'rainbow',
  'sun', 'cloud', 'house', 'automobile', 'pizza', 'birthday-cake', 'books', 'artist-palette', 'headphone', 'studio-microphone',
  'video-game', 'soccer-ball', 'basketball', 'direct-hit', 'bar-chart', 'chart-increasing', 'calendar', 'envelope', 'locked', 'key',
  'hammer-and-wrench', 'magnifying-glass-tilted-left', 'bell', 'shopping-cart', 'package', 'balloon', 'confetti-ball', 'smiling-face-with-heart-eyes',
  'grinning-face', 'cat-face', 'dog-face', 'unicorn', 'sunflower', 'cherry-blossom', 'four-leaf-clover', 'snowflake', 'high-voltage', 'droplet',
  'hot-beverage', 'teacup-without-handle', 'graduation-cap', 'airplane', 'world-map', 'compass', 'bookmark', 'pushpin', 'paperclip', 'memo',
];

export const iconUrl = (prefix: string, name: string, color?: string) =>
  `${API}/${prefix}/${name}.svg${color ? '?' + qs({ color }) : ''}`;

const toItem = (id: string): IconItem => {
  const [prefix, name] = id.split(':');
  const svg = svgCache.get(id);
  return { id, prefix, name, svg, url: svg ? svgDataUrl(svg) : iconUrl(prefix, name) };
};

/* ---------- Batched icon data loader ----------
 * The per-icon `/{prefix}/{name}.svg` endpoint is rate-limited per IP, so we load icon bodies in batches
 * with `/{prefix}.json?icons=a,b,c` (one request per set per page) and build the SVG markup locally. */
const svgCache = new Map<string, string>();
const missing = new Set<string>();
let queue = new Map<string, Set<string>>();
let waiters: { ids: string[]; resolve: () => void; reject: (e: unknown) => void }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export const svgDataUrl = (svg: string) => {
  // Monochrome icons use currentColor, which an <img> can't inherit: draw them dark.
  const s = svg.replace(/currentColor/g, '#1f1f1f');
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
};

function buildSvg(data: any, name: string): string | null {
  let icon = data.icons?.[name];
  const tr = { hFlip: false, vFlip: false, rotate: 0 };
  let alias = data.aliases?.[name];
  let guard = 0;
  while (!icon && alias && guard++ < 5) {
    if (alias.hFlip) tr.hFlip = !tr.hFlip;
    if (alias.vFlip) tr.vFlip = !tr.vFlip;
    tr.rotate += alias.rotate ?? 0;
    icon = data.icons?.[alias.parent] ? { ...data.icons[alias.parent], ...pick(alias) } : null;
    alias = icon ? null : data.aliases?.[alias.parent];
  }
  if (!icon?.body) return null;
  const left = icon.left ?? data.left ?? 0;
  const top = icon.top ?? data.top ?? 0;
  const w = icon.width ?? data.width ?? 16;
  const h = icon.height ?? data.height ?? 16;
  if (icon.hFlip) tr.hFlip = !tr.hFlip;
  if (icon.vFlip) tr.vFlip = !tr.vFlip;
  tr.rotate += icon.rotate ?? 0;
  let body: string = icon.body;
  const t: string[] = [];
  const rot = ((tr.rotate % 4) + 4) % 4;
  if (rot) t.push(`rotate(${rot * 90} ${left + w / 2} ${top + h / 2})`);
  if (tr.hFlip || tr.vFlip) t.push(`translate(${tr.hFlip ? 2 * left + w : 0} ${tr.vFlip ? 2 * top + h : 0}) scale(${tr.hFlip ? -1 : 1} ${tr.vFlip ? -1 : 1})`);
  if (t.length) body = `<g transform="${t.join(' ')}">${body}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${left} ${top} ${w} ${h}">${body}</svg>`;
}
const pick = (a: any) => {
  const o: any = {};
  for (const k of ['left', 'top', 'width', 'height']) if (a[k] !== undefined) o[k] = a[k];
  return o;
};

async function flush() {
  timer = null;
  const q = queue;
  const ws = waiters;
  queue = new Map();
  waiters = [];
  const jobs: Promise<void>[] = [];
  q.forEach((names, prefix) => {
    const list = [...names];
    for (let i = 0; i < list.length; i += 80) {
      const chunk = list.slice(i, i + 80);
      jobs.push(
        getJson<any>(`${API}/${prefix}.json?icons=${chunk.map(encodeURIComponent).join(',')}`).then((data) => {
          chunk.forEach((n) => {
            const svg = buildSvg(data, n);
            if (svg) svgCache.set(`${prefix}:${n}`, svg);
            else missing.add(`${prefix}:${n}`);
          });
        }),
      );
    }
  });
  const res = await Promise.allSettled(jobs);
  const failed = res.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
  ws.forEach((w) => {
    if (failed && w.ids.some((id) => !svgCache.has(id) && !missing.has(id))) w.reject(failed.reason);
    else w.resolve();
  });
}

/** Load SVG markup for many icons (batched per set, cached). */
export function loadIcons(ids: string[]): Promise<void> {
  const need = ids.filter((id) => !svgCache.has(id) && !missing.has(id));
  if (!need.length) return Promise.resolve();
  return new Promise((resolve, reject) => {
    need.forEach((id) => {
      const [p, n] = id.split(':');
      if (!queue.has(p)) queue.set(p, new Set());
      queue.get(p)!.add(n);
    });
    waiters.push({ ids: need, resolve, reject });
    if (!timer) timer = setTimeout(flush, 0);
  });
}

/** Resolve items to include their SVG; icons that don't exist are dropped. */
async function hydrate(items: IconItem[]): Promise<IconItem[]> {
  await loadIcons(items.map((i) => i.id));
  return items.filter((i) => !missing.has(i.id)).map((i) => toItem(i.id));
}

let setsPromise: Promise<Record<string, IconSetInfo>> | null = null;
/** All icon sets (cached for the session). */
export function iconSets(): Promise<Record<string, IconSetInfo>> {
  if (!setsPromise) setsPromise = getJson<Record<string, IconSetInfo>>(`${API}/collections`).catch((e) => {
    setsPromise = null;
    throw e;
  });
  return setsPromise;
}

/** Search icons. `start` paginates (Iconify returns up to `limit` per call, max 999). */
export async function searchIcons(query: string, opts: { prefixes?: string[]; limit?: number; start?: number } = {}, signal?: AbortSignal) {
  const limit = Math.max(32, opts.limit ?? 48);
  const url = `${API}/search?` + qs({ query, limit, start: opts.start ?? 0, prefixes: opts.prefixes?.join(',') });
  const data = await getJson<{ icons: string[]; total: number; start?: number; limit: number }>(url, signal);
  const raw = (data.icons ?? []).map(toItem);
  return { items: raw, total: data.total ?? raw.length, hasMore: raw.length >= limit };
}

/** Search one of the Elements groups; 3D maps flat emoji names onto the colour (3D-look) set. */
export async function searchGroup(group: IconGroup, query: string, page: number, signal?: AbortSignal) {
  const limit = 48;
  const r = await searchIcons(query, { prefixes: GROUP_SETS[group], limit, start: (page - 1) * limit }, signal);
  if (group === '3d') r.items = r.items.filter((i) => i.prefix === 'fluent-emoji-flat').map((i) => toItem(`${THREE_D_SET}:${i.name}`));
  r.items = await hydrate(r.items);
  return r;
}

/** Queries used to browse a group without a search term (round-robin so variety shows up early). */
export const BROWSE_QUERIES: Record<IconGroup, string[]> = {
  graphics: ['business', 'celebration', 'nature', 'education', 'technology', 'food', 'travel', 'health', 'home', 'money', 'music', 'sport'],
  stickers: ['smile', 'heart', 'party', 'star', 'cat', 'fire', 'flower', 'food', 'hand', 'sun', 'sparkles', 'animal'],
  icons: ['home', 'arrow', 'user', 'mail', 'phone', 'calendar', 'check', 'star', 'heart', 'settings', 'search', 'camera'],
  '3d': [],
};

/**
 * Browse a group without a query. (Iconify's /collection endpoint is heavily rate-limited, so we page
 * through a round-robin of popular search terms instead.)
 */
export async function browseGroup(group: IconGroup, page: number, signal?: AbortSignal): Promise<{ items: IconItem[]; hasMore: boolean }> {
  if (group === '3d') {
    const per = 36;
    const items = await hydrate(THREE_D_PICKS.slice((page - 1) * per, page * per).map((n) => toItem(`${THREE_D_SET}:${n}`)));
    return { items, hasMore: page * per < THREE_D_PICKS.length };
  }
  const qs0 = BROWSE_QUERIES[group];
  const q = qs0[(page - 1) % qs0.length];
  const round = Math.floor((page - 1) / qs0.length);
  const r = await searchIcons(q, { prefixes: GROUP_SETS[group], limit: 32, start: round * 32 }, signal);
  return { items: await hydrate(r.items), hasMore: page < qs0.length * 4 };
}

/** SVG markup for an icon (cached, batched). */
export async function iconSvg(id: string): Promise<string> {
  await loadIcons([id]);
  const svg = svgCache.get(id);
  if (!svg) throw new Error(`Icon ${id} not found`);
  return svg;
}

export const peekIconSvg = (id: string) => svgCache.get(id);

/** Warm the SVG cache (so a drag can start synchronously). */
export const prefetchIcon = (id: string) => {
  iconSvg(id).catch(() => {});
};

/** Make element ids inside an SVG unique so several copies on one page don't clash (gradients/clip paths). */
export function uniquifySvgIds(svg: string): string {
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  if (!ids.length) return svg;
  const suf = '-' + Math.random().toString(36).slice(2, 7);
  let out = svg;
  for (const id of new Set(ids)) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out
      .replace(new RegExp(`id="${esc}"`, 'g'), `id="${id}${suf}"`)
      .replace(new RegExp(`url\\(#${esc}\\)`, 'g'), `url(#${id}${suf})`)
      .replace(new RegExp(`href="#${esc}"`, 'g'), `href="#${id}${suf}"`);
  }
  return out;
}

export async function iconCredit(id: string): Promise<Credit> {
  const { prefix, name } = toItem(id);
  let info: IconSetInfo | undefined;
  try {
    info = (await iconSets())[prefix];
  } catch {
    /* credit is best effort */
  }
  return {
    title: `${name.replace(/-/g, ' ')} (${info?.name ?? prefix})`,
    creator: info?.author?.name,
    creatorUrl: info?.author?.url,
    license: info?.license?.spdx ?? info?.license?.title,
    licenseUrl: info?.license?.url,
    source: 'iconify',
    landingUrl: `https://icon-sets.iconify.design/${prefix}/${name}/`,
  };
}

export const iconLabel = (i: IconItem) => i.name.replace(/-/g, ' ');
