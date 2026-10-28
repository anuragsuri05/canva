import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon, LoadMore, useDebounced } from '../ui/ui';
import { useApp } from '../store/app';
import { useEditor } from '../store/editor';
import { searchTemplates, metaFor, type TemplateMeta } from './meta';
import { build } from './build';
import { applyTemplateToCurrentDesign } from './apply';
import { Masonry, PageThumb, TemplateCard, thumbHeight } from './ui/Thumb';
import LayoutsTab from './ui/LayoutsTab';
import StylesPanel from './StylesPanel';
import './templates.css';

type Tab = 'templates' | 'layouts' | 'styles';

const CHIPS: [string, string][] = [
  ['', 'All'],
  ['presentation', 'Presentations'],
  ['social', 'Social media'],
  ['video', 'Videos'],
  ['print', 'Print'],
  ['events', 'Invitations'],
  ['doc', 'Docs'],
  ['whiteboard', 'Whiteboards'],
  ['website', 'Websites'],
  ['email', 'Email'],
  ['logo', 'Logos'],
  ['marketing', 'Marketing'],
];

const PAGE = 20;

function useDesignInfo() {
  const preset = useEditor((s) => s.design?.preset ?? '');
  const category = useEditor((s) => s.design?.category ?? '');
  return { preset, category };
}

function TemplateDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const meta = metaFor(id);
  const built = build(id, true);
  if (!meta || !built) return null;
  const n = built.pages.length;
  return (
    <div className="tpl-panel" data-testid="template-detail">
      <button className="tpl-back" onClick={onBack}>
        <Icon name="ChevronLeft" size={16} /> Back
      </button>
      <div className="tpl-detail-title">{meta.title}</div>
      <button className="btn primary block" data-testid="apply-all-pages" onClick={() => applyTemplateToCurrentDesign(id, { allPages: true })}>
        Apply all {n} pages
      </button>
      <div className="faint" style={{ fontSize: 12 }}>
        Or click a page to add just that one.
      </div>
      <div className="tpl-pages">
        {built.pages.map((p, i) => (
          <button key={p.id} className="tpl-page-btn" data-testid="template-page" onClick={() => applyTemplateToCurrentDesign(id, { pageIndex: i })}>
            <PageThumb page={p} w={meta.width} h={meta.height} width={150} maxRatio={1.8} />
            <div>Page {i + 1}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TemplatesTab() {
  const { preset, category } = useDesignInfo();
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 250);
  const [chip, setChip] = useState('');
  const [onlyThis, setOnlyThis] = useState(false);
  const [pages, setPages] = useState(1);
  const [detail, setDetail] = useState<string | null>(null);
  useEffect(() => setPages(1), [dq, chip, onlyThis]);

  const forDesign = useMemo(() => {
    const r = searchTemplates({ preset, pageSize: 6 });
    return r.total ? { ...r, filter: { preset } } : { ...searchTemplates({ category, pageSize: 6 }), filter: { category } };
  }, [preset, category]);

  const res = useMemo(() => {
    const base = onlyThis ? forDesign.filter : chip ? { category: chip } : {};
    return searchTemplates({ ...base, query: dq, pageSize: pages * PAGE });
  }, [dq, chip, pages, onlyThis, forDesign]);
  const more = useCallback(() => setPages((p) => (p * PAGE < res.total ? p + 1 : p)), [res.total]);

  const open = (m: TemplateMeta) => {
    if (m.pages > 1) setDetail(m.id);
    else applyTemplateToCurrentDesign(m.id);
  };
  if (detail) return <TemplateDetail id={detail} onBack={() => setDetail(null)} />;
  const showForDesign = !dq && !chip && !onlyThis && forDesign.items.length > 0;
  const grid = (items: TemplateMeta[]) => (
    <Masonry<TemplateMeta>
      items={items}
      minCol={130}
      keyOf={(m) => m.id}
      heightOf={(m, w) => thumbHeight(m, w)}
      render={(m, w) => <TemplateCard meta={m} width={w} showTitle={false} onClick={() => open(m)} />}
    />
  );
  return (
    <div className="tpl-panel">
      <div className="search">
        <Icon name="Search" size={16} />
        <input data-testid="design-panel-search" placeholder="Search templates" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="tpl-chips">
        {CHIPS.map(([id, label]) => (
          <button key={id || 'all'} className={'chip' + (chip === id && !onlyThis ? ' active' : '')} onClick={() => (setOnlyThis(false), setChip(id))}>
            {label}
          </button>
        ))}
      </div>
      {showForDesign && (
        <>
          <div className="section-head">
            <h3>Templates for this design</h3>
            <button onClick={() => setOnlyThis(true)} data-testid="see-all-for-design">
              See all
            </button>
          </div>
          {grid(forDesign.items.slice(0, 4))}
          <div className="section-head">
            <h3>All results</h3>
          </div>
        </>
      )}
      {onlyThis && (
        <button className="tpl-back" onClick={() => setOnlyThis(false)}>
          <Icon name="ChevronLeft" size={16} /> Templates for this design
        </button>
      )}
      <div className="faint" style={{ fontSize: 12 }}>
        {res.total.toLocaleString()} templates
      </div>
      {res.total === 0 ? <div className="empty">No templates found.</div> : grid(res.items)}
      {res.items.length < res.total && <LoadMore onVisible={more} />}
    </div>
  );
}

export default function DesignPanel() {
  const [tab, setTab] = useState<Tab>('templates');
  useApp((s) => s.ready);
  return (
    <div data-testid="design-panel">
      <div className="tabs">
        {(['templates', 'layouts', 'styles'] as Tab[]).map((t) => (
          <button key={t} className={'tab' + (tab === t ? ' active' : '')} data-testid={`design-tab-${t}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'layouts' && <LayoutsTab />}
      {tab === 'styles' && <StylesPanel />}
    </div>
  );
}
