// Home section: gradient hero with Search / Cream AI bar, category shortcuts, recent designs, template rows.
import { lazy, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useApp } from '../store/app';
import type { Design } from '../model/types';
import { PRESETS, type DesignPreset } from '../model/presets';
import { Icon, fmtDate } from '../ui/ui';
import { ItemsView, designType } from './Items';
import { ViewToggle, sortDesigns } from './Projects';
import { CustomSizeDialog, RatioBox, presetIcon } from './CreateMenu';
import { createFromPreset, importFiles, openDesign, pickFiles } from './actions';
import { Safe } from './Safe';
import { DesignThumb } from './Thumb';

const TemplateStrip = lazy(() => import('../templates/TemplateStrip'));

interface Cat {
  id: string;
  label: string;
  icon: string;
  color: string;
  presets?: (p: DesignPreset) => boolean;
  direct?: string; // create this preset straight away
  templateCategory?: string;
}

const CATS: Cat[] = [
  { id: 'foryou', label: 'For you', icon: 'Sparkles', color: '#8b3dff' },
  { id: 'presentation', label: 'Presentation', icon: 'Presentation', color: '#ff6105', presets: (p) => p.category === 'presentation', templateCategory: 'presentation' },
  { id: 'social', label: 'Social media', icon: 'Heart', color: '#ff3b4b', presets: (p) => p.group === 'Social media', templateCategory: 'social' },
  { id: 'video', label: 'Video', icon: 'Clapperboard', color: '#e950f7', presets: (p) => p.category === 'video', templateCategory: 'video' },
  { id: 'print', label: 'Print', icon: 'Printer', color: '#8b3dff', presets: (p) => p.category === 'print', templateCategory: 'print' },
  { id: 'doc', label: 'Docs', icon: 'FileText', color: '#13a3b5', direct: 'doc', templateCategory: 'doc' },
  { id: 'whiteboard', label: 'Whiteboard', icon: 'SquareDashed', color: '#0ba84a', direct: 'whiteboard', templateCategory: 'whiteboard' },
  { id: 'website', label: 'Website', icon: 'Globe', color: '#4a53fa', direct: 'website', templateCategory: 'website' },
  { id: 'email', label: 'Email', icon: 'Mail', color: '#ff9e1b', presets: (p) => p.category === 'email', templateCategory: 'email' },
  { id: 'custom', label: 'Custom size', icon: 'Ruler', color: '#0e1318' },
  { id: 'upload', label: 'Upload', icon: 'CloudUpload', color: '#7d2ae8' },
];

function useHomeView(): ['grid' | 'list', (v: 'grid' | 'list') => void] {
  const [v, setV] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('cream-view-home') as any) || 'grid';
    } catch {
      return 'grid';
    }
  });
  return [
    v,
    (n) => {
      setV(n);
      try {
        localStorage.setItem('cream-view-home', n);
      } catch {
        /* ignore */
      }
    },
  ];
}

function Hero() {
  const [mode, setMode] = useState<'search' | 'ai'>('search');
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const designs = useApp(useShallow((s) => Object.values(s.designs)));
  const folders = useApp((s) => s.folders);
  const app = useApp.getState;
  const inputRef = useRef<HTMLInputElement>(null);

  const s = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!s || mode !== 'search') return null;
    return {
      designs: sortDesigns(designs.filter((d) => !d.trashedAt && d.title.toLowerCase().includes(s)), 'activity').slice(0, 5),
      folders: folders.filter((f) => !f.trashedAt && f.name.toLowerCase().includes(s)).slice(0, 3),
      types: PRESETS.filter((p) => (p.name + ' ' + p.group).toLowerCase().includes(s)).slice(0, 4),
    };
  }, [s, mode, designs, folders]);

  const submit = () => {
    const text = q.trim();
    if (mode === 'ai') {
      try {
        sessionStorage.setItem('cream-ai-prompt', text);
      } catch {
        /* ignore */
      }
      app().navigate({ name: 'home', section: 'ai' });
      return;
    }
    if (!text) return;
    try {
      sessionStorage.setItem('cream-template-query', text);
    } catch {
      /* ignore */
    }
    app().navigate({ name: 'home', section: 'templates', param: encodeURIComponent(text) });
  };

  return (
    <div className={'hero' + (mode === 'ai' ? ' ai' : '')} data-testid="hero">
      <h1 className="hero-title">{mode === 'ai' ? 'What will we create together?' : 'What will you design today?'}</h1>
      <div className="hero-modes" role="tablist">
        <button role="tab" className={mode === 'search' ? 'active' : ''} onClick={() => (setMode('search'), inputRef.current?.focus())} data-testid="hero-mode-search">
          <Icon name="Search" size={15} /> Search
        </button>
        <button role="tab" className={mode === 'ai' ? 'active' : ''} onClick={() => (setMode('ai'), inputRef.current?.focus())} data-testid="hero-mode-ai">
          <Icon name="Sparkles" size={15} /> Ask Cream AI
        </button>
      </div>
      <div className="hero-bar-wrap">
        <form
          className="hero-bar"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Icon name={mode === 'ai' ? 'Sparkles' : 'Search'} size={20} className="hero-bar-ico" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setTimeout(() => setFocus(false), 150)}
            placeholder={mode === 'ai' ? 'Describe your idea, and I’ll bring it to life' : 'Search your content or Cream’s'}
            data-testid="hero-input"
          />
          {q && (
            <button type="button" className="icon-btn" onClick={() => setQ('')} aria-label="Clear">
              <Icon name="X" size={16} />
            </button>
          )}
          <button type="submit" className={'hero-go' + (q.trim() || mode === 'ai' ? ' ready' : '')} aria-label="Submit" data-testid="hero-submit">
            <Icon name="ArrowUp" size={18} />
          </button>
        </form>
        {focus && results && (
          <div className="hero-results" data-testid="hero-results">
            {results.designs.length > 0 && <div className="menu-title">Your designs</div>}
            {results.designs.map((d) => (
              <button key={d.id} className="menu-item" onMouseDown={() => openDesign(d.id)}>
                <Icon name="File" size={16} />
                <span className="grow">{d.title}</span>
                <span className="faint">{designType(d)}</span>
              </button>
            ))}
            {results.folders.length > 0 && <div className="menu-title">Folders</div>}
            {results.folders.map((f) => (
              <button key={f.id} className="menu-item" onMouseDown={() => app().navigate({ name: 'home', section: 'folder', param: f.id })}>
                <Icon name="Folder" size={16} />
                <span className="grow">{f.name}</span>
              </button>
            ))}
            {results.types.length > 0 && <div className="menu-title">Create a design</div>}
            {results.types.map((p) => (
              <button key={p.id} className="menu-item" onMouseDown={() => createFromPreset(p.id)}>
                <Icon name={presetIcon(p.icon)} size={16} />
                <span className="grow">{p.name}</span>
                <span className="faint">{p.display}</span>
              </button>
            ))}
            <div className="menu-sep" />
            <button className="menu-item" onMouseDown={submit}>
              <Icon name="LayoutTemplate" size={16} />
              <span className="grow">
                Search templates for “<b>{q.trim()}</b>”
              </span>
              <Icon name="CornerDownLeft" size={14} />
            </button>
          </div>
        )}
      </div>
      {mode === 'ai' && (
        <div className="hero-suggest">
          {['Design a pitch deck for a coffee brand', 'Instagram post for a summer sale', 'Write a poem about autumn', 'Generate an image of a cozy cabin'].map((t) => (
            <button key={t} className="chip on-hero" onClick={() => setQ(t)}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryPicker({ cat, onClose }: { cat: Cat; onClose: () => void }) {
  const list = PRESETS.filter(cat.presets!);
  return (
    <div className="cat-picker" data-testid="cat-picker">
      <div className="section-head">
        <h3>Create a {cat.label.toLowerCase()} design</h3>
        <button onClick={onClose}>Close</button>
      </div>
      <div className="preset-row">
        {list.map((p) => (
          <button key={p.id} className="preset-tile" onClick={() => createFromPreset(p.id)} data-testid={'cat-preset-' + p.id}>
            <span className="preset-art">
              <RatioBox p={p} max={70} />
            </span>
            <span className="preset-name">{p.name}</span>
            <span className="faint">{p.display}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function HomeMain() {
  const [cat, setCat] = useState('foryou');
  const [custom, setCustom] = useState(false);
  const [view, setView] = useHomeView();
  const designs = useApp(useShallow((s) => Object.values(s.designs)));
  const recent = useMemo(() => sortDesigns(designs.filter((d) => !d.trashedAt), 'activity'), [designs]);
  const [showAll, setShowAll] = useState(false);
  const brandTemplates = recent.filter((d) => d.isBrandTemplate);
  const active = CATS.find((c) => c.id === cat)!;

  const clickCat = async (c: Cat) => {
    if (c.id === 'custom') return setCustom(true);
    if (c.id === 'upload') {
      const files = await pickFiles('image/*,video/*,audio/*,.cream,.json', true);
      if (files.length) importFiles(files);
      return;
    }
    if (c.direct) {
      createFromPreset(c.direct);
      return;
    }
    setCat(c.id);
  };

  return (
    <div className="home-content home-dash" data-testid="home-main">
      <Hero />
      <div className="cat-row" data-testid="cat-row">
        {CATS.map((c) => (
          <button key={c.id} className={'cat-btn' + (cat === c.id ? ' active' : '')} onClick={() => clickCat(c)} data-testid={'cat-' + c.id}>
            <span className="cat-ico" style={{ background: c.color }}>
              <Icon name={c.icon} size={22} />
            </span>
            <span className="cat-label">{c.label}</span>
          </button>
        ))}
      </div>

      {active.presets && <CategoryPicker cat={active} onClose={() => setCat('foryou')} />}
      {active.templateCategory && (
        <Safe>
          <TemplateStrip category={active.templateCategory} title={`${active.label} templates`} limit={12} />
        </Safe>
      )}

      <div className="section-head big">
        <h2>Recent designs</h2>
        <div className="row">
          {recent.length > 12 && (
            <button className="btn ghost sm" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show less' : 'See all'}
            </button>
          )}
          <ViewToggle view={view} setView={setView} />
        </div>
      </div>
      <ItemsView
        designs={showAll ? recent : recent.slice(0, 12)}
        view={view}
        empty={
          <div className="empty-recent">
            <Icon name="Palette" size={28} />
            <div>
              <b>You haven’t created any designs yet</b>
              <div className="muted">Pick a design type above, or start from a template below.</div>
            </div>
          </div>
        }
      />

      {brandTemplates.length > 0 && (
        <>
          <div className="section-head big">
            <h2>Brand templates</h2>
          </div>
          <div className="hscroll big">
            {brandTemplates.map((d) => (
              <BrandTemplateCard key={d.id} d={d} />
            ))}
          </div>
        </>
      )}

      <div className="strips">
        <Safe>
          <TemplateStrip title="For you" limit={12} />
        </Safe>
        <Safe>
          <TemplateStrip category="social" title="Social media posts" limit={12} />
        </Safe>
        <Safe>
          <TemplateStrip category="presentation" title="Presentations" limit={12} />
        </Safe>
        <Safe>
          <TemplateStrip category="print" title="Print products" limit={12} />
        </Safe>
      </div>
      {custom && <CustomSizeDialog onClose={() => setCustom(false)} />}
    </div>
  );
}

function BrandTemplateCard({ d }: { d: Design }) {
  return (
    <button
      className="bt-card"
      onClick={() => {
        const copy = useApp.getState().duplicateDesign(d.id);
        if (copy) {
          useApp.getState().patchDesign(copy.id, { isBrandTemplate: false, title: d.title.replace(/\s*\(copy\)$/, '') });
          openDesign(copy.id);
        }
      }}
    >
      <span className="bt-thumb">
        <DesignThumb design={d} pad={8} />
      </span>
      <span className="bt-name">{d.title}</span>
      <span className="faint">
        {designType(d)} · {fmtDate(d.updatedAt)}
      </span>
    </button>
  );
}
