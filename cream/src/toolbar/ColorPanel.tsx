import { useEffect, useMemo, useState } from 'react';
import type { Fill } from '../model/types';
import { useCurrentPage, useEditor, useSelected } from '../store/editor';
import { useApp } from '../store/app';
import { Icon, Toggle } from '../ui/ui';
import { ColorPicker, GradientEditor, Section } from './common';
import {
  DEFAULT_COLORS,
  DEFAULT_GRADIENTS,
  allowsGradient,
  applyTarget,
  countColorOnPage,
  documentColors,
  fillCssOf,
  fillKey,
  normHex,
  readTarget,
  samplePalette,
  sameColor,
  solid,
  targetTitle,
} from './colors';
import './toolbar.css';

export default function ColorPanel() {
  const target = useEditor((s) => s.colorTarget);
  const design = useEditor((s) => s.design);
  const page = useCurrentPage();
  const sel = useSelected();
  const kits = useApp((s) => s.brandKits);
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState(false);
  const [changeAll, setChangeAll] = useState(false);

  // Re-evaluated every render (design changes re-render us).
  const current = readTarget(target);
  const curColor = current?.kind === 'solid' ? current.color : current?.kind === 'gradient' ? current.stops[0].color : undefined;
  const docColors = useMemo(() => documentColors(design), [design]);
  const gradOk = allowsGradient(target) && !(target?.kind === 'text' && sel[0] && sel[0].type !== 'text') && !(target?.kind === 'fill' && sel[0] && sel[0].type !== 'shape');

  // Photo colours from images on the page.
  const imgSrcs = useMemo(() => {
    const out: string[] = [];
    if (page?.backgroundImage) out.push(page.backgroundImage.src);
    page?.elements.forEach((e) => {
      if (e.type === 'image') out.push(e.src);
      if (e.type === 'frame' && e.media.src && e.media.kind !== 'video') out.push(e.media.src);
    });
    return out.slice(0, 4);
  }, [page]);
  const [photo, setPhoto] = useState<{ src: string; colors: string[] }[]>([]);
  useEffect(() => {
    let alive = true;
    Promise.all(imgSrcs.map(async (src) => ({ src, colors: await samplePalette(src, 6) }))).then((r) => alive && setPhoto(r.filter((x) => x.colors.length)));
    return () => {
      alive = false;
    };
  }, [imgSrcs.join('|')]);

  if (!target) {
    return <div className="empty">Select an element or the page, then choose a colour.</div>;
  }
  const notApplicable = target.kind !== 'page-bg' && !sel.length;
  if (notApplicable) return <div className="empty">Select an element to change its colour.</div>;

  const apply = (f: Fill, coalesce?: string) => applyTarget(target, f, { changeAll, coalesce });
  const pick = (c: string) => apply(solid(c));
  const isActive = (c: string) => current?.kind === 'solid' && sameColor(current.color, c);
  const useCount = curColor ? countColorOnPage(curColor) : 0;

  const q = query.trim();
  const qHex = q ? normHex(q) : null;
  const filterC = (list: string[]) => (q && !qHex ? list.filter((c) => c.includes(q.toLowerCase().replace('#', ''))) : list);

  const swatch = (c: string, i: number, prefix: string) => (
    <button
      key={prefix + i + c}
      className={'swatch' + (isActive(c) ? ' active' : '')}
      style={{ background: c }}
      title={c}
      onClick={() => pick(c)}
      data-testid={`${prefix}-${c.replace('#', '')}`}
    />
  );

  return (
    <div data-testid="color-panel">
      <div className="ct-section-head" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>{targetTitle(target)}</span>
        {current && (
          <span className="ct-fill-sw checker" style={{ width: 26, height: 26, borderRadius: 13 }} title={curColor}>
            <span style={{ background: fillCssOf(current) }} />
          </span>
        )}
      </div>
      <div className="search" style={{ marginBottom: 12 }}>
        <Icon name="Search" size={16} />
        <input
          placeholder='Try "blue" or "#00c4cc"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && qHex) pick(qHex);
          }}
          data-testid="color-search"
        />
        {qHex && (
          <button className="swatch" style={{ width: 22, height: 22, background: qHex }} title={`Apply ${qHex}`} onClick={() => pick(qHex)} data-testid="color-search-apply" />
        )}
      </div>

      {page && curColor && useCount > 1 && (
        <div className="ct-settings" style={{ marginTop: 0, padding: '6px 12px' }}>
          <Toggle label={`Change all (${useCount} on this page)`} on={changeAll} onChange={setChangeAll} testId="color-change-all" />
        </div>
      )}

      {custom && (
        <div className="ct-custom" data-testid="custom-color">
          {gradOk && (
            <div className="seg" style={{ marginBottom: 10 }}>
              <button className={current?.kind !== 'gradient' ? 'active' : ''} onClick={() => apply(solid(curColor ?? '#8b3dff'))} data-testid="custom-solid">
                Solid color
              </button>
              <button
                className={current?.kind === 'gradient' ? 'active' : ''}
                data-testid="custom-gradient"
                onClick={() =>
                  current?.kind !== 'gradient' &&
                  apply({
                    kind: 'gradient',
                    type: 'linear',
                    angle: 90,
                    stops: [
                      { color: curColor ?? '#8b3dff', pos: 0 },
                      { color: '#ffffff', pos: 1 },
                    ],
                  })
                }
              >
                Gradient
              </button>
            </div>
          )}
          {current?.kind === 'gradient' && gradOk ? (
            <GradientEditor value={current} onChange={(f) => apply(f, 'grad-edit')} />
          ) : (
            <ColorPicker value={curColor ?? '#000000'} onChange={(c) => apply(solid(c), 'pick')} />
          )}
        </div>
      )}

      <Section title="Document colors">
        <div className="ct-swatch-grid">
          <button className={'swatch add rainbow' + (custom ? ' active' : '')} title="Add a new color" onClick={() => setCustom((v) => !v)} data-testid="color-add" />
          {filterC(docColors).map((c, i) => swatch(c, i, 'doc'))}
        </div>
      </Section>

      {kits.map((k) =>
        k.palettes.some((p) => p.colors.length) ? (
          <Section key={k.id} title={k.name || 'Brand Kit'} right={<Icon name="Crown" size={14} className="crown" />}>
            {k.palettes.map((p) =>
              p.colors.length ? (
                <div key={p.id} style={{ marginBottom: 8 }}>
                  <div className="faint" style={{ marginBottom: 6 }}>{p.name}</div>
                  <div className="ct-swatch-grid">{filterC(p.colors).map((c, i) => swatch(c, i, 'brand'))}</div>
                </div>
              ) : null,
            )}
          </Section>
        ) : null,
      )}

      {photo.length > 0 && (
        <Section title="Photo colors">
          {photo.map((p) => (
            <div key={p.src} className="row" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
              <div className="ct-swatch-grid grow" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                {p.colors.map((c, i) => swatch(c, i, 'photo'))}
              </div>
            </div>
          ))}
        </Section>
      )}

      <Section title="Default colors" right={<span className="faint">Solid colors</span>}>
        <div className="ct-swatch-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
          {filterC(DEFAULT_COLORS).map((c, i) => swatch(c, i, 'default'))}
        </div>
      </Section>

      {gradOk && (
        <Section title="Gradient colors">
          <div className="ct-swatch-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            {DEFAULT_GRADIENTS.map((g, i) => (
              <button
                key={i}
                className={'swatch' + (fillKey(current) === fillKey(g) ? ' active' : '')}
                style={{ background: fillCssOf(g) }}
                title="Gradient"
                onClick={() => apply(g)}
                data-testid={`gradient-${i}`}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
