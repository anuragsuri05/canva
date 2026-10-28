// Text tab: Add a text box, Magic Write, Brand Kit text styles, default styles, dynamic text and font combinations.
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { TextEl } from '../model/types';
import { makeText } from '../model/defaults';
import { insertElements, insertText, setDragPayload } from '../editor/dnd';
import { useEditor } from '../store/editor';
import { useApp } from '../store/app';
import { ensureFont } from '../assets/fonts';
import { FONT_COMBOS, comboElements, comboFamilies, type FontCombo } from '../assets/fontCombos';
import { Icon, useDebounced } from '../ui/ui';
import { EmptyBox, ElPreview, PanelSearch, SectionHead } from './common';
import { matches } from './catalog';

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setSeen(true), { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

function insertCombo(c: FontCombo) {
  const d = useEditor.getState().design;
  if (!d) return;
  comboFamilies(c).forEach((f) => ensureFont(f, 400));
  c.lines.forEach((l) => ensureFont(l.family, l.weight ?? 400, !!l.italic));
  insertElements(comboElements(c, d.width * 0.7, d.width / 2, d.height / 2));
  useEditor.setState({ editingId: null });
}

const ComboTile = memo(function ComboTile({ c }: { c: FontCombo }) {
  const [ref, seen] = useInView<HTMLButtonElement>();
  const els = useMemo(() => comboElements(c, 450, 240, 240), [c]);
  useEffect(() => {
    if (seen) c.lines.forEach((l) => ensureFont(l.family, l.weight ?? 400, !!l.italic));
  }, [seen, c]);
  return (
    <button
      ref={ref}
      type="button"
      className="pn-combo"
      title={`${c.name} — ${comboFamilies(c).join(' + ')}`}
      aria-label={`Font combination: ${c.name}`}
      data-testid="font-combo"
      draggable
      onDragStart={(e) => {
        const d = useEditor.getState().design;
        if (!d) return;
        setDragPayload(e, { kind: 'elements', elements: comboElements(c, d.width * 0.7, d.width / 2, d.height / 2) });
      }}
      onClick={() => insertCombo(c)}
    >
      <div className="inner">{seen && <ElPreview els={els} w={480} h={480} size={146} bg="#ffffff" />}</div>
    </button>
  );
});

function dynamicEl(kind: NonNullable<TextEl['dynamic']>) {
  const d = useEditor.getState().design!;
  const size = Math.max(16, Math.round(d.width / 30));
  const w = kind === 'date' ? size * 9 : size * 3;
  const el = makeText(kind === 'date' ? 'Date' : '1', (d.width - w) / 2, d.height - size * 3, w, { fontSize: size, align: 'center' });
  el.dynamic = kind;
  el.name = kind === 'page-number' ? 'Page number' : kind === 'page-count' ? 'Page count' : 'Date';
  return el;
}

function DynamicButton({ kind, label, icon }: { kind: NonNullable<TextEl['dynamic']>; label: string; icon: string }) {
  return (
    <button
      className="pn-app"
      style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}
      data-testid={`dynamic-${kind}`}
      draggable
      onDragStart={(e) => useEditor.getState().design && setDragPayload(e, { kind: 'elements', elements: [dynamicEl(kind)] })}
      onClick={() => useEditor.getState().design && insertText(dynamicEl(kind))}
    >
      <span className="ico" style={{ background: 'var(--surface-3)', color: 'var(--text)', width: 32, height: 32 }}>
        <Icon name={icon} size={16} />
      </span>
      <span className="nm" style={{ fontWeight: 500 }}>
        {label}
      </span>
    </button>
  );
}

export default function TextPanel() {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 200);
  const kit = useApp((s) => s.brandKits[0]);
  const combos = useMemo(() => FONT_COMBOS.filter((c) => matches(dq, c.name, c.tags, comboFamilies(c).join(' '))), [dq]);

  useEffect(() => {
    if (kit) [kit.fonts.heading, kit.fonts.subheading, kit.fonts.body].forEach((f) => ensureFont(f.family, f.weight));
  }, [kit]);

  const brandStyle = (role: 'heading' | 'subheading' | 'body') => {
    const d = useEditor.getState().design;
    if (!d || !kit) return;
    const f = kit.fonts[role];
    const scale = Math.max(0.4, Math.min(d.width, d.height * 1.4) / 1080);
    const size = Math.round(f.size * scale * (role === 'heading' ? 1.4 : role === 'subheading' ? 1.3 : 1.6));
    const text = role === 'heading' ? 'Heading' : role === 'subheading' ? 'Subheading' : 'Body text';
    const w = Math.min(d.width * 0.8, text.length * size * 0.6 + 20);
    const el = makeText(text, (d.width - w) / 2, d.height / 2 - size / 2, w, { fontFamily: f.family, fontSize: size, fontWeight: f.weight, align: 'center', color: kit.palettes[0]?.colors[0] ?? '#1f1f1f' }, role);
    insertText(el);
  };

  return (
    <div className="pn" data-testid="text-panel">
      <div className="pn-sticky">
        <PanelSearch value={q} onChange={setQ} placeholder="Search fonts and combinations" testId="text-search" />
      </div>
      {!dq && (
        <>
          <button className="btn primary block lg" style={{ marginTop: 4 }} onClick={() => insertText('body')} data-testid="add-text-box" title="Add a text box (T)">
            <Icon name="Type" size={18} /> Add a text box
          </button>
          <button className="btn block" style={{ marginTop: 8 }} onClick={() => useEditor.setState({ right: 'magic-write' })} data-testid="open-magic-write">
            <Icon name="Sparkles" size={16} /> Magic Write
          </button>

          {kit && (
            <>
              <SectionHead title={<span className="row" style={{ gap: 6 }}><Icon name="Crown" size={14} className="crown" /> Brand Kit</span>} onSeeAll={() => useEditor.setState({ side: 'brand' })} />
              <div className="row" style={{ gap: 6 }}>
                {(['heading', 'subheading', 'body'] as const).map((r) => (
                  <button key={r} className="pn-textstyle" style={{ marginBottom: 0, flex: 1, textAlign: 'center', fontFamily: `'${kit.fonts[r].family}'`, fontWeight: kit.fonts[r].weight, fontSize: r === 'heading' ? 17 : r === 'subheading' ? 14 : 12.5, padding: '12px 6px' }} onClick={() => brandStyle(r)} data-testid={`brand-text-${r}`} title={`${kit.fonts[r].family} ${kit.fonts[r].size}`}>
                    {r === 'heading' ? 'Heading' : r === 'subheading' ? 'Subheading' : 'Body'}
                  </button>
                ))}
              </div>
            </>
          )}

          <h4>Default text styles</h4>
          {(
            [
              ['heading', 'Add a heading', 26, 800],
              ['subheading', 'Add a subheading', 18, 600],
              ['body', 'Add a little bit of body text', 13, 400],
            ] as const
          ).map(([preset, label, size, weight]) => (
            <button key={preset} className="pn-textstyle" style={{ fontSize: size, fontWeight: weight }} data-testid={`add-${preset}`} draggable onDragStart={(e) => setDragPayload(e, { kind: 'text', preset })} onClick={() => insertText(preset)}>
              {label}
            </button>
          ))}

          <h4>Dynamic text</h4>
          <div className="pn-grid c3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <DynamicButton kind="page-number" label="Page numbers" icon="Hash" />
            <DynamicButton kind="page-count" label="Page count" icon="Files" />
            <DynamicButton kind="date" label="Date" icon="CalendarDays" />
          </div>
        </>
      )}
      <SectionHead title="Font combinations" />
      {combos.length ? (
        <div className="pn-grid c2" data-testid="font-combos">
          {combos.map((c) => (
            <ComboTile key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <EmptyBox>No font combinations match “{dq}”.</EmptyBox>
      )}
    </div>
  );
}
