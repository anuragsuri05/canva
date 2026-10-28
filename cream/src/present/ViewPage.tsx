import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/app';
import { Icon, Spinner } from '../ui/ui';
import { PageView } from '../render/PageView';
import { importCream } from '../export/creamFile';
import { recordView } from '../export/shareLinks';
import { useDesignById, visiblePages } from './shared';
import { useViewport } from './Stage';
import type { Design } from '../model/types';
import './present.css';

const DownloadModal = lazy(() => import('../export/DownloadModal'));

export default function ViewPage({ id }: { id: string }) {
  const { design, local, params } = useDesignById(id);
  const vp = useViewport();
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState('');
  const [dl, setDl] = useState(false);
  const [busy, setBusy] = useState(false);
  const template = params.get('template') === '1';
  const embed = params.get('embed') === '1';

  useEffect(() => {
    if (!design) return;
    recordView(design.id);
    const prev = document.title;
    document.title = design.website?.published ? design.website.seoTitle || design.title : `${design.title} – Cream`;
    let meta = document.querySelector('meta[name=description]') as HTMLMetaElement | null;
    if (design.website?.seoDescription) {
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = design.website.seoDescription;
    }
    let icon: HTMLLinkElement | null = null;
    if (design.website?.favicon) {
      icon = document.createElement('link');
      icon.rel = 'icon';
      icon.href = design.website.favicon;
      document.head.appendChild(icon);
    }
    return () => {
      document.title = prev;
      icon?.remove();
    };
  }, [design?.id]);

  if (!design) {
    if (id.startsWith('__')) return <div className="vw-root" />;
    return (
      <div className="vw-root" style={{ display: 'grid', placeItems: 'center' }} data-testid="view-missing">
        <div style={{ textAlign: 'center' }}>
          <Icon name="FileX" size={40} />
          <h2>This design isn't available</h2>
          <p className="muted">The link may be incomplete, or the design was only shared on another device.</p>
          <button className="btn primary" onClick={() => useApp.getState().navigate({ name: 'home', section: 'home' })}>
            Go to Cream
          </button>
        </div>
      </div>
    );
  }

  const site = design.website;
  if (site?.password && !unlocked && !local) {
    return (
      <div className="vw-root" style={{ display: 'grid', placeItems: 'center' }}>
        <form
          className="col"
          style={{ width: 320, background: 'var(--surface)', padding: 24, borderRadius: 16, boxShadow: 'var(--shadow)' }}
          onSubmit={(e) => {
            e.preventDefault();
            if (pw === site.password) setUnlocked(true);
            else useApp.getState().toast('Incorrect password', 'error');
          }}
        >
          <Icon name="Lock" size={28} />
          <h3 style={{ margin: 0 }}>This website is password protected</h3>
          <input className="input" type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} data-testid="view-password" />
          <button className="btn primary">View website</button>
        </form>
      </div>
    );
  }

  if (embed) return <EmbedViewer design={design} routeId={id} />;

  const pages = visiblePages(design);
  const maxW = Math.min(site?.published ? vp.w : 1100, vp.w - (site?.published ? 0 : 32));
  const scale = maxW / design.width;
  const copy = async () => {
    setBusy(true);
    try {
      const d = await importCream(design, { title: template ? design.title : design.title + ' (copy)' });
      useApp.getState().toast(template ? 'Template copied to your projects' : 'Copy created', 'success');
      useApp.getState().navigate({ name: 'editor', id: d.id });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vw-root" data-testid="view-page">
      <header className="vw-head">
        <span className="vw-logo" onClick={() => useApp.getState().navigate({ name: 'home', section: 'home' })}>
          Cream
        </span>
        <div className="grow" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} data-testid="view-title">
            {design.title}
          </div>
          <div className="faint">
            {pages.length} page{pages.length === 1 ? '' : 's'} · View only
          </div>
        </div>
        {site?.nav && pages.length > 1 && (
          <nav className="vw-nav">
            {pages.map((p, i) => (
              <a key={p.id} className="btn ghost sm" href={'#'} onClick={(e) => (e.preventDefault(), document.getElementById('vw-' + p.id)?.scrollIntoView({ behavior: 'smooth' }))}>
                {p.title || `Section ${i + 1}`}
              </a>
            ))}
          </nav>
        )}
        <button className="btn sm" onClick={() => useApp.getState().navigate({ name: 'present', id, mode: 'full' })} data-testid="view-present">
          <Icon name="Play" size={15} /> Present
        </button>
        <button className="btn sm" onClick={() => setDl(true)} data-testid="view-download">
          <Icon name="Download" size={15} /> Download
        </button>
        {local && !template ? (
          <button className="btn sm primary" onClick={() => useApp.getState().navigate({ name: 'editor', id: design.id })} data-testid="view-edit">
            <Icon name="Pencil" size={15} /> Edit design
          </button>
        ) : (
          <button className="btn sm primary" onClick={copy} disabled={busy} data-testid="view-use-template">
            <Icon name={template ? 'LayoutTemplate' : 'Copy'} size={15} /> {template ? 'Use template' : 'Make a copy'}
          </button>
        )}
      </header>
      {template && (
        <div style={{ textAlign: 'center', padding: '14px 16px 0' }} className="muted">
          You've been sent a template. Click <b>Use template</b> to get your own editable copy.
        </div>
      )}
      <div className="vw-pages" style={site?.published ? { gap: 0, padding: 0 } : undefined}>
        {pages.map((p) => (
          <div key={p.id} id={'vw-' + p.id} className={site?.published ? '' : 'vw-page'}>
            <PageView design={design} page={p} scale={scale} ctx={{ mode: 'present', pageIndex: design.pages.indexOf(p), pageCount: design.pages.length }} />
          </div>
        ))}
      </div>
      {dl && (
        <Suspense fallback={<Spinner />}>
          <DownloadModal onClose={() => setDl(false)} design={design} />
        </Suspense>
      )}
    </div>
  );
}

function EmbedViewer({ design, routeId }: { design: Design; routeId: string }) {
  const pages = useMemo(() => visiblePages(design), [design]);
  const [i, setI] = useState(0);
  const vp = useViewport();
  const page = pages[i];
  const scale = Math.min(vp.w / design.width, (vp.h - 38) / (page.height ?? design.height));
  return (
    <div className="vw-embed" data-testid="view-embed">
      <div style={{ marginBottom: 38 }}>
        <PageView design={design} page={page} scale={scale} ctx={{ mode: 'present', pageIndex: design.pages.indexOf(page), pageCount: design.pages.length }} animate animKey={i} />
      </div>
      <div className="vw-embed-bar">
        <button onClick={() => setI((x) => Math.max(0, x - 1))} aria-label="Previous">
          <Icon name="ChevronLeft" size={16} />
        </button>
        <span>
          {i + 1} / {pages.length}
        </span>
        <button onClick={() => setI((x) => Math.min(pages.length - 1, x + 1))} aria-label="Next">
          <Icon name="ChevronRight" size={16} />
        </button>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{design.title}</span>
        <a href={`${location.origin}${location.pathname}#/view/${routeId.replace(/[?&]embed=1/, '')}`} target="_blank" rel="noopener" style={{ color: '#fff', fontWeight: 700 }}>
          Cream
        </a>
      </div>
    </div>
  );
}
