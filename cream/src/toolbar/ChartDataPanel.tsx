import { useState } from 'react';
import type { Draft } from 'immer';
import type { ChartEl } from '../model/types';
import { useEditor, useSelected } from '../store/editor';
import { useApp } from '../store/app';
import { CHART_COLORS } from '../model/defaults';
import { Icon, Toggle } from '../ui/ui';
import { ColorSwatch, Section, TSlider } from './common';
import { CHART_TYPES } from './ContextToolbar';
import './toolbar.css';

/** Parse CSV / TSV (first row = header: label column + series names). */
export function parseTable(text: string): string[][] {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim().length);
  if (!lines.length) return [];
  const delim = lines[0].includes('\t') ? '\t' : lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  return lines.map((line) => {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = !q;
      } else if (ch === delim && !q) {
        out.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    out.push(cur.trim());
    return out;
  });
}

const num = (s: string) => {
  const n = parseFloat(String(s).replace(/[^0-9.\-eE]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export default function ChartDataPanel() {
  const el = useSelected().find((e): e is ChartEl => e.type === 'chart');
  const [paste, setPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  if (!el) return <div className="empty">Select a chart to edit its data.</div>;

  const upd = (fn: (c: Draft<ChartEl>) => void, coalesce?: string) => useEditor.getState().updateEl(el.id, (e) => fn(e as Draft<ChartEl>), coalesce ? { coalesce } : undefined);
  const opt = <K extends keyof ChartEl['options']>(k: K, v: ChartEl['options'][K], c?: string) => upd((e) => void (e.options[k] = v as any), c);

  const loadRows = (rows: string[][]) => {
    if (rows.length < 2 || rows[0].length < 2) {
      useApp.getState().toast('Paste a table with a header row and at least one data row', 'error');
      return;
    }
    const names = rows[0].slice(1);
    upd((e) => {
      e.labels = rows.slice(1).map((r) => r[0] ?? '');
      e.series = names.map((n, i) => ({ name: n || `Series ${i + 1}`, values: rows.slice(1).map((r) => num(r[i + 1] ?? '0')), color: e.series[i]?.color ?? CHART_COLORS[i % CHART_COLORS.length] }));
    });
    useApp.getState().toast(`Imported ${rows.length - 1} rows × ${names.length} series`, 'success');
  };
  const importFile = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.csv,.tsv,.txt,text/csv,text/tab-separated-values';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (f) loadRows(parseTable(await f.text()));
    };
    inp.click();
  };
  const isProgress = el.chartType.startsWith('progress') || el.chartType === 'number';
  const stop = (e: React.KeyboardEvent) => e.stopPropagation();

  return (
    <div data-testid="chart-data-panel">
      <Section title="Chart type">
        <div className="ct-tiles four">
          {CHART_TYPES.map((c) => (
            <button key={c.id} className={'ct-tile' + (el.chartType === c.id ? ' active' : '')} onClick={() => upd((e) => void (e.chartType = c.id))} data-testid={`chart-switch-${c.id}`} title={c.label}>
              <span className="ct-tile-box" style={{ aspectRatio: '1.2' }}>
                <Icon name={c.icon} size={22} />
              </span>
              <span className="lbl">{c.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Data"
        right={
          <span className="row" style={{ gap: 4 }}>
            <button className="btn sm ghost" onClick={() => setPaste(!paste)} data-testid="chart-paste-toggle" title="Paste CSV / TSV / spreadsheet cells">
              <Icon name="ClipboardPaste" size={14} />
            </button>
            <button className="btn sm ghost" onClick={importFile} data-testid="chart-import" title="Import CSV / TSV file">
              <Icon name="Upload" size={14} />
            </button>
          </span>
        }
      >
        {paste && (
          <div className="ct-settings" style={{ marginTop: 0 }}>
            <textarea
              className="textarea"
              rows={5}
              placeholder={'Label,Series 1,Series 2\nJan,10,7\nFeb,14,9'}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              onKeyDown={stop}
              data-testid="chart-paste-text"
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <button
              className="btn primary sm block"
              style={{ marginTop: 6 }}
              onClick={() => {
                loadRows(parseTable(pasteText));
                setPaste(false);
                setPasteText('');
              }}
              data-testid="chart-paste-apply"
            >
              Use this data
            </button>
          </div>
        )}
        <div className="ct-data" data-testid="chart-grid">
          <table>
            <thead>
              <tr>
                <th className="rowx" />
                <th>
                  <input value="" placeholder="Label" readOnly tabIndex={-1} />
                </th>
                {el.series.map((s, si) => (
                  <th key={si}>
                    <div className="row" style={{ gap: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 4, background: s.color, marginLeft: 6, flex: 'none' }} />
                      <input value={s.name} onChange={(e) => upd((c) => void (c.series[si].name = e.target.value), `sname-${si}`)} onKeyDown={stop} data-testid={`series-name-${si}`} />
                      {el.series.length > 1 && (
                        <button title="Delete series" onClick={() => upd((c) => void c.series.splice(si, 1))} data-testid={`series-del-${si}`}>
                          <Icon name="X" size={12} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {el.labels.map((l, ri) => (
                <tr key={ri}>
                  <td className="rowx">
                    {el.labels.length > 1 && (
                      <button
                        title="Delete row"
                        onClick={() =>
                          upd((c) => {
                            c.labels.splice(ri, 1);
                            c.series.forEach((s) => s.values.splice(ri, 1));
                          })
                        }
                        data-testid={`row-del-${ri}`}
                      >
                        <Icon name="X" size={12} />
                      </button>
                    )}
                  </td>
                  <td>
                    <input value={l} onChange={(e) => upd((c) => void (c.labels[ri] = e.target.value), `label-${ri}`)} onKeyDown={stop} data-testid={`label-${ri}`} />
                  </td>
                  {el.series.map((s, si) => (
                    <td key={si}>
                      <input
                        value={String(s.values[ri] ?? '')}
                        inputMode="decimal"
                        onChange={(e) => upd((c) => void (c.series[si].values[ri] = num(e.target.value)), `val-${si}-${ri}`)}
                        onKeyDown={stop}
                        data-testid={`value-${si}-${ri}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button
            className="btn sm grow"
            onClick={() =>
              upd((c) => {
                c.labels.push(`Item ${c.labels.length + 1}`);
                c.series.forEach((s) => s.values.push(0));
              })
            }
            data-testid="chart-add-row"
          >
            <Icon name="Plus" size={14} /> Add row
          </button>
          <button
            className="btn sm grow"
            onClick={() =>
              upd((c) =>
                void c.series.push({ name: `Series ${c.series.length + 1}`, values: c.labels.map(() => 0), color: CHART_COLORS[c.series.length % CHART_COLORS.length] }),
              )
            }
            data-testid="chart-add-series"
          >
            <Icon name="Plus" size={14} /> Add series
          </button>
        </div>
      </Section>

      <Section title="Colors">
        {el.series.map((s, i) => (
          <div key={i} className="row" style={{ marginBottom: 6 }}>
            <ColorSwatch value={s.color} onChange={(c) => upd((e) => void (e.series[i].color = c), `scolor-${i}`)} testId={`series-color-${i}`} />
            <span className="grow">{s.name}</span>
          </div>
        ))}
        <div className="row" style={{ marginBottom: 6 }}>
          <ColorSwatch value={el.options.textColor} onChange={(c) => opt('textColor', c, 'tc')} testId="chart-text-color" />
          <span className="grow">Text</span>
          <ColorSwatch value={el.options.gridColor} onChange={(c) => opt('gridColor', c, 'gc')} />
          <span>Grid</span>
        </div>
      </Section>

      <Section title="Settings">
        <Toggle label="Legend" on={el.options.legend} onChange={(v) => opt('legend', v)} testId="chart-legend" />
        <Toggle label="Labels" on={el.options.labels} onChange={(v) => opt('labels', v)} testId="chart-labels" />
        <Toggle label="Grid lines" on={el.options.grid} onChange={(v) => opt('grid', v)} testId="chart-grid-lines" />
        <Toggle label="Show values" on={el.options.values} onChange={(v) => opt('values', v)} testId="chart-values" />
        {['line', 'area', 'radar', 'scatter'].includes(el.chartType) && (
          <>
            <Toggle label="Smooth lines" on={el.options.smooth} onChange={(v) => opt('smooth', v)} testId="chart-smooth" />
            <Toggle label="Points" on={el.options.points} onChange={(v) => opt('points', v)} testId="chart-points" />
            <TSlider label="Line weight" value={el.options.lineWeight} min={1} max={12} onChange={(v) => opt('lineWeight', v, 'lw')} />
          </>
        )}
        {['bar', 'column', 'stacked-column', 'funnel'].includes(el.chartType) && (
          <>
            <TSlider label="Spacing" value={el.options.spacing} min={0} max={100} onChange={(v) => opt('spacing', v, 'sp')} testId="chart-spacing" />
            <TSlider label="Corner rounding" value={el.options.rounding} min={0} max={30} onChange={(v) => opt('rounding', v, 'rd')} />
          </>
        )}
        {isProgress && (
          <div className="row" style={{ marginBottom: 8 }}>
            <label className="ct-num grow">
              <span>Max</span>
              <input value={el.options.max ?? ''} onChange={(e) => opt('max', e.target.value === '' ? undefined : num(e.target.value), 'max')} onKeyDown={stop} data-testid="chart-max" />
            </label>
            <label className="ct-num grow">
              <span>Suffix</span>
              <input value={el.options.suffix ?? ''} onChange={(e) => opt('suffix', e.target.value, 'suffix')} onKeyDown={stop} data-testid="chart-suffix" />
            </label>
          </div>
        )}
        <TSlider label="Font size" value={el.options.fontSize} min={8} max={48} onChange={(v) => opt('fontSize', v, 'cfs')} testId="chart-font-size" />
        <button className="btn sm block" onClick={() => useEditor.setState({ right: 'font' })} style={{ fontFamily: `'${el.options.fontFamily}'` }}>
          <Icon name="Type" size={14} /> {el.options.fontFamily}
        </button>
      </Section>
    </div>
  );
}

