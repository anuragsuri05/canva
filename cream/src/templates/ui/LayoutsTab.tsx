import { useMemo } from 'react';
import { useEditor, useCurrentPage } from '../../store/editor';
import { LAYOUTS, applyLayout, layoutPreview } from '../arrange';
import { PageThumb } from './Thumb';

export default function LayoutsTab() {
  const w = useEditor((s) => s.design?.width ?? 1080);
  const h = useEditor((s) => s.design?.height ?? 1080);
  const page = useCurrentPage();
  const counts = useMemo(() => {
    const els = page?.elements ?? [];
    return {
      texts: els.filter((e) => e.type === 'text').length,
      media: els.filter((e) => e.type === 'image' || e.type === 'frame' || e.type === 'video' || e.type === 'grid').length,
    };
  }, [page]);
  const previews = useMemo(() => LAYOUTS.map((l) => ({ def: l, page: layoutPreview(l, w, h) })), [w, h]);
  const suggested = previews.filter((p) => p.def.images <= counts.media && (counts.media === 0 || p.def.images > 0));
  const others = previews.filter((p) => !suggested.includes(p));
  const disabled = counts.texts + counts.media === 0;
  const grid = (list: typeof previews) => (
    <div className="tpl-layouts">
      {list.map(({ def, page: pg }) => (
        <button key={def.id} className="tpl-layout" data-testid={`layout-${def.id}`} disabled={disabled} onClick={() => applyLayout(def.id)} title={def.name}>
          <PageThumb page={pg} w={w} h={h} width={140} maxRatio={1.8} />
          <div>{def.name}</div>
        </button>
      ))}
    </div>
  );
  return (
    <div className="tpl-panel" data-testid="layouts-tab">
      <div className="faint" style={{ fontSize: 12.5 }}>
        {disabled ? 'Add some text or images to this page, then pick a layout to rearrange them.' : `Rearranges the ${counts.texts} text and ${counts.media} image elements on this page.`}
      </div>
      {suggested.length > 0 && (
        <>
          <div className="section-head">
            <h3>Suggested for this page</h3>
          </div>
          {grid(suggested)}
        </>
      )}
      <div className="section-head">
        <h3>All layouts</h3>
      </div>
      {grid(others.length ? others : previews)}
    </div>
  );
}
