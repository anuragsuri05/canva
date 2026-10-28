import { useMemo, useState } from 'react';
import { useApp } from '../store/app';
import { searchTemplates } from './meta';
import { TemplateCard } from './ui/Thumb';
import PreviewModal from './ui/PreviewModal';
import './templates.css';

const ROW_H = 150;

export default function TemplateStrip({ category, limit = 12, title }: { category?: string; limit?: number; title?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const items = useMemo(() => searchTemplates({ category, pageSize: limit }).items, [category, limit]);
  if (!items.length) return null;
  return (
    <div className="tpl-strip" data-testid="template-strip">
      <div className="section-head">
        <h3>{title ?? 'Templates'}</h3>
        <button onClick={() => useApp.getState().navigate({ name: 'home', section: 'templates' })}>See all</button>
      </div>
      <div className="row">
        {items.map((m) => {
          const w = Math.round(Math.min(ROW_H * 2.2, Math.max(ROW_H * 0.5, (ROW_H * m.width) / m.height)));
          return <TemplateCard key={m.id} meta={m} width={w} onClick={() => setPreview(m.id)} />;
        })}
      </div>
      {preview && <PreviewModal id={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
