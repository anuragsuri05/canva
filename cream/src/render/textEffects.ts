import type { CSSProperties } from 'react';
import type { Fill, TextEffect, TextEl } from '../model/types';
import { hexToRgba } from './filters';

export const TEXT_EFFECT_DEFAULTS: Record<string, TextEffect> = {
  none: { kind: 'none' },
  shadow: { kind: 'shadow', offset: 50, direction: -45, blur: 20, transparency: 40, color: '#000000' },
  lift: { kind: 'lift', intensity: 50 },
  hollow: { kind: 'hollow', thickness: 50 },
  splice: { kind: 'splice', thickness: 50, offset: 50, direction: -45, color: '#808080' },
  echo: { kind: 'echo', offset: 50, direction: -45, color: '#808080' },
  glitch: { kind: 'glitch', offset: 30, direction: 90, scheme: 'blue-red' },
  neon: { kind: 'neon', intensity: 50 },
  background: { kind: 'background', roundness: 50, spread: 50, transparency: 0, color: '#ffe066' },
  outline: { kind: 'outline', thickness: 40, color: '#000000' },
};

export function fillCss(fill?: Fill): string | undefined {
  if (!fill) return undefined;
  if (fill.kind === 'solid') return fill.color;
  if (fill.kind === 'gradient') {
    const stops = fill.stops.map((s) => `${s.color} ${Math.round(s.pos * 100)}%`).join(', ');
    return fill.type === 'radial' ? `radial-gradient(circle, ${stops})` : `linear-gradient(${fill.angle}deg, ${stops})`;
  }
  return undefined;
}

/** CSS for a text element's effect (Canva text effects panel). */
export function textEffectStyle(el: TextEl): CSSProperties {
  const e = el.effect;
  const fs = el.fontSize;
  const st: CSSProperties = {};
  if (el.gradient && el.gradient.kind === 'gradient') {
    st.backgroundImage = fillCss(el.gradient);
    st.WebkitBackgroundClip = 'text';
    st.backgroundClip = 'text';
    st.color = 'transparent';
    (st as any).WebkitTextFillColor = 'transparent';
  }
  if (!e || e.kind === 'none') return st;
  const dirXY = (offset = 50, direction = -45) => {
    const a = (direction * Math.PI) / 180;
    const d = (offset / 100) * fs * 0.15;
    return [Math.cos(a) * d, -Math.sin(a) * d];
  };
  switch (e.kind) {
    case 'shadow': {
      const [dx, dy] = dirXY(e.offset, e.direction);
      st.textShadow = `${dx.toFixed(1)}px ${dy.toFixed(1)}px ${(((e.blur ?? 20) / 100) * fs * 0.3).toFixed(1)}px ${hexToRgba(e.color ?? '#000', 1 - (e.transparency ?? 40) / 100)}`;
      break;
    }
    case 'lift':
      st.textShadow = `0 ${(fs * 0.05).toFixed(1)}px ${(fs * 0.15 * ((e.intensity ?? 50) / 50)).toFixed(1)}px rgba(0,0,0,${(0.15 + (e.intensity ?? 50) / 250).toFixed(2)})`;
      break;
    case 'hollow':
      st.WebkitTextStroke = `${(((e.thickness ?? 50) / 100) * fs * 0.06 + 0.5).toFixed(2)}px ${el.color}`;
      (st as any).WebkitTextFillColor = 'transparent';
      st.color = 'transparent';
      break;
    case 'splice': {
      const [dx, dy] = dirXY(e.offset, e.direction);
      st.WebkitTextStroke = `${(((e.thickness ?? 50) / 100) * fs * 0.05 + 0.5).toFixed(2)}px ${el.color}`;
      (st as any).WebkitTextFillColor = 'transparent';
      st.textShadow = `${dx.toFixed(1)}px ${dy.toFixed(1)}px 0 ${e.color ?? '#808080'}`;
      break;
    }
    case 'echo': {
      const [dx, dy] = dirXY(e.offset, e.direction);
      const c = e.color ?? el.color;
      st.textShadow = `${dx.toFixed(1)}px ${dy.toFixed(1)}px 0 ${hexToRgba(c, 0.5)}, ${(dx * 2).toFixed(1)}px ${(dy * 2).toFixed(1)}px 0 ${hexToRgba(c, 0.3)}`;
      break;
    }
    case 'glitch': {
      const [dx] = dirXY(e.offset, 0);
      const [a, b] = e.scheme === 'cyan-magenta' ? ['#00ffff', '#ff00ff'] : ['#00b3ff', '#ff3b3b'];
      st.textShadow = `${(-dx).toFixed(1)}px 0 0 ${a}, ${dx.toFixed(1)}px 0 0 ${b}`;
      break;
    }
    case 'neon': {
      const i = (e.intensity ?? 50) / 50;
      st.textShadow = `0 0 ${fs * 0.05 * i}px #fff, 0 0 ${fs * 0.1 * i}px ${el.color}, 0 0 ${fs * 0.2 * i}px ${el.color}, 0 0 ${fs * 0.4 * i}px ${el.color}`;
      st.color = '#fff';
      break;
    }
    case 'outline':
      st.WebkitTextStroke = `${(((e.thickness ?? 40) / 100) * fs * 0.08 + 0.5).toFixed(2)}px ${e.color ?? '#000'}`;
      (st as any).paintOrder = 'stroke fill';
      break;
    case 'background':
      // handled by the renderer as an inline highlight span background
      break;
  }
  return st;
}

/** Inline background highlight for the "Background" effect (applied to the text spans). */
export function textBackgroundStyle(el: TextEl): CSSProperties | null {
  const e = el.effect;
  if (!e || e.kind !== 'background') return null;
  const spread = ((e.spread ?? 50) / 100) * el.fontSize * 0.35;
  return {
    background: hexToRgba(e.color ?? '#ffe066', 1 - (e.transparency ?? 0) / 100),
    borderRadius: ((e.roundness ?? 50) / 100) * el.fontSize * 0.4,
    padding: `${spread * 0.4}px ${spread}px`,
    boxDecorationBreak: 'clone',
    WebkitBoxDecorationBreak: 'clone',
  };
}
