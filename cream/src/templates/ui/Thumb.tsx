import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { PageView } from '../../render/PageView';
import type { Page } from '../../model/types';
import { build } from '../build';
import type { TemplateMeta } from '../meta';
import { Icon } from '../../ui/ui';
import '../templates.css';

const CTX = { mode: 'static' as const, pageIndex: 0, pageCount: 1 };

/** Becomes true once the element scrolls near the viewport. */
export function useVisible<T extends HTMLElement>(margin = '300px') {
  const ref = useRef<T>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || vis) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setVis(true), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [vis, margin]);
  return [ref, vis] as const;
}

export const thumbHeight = (m: Pick<TemplateMeta, 'width' | 'height'>, width: number, maxRatio = 2) => Math.round(Math.min((m.height / m.width) * width, width * maxRatio));

/** Renders a built page at a given pixel width. */
export function PageThumb({ page, w, h, width, maxRatio = 2 }: { page: Page; w: number; h: number; width: number; maxRatio?: number }) {
  const scale = width / w;
  const height = Math.round(Math.min(h * scale, width * maxRatio));
  return (
    <div className="tpl-thumb" style={{ width, height }}>
      <PageView design={{ width: w, height: h }} page={page} scale={scale} ctx={CTX} />
    </div>
  );
}

/** Lazy thumbnail of a template page (only built when scrolled into view). */
export function TemplateThumb({ meta, width, pageIndex = 0, maxRatio = 2 }: { meta: TemplateMeta; width: number; pageIndex?: number; maxRatio?: number }) {
  const [ref, vis] = useVisible<HTMLDivElement>();
  const height = thumbHeight(meta, width, maxRatio);
  const built = vis && width > 0 ? build(meta.id, true, pageIndex === 0) : null;
  const page = built?.pages[pageIndex];
  return (
    <div ref={ref} className="tpl-thumb" style={{ width, height, background: meta.swatch[0] }}>
      {page ? (
        <PageView design={{ width: meta.width, height: meta.height }} page={page} scale={width / meta.width} ctx={CTX} />
      ) : (
        <div className="tpl-thumb-ph" style={{ opacity: 0.5 }}>
          <div style={{ background: meta.swatch[1] }} />
          <div style={{ background: meta.swatch[3] }} />
        </div>
      )}
    </div>
  );
}

export function TemplateCard({ meta, width, onClick, showTitle = true }: { meta: TemplateMeta; width: number; onClick: () => void; showTitle?: boolean }) {
  return (
    <button className="tpl-card" data-testid="template-card" data-template-id={meta.id} title={meta.title} onClick={onClick} style={{ width }}>
      <TemplateThumb meta={meta} width={width} />
      <div className="tpl-badges">
        {meta.pages > 1 && <span className="tpl-badge">{meta.pages}</span>}
        {meta.animated && (
          <span className="tpl-badge">
            <Icon name="Play" size={11} />
          </span>
        )}
        <span className="sp" />
        {meta.pro && (
          <span className="tpl-badge pro" title="Pro">
            <Icon name="Crown" size={12} />
          </span>
        )}
      </div>
      {showTitle && <div className="tpl-title">{meta.title}</div>}
    </button>
  );
}

/** JS masonry: distributes items into columns by shortest column. Measures its own width. */
export function Masonry<T>({ items, minCol = 140, gap = 8, heightOf, render, keyOf }: { items: T[]; minCol?: number; gap?: number; heightOf: (it: T, colW: number) => number; render: (it: T, colW: number) => ReactNode; keyOf: (it: T) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const n = Math.max(1, Math.floor((width + gap) / (minCol + gap)));
  const colW = width ? Math.floor((width - gap * (n - 1)) / n) : 0;
  const cols: T[][] = Array.from({ length: n }, () => []);
  const hs = new Array(n).fill(0);
  for (const it of items) {
    const i = hs.indexOf(Math.min(...hs));
    cols[i].push(it);
    hs[i] += heightOf(it, colW) + gap + 20;
  }
  return (
    <div ref={ref} className="tpl-masonry" style={{ gap }}>
      {colW > 0 &&
        cols.map((cl, i) => (
          <div key={i} className="tpl-col" style={{ gap }}>
            {cl.map((it) => (
              <Fragment key={keyOf(it)}>{render(it, colW)}</Fragment>
            ))}
          </div>
        ))}
    </div>
  );
}
