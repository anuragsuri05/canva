import { useEffect, useRef, useState } from 'react';
import type { Design } from '../model/types';
import { PageView } from '../render/PageView';
import { Icon } from '../ui/ui';

/** Live, lazily rendered thumbnail of a design's first page, fitted to its box. */
export function DesignThumb({ design, pad = 12, pageIndex = 0 }: { design: Design; pad?: number; pageIndex?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setVisible(true), { rootMargin: '300px' });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);
  const page = design.pages[pageIndex] ?? design.pages[0];
  const ph = page?.height ?? design.height;
  const scale = box ? Math.min((box.w - pad * 2) / design.width, (box.h - pad * 2) / ph) : 0;
  return (
    <div ref={ref} className="thumb-fit">
      {page && visible && scale > 0 ? (
        <div className="thumb-page" style={{ width: design.width * scale, height: ph * scale }}>
          <PageView design={design} page={page} scale={scale} ctx={{ mode: 'static', pageIndex: 0, pageCount: design.pages.length }} />
        </div>
      ) : (
        !page && <Icon name="File" size={28} />
      )}
    </div>
  );
}
