// "Create a design" menu, Custom size dialog, Edit photo and Import file.
import { useMemo, useState } from 'react';
import type { Unit } from '../model/types';
import { CUSTOM_MAX_PX, CUSTOM_MIN_PX, PRESETS, fromPx, toPx, type DesignPreset } from '../model/presets';
import { Floating, Icon, Modal, type Anchor } from '../ui/ui';
import { createCustom, createFromPreset, designFromImageFile, importFiles, pickFiles, recentCustomSizes } from './actions';

const BRAND_ICON: Record<string, string> = { Instagram: 'Camera', Facebook: 'ThumbsUp', Linkedin: 'Briefcase', Twitter: 'AtSign', Youtube: 'SquarePlay' };
export const presetIcon = (icon: string) => BRAND_ICON[icon] ?? icon;

export const CREATE_CATEGORIES: { id: string; label: string; icon: string; filter: (p: DesignPreset) => boolean }[] = [
  { id: 'foryou', label: 'For you', icon: 'Sparkles', filter: (p) => ['presentation', 'doc', 'whiteboard', 'instagram-post', 'video', 'poster', 'logo', 'flyer', 'youtube-thumbnail', 'website', 'resume', 'instagram-story'].includes(p.id) },
  { id: 'doc', label: 'Docs', icon: 'FileText', filter: (p) => p.category === 'doc' || ['a4', 'letter', 'resume'].includes(p.id) },
  { id: 'whiteboard', label: 'Whiteboards', icon: 'SquareDashed', filter: (p) => p.category === 'whiteboard' },
  { id: 'presentation', label: 'Presentations', icon: 'Presentation', filter: (p) => p.category === 'presentation' },
  { id: 'social', label: 'Social media', icon: 'Heart', filter: (p) => p.group === 'Social media' },
  { id: 'video', label: 'Videos', icon: 'Clapperboard', filter: (p) => p.category === 'video' },
  { id: 'print', label: 'Print', icon: 'Printer', filter: (p) => p.category === 'print' },
  { id: 'website', label: 'Websites', icon: 'Globe', filter: (p) => p.category === 'website' },
  { id: 'email', label: 'Email', icon: 'Mail', filter: (p) => p.category === 'email' },
  { id: 'marketing', label: 'Marketing', icon: 'Megaphone', filter: (p) => p.group === 'Marketing' },
];

/** Small aspect-ratio glyph for a preset. */
export function RatioBox({ p, max = 30 }: { p: { width: number; height: number }; max?: number }) {
  const k = max / Math.max(p.width, p.height);
  return <span className="ratio-box" style={{ width: Math.max(6, p.width * k), height: Math.max(6, p.height * k) }} />;
}

export function CreateMenu({ anchor, onClose, folderId = null }: { anchor: Anchor; onClose: () => void; folderId?: string | null }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('foryou');
  const [custom, setCustom] = useState(false);
  const list = useMemo(() => {
    if (q.trim()) {
      const s = q.toLowerCase();
      return PRESETS.filter((p) => (p.name + ' ' + p.group + ' ' + p.category).toLowerCase().includes(s));
    }
    return PRESETS.filter(CREATE_CATEGORIES.find((c) => c.id === cat)!.filter);
  }, [q, cat]);
  const create = (id: string) => {
    onClose();
    createFromPreset(id, { folderId });
  };
  if (custom) return <CustomSizeDialog onClose={onClose} folderId={folderId} />;
  return (
    <Floating anchor={anchor} onClose={onClose} className="popover create-menu" placement="bottom-start" width={680}>
      <div className="search create-search">
        <Icon name="Search" size={16} />
        <input autoFocus placeholder="What would you like to create?" value={q} onChange={(e) => setQ(e.target.value)} data-testid="create-search" />
        {q && (
          <button className="icon-btn" onClick={() => setQ('')} style={{ width: 24, height: 24 }}>
            <Icon name="X" size={14} />
          </button>
        )}
      </div>
      <div className="create-body">
        <div className="create-cats">
          {CREATE_CATEGORIES.map((c) => (
            <button key={c.id} className={'nav-item sm' + (!q && cat === c.id ? ' active' : '')} onClick={() => (setQ(''), setCat(c.id))}>
              <Icon name={c.icon} size={17} />
              {c.label}
            </button>
          ))}
          <div className="menu-sep" />
          <button className="nav-item sm" onClick={() => setCustom(true)} data-testid="custom-size-btn">
            <Icon name="Ruler" size={17} /> Custom size
          </button>
          <button
            className="nav-item sm"
            data-testid="edit-photo-btn"
            onClick={async () => {
              const [f] = await pickFiles('image/*');
              if (f) {
                onClose();
                await designFromImageFile(f);
              }
            }}
          >
            <Icon name="ImagePlus" size={17} /> Edit photo
          </button>
          <button
            className="nav-item sm"
            data-testid="import-file-btn"
            onClick={async () => {
              const files = await pickFiles('image/*,video/*,audio/*,.cream,.json,.ttf,.otf,.woff,.woff2', true);
              if (files.length) {
                onClose();
                await importFiles(files);
              }
            }}
          >
            <Icon name="FileUp" size={17} /> Import file
          </button>
        </div>
        <div className="create-list">
          {list.length === 0 && (
            <div className="empty">
              No design types match “{q}”.
              <div style={{ marginTop: 10 }}>
                <button className="btn sm" onClick={() => setCustom(true)}>
                  Use a custom size
                </button>
              </div>
            </div>
          )}
          {list.map((p) => (
            <button key={p.id} className="create-item" onClick={() => create(p.id)} data-testid={'preset-' + p.id}>
              <span className="create-ico">
                <Icon name={presetIcon(p.icon)} size={18} />
              </span>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="create-name">{p.name}</span>
                <span className="faint">{p.display}</span>
              </span>
              <RatioBox p={p} max={26} />
            </button>
          ))}
        </div>
      </div>
    </Floating>
  );
}

const UNITS: Unit[] = ['px', 'in', 'mm', 'cm'];

export function CustomSizeDialog({ onClose, folderId = null }: { onClose: () => void; folderId?: string | null }) {
  const [unit, setUnit] = useState<Unit>('px');
  const [w, setW] = useState('1080');
  const [h, setH] = useState('1080');
  const [lock, setLock] = useState(false);
  const recent = recentCustomSizes();

  const min = fromPx(CUSTOM_MIN_PX, unit);
  const max = fromPx(CUSTOM_MAX_PX, unit);
  const valid = (s: string) => {
    const n = Number(s);
    if (!s.trim() || !isFinite(n)) return false;
    const px = toPx(n, unit);
    return px >= CUSTOM_MIN_PX - 0.5 && px <= CUSTOM_MAX_PX + 0.5;
  };
  const wOk = valid(w);
  const hOk = valid(h);

  const changeUnit = (u: Unit) => {
    const cw = Number(w);
    const ch = Number(h);
    if (isFinite(cw) && w) setW(String(fromPx(toPx(cw, unit), u)));
    if (isFinite(ch) && h) setH(String(fromPx(toPx(ch, unit), u)));
    setUnit(u);
  };
  const setDim = (which: 'w' | 'h', v: string) => {
    const n = Number(v);
    if (lock && isFinite(n) && n > 0) {
      const ow = Number(w);
      const oh = Number(h);
      if (ow > 0 && oh > 0) {
        const r = which === 'w' ? oh / ow : ow / oh;
        const other = unit === 'px' ? Math.round(n * r) : Math.round(n * r * 100) / 100;
        if (which === 'w') setH(String(other));
        else setW(String(other));
      }
    }
    if (which === 'w') setW(v);
    else setH(v);
  };
  const submit = () => {
    if (!wOk || !hOk) return;
    onClose();
    createCustom(toPx(Number(w), unit), toPx(Number(h), unit), unit, folderId);
  };
  const err = `Must be between ${min} and ${max} ${unit}`;
  return (
    <Modal
      title="Custom size"
      onClose={onClose}
      testId="custom-size-dialog"
      footer={
        <button className="btn primary block lg" disabled={!wOk || !hOk} onClick={submit} data-testid="create-custom">
          Create new design
        </button>
      }
    >
      <div className="custom-grid">
        <div className={'field' + (wOk ? '' : ' invalid')}>
          <label>Width</label>
          <input
            className="input"
            inputMode="decimal"
            value={w}
            onChange={(e) => setDim('w', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            data-testid="custom-size-width"
            aria-invalid={!wOk}
          />
        </div>
        <button className={'icon-btn lock-btn' + (lock ? ' active' : '')} onClick={() => setLock(!lock)} title={lock ? 'Unlock aspect ratio' : 'Lock aspect ratio'} data-testid="custom-size-lock">
          <Icon name={lock ? 'Lock' : 'Unlock'} size={16} />
        </button>
        <div className={'field' + (hOk ? '' : ' invalid')}>
          <label>Height</label>
          <input
            className="input"
            inputMode="decimal"
            value={h}
            onChange={(e) => setDim('h', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            data-testid="custom-size-height"
            aria-invalid={!hOk}
          />
        </div>
        <div className="field">
          <label>Units</label>
          <select className="select" value={unit} onChange={(e) => changeUnit(e.target.value as Unit)} data-testid="custom-size-unit">
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>
      {(!wOk || !hOk) && (
        <div className="field-error" data-testid="custom-size-error">
          <Icon name="CircleAlert" size={14} /> {err}
        </div>
      )}
      {unit !== 'px' && wOk && hOk && (
        <div className="faint" style={{ marginTop: 4 }}>
          {Math.round(toPx(Number(w), unit))} × {Math.round(toPx(Number(h), unit))} px at 96 DPI
        </div>
      )}
      {recent.length > 0 && (
        <>
          <div className="label" style={{ marginTop: 16, marginBottom: 6 }}>
            Recently used
          </div>
          <div className="chips">
            {recent.map((r, i) => (
              <button
                key={i}
                className="chip"
                onClick={() => {
                  const u = (r.unit as Unit) ?? 'px';
                  setUnit(u);
                  setW(String(fromPx(r.w, u)));
                  setH(String(fromPx(r.h, u)));
                }}
              >
                {fromPx(r.w, r.unit as Unit)} × {fromPx(r.h, r.unit as Unit)} {r.unit}
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
