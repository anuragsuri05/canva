// Home shell: customisable left navigation, notifications, account/help menus and section routing.
import { lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useApp, DEFAULT_SETTINGS, type HomeSection } from '../store/app';
import { Floating, Icon, Menu, fmtDate, type Anchor, type MenuItem } from '../ui/ui';
import { CreateMenu } from './CreateMenu';
import { HomeMain } from './HomeMain';
import { FolderPage, ProjectsPage, SharedPage, StarredPage, TrashPage, UploadsPage, purgeOldTrash } from './Projects';
import { openDesign } from './actions';
import { Safe } from './Safe';
import './home.css';

const TemplatesPage = lazy(() => import('../templates/TemplatesPage'));
const AIHome = lazy(() => import('../ai/AIHome'));
const DreamLab = lazy(() => import('../ai/DreamLab'));
const BrandHub = lazy(() => import('../brand/BrandHub'));
const SettingsPage = lazy(() => import('./Settings'));
const AppsPage = lazy(() => import('./AppsPage'));
const PrintShop = lazy(() => import('./PrintShop'));
const Planner = lazy(() => import('./Planner'));

export interface NavDef {
  id: string;
  label: string;
  icon: string;
  section: HomeSection;
}

export const NAV: NavDef[] = [
  { id: 'home', label: 'Home', icon: 'House', section: 'home' },
  { id: 'projects', label: 'Projects', icon: 'FolderOpen', section: 'projects' },
  { id: 'templates', label: 'Templates', icon: 'LayoutTemplate', section: 'templates' },
  { id: 'brand', label: 'Brand', icon: 'Crown', section: 'brand' },
  { id: 'ai', label: 'Cream AI', icon: 'Sparkles', section: 'ai' },
  { id: 'apps', label: 'Apps', icon: 'LayoutGrid', section: 'apps' },
  { id: 'dreamlab', label: 'Dream Lab', icon: 'Wand2', section: 'dreamlab' },
  { id: 'print', label: 'Print Shop', icon: 'Printer', section: 'print' },
  { id: 'planner', label: 'Content Planner', icon: 'CalendarDays', section: 'planner' },
  { id: 'uploads', label: 'Uploads', icon: 'CloudUpload', section: 'uploads' },
  { id: 'shared', label: 'Shared with you', icon: 'Users', section: 'shared' },
  { id: 'starred', label: 'Starred', icon: 'Star', section: 'starred' },
];
const NAV_BY_ID = Object.fromEntries(NAV.map((n) => [n.id, n]));
const INITIAL_PINNED = ['home', 'projects', 'templates', 'brand', 'ai', 'apps', 'dreamlab', 'print', 'planner'];

/* ---------------- Navigation ---------------- */
function NavItem({
  n,
  active,
  pinned,
  onDragStart,
  onDropOn,
  dragOver,
  setDragOver,
}: {
  n: NavDef;
  active: boolean;
  pinned: boolean;
  onDragStart: () => void;
  onDropOn: () => void;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
}) {
  const app = useApp.getState;
  const fixed = n.id === 'home';
  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cur = app().settings.pinnedNav;
    app().updateSettings({ pinnedNav: pinned ? cur.filter((x) => x !== n.id) : [...cur, n.id] });
    app().toast(pinned ? `${n.label} moved to More` : `${n.label} pinned`);
  };
  return (
    <div
      className={'nav-row' + (dragOver ? ' drag-over' : '')}
      draggable={!fixed}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-cream-nav', n.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-cream-nav')) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onDropOn();
      }}
    >
      <button className={'nav-item' + (active ? ' active' : '')} onClick={() => app().navigate({ name: 'home', section: n.section })} data-testid={'nav-' + n.id}>
        <Icon name={n.icon} size={19} />
        <span className="grow">{n.label}</span>
      </button>
      {!fixed && (
        <button className="nav-pin" title={pinned ? 'Unpin' : 'Pin'} onClick={togglePin} data-testid={'pin-' + n.id}>
          <Icon name={pinned ? 'PinOff' : 'Pin'} size={14} />
        </button>
      )}
    </div>
  );
}

function StarredSection() {
  const starredDesigns = useApp(useShallow((s) => Object.values(s.designs).filter((d) => d.starred && !d.trashedAt)));
  const starredFolders = useApp(useShallow((s) => s.folders.filter((f) => f.starred && !f.trashedAt)));
  const [open, setOpen] = useState(true);
  const app = useApp.getState;
  const items = [...starredFolders.map((f) => ({ k: 'f' + f.id, label: f.name, icon: 'Folder', go: () => app().navigate({ name: 'home', section: 'folder', param: f.id }) })), ...starredDesigns.map((d) => ({ k: 'd' + d.id, label: d.title, icon: 'File', go: () => openDesign(d.id) }))];
  return (
    <div className="nav-starred" data-testid="nav-starred">
      <button className="nav-heading" onClick={() => setOpen(!open)}>
        <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={14} /> Starred
      </button>
      {open &&
        (items.length ? (
          <>
            {items.slice(0, 8).map((it) => (
              <button key={it.k} className="nav-item sm" onClick={it.go} title={it.label}>
                <Icon name={it.icon} size={16} />
                <span className="grow ellipsis">{it.label}</span>
              </button>
            ))}
            {items.length > 8 && (
              <button className="nav-item sm muted" onClick={() => app().navigate({ name: 'home', section: 'starred' })}>
                <Icon name="Ellipsis" size={16} /> See all {items.length}
              </button>
            )}
          </>
        ) : (
          <div className="faint nav-hint">Star designs and folders to see them here</div>
        ))}
    </div>
  );
}

function Notifications({ anchor, onClose }: { anchor: Anchor; onClose: () => void }) {
  const notes = useApp((s) => s.notifications);
  const app = useApp.getState;
  return (
    <Floating anchor={anchor} onClose={onClose} placement="right-start" width={360} className="popover notif-panel">
      <div className="row" style={{ marginBottom: 8 }}>
        <h3 className="grow" style={{ margin: 0, fontSize: 16 }}>
          Notifications
        </h3>
        <button className="btn ghost sm" disabled={!notes.some((n) => !n.read)} onClick={() => app().markNotificationsRead()} data-testid="notif-mark-read">
          Mark all as read
        </button>
      </div>
      <div className="notif-list" data-testid="notif-list">
        {notes.length === 0 && (
          <div className="empty">
            <Icon name="BellOff" size={26} />
            <div style={{ marginTop: 8 }}>You’re all caught up. Comments, shares and approvals will appear here.</div>
          </div>
        )}
        {notes.map((n) => (
          <button
            key={n.id}
            className={'notif' + (n.read ? '' : ' unread')}
            onClick={() => {
              if (n.designId && app().designs[n.designId]) {
                onClose();
                openDesign(n.designId);
              }
            }}
          >
            <span className="notif-dot" />
            <span className="grow">
              <span className="notif-text">{n.text}</span>
              <span className="faint">{fmtDate(n.createdAt)}</span>
            </span>
          </button>
        ))}
      </div>
    </Floating>
  );
}

function helpItems(): MenuItem[] {
  const app = useApp.getState();
  return [
    { title: 'Help' },
    { label: 'Help Center', icon: 'LifeBuoy', onClick: () => app.toast('Cream is local-first — everything you make stays in this browser. Hover any button for hints.') },
    { label: 'Keyboard shortcuts', icon: 'Keyboard', kbd: '?', onClick: () => app.toast('Open any design and press ? to see all keyboard shortcuts') },
    { label: "What's new", icon: 'Megaphone', onClick: () => app.notify("What's new: Brand Hub, Content Planner and Print Shop are here.") },
    { sep: true },
    { label: 'Give feedback', icon: 'MessageSquare', onClick: () => app.toast('Thanks! Feedback noted locally.', 'success') },
    { label: 'Privacy & terms', icon: 'ShieldCheck', onClick: () => app.navigate({ name: 'home', section: 'settings', param: 'privacy' }) },
  ];
}

function accountItems(): MenuItem[] {
  const app = useApp.getState();
  const s = app.settings;
  const theme = (t: 'light' | 'system' | 'dark') => () => app.updateSettings({ theme: t });
  return [
    { title: `${s.userName} · ${s.userEmail}` },
    { label: 'Your account', icon: 'CircleUser', onClick: () => app.navigate({ name: 'home', section: 'settings', param: 'profile' }), testId: 'menu-your-account' },
    { label: 'Settings', icon: 'Settings', onClick: () => app.navigate({ name: 'home', section: 'settings', param: 'account' }), testId: 'menu-settings' },
    { label: 'Brand Hub', icon: 'Crown', onClick: () => app.navigate({ name: 'home', section: 'brand' }) },
    { sep: true },
    { title: 'Theme' },
    { label: 'Light', icon: s.theme === 'light' ? 'Check' : 'Sun', onClick: theme('light'), testId: 'theme-light' },
    { label: 'Sync with system', icon: s.theme === 'system' ? 'Check' : 'Monitor', onClick: theme('system'), testId: 'theme-system' },
    { label: 'Dark', icon: s.theme === 'dark' ? 'Check' : 'Moon', onClick: theme('dark'), testId: 'theme-dark' },
    { sep: true },
    { label: 'Refer friends', icon: 'Gift', onClick: () => app.toast('Share Cream: it is free and runs entirely in your browser.') },
    { label: 'Sign out', icon: 'LogOut', onClick: () => app.toast('Cream has no accounts to sign out of — your work stays on this device.'), testId: 'sign-out' },
  ];
}

export function Avatar({ size = 32 }: { size?: number }) {
  const name = useApp((s) => s.settings.userName);
  const color = useAvatarColor();
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'Y';
  return (
    <span className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}>
      {initials}
    </span>
  );
}

export const AVATAR_COLORS = ['#8b3dff', '#00c4cc', '#ff8a4c', '#2f9e6e', '#22b8cf', '#4c6ef5', '#f59f00', '#1d1a26'];
export function useAvatarColor() {
  const [c, setC] = useState(() => {
    try {
      return localStorage.getItem('cream-avatar-color') || AVATAR_COLORS[0];
    } catch {
      return AVATAR_COLORS[0];
    }
  });
  useEffect(() => {
    const h = () => setC(localStorage.getItem('cream-avatar-color') || AVATAR_COLORS[0]);
    window.addEventListener('cream-avatar', h);
    return () => window.removeEventListener('cream-avatar', h);
  }, []);
  return c;
}

function Nav({ section, param }: { section: HomeSection; param?: string }) {
  const pinnedRaw = useApp((s) => s.settings.pinnedNav);
  const userName = useApp((s) => s.settings.userName);
  const unread = useApp((s) => s.notifications.filter((n) => !n.read).length);
  const [create, setCreate] = useState<Anchor | null>(null);
  const [more, setMore] = useState<Anchor | null>(null);
  const [notif, setNotif] = useState<Anchor | null>(null);
  const [acct, setAcct] = useState<Anchor | null>(null);
  const [help, setHelp] = useState<Anchor | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const app = useApp.getState;

  const pinned = ['home', ...pinnedRaw.filter((id) => id !== 'home' && NAV_BY_ID[id])];
  const unpinned = NAV.filter((n) => !pinned.includes(n.id));
  const activeId = section === 'folder' ? 'projects' : section === 'settings' ? '' : section;

  const reorder = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const list = pinned.filter((x) => x !== dragId);
    const idx = Math.max(1, list.indexOf(targetId));
    const from = pinned.indexOf(dragId);
    const to = pinned.indexOf(targetId);
    list.splice(from < to ? idx + 1 : idx, 0, dragId);
    app().updateSettings({ pinnedNav: list });
    setDragId(null);
  };

  return (
    <nav className="home-nav" data-testid="home-nav">
      <div className="nav-top">
        <button className="logo" onClick={() => app().navigate({ name: 'home', section: 'home' })} aria-label="Cream home">
          <img src="/cream.svg" alt="" width={30} height={30} />
          <span>Cream</span>
        </button>
      </div>
      <button className="btn primary create-btn" onClick={(e) => setCreate(e.currentTarget)} data-testid="create-design-btn">
        <Icon name="Plus" size={18} /> Create a design
      </button>
      <div className="nav-list">
        {pinned.map((id) => (
          <NavItem
            key={id}
            n={NAV_BY_ID[id]}
            active={activeId === id}
            pinned
            onDragStart={() => setDragId(id)}
            onDropOn={() => reorder(id)}
            dragOver={overId === id && dragId !== id}
            setDragOver={(v) => setOverId(v ? id : null)}
          />
        ))}
        <button className={'nav-item' + (section === 'trash' ? ' active' : '')} onClick={() => app().navigate({ name: 'home', section: 'trash' })} data-testid="nav-trash">
          <Icon name="Trash2" size={19} />
          <span className="grow">Trash</span>
        </button>
        <button className={'nav-item' + (unpinned.some((n) => n.id === activeId) ? ' active' : '')} onClick={(e) => setMore(e.currentTarget)} data-testid="nav-more">
          <Icon name="Ellipsis" size={19} />
          <span className="grow">More</span>
          <Icon name="ChevronRight" size={14} />
        </button>
      </div>
      <StarredSection />
      <div className="grow" />
      <div className="nav-bottom">
        <button className="nav-account" onClick={(e) => setAcct(e.currentTarget)} data-testid="account-btn">
          <Avatar size={32} />
          <span className="grow ellipsis" style={{ textAlign: 'left' }}>
            <b>{userName}</b>
            <span className="faint" style={{ display: 'block' }}>
              Personal · Pro
            </span>
          </span>
        </button>
        <button className="icon-btn bell" title="Notifications" onClick={(e) => setNotif(e.currentTarget)} data-testid="notif-bell">
          <Icon name="Bell" size={19} />
          {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
        </button>
        <button className="icon-btn" title="Help" onClick={(e) => setHelp(e.currentTarget)} data-testid="help-btn">
          <Icon name="CircleHelp" size={19} />
        </button>
      </div>

      {create && <CreateMenu anchor={create} onClose={() => setCreate(null)} folderId={section === 'folder' ? (param ?? null) : null} />}
      {more && (
        <Menu
          anchor={more}
          placement="right-start"
          onClose={() => setMore(null)}
          width={260}
          items={[
            { title: 'More' },
            ...unpinned.map((n) => ({
              label: n.label,
              icon: n.icon,
              testId: 'more-' + n.id,
              onClick: () => app().navigate({ name: 'home', section: n.section }),
            })),
            ...(unpinned.length ? [{ sep: true } as MenuItem] : []),
            { title: 'Pin to sidebar' },
            ...unpinned.map((n) => ({
              label: `Pin ${n.label}`,
              icon: 'Pin',
              testId: 'more-pin-' + n.id,
              onClick: () => app().updateSettings({ pinnedNav: [...app().settings.pinnedNav, n.id] }),
            })),
            { sep: true },
            { label: 'Reset navigation', icon: 'RotateCcw', onClick: () => app().updateSettings({ pinnedNav: INITIAL_PINNED }) },
          ]}
        />
      )}
      {notif && <Notifications anchor={notif} onClose={() => setNotif(null)} />}
      {acct && <Menu anchor={acct} items={accountItems()} onClose={() => setAcct(null)} placement="top-start" width={270} />}
      {help && <Menu anchor={help} items={helpItems()} onClose={() => setHelp(null)} placement="top-start" width={250} />}
    </nav>
  );
}

function Section({ section, param }: { section: HomeSection; param?: string }): ReactNode {
  switch (section) {
    case 'projects':
      return <ProjectsPage />;
    case 'folder':
      return <FolderPage id={param ?? ''} />;
    case 'templates':
      return (
        <Safe label="Templates">
          <TemplatesPage query={param ? decodeURIComponent(param) : undefined} />
        </Safe>
      );
    case 'brand':
      return (
        <Safe label="Brand Hub">
          <BrandHub kitId={param} />
        </Safe>
      );
    case 'ai':
      return (
        <Safe label="Cream AI">
          <AIHome />
        </Safe>
      );
    case 'dreamlab':
      return (
        <Safe label="Dream Lab">
          <DreamLab />
        </Safe>
      );
    case 'apps':
      return (
        <Safe>
          <AppsPage />
        </Safe>
      );
    case 'print':
      return (
        <Safe>
          <PrintShop />
        </Safe>
      );
    case 'planner':
      return (
        <Safe>
          <Planner />
        </Safe>
      );
    case 'settings':
      return (
        <Safe>
          <SettingsPage tab={param} />
        </Safe>
      );
    case 'trash':
      return <TrashPage />;
    case 'starred':
      return <StarredPage />;
    case 'shared':
      return <SharedPage />;
    case 'uploads':
      return <UploadsPage />;
    default:
      return <HomeMain />;
  }
}

export default function Home() {
  const route = useApp((s) => s.route);
  const section: HomeSection = route.name === 'home' ? route.section : 'home';
  const param = route.name === 'home' ? route.param : undefined;
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    purgeOldTrash();
    // First run: Canva shows Print Shop + Content Planner pinned too. Only touch an uncustomised nav.
    const s = useApp.getState().settings;
    if (JSON.stringify(s.pinnedNav) === JSON.stringify(DEFAULT_SETTINGS.pinnedNav)) useApp.getState().updateSettings({ pinnedNav: INITIAL_PINNED });
  }, []);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [section, param]);

  return (
    <div className="home" data-testid="home">
      <Nav section={section} param={param} />
      <main className="home-main" ref={mainRef} data-section={section}>
        <Section section={section} param={param} />
      </main>
    </div>
  );
}
