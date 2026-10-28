import { useMemo, useState } from 'react';
import { Modal, Icon, Spinner } from '../ui/ui';
import { useEditor } from '../store/editor';
import { useApp } from '../store/app';
import { PRESETS, toPx, fromPx, CUSTOM_MIN_PX, CUSTOM_MAX_PX } from '../model/presets';
import type { Design, Unit } from '../model/types';
import { resizedCopy, resizePages, designToDoc } from './resize';
import { uid, cloneElements } from '../model/defaults';
import './export.css';

type Tab = 'resize' | 'translate' | 'doc';

// The AI translate module is owned by another area; load it only if it exists.
const aiModules = import.meta.glob(['../ai/translate.ts', '../ai/languages.ts']);
const FALLBACK_LANGS = [
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['de', 'German'],
  ['it', 'Italian'],
  ['pt', 'Portuguese'],
  ['nl', 'Dutch'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
  ['zh', 'Chinese (Simplified)'],
  ['hi', 'Hindi'],
  ['ar', 'Arabic'],
  ['ru', 'Russian'],
  ['tr', 'Turkish'],
  ['pl', 'Polish'],
  ['sv', 'Swedish'],
  ['id', 'Indonesian'],
];

export default function ResizeModal({ onClose }: { onClose: () => void }) {
  const design = useEditor((s) => s.design) as Design;
  const app = useApp.getState();
  const [tab, setTab] = useState<Tab>('resize');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [custom, setCustom] = useState<{ on: boolean; w: number; h: number; unit: Unit }>({ on: false, w: design.width, h: design.height, unit: 'px' });
  const [step, setStep] = useState<'pick' | 'confirm'>('pick');
  const [lang, setLang] = useState('es');
  const [busy, setBusy] = useState('');

  const groups = useMemo(() => {
    const list = PRESETS.filter((p) => !q || (p.name + ' ' + p.group + ' ' + p.display).toLowerCase().includes(q.toLowerCase()));
    const g = new Map<string, typeof list>();
    for (const p of list) g.set(p.group, [...(g.get(p.group) ?? []), p]);
    return [...g];
  }, [q]);

  const targets = () => {
    const t = sel.map((id) => PRESETS.find((p) => p.id === id)!).map((p) => ({ id: p.id, name: p.name, w: p.width, h: p.height }));
    if (custom.on) {
      const w = Math.round(toPx(custom.w, custom.unit));
      const h = Math.round(toPx(custom.h, custom.unit));
      t.push({ id: 'custom', name: `${custom.w} × ${custom.h} ${custom.unit}`, w, h });
    }
    return t;
  };
  const customValid = !custom.on || (toPx(custom.w, custom.unit) >= CUSTOM_MIN_PX && toPx(custom.w, custom.unit) <= CUSTOM_MAX_PX && toPx(custom.h, custom.unit) >= CUSTOM_MIN_PX && toPx(custom.h, custom.unit) <= CUSTOM_MAX_PX);
  const count = sel.length + (custom.on ? 1 : 0);

  const copyAndResize = () => {
    const made = targets().map((t) => app.addDesign(resizedCopy(design, t.w, t.h, t.id, t.name)));
    app.toast(made.length === 1 ? 'Resized copy created' : `${made.length} resized copies created`, 'success');
    onClose();
    if (made.length === 1) app.navigate({ name: 'editor', id: made[0].id });
  };
  const resizeThis = () => {
    const t = targets()[0];
    if (!t) return;
    const unit = custom.on ? custom.unit : (PRESETS.find((p) => p.id === t.id)?.unit ?? 'px');
    useEditor.getState().update((d) => {
      d.pages = resizePages(design.pages, design.width, design.height, t.w, t.h).map((p, i) => ({ ...p, id: design.pages[i].id })) as any;
      d.width = t.w;
      d.height = t.h;
      d.preset = t.id;
      d.unit = unit;
    });
    useEditor.setState({ pageId: design.pages[0].id, selection: [], fit: true });
    app.toast('Design resized', 'success');
    onClose();
  };

  const translate = async () => {
    const tr = aiModules['../ai/translate.ts'];
    if (!tr) return app.toast('Translation is not available yet', 'error');
    setBusy('Translating…');
    try {
      const mod: any = await tr();
      const copy: Design = { ...structuredClone(design), id: uid(), comments: [], createdAt: Date.now(), updatedAt: Date.now(), openedAt: Date.now(), starred: false };
      copy.pages = copy.pages.map((p) => ({ ...p, id: uid(), elements: cloneElements(p.elements) }));
      const slots: { set: (h: string) => void; html: string }[] = [];
      for (const p of copy.pages)
        for (const e of p.elements) {
          if ((e.type === 'text' || e.type === 'sticky') && e.html.trim()) slots.push({ html: e.html, set: (h) => (e.html = h) });
          else if (e.type === 'shape' && e.html?.trim()) slots.push({ html: e.html, set: (h) => (e.html = h) });
          else if (e.type === 'table') e.cells.forEach((row) => row.forEach((c) => c.html.trim() && slots.push({ html: c.html, set: (h) => (c.html = h) })));
        }
      const out: string[] = await mod.translateHtml(
        slots.map((s) => s.html),
        lang,
      );
      out.forEach((h, i) => slots[i]?.set(h));
      const name = FALLBACK_LANGS.find((l) => l[0] === lang)?.[1] ?? lang;
      copy.title = `${design.title} (${name})`;
      app.addDesign(copy);
      app.toast(`Translated copy created in ${name}`, 'success');
      onClose();
      app.navigate({ name: 'editor', id: copy.id });
    } catch (e) {
      app.toast('Translation failed: ' + (e as Error).message, 'error');
    } finally {
      setBusy('');
    }
  };

  const toDoc = () => {
    const doc = app.addDesign(designToDoc(design));
    app.toast('Doc created from your design', 'success');
    onClose();
    app.navigate({ name: 'editor', id: doc.id });
  };

  return (
    <Modal title="Resize & Magic Switch" onClose={onClose} testId="resize-modal">
      <div className="xp-modal">
        <div className="tabs">
          <button className={'tab' + (tab === 'resize' ? ' active' : '')} onClick={() => setTab('resize')} data-testid="resize-tab-resize">
            <Icon name="Scaling" size={14} /> Resize
          </button>
          <button className={'tab' + (tab === 'translate' ? ' active' : '')} onClick={() => setTab('translate')} data-testid="resize-tab-translate">
            <Icon name="Languages" size={14} /> Translate
          </button>
          <button className={'tab' + (tab === 'doc' ? ' active' : '')} onClick={() => setTab('doc')} data-testid="resize-tab-doc">
            <Icon name="FileText" size={14} /> Transform into Doc
          </button>
        </div>

        {tab === 'resize' && step === 'pick' && (
          <>
            <div className="search" style={{ marginBottom: 10 }}>
              <Icon name="Search" size={16} />
              <input placeholder="Search sizes (e.g. Instagram, A4, poster)" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} data-testid="resize-search" />
            </div>
            <label className="xp-row-item" style={{ border: '1px solid var(--border)', marginBottom: 8 }}>
              <input type="checkbox" checked={custom.on} onChange={(e) => setCustom({ ...custom, on: e.target.checked })} data-testid="resize-custom" />
              <Icon name="Ruler" size={16} />
              <b>Custom size</b>
            </label>
            {custom.on && (
              <div className="row" style={{ marginBottom: 10 }}>
                <input className="input" type="number" style={{ width: 100 }} value={custom.w} onChange={(e) => setCustom({ ...custom, w: Number(e.target.value) })} data-testid="resize-w" aria-label="Width" />
                <span>×</span>
                <input className="input" type="number" style={{ width: 100 }} value={custom.h} onChange={(e) => setCustom({ ...custom, h: Number(e.target.value) })} data-testid="resize-h" aria-label="Height" />
                <select
                  className="select"
                  style={{ width: 80 }}
                  value={custom.unit}
                  onChange={(e) => {
                    const unit = e.target.value as Unit;
                    const conv = (v: number) => Math.round(fromPx(toPx(v, custom.unit), unit) * 100) / 100;
                    setCustom({ ...custom, unit, w: conv(custom.w), h: conv(custom.h) });
                  }}
                >
                  {(['px', 'in', 'mm', 'cm'] as Unit[]).map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
                <button className="icon-btn" title="Swap" onClick={() => setCustom({ ...custom, w: custom.h, h: custom.w })}>
                  <Icon name="ArrowLeftRight" size={16} />
                </button>
              </div>
            )}
            {!customValid && <div className="faint" style={{ color: 'var(--danger)' }}>Sizes must be between {CUSTOM_MIN_PX} and {CUSTOM_MAX_PX} px.</div>}
            <div className="xp-list">
              {groups.map(([g, list]) => (
                <div key={g}>
                  <div className="faint" style={{ padding: '6px 8px 2px', fontWeight: 600 }}>
                    {g}
                  </div>
                  {list.map((p) => (
                    <label key={p.id} className="xp-row-item" data-testid={'resize-preset-' + p.id}>
                      <input type="checkbox" checked={sel.includes(p.id)} onChange={(e) => setSel(e.target.checked ? [...sel, p.id] : sel.filter((x) => x !== p.id))} />
                      <Icon name={p.icon} size={16} />
                      <span className="grow">{p.name}</span>
                      <span className="faint">{p.display}</span>
                    </label>
                  ))}
                </div>
              ))}
              {!groups.length && <div className="empty">No sizes match “{q}”.</div>}
            </div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <span className="faint">
                Current: {design.width} × {design.height} px{count ? ` · ${count} selected` : ''}
              </span>
              <button className="btn primary" disabled={!count || !customValid} onClick={() => setStep('confirm')} data-testid="resize-continue">
                Continue
              </button>
            </div>
          </>
        )}

        {tab === 'resize' && step === 'confirm' && (
          <>
            <button className="btn ghost sm" onClick={() => setStep('pick')} style={{ marginBottom: 8 }}>
              <Icon name="ChevronLeft" size={16} /> Back
            </button>
            <div className="xp-list" style={{ marginBottom: 12 }}>
              {targets().map((t) => (
                <div key={t.id} className="xp-row-item">
                  <Icon name="Check" size={16} />
                  <span className="grow">{t.name}</span>
                  <span className="faint">
                    {t.w} × {t.h} px
                  </span>
                </div>
              ))}
            </div>
            <button className="btn primary block lg" onClick={copyAndResize} data-testid="resize-copy">
              <Icon name="Copy" size={16} /> Copy &amp; resize{count > 1 ? ` (${count} designs)` : ''}
            </button>
            <button className="btn block lg" style={{ marginTop: 8 }} onClick={resizeThis} disabled={count !== 1} data-testid="resize-this" title={count > 1 ? 'Select one size to resize this design' : undefined}>
              <Icon name="Scaling" size={16} /> Resize this design
            </button>
            <div className="faint" style={{ marginTop: 8 }}>
              Elements are repositioned to fit the new size and scaled evenly so text stays readable. Full-page backgrounds are stretched to cover.
            </div>
          </>
        )}

        {tab === 'translate' && (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Create a translated copy of this design. All text, including tables and shapes, is translated.
            </p>
            <div className="field">
              <label>Translate to</label>
              <select className="select" value={lang} onChange={(e) => setLang(e.target.value)} data-testid="resize-lang">
                {FALLBACK_LANGS.map(([c, n]) => (
                  <option key={c} value={c}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn primary block lg" onClick={translate} disabled={!!busy} data-testid="resize-translate">
              {busy ? (
                <>
                  <Spinner /> {busy}
                </>
              ) : (
                'Translate a copy'
              )}
            </button>
          </>
        )}

        {tab === 'doc' && (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Turn this design into a Doc. Each page becomes a section with its headings, text and notes.
            </p>
            <div className="xp-note">
              {design.pages.length} page{design.pages.length === 1 ? '' : 's'} → 1 Doc
            </div>
            <button className="btn primary block lg" onClick={toDoc} data-testid="resize-to-doc">
              <Icon name="FileText" size={16} /> Transform into Doc
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
