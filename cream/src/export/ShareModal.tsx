import { useEffect, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { Modal, Icon } from '../ui/ui';
import { useEditor, editDesign } from '../store/editor';
import { useApp } from '../store/app';
import type { Design } from '../model/types';
import { PageView } from '../render/PageView';
import { copyText, qrLink, SOCIAL, viewLink, useWarmShareAssets } from './shareLinks';
import { creamBlob } from './creamFile';
import { downloadBlob, safeName } from './exporters';
import './export.css';

type Role = 'view' | 'comment' | 'edit';
const ROLE_LABEL: Record<Role, string> = { edit: 'Can edit', comment: 'Can comment', view: 'Can view' };
const ACCESS = [
  { id: 'private', label: 'Only you can access', icon: 'Lock' },
  { id: 'team', label: 'Anyone in your team', icon: 'Users' },
  { id: 'link', label: 'Anyone with the link', icon: 'Globe' },
] as const;

const COLORS = ['#8b3dff', '#00c4cc', '#2f9e6e', '#f59f00', '#1c7ed6', '#ae3ec9', '#0ca678'];
export const avatarColor = (name: string) => COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length];
export const initials = (name: string) =>
  name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('') || '?';

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span className="xp-avatar" style={{ background: avatarColor(name), width: size, height: size, fontSize: size * 0.4 }} title={name}>
      {initials(name)}
    </span>
  );
}

type View = 'main' | 'social' | 'public' | 'template' | 'qr' | 'phone' | 'more';

export function QrImage({ text, size = 220, testId }: { text: string; size?: number; testId?: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    QRCode.toDataURL(text, { width: size * 2, margin: 1, errorCorrectionLevel: 'L' })
      .then(setUrl)
      .catch(() => setUrl(''));
  }, [text, size]);
  return <div className="xp-qr">{url ? <img src={url} width={size} height={size} alt="QR code" data-testid={testId} /> : <div className="faint">Link too long for a QR code</div>}</div>;
}

function Tile({ icon, label, onClick, testId, color }: { icon: string; label: string; onClick: () => void; testId?: string; color?: string }) {
  return (
    <button className="xp-tile" onClick={onClick} data-testid={testId}>
      <span className="xp-tile-ico" style={color ? { background: color, color: '#fff' } : undefined}>
        <Icon name={icon} size={20} />
      </span>
      {label}
    </button>
  );
}

function Sub({ title, back, children }: { title: string; back: () => void; children: ReactNode }) {
  return (
    <div>
      <button className="btn ghost sm" onClick={back} style={{ marginBottom: 8 }} data-testid="share-back">
        <Icon name="ChevronLeft" size={16} /> {title}
      </button>
      {children}
    </div>
  );
}

function LinkBox({ link, testId }: { link: string; testId: string }) {
  const toast = useApp.getState().toast;
  return (
    <div className="col">
      <input className="input" readOnly value={link} onFocus={(e) => e.target.select()} data-testid={testId + '-input'} />
      <button
        className="btn primary block"
        data-testid={testId}
        onClick={async () => {
          await copyText(link);
          toast('Link copied', 'success');
        }}
      >
        <Icon name="Link" size={16} /> Copy link
      </button>
    </div>
  );
}

export default function ShareModal({ onClose }: { onClose: () => void }) {
  const design = useEditor((s) => s.design) as Design;
  useWarmShareAssets(design);
  const settings = useApp((s) => s.settings);
  const [view, setView] = useState<View>('main');
  const [who, setWho] = useState('');
  const [whoRole, setWhoRole] = useState<Role>('edit');
  const share = design.share ?? { access: 'private', role: 'edit', people: [] };
  const toast = useApp.getState().toast;
  const setShare = (p: Partial<NonNullable<Design['share']>>) => editDesign((d) => void (d.share = { ...share, ...p }));
  const openModal = (m: any) => useEditor.setState({ modal: m });
  const go = (mode: 'full' | 'presenter' | 'autoplay') => {
    const d = useEditor.getState().design;
    if (d) useApp.getState().saveDesign(d);
    onClose();
    useApp.getState().navigate({ name: 'present', id: design.id, mode });
  };

  const addPerson = () => {
    const name = who.trim();
    if (!name) return;
    if (share.people.some((p) => p.name.toLowerCase() === name.toLowerCase())) return toast('Already has access');
    setShare({ people: [...share.people, { name, role: whoRole }] });
    useApp.getState().notify(`You shared "${design.title}" with ${name}`, design.id);
    setWho('');
  };

  const isWebsite = design.category === 'website';
  const title =
    view === 'main' ? 'Share this design' : { social: 'Share on social', public: 'Public view link', template: 'Template link', qr: 'QR code', phone: 'Send to phone', more: 'More', main: '' }[view];

  return (
    <Modal title={title} onClose={onClose} testId="share-modal">
      <div className="xp-modal">
        {view === 'main' && (
          <>
            <div className="xp-section">People with access</div>
            <div className="row">
              <input
                className="input grow"
                placeholder="Add people, groups, or your team"
                value={who}
                onChange={(e) => setWho(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') addPerson();
                }}
                data-testid="share-add-input"
              />
              <select className="select" style={{ width: 130 }} value={whoRole} onChange={(e) => setWhoRole(e.target.value as Role)}>
                {(['edit', 'comment', 'view'] as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              <button className="btn primary" onClick={addPerson} disabled={!who.trim()} data-testid="share-add-btn">
                Add
              </button>
            </div>
            <div className="xp-person">
              <Avatar name={settings.userName || 'You'} />
              <div className="grow">
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{settings.userName || 'You'} (you)</div>
                <div className="faint">{settings.userEmail}</div>
              </div>
              <span className="faint">Owner</span>
            </div>
            {share.people.map((p, i) => (
              <div className="xp-person" key={p.name} data-testid="share-person">
                <Avatar name={p.name} />
                <div className="grow" style={{ fontSize: 13.5 }}>
                  {p.name}
                </div>
                <select
                  className="select"
                  style={{ width: 130, height: 30 }}
                  value={p.role}
                  onChange={(e) => setShare({ people: share.people.map((x, j) => (j === i ? { ...x, role: e.target.value as Role } : x)) })}
                >
                  {(['edit', 'comment', 'view'] as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <button className="icon-btn" title="Remove access" onClick={() => setShare({ people: share.people.filter((_, j) => j !== i) })}>
                  <Icon name="X" size={16} />
                </button>
              </div>
            ))}

            <div className="xp-section">Collaboration link</div>
            <div className="row">
              <Icon name={ACCESS.find((a) => a.id === share.access)!.icon} size={18} />
              <select className="select grow" value={share.access} onChange={(e) => setShare({ access: e.target.value as any })} data-testid="share-access">
                {ACCESS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
              {share.access !== 'private' && (
                <select className="select" style={{ width: 140 }} value={share.role} onChange={(e) => setShare({ role: e.target.value as Role })} data-testid="share-role">
                  {(['edit', 'comment', 'view'] as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              className="btn primary block lg"
              style={{ marginTop: 12 }}
              data-testid="share-copy-link"
              onClick={async () => {
                const ok = await copyText(viewLink(design));
                toast(ok ? 'Link copied' : 'Could not copy link', ok ? 'success' : 'error');
              }}
            >
              <Icon name="Link" size={16} /> Copy link
            </button>
            {share.access === 'private' && <div className="faint" style={{ marginTop: 6 }}>Only people you add can open this link. Change access to share more widely.</div>}

            <div className="xp-section" style={{ marginTop: 18 }}>
              Share
            </div>
            <div className="xp-tiles">
              <Tile icon="Download" label="Download" onClick={() => openModal('download')} testId="share-tile-download" />
              <Tile icon="Share2" label="Share on social" onClick={() => setView('social')} testId="share-tile-social" />
              <Tile icon="Play" label="Present" onClick={() => go('full')} testId="share-tile-present" />
              <Tile icon="Eye" label="Public view link" onClick={() => setView('public')} testId="share-tile-public" />
              <Tile icon="LayoutTemplate" label="Template link" onClick={() => setView('template')} testId="share-tile-template" />
              <Tile icon="Video" label="Present and record" onClick={() => openModal('present-record')} testId="share-tile-record" />
              <Tile icon="Printer" label="Print with Cream" onClick={() => openModal('print')} testId="share-tile-print" />
              <Tile icon="Code" label="Embed" onClick={() => openModal('embed')} testId="share-tile-embed" />
              <Tile icon="QrCode" label="QR code" onClick={() => setView('qr')} testId="share-tile-qr" />
              <Tile icon="Smartphone" label="Send to phone" onClick={() => setView('phone')} testId="share-tile-phone" />
              <Tile icon="CalendarClock" label="Schedule" onClick={() => openModal('schedule')} testId="share-tile-schedule" />
              <Tile icon="Crown" label="Brand template" onClick={() => openModal('brand-template')} testId="share-tile-brand" />
              <Tile icon="BadgeCheck" label="Request approval" onClick={() => openModal('request-approval')} testId="share-tile-approval" />
              <Tile icon="Globe" label={isWebsite ? 'Publish website' : 'Publish as website'} onClick={() => openModal('publish-website')} testId="share-tile-website" />
              <Tile
                icon="FileJson"
                label="Cream file"
                onClick={async () => {
                  downloadBlob(await creamBlob(design), safeName(design.title) + '.cream');
                  toast('Downloaded .cream file', 'success');
                }}
                testId="share-tile-cream"
              />
              <Tile icon="MoreHorizontal" label="More" onClick={() => setView('more')} testId="share-tile-more" />
            </div>
          </>
        )}

        {view === 'social' && (
          <Sub title="Share" back={() => setView('main')}>
            <p className="muted" style={{ marginTop: 0 }}>
              Post a public view link to your design. To schedule a post, use <b>Schedule</b>.
            </p>
            <div className="xp-tiles">
              {SOCIAL.map((s) => (
                <Tile
                  key={s.id}
                  icon={s.icon}
                  label={s.label}
                  testId={'share-social-' + s.id}
                  onClick={() => {
                    const link = viewLink(design, { maxLen: 6000 });
                    window.open(s.url(link, design.title), '_blank', 'noopener');
                  }}
                />
              ))}
              <Tile icon="CalendarClock" label="Schedule post" onClick={() => openModal('schedule')} />
            </div>
          </Sub>
        )}

        {view === 'public' && (
          <Sub title="Share" back={() => setView('main')}>
            <div className="row" style={{ gap: 12, marginBottom: 12 }}>
              <div style={{ borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', flex: 'none' }}>
                <PageView design={design} page={design.pages[0]} scale={140 / Math.max(design.width, design.height)} ctx={{ mode: 'static', pageIndex: 0, pageCount: design.pages.length }} />
              </div>
              <p className="muted" style={{ margin: 0 }}>
                Anyone with this link can view your design as a webpage — no editing. The design travels inside the link, so it works anywhere.
              </p>
            </div>
            <LinkBox link={viewLink(design)} testId="share-public-copy" />
            <button className="btn block" style={{ marginTop: 8 }} onClick={() => window.open(viewLink(design), '_blank')} data-testid="share-public-open">
              <Icon name="ExternalLink" size={16} /> Open view link
            </button>
          </Sub>
        )}

        {view === 'template' && (
          <Sub title="Share" back={() => setView('main')}>
            <p className="muted" style={{ marginTop: 0 }}>
              Anyone with this link can use your design as a template. They'll get their own copy — your original stays unchanged.
            </p>
            <LinkBox link={viewLink(design, { template: true })} testId="share-template-copy" />
          </Sub>
        )}

        {(view === 'qr' || view === 'phone') && (
          <Sub title="Share" back={() => setView('main')}>
            <div className="col" style={{ alignItems: 'center' }}>
              <QrImage text={qrLink(design)} testId="share-qr-img" />
              <p className="muted" style={{ textAlign: 'center' }}>
                {view === 'phone' ? 'Scan with your phone camera to open this design on your phone.' : 'Anyone who scans this QR code can view your design.'}
              </p>
              <button
                className="btn primary"
                data-testid="share-qr-download"
                onClick={async () => {
                  const url = await QRCode.toDataURL(qrLink(design), { width: 1024, margin: 2, errorCorrectionLevel: 'L' });
                  downloadBlob(await (await fetch(url)).blob(), safeName(design.title) + '-qr.png');
                }}
              >
                <Icon name="Download" size={16} /> Download QR code
              </button>
            </div>
          </Sub>
        )}

        {view === 'more' && (
          <Sub title="Share" back={() => setView('main')}>
            <div className="xp-tiles">
              {[
                { icon: 'HardDrive', label: 'Google Drive' },
                { icon: 'Box', label: 'Dropbox' },
                { icon: 'Cloud', label: 'OneDrive' },
                { icon: 'Save', label: 'Save to device' },
              ].map((t) => (
                <Tile
                  key={t.label}
                  icon={t.icon}
                  label={t.label}
                  onClick={async () => {
                    downloadBlob(await creamBlob(design), safeName(design.title) + '.cream');
                    toast(t.label === 'Save to device' ? 'Saved to your device' : `Saved a .cream file — upload it to ${t.label}`, 'success');
                  }}
                />
              ))}
              <Tile icon="Mail" label="Email" onClick={() => window.open(SOCIAL.find((s) => s.id === 'email')!.url(viewLink(design, { maxLen: 6000 }), design.title))} />
              <Tile icon="MessageSquare" label="Slack" onClick={async () => (await copyText(viewLink(design)), toast('Link copied — paste it in Slack', 'success'))} />
              <Tile icon="Users" label="Microsoft Teams" onClick={async () => (await copyText(viewLink(design)), toast('Link copied — paste it in Teams', 'success'))} />
              <Tile icon="MonitorPlay" label="Presenter view" onClick={() => go('presenter')} />
              <Tile icon="PlayCircle" label="Autoplay" onClick={() => go('autoplay')} />
            </div>
          </Sub>
        )}
      </div>
    </Modal>
  );
}
