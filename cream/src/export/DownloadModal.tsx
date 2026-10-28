import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Icon, Slider, useOutside } from '../ui/ui';
import { useEditor } from '../store/editor';
import { useApp } from '../store/app';
import type { Design } from '../model/types';
import { PageView } from '../render/PageView';
import { Cancelled, DEFAULT_EXPORT, downloadBlob, pickVideoMime, runExport, type ExportFormat, type ExportOptions } from './exporters';
import './export.css';

interface TypeDef {
  id: ExportFormat;
  label: string;
  desc: string;
  icon: string;
}

export const FILE_TYPES: TypeDef[] = [
  { id: 'png', label: 'PNG', desc: 'High quality image', icon: 'Image' },
  { id: 'jpg', label: 'JPG', desc: 'Small file size image', icon: 'FileImage' },
  { id: 'pdf', label: 'PDF Standard', desc: 'Small file size, multi-page document', icon: 'FileText' },
  { id: 'pdf-print', label: 'PDF Print', desc: 'High quality, multi-page document', icon: 'Printer' },
  { id: 'svg', label: 'SVG', desc: 'Sharp images and illustrations of any size', icon: 'PenTool' },
  { id: 'mp4', label: 'MP4 Video', desc: 'High quality video', icon: 'Film' },
  { id: 'gif', label: 'GIF', desc: 'Short clip, no sound', icon: 'Clapperboard' },
  { id: 'pptx', label: 'PPTX', desc: 'Microsoft PowerPoint document', icon: 'Presentation' },
  { id: 'cream', label: 'Cream file (.cream)', desc: 'Editable design file to share or import', icon: 'FileJson' },
];

const SETTINGS_KEY = 'cream-download-settings';

function suggested(d: Design): ExportFormat {
  if (d.category === 'video' || d.audio?.length || d.pages.some((p) => p.elements.some((e) => e.type === 'video'))) return 'mp4';
  if (d.category === 'presentation' || d.category === 'doc') return 'pdf';
  if (d.category === 'print') return 'pdf-print';
  return 'png';
}

function loadSaved(): Partial<ExportOptions> | null {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
  } catch {
    return null;
  }
}

export function FileTypePicker({ value, onChange, suggestedId }: { value: ExportFormat; onChange: (v: ExportFormat) => void; suggestedId: ExportFormat }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  const cur = FILE_TYPES.find((t) => t.id === value)!;
  return (
    <div className="xp-dd" ref={ref}>
      <button className="xp-dd-btn" onClick={() => setOpen((o) => !o)} data-testid="dl-filetype">
        <span className="xp-ico">
          <Icon name={cur.icon} size={16} />
        </span>
        <span className="grow">
          <span className="xp-opt-title">
            {cur.label} {cur.id === suggestedId && <span className="badge">Suggested</span>}
          </span>
        </span>
        <Icon name="ChevronDown" size={16} />
      </button>
      {open && (
        <div className="xp-dd-list" role="listbox">
          {FILE_TYPES.map((t) => (
            <button
              key={t.id}
              className={'xp-opt' + (t.id === value ? ' active' : '')}
              data-testid={'dl-type-' + t.id}
              onClick={() => {
                onChange(t.id);
                setOpen(false);
              }}
            >
              <span className="xp-ico">
                <Icon name={t.icon} size={16} />
              </span>
              <span className="grow">
                <div className="xp-opt-title">
                  {t.label} {t.id === suggestedId && <span className="badge">Suggested</span>}
                </div>
                <div className="xp-opt-desc">{t.desc}</div>
              </span>
              {t.id === value && <Icon name="Check" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PagePicker({ design, value, onChange, currentId }: { design: Design; value: string[]; onChange: (ids: string[]) => void; currentId: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);
  const all = design.pages.map((p) => p.id);
  const label =
    value.length === all.length ? `All pages (${all.length})` : value.length === 1 && value[0] === currentId ? `Current page (${design.pages.findIndex((p) => p.id === currentId) + 1})` : `${value.length} page${value.length === 1 ? '' : 's'} selected`;
  const scale = 80 / Math.max(design.width, design.height);
  return (
    <div className="xp-dd" ref={ref}>
      <button className="xp-dd-btn" onClick={() => setOpen((o) => !o)} data-testid="dl-pages">
        <span className="grow">{label}</span>
        <Icon name="ChevronDown" size={16} />
      </button>
      {open && (
        <div className="xp-dd-list">
          <label className="xp-check">
            <input type="checkbox" checked={value.length === all.length} onChange={(e) => onChange(e.target.checked ? all : currentId ? [currentId] : [all[0]])} data-testid="dl-pages-all" />
            All pages
          </label>
          {currentId && (
            <button className="btn sm ghost" onClick={() => onChange([currentId])} data-testid="dl-pages-current">
              Current page
            </button>
          )}
          <div className="xp-pages">
            {design.pages.map((p, i) => {
              const on = value.includes(p.id);
              return (
                <label key={p.id} className={'xp-page' + (on ? ' on' : '')}>
                  <input type="checkbox" checked={on} onChange={() => onChange(on ? value.filter((x) => x !== p.id) : all.filter((x) => x === p.id || value.includes(x)))} />
                  <PageView design={design} page={p} scale={scale} ctx={{ mode: 'static', pageIndex: i, pageCount: design.pages.length }} />
                  <span>
                    {i + 1}
                    {p.hidden ? ' (hidden)' : ''}
                  </span>
                </label>
              );
            })}
          </div>
          <button className="btn sm primary block" style={{ marginTop: 8 }} onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}

export default function DownloadModal({ onClose, design: designProp }: { onClose: () => void; design?: Design }) {
  const edDesign = useEditor((s) => s.design);
  const edPageId = useEditor((s) => s.pageId);
  const design = designProp ?? edDesign!;
  const pageId = design.pages.some((p) => p.id === edPageId) ? edPageId : null;
  const sugg = useMemo(() => suggested(design), [design.id]);
  const saved = useMemo(loadSaved, []);
  const [opts, setOpts] = useState<ExportOptions>(() => ({
    ...DEFAULT_EXPORT,
    ...(saved ?? {}),
    format: (saved?.format as ExportFormat) ?? sugg,
    pageIds: design.pages.map((p) => p.id),
  }));
  const [save, setSave] = useState(!!saved);
  const [busy, setBusy] = useState<{ p: number; label: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const set = (p: Partial<ExportOptions>) => setOpts((o) => ({ ...o, ...p }));
  const f = opts.format;
  const W = design.width;
  const H = design.height;
  const multi = opts.pageIds.length > 1;

  useEffect(() => () => abort.current?.abort(), []);

  const go = async () => {
    if (save) {
      const { pageIds, ...rest } = opts;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(rest));
    } else localStorage.removeItem(SETTINGS_KEY);
    const ac = new AbortController();
    abort.current = ac;
    setBusy({ p: 0, label: 'Preparing your design' });
    try {
      const res = await runExport(design, opts, (p, label) => setBusy({ p, label }), ac.signal);
      downloadBlob(res.blob, res.filename);
      useApp.getState().toast(`Downloaded ${res.filename}`, 'success');
      onClose();
    } catch (e) {
      if (e instanceof Cancelled) useApp.getState().toast('Download cancelled');
      else {
        console.error(e);
        useApp.getState().toast('Download failed: ' + (e as Error).message, 'error');
      }
      setBusy(null);
    }
  };

  const sizeRow = (min: number, max: number, step: number, value: number, key: 'scale' | 'gifScale') => (
    <div className="field">
      <label>Size ×</label>
      <Slider value={value} min={min} max={max} step={step} onChange={(v) => set({ [key]: v } as any)} testId={'dl-size'} />
      <div className="row faint">
        <span>
          {Math.round(W * value)} × {Math.round(H * value)} px
        </span>
        <span className="grow" />
        {key === 'scale' && (
          <>
            <span>Width</span>
            <input
              className="input sm"
              style={{ width: 80 }}
              type="number"
              value={Math.round(W * value)}
              data-testid="dl-width"
              onChange={(e) => {
                const px = Number(e.target.value);
                if (px > 0) set({ scale: Math.max(0.1, Math.min(8, px / W)) });
              }}
            />
            <span>px</span>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Modal title="Download" onClose={onClose} testId="download-modal">
      <div className="xp-modal">
        <div className="field">
          <label>File type</label>
          <FileTypePicker value={f} onChange={(format) => set({ format })} suggestedId={sugg} />
        </div>

        {(f === 'png' || f === 'jpg') && sizeRow(0.5, 3, 0.125, opts.scale, 'scale')}
        {f === 'jpg' && (
          <div className="field">
            <label>Quality</label>
            <Slider value={opts.quality} min={1} max={100} onChange={(quality) => set({ quality })} testId="dl-quality" />
          </div>
        )}
        {f === 'png' && (
          <>
            <label className="xp-check">
              <input type="checkbox" checked={opts.transparent} onChange={(e) => set({ transparent: e.target.checked })} data-testid="dl-transparent" />
              <Icon name="Crown" size={14} style={{ color: '#f5a623' }} /> Transparent background
            </label>
            <label className="xp-check">
              <input type="checkbox" checked={opts.compress} onChange={(e) => set({ compress: e.target.checked })} data-testid="dl-compress" />
              <Icon name="Crown" size={14} style={{ color: '#f5a623' }} /> Compress file (lower quality)
            </label>
          </>
        )}
        {(f === 'png' || f === 'jpg') && !multi && (
          <label className="xp-check">
            <input type="checkbox" checked={!!opts.limitKb} onChange={(e) => set({ limitKb: e.target.checked ? 500 : undefined })} data-testid="dl-limit" />
            Limit file size
            {opts.limitKb ? (
              <>
                <input className="input sm" type="number" style={{ width: 90 }} value={opts.limitKb} onChange={(e) => set({ limitKb: Math.max(10, Number(e.target.value) || 10) })} /> KB
              </>
            ) : null}
          </label>
        )}

        {f === 'pdf' && (
          <>
            <label className="xp-check">
              <input type="checkbox" checked={opts.flatten} onChange={(e) => set({ flatten: e.target.checked })} />
              Flatten PDF
            </label>
            <label className="xp-check">
              <input type="checkbox" checked={opts.compress} onChange={(e) => set({ compress: e.target.checked })} />
              <Icon name="Crown" size={14} style={{ color: '#f5a623' }} /> Compress PDF
            </label>
            <div className="xp-note">Pages are embedded as high-resolution images. Unflattened PDFs also get a searchable text layer and clickable links.</div>
          </>
        )}
        {f === 'pdf-print' && (
          <>
            <label className="xp-check">
              <input type="checkbox" checked={opts.cropMarks} onChange={(e) => set({ cropMarks: e.target.checked })} data-testid="dl-cropmarks" />
              Crop marks and bleed
            </label>
            <label className="xp-check">
              <input type="checkbox" checked readOnly />
              Flatten PDF
            </label>
            <div className="field" style={{ marginTop: 8 }}>
              <label>Color profile</label>
              <select className="select" value={opts.colorProfile} onChange={(e) => set({ colorProfile: e.target.value as 'rgb' | 'cmyk' })}>
                <option value="rgb">RGB (best for digital use)</option>
                <option value="cmyk">CMYK (best for professional printing)</option>
              </select>
            </div>
            <div className="xp-note">
              Rendered at 300 DPI.{opts.cropMarks ? ' Adds 0.125 in bleed plus crop marks around each page.' : ''}
              {opts.colorProfile === 'cmyk' ? ' Browsers can only produce RGB output, so the file is exported in RGB — your print shop will convert it to CMYK.' : ''}
            </div>
          </>
        )}
        {f === 'svg' && (
          <>
            {sizeRow(0.5, 3, 0.125, opts.scale, 'scale')}
            <label className="xp-check">
              <input type="checkbox" checked={opts.transparent} onChange={(e) => set({ transparent: e.target.checked })} />
              Transparent background
            </label>
            {multi && <div className="xp-note">Each page is saved as a separate SVG file in a .zip.</div>}
          </>
        )}
        {f === 'mp4' && (
          <>
            <div className="field">
              <label>Quality</label>
              <select className="select" value={opts.videoQuality} onChange={(e) => set({ videoQuality: e.target.value as ExportOptions['videoQuality'] })} data-testid="dl-video-quality">
                <option value="480p">480p</option>
                <option value="720p">720p (HD)</option>
                <option value="1080p">1080p (Full HD) — Suggested</option>
                <option value="4k">4K (Ultra HD)</option>
              </select>
            </div>
            <div className="xp-note">
              Plays each page for its duration with page transitions and audio. Recorded in real time (
              {design.pages.filter((p) => opts.pageIds.includes(p.id)).reduce((s, p) => s + (p.duration || 5), 0).toFixed(1)}s). Format: {pickVideoMime().ext.toUpperCase()}
              {pickVideoMime().ext === 'webm' ? ' (this browser cannot record MP4)' : ''}.
            </div>
          </>
        )}
        {f === 'gif' && sizeRow(0.2, 1, 0.05, opts.gifScale, 'gifScale')}
        {f === 'pptx' && <div className="xp-note">Text stays editable in PowerPoint. Animations aren't included; graphics, charts and effects are converted to images. Speaker notes are kept.</div>}
        {f === 'cream' && <div className="xp-note">A complete, editable copy of this design (with uploads embedded). Open it from Cream to import.</div>}

        {f !== 'cream' && (
          <div className="field" style={{ marginTop: 12 }}>
            <label>Select pages</label>
            <PagePicker design={design} value={opts.pageIds} onChange={(pageIds) => set({ pageIds })} currentId={pageId} />
          </div>
        )}

        <label className="xp-check">
          <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} data-testid="dl-save-settings" />
          Save download settings
        </label>

        {busy ? (
          <div data-testid="dl-progress">
            <div className="xp-progress">
              <div style={{ width: `${Math.round(busy.p * 100)}%` }} />
            </div>
            <div className="row">
              <span className="faint grow">{busy.label}…</span>
              <button className="btn sm" onClick={() => abort.current?.abort()} data-testid="dl-cancel">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="btn primary block lg" style={{ marginTop: 10 }} onClick={go} disabled={f !== 'cream' && !opts.pageIds.length} data-testid="dl-download">
            Download
          </button>
        )}
      </div>
    </Modal>
  );
}
