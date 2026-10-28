import { useMemo, useState } from 'react';
import type { Draft } from 'immer';
import { Icon, Spinner, Toggle } from '../ui/ui';
import { currentPage, useEditor, useCurrentPage } from '../store/editor';
import { useApp } from '../store/app';
import { clonePage, htmlToText } from '../model/defaults';
import type { El, Page, TableEl } from '../model/types';
import { ErrorBox, EngineBadge, useRunner } from './common';
import { useHasKey } from './config';
import { LANGUAGES, isRtl, langName } from './languages';
import { translateHtml, type Tone } from './translate';
import './ai.css';

const TONES: { id: Tone; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'conversational', label: 'Conversational' },
  { id: 'informative', label: 'Informative' },
  { id: 'professional', label: 'Professional' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'inspirational', label: 'Inspirational' },
];

interface Slot {
  elIndex: number;
  cell?: [number, number];
  html: string;
}

function collect(page: Page): Slot[] {
  const out: Slot[] = [];
  page.elements.forEach((e, i) => {
    if (e.locked === 'full' || e.brandLocked) return;
    if ((e.type === 'text' || e.type === 'sticky' || e.type === 'shape') && e.html && htmlToText(e.html).trim() && !(e.type === 'text' && e.dynamic)) out.push({ elIndex: i, html: e.html });
    if (e.type === 'table')
      (e as TableEl).cells.forEach((row, r) => row.forEach((c, k) => c.html && !c.hidden && htmlToText(c.html).trim() && out.push({ elIndex: i, cell: [r, k], html: c.html })));
  });
  return out;
}

export default function TranslatePanel() {
  const page = useCurrentPage();
  const has = useHasKey();
  const [lang, setLang] = useState(() => localStorage.getItem('cream-translate-lang') || 'es');
  const [q, setQ] = useState('');
  const [tone, setTone] = useState<Tone>('original');
  const [shrink, setShrink] = useState(true);
  const [dup, setDup] = useState(true);
  const [mirror, setMirror] = useState(true);
  const [done, setDone] = useState<string | null>(null);
  const r = useRunner();
  const slots = useMemo(() => (page ? collect(page) : []), [page]);
  const chars = slots.reduce((n, s) => n + htmlToText(s.html).length, 0);
  const rtl = isRtl(lang);
  const filtered = LANGUAGES.filter((l) => !q || l.name.toLowerCase().includes(q.toLowerCase()) || l.code.toLowerCase().startsWith(q.toLowerCase()));

  const apply = () =>
    r.run(async (signal) => {
      setDone(null);
      const s = useEditor.getState();
      const src = currentPage(s);
      const d = s.design;
      if (!src || !d) return;
      const list = collect(src);
      if (!list.length) throw new Error('There’s no text on this page to translate.');
      try {
        localStorage.setItem('cream-translate-lang', lang);
      } catch {
        /* ignore */
      }
      const out = await translateHtml(
        list.map((x) => x.html),
        lang,
        { tone: has ? tone : 'original', signal },
      );
      const target = dup ? clonePage(src) : null;
      const W = d.width;
      s.update((dd) => {
        let pg: Draft<Page>;
        if (target) {
          const i = dd.pages.findIndex((p) => p.id === src.id);
          target.title = `${src.title ? src.title + ' · ' : ''}${langName(lang)}`;
          dd.pages.splice(i + 1, 0, target as Draft<Page>);
          pg = dd.pages[i + 1];
        } else pg = dd.pages.find((p) => p.id === src.id)!;
        list.forEach((slot, k) => {
          const el = pg.elements[slot.elIndex] as Draft<El>;
          if (!el) return;
          const before = htmlToText(slot.html).length;
          const after = htmlToText(out[k]).length;
          if (slot.cell && el.type === 'table') {
            el.cells[slot.cell[0]][slot.cell[1]].html = out[k];
            return;
          }
          (el as any).html = out[k];
          if (shrink && after > before * 1.08 && before > 0) {
            const f = Math.max(0.6, Math.sqrt(before / after));
            if ('fontSize' in el && typeof (el as any).fontSize === 'number') (el as any).fontSize = Math.max(6, Math.round((el as any).fontSize * f));
          }
        });
        if (rtl && mirror) {
          for (const el of pg.elements) {
            el.x = W - el.x - el.w;
            if (el.type === 'line') {
              el.x1 = W - el.x1;
              el.x2 = W - el.x2;
            }
            if ((el.type === 'text' || el.type === 'shape') && el.align) el.align = el.align === 'left' ? 'right' : el.align === 'right' ? 'left' : el.align;
          }
        }
      });
      if (target) s.set({ pageId: target.id, selection: [] });
      setDone(`Translated ${list.length} text box${list.length === 1 ? '' : 'es'} into ${langName(lang)}${target ? ' on a new page' : ''}.`);
      useApp.getState().toast(`Translated into ${langName(lang)}`, 'success');
    });

  return (
    <div data-testid="translate-panel">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="faint">Translate all text on this page</div>
        <EngineBadge freeLabel="Free (MyMemory)" />
      </div>
      <div className="field">
        <label>Translate to</label>
        <input className="input" placeholder="Search 100+ languages" value={q} onChange={(e) => setQ(e.target.value)} data-testid="translate-search" />
        <select className="select" size={7} value={lang} onChange={(e) => setLang(e.target.value)} data-testid="translate-lang" style={{ height: 'auto', padding: 4 }}>
          {filtered.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
              {l.rtl ? ' (RTL)' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>
          Tone {!has && <span className="faint">· needs an AI key</span>}
        </label>
        <div className="chips">
          {TONES.map((t) => (
            <button key={t.id} className={'chip' + (tone === t.id ? ' active' : '')} disabled={!has && t.id !== 'original'} style={{ height: 26, fontSize: 12, opacity: !has && t.id !== 'original' ? 0.5 : 1 }} onClick={() => setTone(t.id)} data-testid={`translate-tone-${t.id}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <Toggle on={shrink} onChange={setShrink} label="Reduce font size to fit" testId="translate-shrink" />
      <Toggle on={dup} onChange={setDup} label="Translate into a copy of the page" testId="translate-duplicate" />
      {rtl && <Toggle on={mirror} onChange={setMirror} label="Mirror page layout for right-to-left" testId="translate-mirror" />}
      <div className="faint" style={{ margin: '6px 0 12px' }}>
        {slots.length} text box{slots.length === 1 ? '' : 'es'} · {chars} characters on this page
      </div>
      <button className="btn primary block" disabled={r.busy || !slots.length} onClick={apply} data-testid="translate-apply">
        {r.busy ? <Spinner /> : <Icon name="Languages" size={16} />} {r.busy ? 'Translating…' : `Translate to ${langName(lang)}`}
      </button>
      {r.busy && (
        <button className="btn ghost block" style={{ marginTop: 6 }} onClick={r.stop}>
          Stop
        </button>
      )}
      <ErrorBox error={r.error} onRetry={apply} onClose={() => r.setError(null)} />
      {done && (
        <div className="ai-note" style={{ marginTop: 10 }} data-testid="translate-done">
          <Icon name="CircleCheck" size={14} /> {done}{' '}
          <button className="btn sm ghost" onClick={() => useEditor.getState().undo()}>
            Undo
          </button>
        </div>
      )}
      <div className="faint" style={{ marginTop: 14 }}>
        {has ? 'Uses your AI provider for natural translations with tone.' : 'Free translations by MyMemory (machine translation, daily limit). Add an AI key for tone control and higher quality.'}
      </div>
    </div>
  );
}
