// Styles tab: apply colour palettes, font sets and brand kits to the open design by role.
import type { BrandKit, El, Fill, Page } from '../model/types';
import { useEditor } from '../store/editor';
import { contrast, luminance, readable, Rng } from './rng';
import type { FontSet } from './themes';

const fillColor = (f: Fill): string | null => (f.kind === 'solid' ? f.color : f.kind === 'gradient' ? f.stops[0]?.color ?? null : null);
const opaque = (c: string) => !/rgba\([^)]*,\s*0(\.0+)?\)$/.test(c) && c !== 'transparent';

function contains(e: El, x: number, y: number) {
  return x >= e.x && x <= e.x + e.w && y >= e.y && y <= e.y + e.h;
}

/** Recolour one page by role. */
export function recolorPage(p: Page, colors: string[], shuffle: number) {
  const rng = new Rng(colors.join('') + ':' + shuffle);
  const sorted = [...colors].sort((a, b) => luminance(b) - luminance(a)); // light → dark
  const order = shuffle === 0 ? sorted : rng.shuffle(colors);
  const bg = shuffle === 0 ? sorted[0] : order[0];
  const others = colors.filter((c) => c !== bg);
  if (p.background.kind === 'solid') p.background = { kind: 'solid', color: bg };
  else if (p.background.kind === 'gradient') p.background = { ...p.background, stops: [{ color: bg, pos: 0 }, { color: others[0] ?? bg, pos: 1 }] };
  const map = new Map<string, string>();
  let next = 0;
  const pick = (orig: string) => {
    const k = orig.toLowerCase();
    if (!map.has(k)) map.set(k, others[(next++ + shuffle) % Math.max(1, others.length)] ?? bg);
    return map.get(k)!;
  };
  const newFill = new Map<string, string>(); // element id -> new solid colour
  for (const e of p.elements) {
    if (e.type === 'shape') {
      const c = fillColor(e.fill);
      if (e.fill.kind === 'solid' && c && opaque(c)) {
        e.fill = { kind: 'solid', color: pick(c) };
        newFill.set(e.id, e.fill.color);
      } else if (e.fill.kind === 'gradient' && e.fill.stops.every((s) => opaque(s.color))) {
        e.fill = { ...e.fill, stops: e.fill.stops.map((s) => ({ ...s, color: pick(s.color) })) };
        newFill.set(e.id, e.fill.stops[0].color);
      }
      if (e.stroke) e.stroke = { ...e.stroke, color: pick(e.stroke.color) };
      if (e.html && newFill.has(e.id)) e.color = readable(newFill.get(e.id)!, [...others, bg, '#ffffff', '#111111']);
    } else if (e.type === 'line') e.color = pick(e.color);
    else if (e.type === 'chart') e.series = e.series.map((s, i) => ({ ...s, color: others[(i + shuffle) % others.length] ?? s.color }));
  }
  p.elements.forEach((e, i) => {
    if (e.type !== 'text') return;
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    let under: string | null = bg;
    for (let j = i - 1; j >= 0; j--) {
      const o = p.elements[j];
      if (!contains(o, cx, cy) || o.opacity < 0.5) continue;
      if (o.type === 'shape' && newFill.has(o.id)) {
        under = newFill.get(o.id)!;
        break;
      }
      if (o.type === 'image' || o.type === 'frame' || o.type === 'video' || o.type === 'grid') {
        under = null;
        break;
      }
    }
    if (!under) return;
    const pal = [...others].sort((a, b) => contrast(under!, b) - contrast(under!, a));
    const good = pal.filter((x) => contrast(under!, x) >= 4.5);
    e.color = (e.role === 'heading' || e.fontSize > 40) && good.length ? rng.pick(good) : readable(under, [...pal, '#ffffff', '#111111'], 4.5);
  });
}

export function applyPalette(colors: string[], shuffle = 0, allPages = true) {
  const ed = useEditor.getState();
  ed.update((d) => {
    for (const p of d.pages) if (allPages || p.id === ed.pageId) recolorPage(p as Page, colors, shuffle);
  });
}

type FontPick = { family: string; weight: number };

export function applyFontSet(fs: Pick<FontSet, 'heading' | 'subheading' | 'body'> | { heading: FontPick; subheading: FontPick; body: FontPick }) {
  const ed = useEditor.getState();
  ed.update((d) => {
    for (const p of d.pages) {
      const texts = p.elements.filter((e) => e.type === 'text') as Extract<El, { type: 'text' }>[];
      const max = Math.max(1, ...texts.map((t) => t.fontSize));
      for (const t of texts) {
        const role = t.role ?? (t.fontSize >= max * 0.7 ? 'heading' : t.fontSize >= max * 0.4 ? 'subheading' : 'body');
        const f = role === 'heading' ? fs.heading : role === 'subheading' ? fs.subheading : fs.body;
        t.fontFamily = f.family;
        t.fontWeight = f.weight;
      }
      for (const e of p.elements) if (e.type === 'shape' && e.html) e.fontFamily = fs.body.family;
    }
  });
}

export function applyBrandKit(kit: BrandKit | undefined) {
  if (!kit) return false;
  const colors = kit.palettes.flatMap((p) => p.colors).slice(0, 6);
  if (colors.length >= 2) applyPalette(colors, 0);
  applyFontSet({ heading: kit.fonts.heading, subheading: kit.fonts.subheading, body: kit.fonts.body });
  return true;
}
