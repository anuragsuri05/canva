// Font loading from Fontsource (2,100+ open-licence fonts, served by jsDelivr).
// API: https://api.fontsource.org/v1/fonts  — CDN: https://cdn.jsdelivr.net/fontsource/fonts/<id>@latest/<subset>-<weight>-<style>.woff2

export interface FontMeta {
  id: string;
  family: string;
  subsets: string[];
  weights: number[];
  styles: string[];
  category: string;
  variable?: boolean;
  type?: string;
  defSubset?: string;
}

// Fonts that ship with the OS / are always available (no network needed).
export const SYSTEM_FONTS = ['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS', 'system-ui'];

// A curated starter list so the picker is useful before the full catalogue loads.
export const POPULAR_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins', 'Lato', 'Playfair Display', 'Oswald', 'Raleway', 'Merriweather',
  'Nunito', 'Bebas Neue', 'DM Sans', 'Rubik', 'Work Sans', 'Lora', 'Space Grotesk', 'Archivo Black', 'Anton', 'Pacifico',
  'Dancing Script', 'Great Vibes', 'Abril Fatface', 'Caveat', 'Lobster', 'Josefin Sans', 'Quicksand', 'Cormorant Garamond', 'Libre Baskerville', 'Fira Sans',
  'Sora', 'Outfit', 'Manrope', 'Plus Jakarta Sans', 'Urbanist', 'Syne', 'Righteous', 'Permanent Marker', 'Shadows Into Light', 'Amatic SC',
  'Alfa Slab One', 'Bitter', 'Crimson Text', 'EB Garamond', 'Fredoka', 'Kanit', 'Barlow', 'Barlow Condensed', 'Teko', 'Zilla Slab',
  'Comfortaa', 'Satisfy', 'Sacramento', 'Monoton', 'Bungee', 'Press Start 2P', 'Black Ops One', 'Cinzel', 'Prata', 'Yeseva One',
  'Space Mono', 'JetBrains Mono', 'IBM Plex Sans', 'IBM Plex Serif', 'Source Serif 4', 'Noto Sans', 'Noto Serif', 'Mulish', 'Karla', 'Cabin',
];

export const fontId = (family: string) =>
  family
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const loaded = new Set<string>();
const loading = new Map<string, Promise<void>>();
let catalogue: FontMeta[] | null = null;
let cataloguePromise: Promise<FontMeta[]> | null = null;

export function loadCatalogue(): Promise<FontMeta[]> {
  if (catalogue) return Promise.resolve(catalogue);
  if (!cataloguePromise) {
    cataloguePromise = fetch('https://api.fontsource.org/v1/fonts')
      .then((r) => r.json())
      .then((list: FontMeta[]) => {
        catalogue = list.filter((f) => f.subsets?.includes('latin') || f.defSubset);
        return catalogue;
      })
      .catch(() => {
        catalogue = POPULAR_FONTS.map((f) => ({ id: fontId(f), family: f, subsets: ['latin'], weights: [400, 700], styles: ['normal'], category: 'sans-serif' }));
        return catalogue;
      });
  }
  return cataloguePromise;
}

export const getCatalogueSync = () => catalogue;

const listeners = new Set<() => void>();
export const onFontsChange = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Ensure a font family is available (loads regular, bold and italics lazily). */
export function ensureFont(family: string, weight = 400, italic = false): Promise<void> {
  if (!family || SYSTEM_FONTS.includes(family)) return Promise.resolve();
  const key = `${family}|${weight}|${italic ? 'i' : 'n'}`;
  if (loaded.has(key)) return Promise.resolve();
  const existing = loading.get(key);
  if (existing) return existing;
  const id = fontId(family);
  const meta = catalogue?.find((f) => f.family === family);
  const subset = meta?.defSubset && !meta.subsets.includes('latin') ? meta.defSubset : 'latin';
  const weights = meta?.weights ?? [400, 700];
  const w = weights.reduce((best, x) => (Math.abs(x - weight) < Math.abs(best - weight) ? x : best), weights[0] ?? 400);
  const style = italic && (meta?.styles ?? ['italic']).includes('italic') ? 'italic' : 'normal';
  const url = `https://cdn.jsdelivr.net/fontsource/fonts/${id}@latest/${subset}-${w}-${style}.woff2`;
  const p = new FontFace(family, `url(${url}) format('woff2')`, { weight: String(weight), style })
    .load()
    .then((face) => {
      (document.fonts as any).add(face);
      loaded.add(key);
      listeners.forEach((l) => l());
    })
    .catch(() => {
      loaded.add(key); // don't retry endlessly
    });
  loading.set(key, p);
  return p;
}

/** Fetch a font's woff2 as a data URL (export embeds fonts so SVG/PNG output matches). */
export async function fontFaceCss(family: string, weight: number, italic: boolean): Promise<string> {
  if (SYSTEM_FONTS.includes(family)) return '';
  const id = fontId(family);
  const meta = catalogue?.find((f) => f.family === family);
  const subset = meta?.defSubset && !meta.subsets.includes('latin') ? meta.defSubset : 'latin';
  const weights = meta?.weights ?? [400, 700];
  const w = weights.reduce((best, x) => (Math.abs(x - weight) < Math.abs(best - weight) ? x : best), weights[0] ?? 400);
  const style = italic ? 'italic' : 'normal';
  const url = `https://cdn.jsdelivr.net/fontsource/fonts/${id}@latest/${subset}-${w}-${style}.woff2`;
  try {
    const blob = await (await fetch(url)).blob();
    const data = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(blob);
    });
    return `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};src:url(${data}) format('woff2');}`;
  } catch {
    return '';
  }
}
