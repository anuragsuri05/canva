import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon, LoadMore, useDebounced } from '../ui/ui';
import { TEMPLATE_CATEGORIES } from './catalog';
import { searchTemplates, type SearchOpts, type TemplateMeta } from './meta';
import { THEMES } from './themes';
import { TOPICS } from './content';
import { Masonry, TemplateCard, thumbHeight } from './ui/Thumb';
import PreviewModal, { getFavorites } from './ui/PreviewModal';
import './templates.css';

const STYLES = [...new Set(THEMES.flatMap((t) => t.styles))].sort();
const COLORS = ['white', 'black', 'gray', 'beige', 'brown', 'red', 'pink', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple'];
const PAGE = 30;

type Filters = Pick<SearchOpts, 'category' | 'style' | 'theme' | 'feature' | 'topic' | 'color' | 'price'>;

function Select({ label, value, options, onChange, testId }: { label: string; value?: string; options: [string, string][]; onChange: (v?: string) => void; testId?: string }) {
  return (
    <select className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} data-testid={testId} aria-label={label}>
      <option value="">{label}</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export default function TemplatesPage({ query: initialQuery }: { query?: string } = {}) {
  const [q, setQ] = useState(initialQuery ?? '');
  const dq = useDebounced(q, 250);
  const [f, setF] = useState<Filters>({});
  const [favOnly, setFavOnly] = useState(false);
  const [pages, setPages] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => setQ(initialQuery ?? ''), [initialQuery]);
  useEffect(() => setPages(1), [dq, f, favOnly]);
  const res = useMemo(() => {
    if (favOnly) {
      const favs = new Set(getFavorites());
      const all = searchTemplates({ ...f, query: dq, pageSize: 100000 }).items.filter((m) => favs.has(m.id));
      return { items: all.slice(0, pages * PAGE), total: all.length };
    }
    return searchTemplates({ ...f, query: dq, page: 0, pageSize: pages * PAGE });
  }, [dq, f, pages, favOnly]);
  const more = useCallback(() => setPages((p) => (p * PAGE < res.total ? p + 1 : p)), [res.total]);
  const set = (k: keyof Filters) => (v?: string) => setF((o) => ({ ...o, [k]: v }));
  const anyFilter = Object.values(f).some(Boolean) || !!dq || favOnly;
  return (
    <div className="tpl-page" data-testid="templates-page">
      <div className="tpl-hero">
        <h1>What will you design today?</h1>
        <div className="search">
          <Icon name="Search" size={18} />
          <input data-testid="templates-search" placeholder="Search thousands of templates" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && (
            <button className="icon-btn" aria-label="Clear search" onClick={() => setQ('')}>
              <Icon name="X" size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="tpl-cats">
        {TEMPLATE_CATEGORIES.map((c) => (
          <button key={c.id} className={'tpl-cat' + (f.category === c.id ? ' active' : '')} data-testid={`template-category-${c.id}`} onClick={() => set('category')(f.category === c.id ? undefined : c.id)}>
            <span className="ic" style={{ background: c.color }}>
              <Icon name={c.icon} size={22} />
            </span>
            {c.label}
          </button>
        ))}
      </div>
      <div className="tpl-filters">
        <Select label="Category" value={f.category} onChange={set('category')} options={TEMPLATE_CATEGORIES.map((c) => [c.id, c.label])} testId="filter-category" />
        <Select label="Style" value={f.style} onChange={set('style')} options={STYLES.map((s) => [s, s[0].toUpperCase() + s.slice(1)])} testId="filter-style" />
        <Select label="Theme" value={f.theme} onChange={set('theme')} options={THEMES.map((t) => [t.id, t.name])} testId="filter-theme" />
        <Select label="Feature" value={f.feature} onChange={set('feature')} options={[['animated', 'Animated'], ['multi-page', 'Multi-page']]} testId="filter-feature" />
        <Select label="Topic" value={f.topic} onChange={set('topic')} options={TOPICS.map((t) => [t.id, t.label])} testId="filter-topic" />
        <Select label="Color" value={f.color} onChange={set('color')} options={COLORS.map((c) => [c, c[0].toUpperCase() + c.slice(1)])} testId="filter-color" />
        <Select label="Price" value={f.price} onChange={set('price')} options={[['free', 'Free'], ['pro', 'Pro']]} testId="filter-price" />
        <button className={'chip' + (favOnly ? ' active' : '')} onClick={() => setFavOnly(!favOnly)} data-testid="filter-favorites">
          <Icon name="Star" size={14} /> Starred
        </button>
        {anyFilter && (
          <button
            className="btn ghost sm"
            onClick={() => {
              setF({});
              setQ('');
              setFavOnly(false);
            }}
          >
            Clear all
          </button>
        )}
        <span className="tpl-count" data-testid="templates-count">
          {res.total.toLocaleString()} templates
        </span>
      </div>
      {res.total === 0 ? (
        <div className="empty">No templates match. Try a different search or clear filters.</div>
      ) : (
        <Masonry<TemplateMeta>
          items={res.items}
          minCol={200}
          gap={14}
          keyOf={(m) => m.id}
          heightOf={(m, w) => thumbHeight(m, w)}
          render={(m, w) => <TemplateCard meta={m} width={w} onClick={() => setPreview(m.id)} />}
        />
      )}
      {res.items.length < res.total && <LoadMore onVisible={more} />}
      {preview && <PreviewModal id={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
