import { memo, type CSSProperties } from 'react';
import type { Design, Fill, Page } from '../model/types';
import { ElementView, RenderContext, type RenderCtx } from './Elements';
import { fillCss } from './textEffects';
import { useSrc } from '../store/blobs';
import { cssFilter, mergeFilters, overlayStyles } from './filters';
import { animStyle } from './animation';

export function backgroundCss(fill: Fill): CSSProperties {
  if (fill.kind === 'solid') return { background: fill.color };
  if (fill.kind === 'gradient') return { background: fillCss(fill) };
  return {};
}

function BackgroundImage({ page }: { page: Page }) {
  const src = useSrc(page.backgroundImage?.src ?? (page.background.kind === 'image' ? page.background.src : undefined));
  if (!src) return null;
  const f = mergeFilters(page.backgroundImage?.filters);
  const tile = page.background.kind === 'image' && page.background.fit === 'tile';
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("${src}")`,
          backgroundSize: tile ? 'auto' : page.background.kind === 'image' && page.background.fit === 'contain' ? 'contain' : 'cover',
          backgroundRepeat: tile ? 'repeat' : 'no-repeat',
          backgroundPosition: 'center',
          filter: cssFilter(f) || undefined,
          opacity: page.background.kind === 'image' ? page.background.opacity ?? 1 : 1,
        }}
      />
      {overlayStyles(f).map((s, i) => (
        <div key={i} style={{ position: 'absolute', inset: 0, ...s }} />
      ))}
    </>
  );
}

export interface PageViewProps {
  design: Pick<Design, 'width' | 'height'>;
  page: Page;
  scale: number;
  ctx: RenderCtx;
  animate?: boolean; // play entrance animations
  animKey?: string | number; // change to replay
  exit?: boolean;
  style?: CSSProperties;
  className?: string;
  overflowVisible?: boolean;
}

/** Renders one page at `scale`. The inner coordinate system is always design px. */
export const PageView = memo(function PageView({ design, page, scale, ctx, animate, animKey, exit, style, className, overflowVisible }: PageViewProps) {
  const h = page.height ?? design.height;
  return (
    <RenderContext.Provider value={ctx}>
      <div className={className} style={{ width: design.width * scale, height: h * scale, position: 'relative', overflow: overflowVisible ? 'visible' : 'hidden', ...style }}>
        <div
          key={animKey}
          className="cream-page"
          data-page-id={page.id}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: design.width,
            height: h,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
            ...backgroundCss(page.background),
            overflow: overflowVisible ? 'visible' : 'hidden',
          }}
        >
          <BackgroundImage page={page} />
          {page.elements.map((el, i) =>
            el.hidden && ctx.mode !== 'edit' ? null : (
              <ElementView key={el.id} el={el} animation={animate ? animStyle(el, i, page.pageAnim, { exit }) : undefined} />
            ),
          )}
        </div>
      </div>
    </RenderContext.Provider>
  );
});
