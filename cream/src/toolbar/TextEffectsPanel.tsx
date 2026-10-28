import type { TextEffect, TextEffectKind, TextEl } from '../model/types';
import { useEditor, useSelected } from '../store/editor';
import { TEXT_EFFECT_DEFAULTS, textBackgroundStyle, textEffectStyle } from '../render/textEffects';
import { Icon, Segmented } from '../ui/ui';
import { ColorSwatch, Section, TSlider } from './common';
import './toolbar.css';

const STYLES: { id: TextEffectKind; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'shadow', label: 'Shadow' },
  { id: 'lift', label: 'Lift' },
  { id: 'hollow', label: 'Hollow' },
  { id: 'splice', label: 'Splice' },
  { id: 'echo', label: 'Echo' },
  { id: 'glitch', label: 'Glitch' },
  { id: 'neon', label: 'Neon' },
  { id: 'background', label: 'Background' },
  { id: 'outline', label: 'Outline' },
];

type Ctl = { key: keyof TextEffect; label: string; min?: number; max?: number; kind?: 'color' | 'scheme' };
const CONTROLS: Partial<Record<TextEffectKind, Ctl[]>> = {
  shadow: [
    { key: 'offset', label: 'Offset' },
    { key: 'direction', label: 'Direction', min: -180, max: 180 },
    { key: 'blur', label: 'Blur' },
    { key: 'transparency', label: 'Transparency' },
    { key: 'color', label: 'Color', kind: 'color' },
  ],
  lift: [{ key: 'intensity', label: 'Intensity' }],
  hollow: [{ key: 'thickness', label: 'Thickness' }],
  splice: [
    { key: 'thickness', label: 'Thickness' },
    { key: 'offset', label: 'Offset' },
    { key: 'direction', label: 'Direction', min: -180, max: 180 },
    { key: 'color', label: 'Color', kind: 'color' },
  ],
  echo: [
    { key: 'offset', label: 'Offset' },
    { key: 'direction', label: 'Direction', min: -180, max: 180 },
    { key: 'color', label: 'Color', kind: 'color' },
  ],
  glitch: [
    { key: 'offset', label: 'Offset' },
    { key: 'direction', label: 'Direction', min: -180, max: 180 },
    { key: 'scheme', label: 'Color', kind: 'scheme' },
  ],
  neon: [{ key: 'intensity', label: 'Intensity' }],
  background: [
    { key: 'roundness', label: 'Roundness' },
    { key: 'spread', label: 'Spread' },
    { key: 'transparency', label: 'Transparency' },
    { key: 'color', label: 'Color', kind: 'color' },
  ],
  outline: [
    { key: 'thickness', label: 'Thickness' },
    { key: 'color', label: 'Color', kind: 'color' },
  ],
};

function Preview({ el, kind }: { el: TextEl; kind: TextEffectKind }) {
  const fake: TextEl = { ...el, fontSize: 34, effect: kind === el.effect?.kind ? el.effect : TEXT_EFFECT_DEFAULTS[kind], gradient: el.gradient, color: el.color === '#ffffff' || el.color === '#fff' ? '#1f1f1f' : el.color };
  const st = textEffectStyle(fake);
  const bg = textBackgroundStyle(fake);
  return (
    <span
      style={{
        fontFamily: `'${el.fontFamily}', sans-serif`,
        fontWeight: Math.max(600, el.fontWeight),
        fontSize: 34,
        lineHeight: 1,
        color: fake.color,
        ...st,
        ...(bg ?? {}),
      }}
    >
      Ag
    </span>
  );
}

export default function TextEffectsPanel() {
  const sel = useSelected().filter((e): e is TextEl => e.type === 'text');
  if (!sel.length) return <div className="empty">Select text to add effects.</div>;
  const el = sel[0];
  const kind = el.effect?.kind ?? 'none';
  const fx = el.effect ?? { kind: 'none' };
  const upd = (fn: (e: TextEl) => void, coalesce?: string) =>
    useEditor.getState().updateSelected((e) => {
      if (e.type === 'text') fn(e as TextEl);
    }, coalesce ? { coalesce } : undefined);
  const setFx = (patch: Partial<TextEffect>, coalesce?: string) => upd((e) => void (e.effect = { ...(e.effect ?? TEXT_EFFECT_DEFAULTS[kind]), ...patch } as TextEffect), coalesce);
  const curve = el.curve ?? 0;

  return (
    <div data-testid="text-effects-panel">
      <Section title="Style">
        <div className="ct-tiles">
          {STYLES.map((s) => (
            <button
              key={s.id}
              className={'ct-tile' + (kind === s.id ? ' active' : '')}
              onClick={() => upd((e) => void (e.effect = s.id === 'none' ? undefined : structuredClone(TEXT_EFFECT_DEFAULTS[s.id])))}
              data-testid={`effect-${s.id}`}
            >
              <span className="ct-tile-box" style={{ background: s.id === 'neon' ? '#1d1a26' : 'var(--surface-2)' }}>
                {s.id === 'none' ? <Icon name="Ban" size={26} style={{ color: 'var(--text-3)' }} /> : <Preview el={el} kind={s.id} />}
              </span>
              <span className="lbl">{s.label}</span>
            </button>
          ))}
        </div>
        {CONTROLS[kind] && (
          <div className="ct-settings" data-testid="effect-settings">
            {CONTROLS[kind]!.map((c) =>
              c.kind === 'color' ? (
                <div key={c.key} className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="label">{c.label}</span>
                  <ColorSwatch value={(fx[c.key] as string) ?? '#000000'} onChange={(v) => setFx({ [c.key]: v }, 'fx-color')} testId={`effect-${c.key}`} />
                </div>
              ) : c.kind === 'scheme' ? (
                <div key={c.key} style={{ marginBottom: 8 }}>
                  <div className="label" style={{ marginBottom: 6 }}>{c.label}</div>
                  <Segmented
                    value={fx.scheme ?? 'blue-red'}
                    options={[
                      { value: 'blue-red', label: <span><span style={{ color: '#00b3ff' }}>●</span><span style={{ color: '#ff3b3b' }}>●</span> Blue · Red</span> },
                      { value: 'cyan-magenta', label: <span><span style={{ color: '#00ffff' }}>●</span><span style={{ color: '#ff00ff' }}>●</span> Cyan · Magenta</span> },
                    ]}
                    onChange={(v) => setFx({ scheme: v as TextEffect['scheme'] })}
                  />
                </div>
              ) : (
                <TSlider
                  key={c.key}
                  label={c.label}
                  value={(fx[c.key] as number) ?? (TEXT_EFFECT_DEFAULTS[kind][c.key] as number) ?? 0}
                  min={c.min ?? 0}
                  max={c.max ?? 100}
                  onChange={(v) => setFx({ [c.key]: v }, 'fx-' + c.key)}
                  testId={`effect-${c.key}`}
                />
              ),
            )}
          </div>
        )}
        {el.gradient && kind !== 'none' && !['shadow', 'lift', 'echo'].includes(kind) && (
          <div className="faint" style={{ marginTop: 6 }}>
            <Icon name="Info" size={12} /> Gradient text renders fully with Shadow, Lift, Echo and Curve only.
          </div>
        )}
      </Section>
      <Section title="Shape">
        <div className="ct-tiles">
          <button className={'ct-tile' + (curve === 0 ? ' active' : '')} onClick={() => upd((e) => void (e.curve = 0))} data-testid="shape-none">
            <span className="ct-tile-box">
              <Icon name="Ban" size={26} style={{ color: 'var(--text-3)' }} />
            </span>
            <span className="lbl">None</span>
          </button>
          <button
            className={'ct-tile' + (curve !== 0 ? ' active' : '')}
            onClick={() =>
              upd((e) => {
                if (!e.curve) e.curve = 50;
              })
            }
            data-testid="shape-curve"
          >
            <span className="ct-tile-box">
              <svg width="64" height="40" viewBox="0 0 64 40">
                <path id="ct-curve-prev" d="M6,34 A30,30 0 0 1 58,34" fill="none" />
                <text fontSize="13" fontWeight="700" fill="currentColor">
                  <textPath href="#ct-curve-prev" startOffset="50%" textAnchor="middle">
                    ABCDE
                  </textPath>
                </text>
              </svg>
            </span>
            <span className="lbl">Curve</span>
          </button>
        </div>
        {curve !== 0 && (
          <div className="ct-settings">
            <TSlider label="Curve" value={curve} min={-100} max={100} onChange={(v) => upd((e) => void (e.curve = v === 0 ? 1 : v), 'curve')} testId="curve-slider" />
          </div>
        )}
      </Section>
    </div>
  );
}
