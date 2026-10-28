import { useState } from 'react';
import { Modal, Icon, Toggle } from '../ui/ui';
import { useEditor, editDesign } from '../store/editor';
import { useApp } from '../store/app';
import type { Design } from '../model/types';
import { copyText, viewLink, useWarmShareAssets } from './shareLinks';
import './export.css';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'my-site';

export default function PublishModal({ onClose }: { onClose: () => void }) {
  const design = useEditor((s) => s.design) as Design;
  useWarmShareAssets(design);
  const w = design.website;
  const [tab, setTab] = useState<'site' | 'pages'>('site');
  const [slug, setSlug] = useState(w?.slug ?? slugify(design.title));
  const [nav, setNav] = useState(w?.nav ?? design.pages.length > 1);
  const [seoTitle, setSeoTitle] = useState(w?.seoTitle ?? design.title);
  const [seoDescription, setSeoDescription] = useState(w?.seoDescription ?? '');
  const [pwOn, setPwOn] = useState(!!w?.password);
  const [password, setPassword] = useState(w?.password ?? '');
  const [favicon, setFavicon] = useState(w?.favicon ?? '');
  const [visible, setVisible] = useState(true);
  const [published, setPublished] = useState<string | null>(w?.published ? viewLink(design) : null);
  const app = useApp.getState();

  const save = (pub: boolean) => {
    const site = { published: pub, slug: slugify(slug), nav, seoTitle, seoDescription: seoDescription + (visible ? '' : ''), password: pwOn && password ? password : undefined, favicon: favicon || undefined };
    editDesign((d) => void (d.website = site));
    return { ...design, website: site } as Design;
  };

  const publish = () => {
    if (pwOn && !password) return app.toast('Enter a password or turn off password protection', 'error');
    const d = save(true);
    const link = viewLink(d);
    setPublished(link);
    window.open(link, '_blank');
    app.notify(`Your website "${design.title}" is live at my.cream.site/${slugify(slug)}`, design.id);
    app.toast('Website published', 'success');
  };
  const unpublish = () => {
    save(false);
    setPublished(null);
    app.toast('Website unpublished');
  };

  const onFavicon = (f?: File) => {
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) return app.toast('Favicon must be under 25 MB', 'error');
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d')!;
      const s = Math.max(64 / img.width, 64 / img.height);
      g.drawImage(img, (64 - img.width * s) / 2, (64 - img.height * s) / 2, img.width * s, img.height * s);
      setFavicon(c.toDataURL('image/png'));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };

  return (
    <Modal title="Publish website" onClose={onClose} testId="publish-modal">
      <div className="xp-modal">
        {published && (
          <div className="xp-note" style={{ background: 'var(--primary-soft)', color: 'var(--text)' }} data-testid="publish-live">
            <div className="row">
              <Icon name="Globe" size={16} />
              <b className="grow">my.cream.site/{slugify(slug)}</b>
              <button className="btn sm" onClick={async () => (await copyText(published), app.toast('Link copied', 'success'))}>
                Copy link
              </button>
              <button className="btn sm" onClick={() => window.open(published, '_blank')}>
                Open
              </button>
            </div>
          </div>
        )}
        <div className="field">
          <label>Domain</label>
          <div className="row">
            <span className="muted">my.cream.site/</span>
            <input className="input grow" value={slug} onChange={(e) => setSlug(e.target.value)} onBlur={() => setSlug(slugify(slug))} onKeyDown={(e) => e.stopPropagation()} data-testid="publish-slug" />
          </div>
          <span className="faint">Free domain. Custom domains aren't available in this local version.</span>
        </div>
        <div className="tabs">
          <button className={'tab' + (tab === 'site' ? ' active' : '')} onClick={() => setTab('site')}>
            Site
          </button>
          <button className={'tab' + (tab === 'pages' ? ' active' : '')} onClick={() => setTab('pages')}>
            Pages
          </button>
        </div>
        {tab === 'site' && (
          <>
            <Toggle label="Include navigation menu" on={nav} onChange={setNav} testId="publish-nav" />
            <Toggle label="Let search engines show my site" on={visible} onChange={setVisible} />
            <div className="field" style={{ marginTop: 8 }}>
              <label>Site title (SEO)</label>
              <input className="input" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} onKeyDown={(e) => e.stopPropagation()} data-testid="publish-seo-title" />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea className="textarea" rows={2} value={seoDescription} maxLength={300} onChange={(e) => setSeoDescription(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="A short summary shown in search results" data-testid="publish-seo-desc" />
            </div>
            <Toggle label="Password protection" on={pwOn} onChange={setPwOn} testId="publish-password-toggle" />
            {pwOn && <input className="input" type="text" placeholder="Set a password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.stopPropagation()} data-testid="publish-password" />}
            <div className="field" style={{ marginTop: 10 }}>
              <label>Favicon</label>
              <div className="row">
                <div style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', display: 'grid', placeItems: 'center', overflow: 'hidden', background: 'var(--surface-2)' }}>
                  {favicon ? <img src={favicon} width={32} height={32} alt="Favicon" /> : <Icon name="Image" size={16} />}
                </div>
                <label className="btn sm">
                  Upload
                  <input type="file" accept="image/png,image/jpeg" hidden onChange={(e) => onFavicon(e.target.files?.[0])} />
                </label>
                {favicon && (
                  <button className="btn sm ghost" onClick={() => setFavicon('')}>
                    Remove
                  </button>
                )}
                <span className="faint">JPG or PNG, 280 × 280 px recommended</span>
              </div>
            </div>
          </>
        )}
        {tab === 'pages' && (
          <div className="col">
            <span className="faint">Page titles become navigation links and page headings.</span>
            {design.pages.map((p, i) => (
              <div key={p.id} className="row">
                <span className="faint" style={{ width: 52 }}>
                  Page {i + 1}
                </span>
                <input
                  className="input grow"
                  placeholder={`Section ${i + 1}`}
                  value={p.title ?? ''}
                  onChange={(e) => editDesign((d) => void (d.pages[i].title = e.target.value), { coalesce: 'page-title-' + p.id })}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            ))}
          </div>
        )}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
          {published && (
            <button className="btn" onClick={unpublish} data-testid="publish-unpublish">
              Unpublish
            </button>
          )}
          <button className="btn" onClick={() => window.open(viewLink(save(!!published)), '_blank')}>
            <Icon name="Eye" size={16} /> Preview
          </button>
          <button className="btn primary" onClick={publish} data-testid="publish-submit">
            {published ? 'Update website' : 'Publish'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
