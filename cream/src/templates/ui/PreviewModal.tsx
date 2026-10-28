import { useEffect, useMemo, useState } from 'react';
import { Icon, Modal } from '../../ui/ui';
import { useApp } from '../../store/app';
import { presetById } from '../../model/presets';
import { build } from '../build';
import { metaFor, searchTemplates } from '../meta';
import { instantiateTemplate } from '../apply';
import { PageThumb, TemplateCard } from './Thumb';

const FAV_KEY = 'cream.templates.favorites';

export function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function toggleFavorite(id: string) {
  const f = getFavorites();
  const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next.includes(id);
}

export function customizeTemplate(id: string) {
  const app = useApp.getState();
  const d = app.addDesign(instantiateTemplate(id));
  app.navigate({ name: 'editor', id: d.id });
}

export default function PreviewModal({ id: initial, onClose }: { id: string; onClose: () => void }) {
  const [id, setId] = useState(initial);
  const [pi, setPi] = useState(0);
  const [fav, setFav] = useState(() => getFavorites().includes(initial));
  const meta = metaFor(id);
  const built = useMemo(() => build(id, true), [id]);
  const full = useMemo(() => build(id), [id]);
  useEffect(() => {
    setPi(0);
    setFav(getFavorites().includes(id));
  }, [id]);
  const related = useMemo(() => {
    if (!meta) return [];
    const a = searchTemplates({ kind: meta.kind, topic: meta.topic, exclude: id, pageSize: 3 }).items;
    const b = searchTemplates({ kind: meta.kind, theme: meta.theme, exclude: id, pageSize: 3 }).items;
    return [...a, ...b.filter((x) => !a.some((y) => y.id === x.id))].slice(0, 6);
  }, [id, meta]);
  if (!meta || !built) return null;
  const n = built.pages.length;
  const stageW = Math.round(Math.min(470, (420 * meta.width) / meta.height));
  const preset = presetById(meta.preset);
  return (
    <Modal title="Template preview" onClose={onClose} size="wide" testId="template-preview">
      <div className="tpl-preview">
        <div>
          <div className="tpl-stage">
            <PageThumb page={(full ?? built).pages[pi]} w={meta.width} h={meta.height} width={stageW} maxRatio={3} />
            {n > 1 && (
              <>
                <button className="icon-btn nav l" disabled={pi === 0} onClick={() => setPi(pi - 1)} aria-label="Previous page">
                  <Icon name="ChevronLeft" />
                </button>
                <button className="icon-btn nav r" disabled={pi === n - 1} onClick={() => setPi(pi + 1)} aria-label="Next page">
                  <Icon name="ChevronRight" />
                </button>
              </>
            )}
          </div>
          {n > 1 && (
            <div className="tpl-strip-pages">
              {built.pages.map((p, i) => (
                <button key={p.id} className={i === pi ? 'active' : ''} onClick={() => setPi(i)} title={`Page ${i + 1}`}>
                  <PageThumb page={p} w={meta.width} h={meta.height} width={Math.max(40, (60 * meta.width) / meta.height)} maxRatio={1.6} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="tpl-info">
          <h3>{meta.title}</h3>
          <div className="by">by Cream Studio · {preset?.display}</div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary lg grow" data-testid="customize-template" onClick={() => customizeTemplate(id)}>
              Customize this template
            </button>
            <button
              className="icon-btn"
              data-testid="favorite-template"
              aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
              onClick={() => setFav(toggleFavorite(id))}
              style={{ color: fav ? '#f59f00' : undefined }}
            >
              <Icon name="Star" style={{ fill: fav ? '#f59f00' : 'none' }} />
            </button>
          </div>
          <div className="meta">
            <span className="chip">{meta.kindLabel}</span>
            <span className="chip">{meta.topicLabel}</span>
            <span className="chip">{meta.themeName}</span>
            {n > 1 && <span className="chip">{n} pages</span>}
            {meta.animated && <span className="chip">Animated</span>}
            <span className="chip">{meta.pro ? '👑 Pro' : 'Free'}</span>
          </div>
          {related.length > 0 && (
            <>
              <div className="section-head">
                <h3>Related templates</h3>
              </div>
              <div className="tpl-related">
                {related.map((r) => (
                  <TemplateCard key={r.id} meta={r} width={84} showTitle={false} onClick={() => setId(r.id)} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
