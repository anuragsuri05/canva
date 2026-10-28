import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/app';
import { ensureFont } from '../assets/fonts';
import { FONT_SETS, PALETTES, type FontSet } from './themes';
import { applyBrandKit, applyFontSet, applyPalette } from './styling';
import './templates.css';

function FontSetButton({ fs }: { fs: FontSet }) {
  useEffect(() => {
    ensureFont(fs.heading.family, fs.heading.weight);
    ensureFont(fs.body.family, fs.body.weight);
  }, [fs]);
  return (
    <button className="tpl-fontset" data-testid={`fontset-${fs.id}`} onClick={() => applyFontSet(fs)} title={fs.name}>
      <div className="h" style={{ fontFamily: `'${fs.heading.family}'`, fontWeight: fs.heading.weight }}>
        {fs.heading.family}
      </div>
      <div className="s" style={{ fontFamily: `'${fs.subheading.family}'`, fontWeight: fs.subheading.weight }}>
        {fs.subheading.family} subheading
      </div>
      <div className="b" style={{ fontFamily: `'${fs.body.family}'` }}>
        {fs.body.family} body text
      </div>
    </button>
  );
}

export default function StylesPanel() {
  const kit = useApp((s) => s.brandKits[0]);
  const clicks = useRef<Record<string, number>>({});
  const [last, setLast] = useState<string | null>(null);
  const [fonts, setFonts] = useState(8);
  const onPalette = (id: string, colors: string[]) => {
    const n = last === id ? (clicks.current[id] ?? 0) + 1 : 0;
    clicks.current[id] = n;
    setLast(id);
    applyPalette(colors, n);
  };
  const kitColors = kit?.palettes.flatMap((p) => p.colors).slice(0, 8) ?? [];
  return (
    <div className="tpl-panel" data-testid="styles-panel">
      {kit && (
        <div className="tpl-brand">
          <div style={{ fontWeight: 600, fontSize: 13 }}>{kit.name}</div>
          <div className="sw">
            {kitColors.map((c, i) => (
              <span key={i} style={{ background: c }} />
            ))}
          </div>
          <button className="btn block" data-testid="apply-brand-kit" onClick={() => applyBrandKit(kit) || useApp.getState().toast('Brand kit has no styles yet')}>
            Apply brand kit
          </button>
        </div>
      )}
      <div className="section-head">
        <h3>Color palettes</h3>
      </div>
      <div className="faint" style={{ fontSize: 12, marginTop: -6 }}>
        Click to apply, click again to shuffle.
      </div>
      <div className="tpl-palettes">
        {PALETTES.map((p) => (
          <button key={p.id} className="tpl-palette" data-testid={`palette-${p.id}`} onClick={() => onPalette(p.id, p.colors)} title={p.name}>
            <div className="bar">
              {p.colors.map((c, i) => (
                <span key={i} style={{ background: c }} />
              ))}
            </div>
            <div className="nm">{p.name}</div>
          </button>
        ))}
      </div>
      <div className="section-head">
        <h3>Font sets</h3>
      </div>
      {FONT_SETS.slice(0, fonts).map((fs) => (
        <FontSetButton key={fs.id} fs={fs} />
      ))}
      {fonts < FONT_SETS.length && (
        <button className="btn ghost block" onClick={() => setFonts(FONT_SETS.length)}>
          Show more font sets
        </button>
      )}
    </div>
  );
}
