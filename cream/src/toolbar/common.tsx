// Shared building blocks for the toolbar + panels: colour picker, gradient editor, swatch popover, txn slider.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Fill, GradientStop } from '../model/types';
import { Floating, Icon, Slider } from '../ui/ui';
import { startDrag } from './local';
import { DEFAULT_COLORS, fillCssOf, hexToRgb, hsvToRgb, normHex, rgbToHex, rgbToHsv } from './colors';
import './toolbar.css';

/* ---------- Slider that groups a drag into one undo step ---------- */
export function TSlider(props: {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  testId?: string;
}) {
  return (
    <div onPointerDownCapture={(e) => (e.target as HTMLElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type === 'range' && startDrag()}>
      <Slider {...props} value={Number.isFinite(props.value) ? props.value : 0} />
    </div>
  );
}

/* ---------- Saturation/value + hue + alpha colour picker ---------- */
export function ColorPicker({ value, onChange, alpha = true, compact }: { value: string; onChange: (hex: string) => void; alpha?: boolean; compact?: boolean }) {
  const rgb = hexToRgb(value || '#000000');
  const hsv0 = rgbToHsv(rgb.r, rgb.g, rgb.b);
  // keep hue stable when saturation/value hit 0
  const [hue, setHue] = useState(hsv0.h);
  const lastHex = useRef(value);
  useEffect(() => {
    if (value !== lastHex.current) {
      lastHex.current = value;
      const h = rgbToHsv(hexToRgb(value).r, hexToRgb(value).g, hexToRgb(value).b);
      if (h.s > 0 && h.v > 0) setHue(h.h);
    }
  }, [value]);
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  const svRef = useRef<HTMLDivElement>(null);
  const emit = (h: number, s: number, v: number, a = rgb.a) => {
    const c = hsvToRgb(h, s, v);
    const out = rgbToHex(c.r, c.g, c.b, a);
    lastHex.current = out;
    onChange(out);
  };
  const dragSV = (e: React.PointerEvent) => {
    startDrag();
    const el = svRef.current!;
    const move = (ev: PointerEvent | React.PointerEvent) => {
      const r = el.getBoundingClientRect();
      const s = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      const v = Math.max(0, Math.min(1, 1 - (ev.clientY - r.top) / r.height));
      emit(hue, s, v);
    };
    move(e);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const eyedrop = async () => {
    const ED = (window as any).EyeDropper;
    if (!ED) return;
    try {
      const r = await new ED().open();
      if (r?.sRGBHex) onChange(normHex(r.sRGBHex) ?? r.sRGBHex);
    } catch {
      /* cancelled */
    }
  };
  const hasEye = typeof window !== 'undefined' && 'EyeDropper' in window;
  return (
    <div className="ct-picker" data-testid="color-picker">
      <div
        ref={svRef}
        className="ct-sv"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue},100%,50%))`, height: compact ? 120 : 160 }}
        onPointerDown={dragSV}
        data-testid="color-sv"
      >
        <div className="ct-sv-dot" style={{ left: `${hsv0.s * 100}%`, top: `${(1 - hsv0.v) * 100}%`, background: value }} />
      </div>
      <div onPointerDownCapture={() => startDrag()}>
        <input
          type="range"
          className="ct-hue"
          min={0}
          max={360}
          value={Math.round(hue)}
          aria-label="Hue"
          data-testid="color-hue"
          onChange={(e) => {
            const h = Number(e.target.value);
            setHue(h);
            emit(h, hsv0.s || 1, hsv0.v || 1);
          }}
        />
        {alpha && (
          <div className="ct-alpha-wrap checker">
            <input
              type="range"
              className="ct-alpha"
              min={0}
              max={100}
              value={Math.round(rgb.a * 100)}
              aria-label="Transparency"
              style={{ background: `linear-gradient(to right, transparent, ${rgbToHex(rgb.r, rgb.g, rgb.b)})` }}
              onChange={(e) => onChange(rgbToHex(rgb.r, rgb.g, rgb.b, Number(e.target.value) / 100))}
            />
          </div>
        )}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <span className="ct-chip-swatch" style={{ background: value }} />
        <input
          className="input sm grow"
          value={hex}
          data-testid="color-hex"
          onChange={(e) => setHex(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              const n = normHex(hex);
              if (n) onChange(n);
            }
          }}
          onBlur={() => {
            const n = normHex(hex);
            if (n && n !== value) onChange(n);
          }}
        />
        {hasEye && (
          <button className="icon-btn" title="Pick a colour from the screen" onClick={eyedrop} data-testid="color-eyedropper">
            <Icon name="Pipette" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Gradient editor ---------- */
export function GradientEditor({ value, onChange }: { value: Extract<Fill, { kind: 'gradient' }>; onChange: (f: Fill) => void }) {
  const [active, setActive] = useState(0);
  const stops = value.stops;
  const idx = Math.min(active, stops.length - 1);
  const setStops = (s: GradientStop[]) => onChange({ ...value, stops: s });
  return (
    <div className="ct-grad" data-testid="gradient-editor">
      <div className="row" style={{ marginBottom: 8 }}>
        <div className="seg">
          {(['linear', 'radial'] as const).map((t) => (
            <button key={t} className={value.type === t ? 'active' : ''} onClick={() => onChange({ ...value, type: t })} data-testid={`grad-${t}`}>
              {t === 'linear' ? 'Linear' : 'Radial'}
            </button>
          ))}
        </div>
        <span className="grow" />
        {stops.length < 4 && (
          <button
            className="btn sm"
            onClick={() => {
              const pos = stops.length === 2 ? 0.5 : (stops[stops.length - 2].pos + stops[stops.length - 1].pos) / 2;
              const ns = [...stops, { color: stops[idx].color, pos }].sort((a, b) => a.pos - b.pos);
              setStops(ns);
              setActive(ns.findIndex((s) => s.pos === pos));
            }}
            data-testid="grad-add-stop"
          >
            <Icon name="Plus" size={14} /> Stop
          </button>
        )}
      </div>
      <div className="ct-grad-bar" style={{ background: `linear-gradient(90deg, ${stops.map((s) => `${s.color} ${s.pos * 100}%`).join(',')})` }}>
        {stops.map((s, i) => (
          <button
            key={i}
            className={'ct-grad-stop' + (i === idx ? ' active' : '')}
            style={{ left: `${s.pos * 100}%`, background: s.color }}
            onClick={() => setActive(i)}
            title={`Stop ${i + 1}`}
          />
        ))}
      </div>
      {value.type === 'linear' && <TSlider label="Angle" value={value.angle} min={0} max={360} onChange={(a) => onChange({ ...value, angle: a })} />}
      <TSlider
        label={`Stop ${idx + 1} position`}
        value={Math.round(stops[idx].pos * 100)}
        min={0}
        max={100}
        onChange={(p) => setStops(stops.map((s, i) => (i === idx ? { ...s, pos: p / 100 } : s)))}
      />
      <ColorPicker compact value={stops[idx].color} onChange={(c) => setStops(stops.map((s, i) => (i === idx ? { ...s, color: c } : s)))} />
      {stops.length > 2 && (
        <button className="btn sm ghost" style={{ marginTop: 6 }} onClick={() => setStops(stops.filter((_, i) => i !== idx))}>
          <Icon name="Trash2" size={14} /> Remove stop
        </button>
      )}
    </div>
  );
}

/* ---------- Compact swatch button with popover picker ---------- */
export function ColorSwatch({ value, onChange, title, testId, size = 28, alpha = true }: { value: string; onChange: (c: string) => void; title?: string; testId?: string; size?: number; alpha?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={ref}
        className="ct-swatch-btn checker"
        style={{ width: size, height: size }}
        title={title ?? value}
        data-testid={testId}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={{ background: value }} />
      </button>
      {open && (
        <Floating anchor={ref.current} onClose={() => setOpen(false)} width={260} ignoreRef={ref}>
          <div className="ct-mini-swatches">
            {DEFAULT_COLORS.map((c) => (
              <button key={c} className={'swatch' + (c === value ? ' active' : '')} style={{ background: c }} onClick={() => onChange(c)} title={c} />
            ))}
          </div>
          <ColorPicker compact value={value} onChange={onChange} alpha={alpha} />
        </Floating>
      )}
    </>
  );
}

export function FillSwatch({ fill, size = 24 }: { fill?: Fill | null; size?: number }) {
  return (
    <span className="ct-fill-sw checker" style={{ width: size, height: size }}>
      <span style={{ background: fillCssOf(fill) }} />
    </span>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="ct-section">
      <div className="ct-section-head">
        <span>{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Stops the editor deselect / text blur when clicking toolbar chrome. */
export const keepFocus = (e: React.MouseEvent) => {
  const t = e.target as HTMLElement;
  if (t.closest('input, textarea, select')) return;
  e.preventDefault();
};
