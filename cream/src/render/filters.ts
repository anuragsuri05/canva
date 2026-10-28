import type { CSSProperties } from 'react';
import type { ImageFilters, ImageShadow } from '../model/types';

export const EMPTY_FILTERS: ImageFilters = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  vibrance: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  clarity: 0,
  sharpness: 0,
  vignette: 0,
  blur: 0,
  fade: 0,
};

/** Named filter presets (Canva-style). Values are applied scaled by preset intensity. */
export const FILTER_PRESETS: Record<string, Partial<ImageFilters>> = {
  Epic: { contrast: 30, saturation: 20, shadows: -20, clarity: 30, vignette: 25 },
  Festive: { brightness: 10, saturation: 35, temperature: 20, vibrance: 20 },
  Summer: { brightness: 12, temperature: 35, saturation: 15, fade: 10 },
  Retro: { contrast: -10, saturation: -25, temperature: 25, fade: 35, vignette: 20 },
  Selfie: { brightness: 12, contrast: -5, saturation: 8, blur: 0, highlights: 15 },
  Street: { contrast: 35, saturation: -45, clarity: 25, vignette: 15 },
  Whimsical: { brightness: 15, saturation: 25, tint: 20, fade: 15 },
  Cali: { brightness: 8, temperature: 30, saturation: 25, contrast: 10 },
  Drama: { contrast: 45, saturation: -15, shadows: -30, vignette: 40 },
  Edge: { contrast: 40, saturation: 10, clarity: 40 },
  Nordic: { brightness: 8, saturation: -30, temperature: -30, fade: 15 },
  Solar: { brightness: 15, contrast: 20, temperature: 40, saturation: 30 },
  Bliss: { brightness: 18, saturation: 12, fade: 20, tint: 10 },
  Fresco: { brightness: 5, saturation: -10, temperature: 15, fade: 25 },
  Grayscale: { saturation: -100 },
  Noir: { saturation: -100, contrast: 45, vignette: 35 },
  Vintage: { saturation: -35, temperature: 35, fade: 40, contrast: -10 },
  Cool: { temperature: -40, saturation: 10 },
  Warm: { temperature: 40, saturation: 10 },
  Pop: { saturation: 60, contrast: 20, vibrance: 30 },
  Matte: { contrast: -20, fade: 40 },
  Dream: { brightness: 20, blur: 3, fade: 20, saturation: 10 },
};

export function mergeFilters(filters?: Partial<ImageFilters>, preset?: string, intensity = 50): ImageFilters {
  const f: ImageFilters = { ...EMPTY_FILTERS, ...(filters ?? {}) };
  const p = preset ? FILTER_PRESETS[preset] : undefined;
  if (p) {
    const k = intensity / 50; // 50 = preset as designed
    for (const [key, v] of Object.entries(p)) (f as any)[key] += (v as number) * k;
  }
  return f;
}

/** CSS filter string approximating Canva's adjust sliders. */
export function cssFilter(f: ImageFilters): string {
  const parts: string[] = [];
  const bright = 1 + f.brightness / 100 + f.highlights / 400 + f.whites / 400 + f.shadows / 500;
  if (bright !== 1) parts.push(`brightness(${bright.toFixed(3)})`);
  const contrast = 1 + f.contrast / 100 + f.clarity / 300 - f.fade / 250 + f.blacks / -400;
  if (contrast !== 1) parts.push(`contrast(${Math.max(0, contrast).toFixed(3)})`);
  const sat = 1 + f.saturation / 100 + f.vibrance / 200;
  if (sat !== 1) parts.push(`saturate(${Math.max(0, sat).toFixed(3)})`);
  if (f.temperature > 0) parts.push(`sepia(${(f.temperature / 250).toFixed(3)})`);
  if (f.temperature < 0) parts.push(`hue-rotate(${(f.temperature / 6).toFixed(1)}deg)`);
  if (f.tint) parts.push(`hue-rotate(${(f.tint / 4).toFixed(1)}deg)`);
  if (f.blur > 0) parts.push(`blur(${(f.blur / 8).toFixed(2)}px)`);
  return parts.join(' ');
}

/** Extra overlays (temperature colour wash, fade, vignette) rendered on top of media. */
export function overlayStyles(f: ImageFilters): CSSProperties[] {
  const out: CSSProperties[] = [];
  if (f.temperature < 0) out.push({ background: `rgba(40,120,255,${(-f.temperature / 500).toFixed(3)})`, mixBlendMode: 'soft-light' });
  if (f.fade > 0) out.push({ background: `rgba(255,255,255,${(f.fade / 400).toFixed(3)})` });
  if (f.vignette > 0)
    out.push({ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${(f.vignette / 110).toFixed(3)}) 100%)` });
  return out;
}

export function imageShadowCss(s?: ImageShadow): string | undefined {
  if (!s || s.kind === 'none') return undefined;
  const a = (1 - s.transparency / 100).toFixed(2);
  const col = hexToRgba(s.color, Number(a));
  const ang = (s.direction * Math.PI) / 180;
  const off = s.offset / 4;
  const dx = Math.cos(ang) * off;
  const dy = Math.sin(ang) * off;
  switch (s.kind) {
    case 'glow':
      return `drop-shadow(0 0 ${s.blur / 3 + s.size / 4}px ${col})`;
    case 'drop':
      return `drop-shadow(${dx}px ${dy}px ${s.blur / 4}px ${col})`;
    case 'angled':
      return `drop-shadow(${off}px ${off * 1.4}px ${s.blur / 4}px ${col})`;
    case 'page-lift':
      return `drop-shadow(0 ${off + 6}px ${s.blur / 3 + 6}px ${col})`;
    case 'curved':
      return `drop-shadow(0 ${off + 10}px ${s.blur / 2 + 8}px ${col})`;
    case 'backdrop':
      return `drop-shadow(${dx + 12}px ${dy + 12}px 0px ${col})`;
  }
}

export function hexToRgba(hex: string, a = 1): string {
  if (!hex) return `rgba(0,0,0,${a})`;
  if (hex.startsWith('rgb')) return hex;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
