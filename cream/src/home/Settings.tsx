// Account settings ("Your account" + "Settings"), all local-first.
import { lazy, useEffect, useState, type ReactNode } from 'react';
import { createStore, clear, entries } from 'idb-keyval';
import { useApp } from '../store/app';
import { db } from '../store/persist';
import { Icon, Segmented, Toggle } from '../ui/ui';
import { downloadJson, fmtBytes, pickFiles } from './actions';
import { AVATAR_COLORS, Avatar, useAvatarColor } from './Home';
import { Safe } from './Safe';

const AISettings = lazy(() => import('../ai/AISettings'));

const TABS: { id: string; label: string; icon: string; group: string }[] = [
  { id: 'profile', label: 'Your profile', icon: 'CircleUser', group: 'Your account' },
  { id: 'account', label: 'Account & security', icon: 'ShieldCheck', group: 'Your account' },
  { id: 'accessibility', label: 'Accessibility', icon: 'Accessibility', group: 'Your account' },
  { id: 'messages', label: 'Message preferences', icon: 'Mail', group: 'Your account' },
  { id: 'privacy', label: 'Privacy', icon: 'Lock', group: 'Your account' },
  { id: 'storage', label: 'Data & storage', icon: 'HardDrive', group: 'Your account' },
  { id: 'ai', label: 'AI', icon: 'Sparkles', group: 'Your account' },
  { id: 'teams', label: 'Your teams', icon: 'Users', group: 'Settings' },
  { id: 'billing', label: 'Billing & plans', icon: 'CreditCard', group: 'Settings' },
];

function Card({ title, desc, children }: { title: string; desc?: ReactNode; children?: ReactNode }) {
  return (
    <section className="set-card">
      <div className="set-card-head">
        <h3>{title}</h3>
        {desc && <p className="muted">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, desc, children }: { label: string; desc?: ReactNode; children: ReactNode }) {
  return (
    <div className="set-row">
      <div className="grow">
        <div className="set-label">{label}</div>
        {desc && <div className="faint">{desc}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Profile() {
  const s = useApp((x) => x.settings);
  const color = useAvatarColor();
  const up = useApp.getState().updateSettings;
  return (
    <>
      <Card title="Your profile">
        <div className="row" style={{ gap: 16, marginBottom: 18 }}>
          <Avatar size={72} />
          <div>
            <div className="label" style={{ marginBottom: 6 }}>
              Avatar color
            </div>
            <div className="row" style={{ gap: 6 }}>
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  className={'swatch' + (c === color ? ' active' : '')}
                  style={{ background: c, width: 26, height: 26 }}
                  data-testid={'avatar-color-' + c.slice(1)}
                  onClick={() => {
                    localStorage.setItem('cream-avatar-color', c);
                    window.dispatchEvent(new Event('cream-avatar'));
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="field">
          <label>Name</label>
          <input className="input" value={s.userName} onChange={(e) => up({ userName: e.target.value })} data-testid="profile-name" />
        </div>
        <div className="field">
          <label>Email address</label>
          <input className="input" type="email" value={s.userEmail} onChange={(e) => up({ userEmail: e.target.value })} data-testid="profile-email" />
        </div>
        <div className="field">
          <label>Language</label>
          <select className="select" value={s.language} onChange={(e) => up({ language: e.target.value })}>
            {[
              ['en', 'English (US)'],
              ['en-GB', 'English (UK)'],
              ['es', 'Español'],
              ['fr', 'Français'],
              ['de', 'Deutsch'],
              ['hi', 'हिन्दी'],
              ['ja', '日本語'],
              ['pt', 'Português'],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </Card>
    </>
  );
}

async function exportAll() {
  const s = useApp.getState();
  const blobs: Record<string, string> = {};
  for (const a of s.assets) {
    const b = await db.getBlob(a.id);
    if (b)
      blobs[a.id] = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.readAsDataURL(b);
      });
  }
  const versions: Record<string, unknown> = {};
  for (const id of Object.keys(s.designs)) versions[id] = await db.loadVersions(id);
  let planner: unknown = [];
  try {
    planner = JSON.parse(localStorage.getItem('cream-planner') || '[]');
  } catch {
    /* ignore */
  }
  downloadJson(`cream-backup-${new Date().toISOString().slice(0, 10)}.json`, {
    kind: 'cream-backup',
    version: 1,
    exportedAt: Date.now(),
    designs: Object.values(s.designs),
    folders: s.folders,
    assets: s.assets,
    brandKits: s.brandKits,
    settings: s.settings,
    notifications: s.notifications,
    versions,
    blobs,
    planner,
  });
  s.toast('Backup downloaded', 'success');
}

async function importBackup() {
  const [f] = await pickFiles('.json,.cream');
  if (!f) return;
  const app = useApp.getState();
  try {
    const data = JSON.parse(await f.text());
    if (data?.kind !== 'cream-backup') {
      app.toast('That file is not a Cream backup', 'error');
      return;
    }
    if (!confirm('Restore this backup? Items with the same IDs will be replaced; everything else is kept.')) return;
    for (const d of data.designs ?? []) await db.saveDesign(d);
    const mergeById = <T extends { id: string }>(cur: T[], inc: T[]) => [...cur.filter((x) => !inc.some((y) => y.id === x.id)), ...inc];
    await db.saveFolders(mergeById(app.folders, data.folders ?? []));
    await db.saveAssets(mergeById(app.assets, data.assets ?? []));
    await db.saveBrandKits(mergeById(app.brandKits, data.brandKits ?? []));
    if (data.settings) await db.saveSettings({ ...app.settings, ...data.settings });
    for (const [id, v] of Object.entries(data.versions ?? {})) await db.saveVersions(id, v as any);
    for (const [id, url] of Object.entries<string>(data.blobs ?? {})) await db.putBlob(id, await (await fetch(url)).blob());
    if (data.planner) localStorage.setItem('cream-planner', JSON.stringify(data.planner));
    app.toast('Backup restored — reloading…', 'success');
    setTimeout(() => location.reload(), 600);
  } catch {
    app.toast('Could not read that backup', 'error');
  }
}

async function deleteEverything() {
  if (!confirm('Delete ALL Cream data on this device? Designs, uploads, brand kits and settings will be permanently removed.')) return;
  if (prompt('Type DELETE to confirm') !== 'DELETE') return;
  await clear(createStore('cream-db', 'kv'));
  await clear(createStore('cream-blobs', 'blobs'));
  ['cream-planner', 'cream-custom-sizes', 'cream-avatar-color'].forEach((k) => localStorage.removeItem(k));
  location.hash = '#/';
  location.reload();
}

function Account() {
  return (
    <>
      <div className="notice">
        <Icon name="HardDrive" size={16} /> Cream is local-first. There’s no password, login or server — everything is stored in this browser’s IndexedDB.
      </div>
      <Card title="Login & security" desc="Sign-in methods, 2-step verification and sessions don’t apply to a local-only app.">
        <Row label="Login methods" desc="None needed">
          <span className="badge">Local device</span>
        </Row>
        <Row label="Active sessions" desc={navigator.userAgent.split(') ')[0] + ')'}>
          <span className="badge">This browser</span>
        </Row>
      </Card>
      <Card title="Download your content" desc="Export every design, folder, upload, brand kit, version and setting as one JSON backup file.">
        <div className="row">
          <button className="btn primary" onClick={exportAll} data-testid="export-backup">
            <Icon name="Download" size={16} /> Export all data
          </button>
          <button className="btn" onClick={importBackup} data-testid="import-backup">
            <Icon name="Upload" size={16} /> Import backup
          </button>
        </div>
      </Card>
      <Card title="Delete account" desc="Permanently remove all Cream data from this browser. This can’t be undone — export a backup first.">
        <button className="btn danger" onClick={deleteEverything} data-testid="delete-all-data">
          <Icon name="Trash2" size={16} /> Delete all data
        </button>
      </Card>
    </>
  );
}

function AccessibilityTab() {
  const s = useApp((x) => x.settings);
  const up = useApp.getState().updateSettings;
  return (
    <Card title="Accessibility" desc="Make Cream easier to see and use.">
      <Row label="Theme" desc="Choose how Cream looks to you">
        <Segmented
          value={s.theme}
          onChange={(v) => up({ theme: v })}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'system', label: 'Sync with system' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </Row>
      <Row label="High color contrast" desc="Stronger text and borders">
        <Toggle on={s.highContrast} onChange={(v) => up({ highContrast: v })} testId="toggle-contrast" />
      </Row>
      <Row label="Reduce motion" desc="Minimise animations across the interface">
        <Toggle on={s.reduceMotion} onChange={(v) => up({ reduceMotion: v })} testId="toggle-motion" />
      </Row>
    </Card>
  );
}

function usePref(key: string, def: boolean): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem('cream-pref-' + key);
      return raw === null ? def : raw === '1';
    } catch {
      return def;
    }
  });
  return [
    v,
    (n) => {
      setV(n);
      localStorage.setItem('cream-pref-' + key, n ? '1' : '0');
    },
  ];
}

function PrefRow({ k, label, desc, def = true }: { k: string; label: string; desc?: string; def?: boolean }) {
  const [v, setV] = usePref(k, def);
  return (
    <Row label={label} desc={desc}>
      <Toggle on={v} onChange={setV} />
    </Row>
  );
}

function Messages() {
  return (
    <Card title="Message preferences" desc="In-app notifications (the bell) are always on. Cream never sends email — these toggles control which in-app messages you see.">
      <PrefRow k="comments" label="Comments & mentions" desc="When someone comments or @mentions you" />
      <PrefRow k="shares" label="Shared designs" desc="When a design is shared with you" />
      <PrefRow k="approvals" label="Approvals" desc="Approval requests and decisions" />
      <PrefRow k="planner" label="Content Planner reminders" desc="Before a scheduled post is due" />
      <PrefRow k="news" label="What’s new" desc="Product updates and tips" def={false} />
    </Card>
  );
}

function Privacy() {
  return (
    <Card title="Privacy controls" desc="Cream has no servers, analytics or cookies. Your designs never leave this device unless you export or share them.">
      <PrefRow k="ai-training" label="Use my content to improve AI" desc="Off — nothing is ever uploaded" def={false} />
      <PrefRow k="ai-personal" label="AI personalisation" desc="Let Cream AI remember preferences locally (see AI tab)" />
      <PrefRow k="third-party" label="Third-party media sources" desc="Search Openverse, Iconify, Wikimedia and Fontsource for assets" />
    </Card>
  );
}

function Storage() {
  const designs = useApp((s) => s.designs);
  const assets = useApp((s) => s.assets);
  const [est, setEst] = useState<{ usage?: number; quota?: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [kvBytes, setKvBytes] = useState<number | null>(null);
  useEffect(() => {
    navigator.storage?.estimate?.().then(setEst).catch(() => setEst({}));
    navigator.storage?.persisted?.().then(setPersisted).catch(() => {});
    entries(createStore('cream-db', 'kv'))
      .then((all) => setKvBytes(all.reduce((n, [, v]) => n + JSON.stringify(v).length, 0)))
      .catch(() => {});
  }, []);
  const n = Object.values(designs);
  const live = assets.filter((a) => !a.trashedAt);
  const kinds = ['image', 'video', 'audio', 'font'] as const;
  const pct = est?.usage && est?.quota ? Math.min(100, (est.usage / est.quota) * 100) : 0;
  return (
    <>
      <Card title="Data & storage" desc="How much of this browser’s storage Cream is using.">
        <div className="storage-bar">
          <div style={{ width: Math.max(1, pct) + '%' }} />
        </div>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }} data-testid="storage-usage">
          <b>{est?.usage != null ? fmtBytes(est.usage) : '…'} used</b>
          <span className="muted">{est?.quota ? `of ${fmtBytes(est.quota)} available` : ''}</span>
        </div>
        <div className="stat-grid">
          <div className="stat">
            <b>{n.filter((d) => !d.trashedAt).length}</b>
            <span>Designs</span>
          </div>
          <div className="stat">
            <b>{n.filter((d) => d.trashedAt).length}</b>
            <span>In trash</span>
          </div>
          {kinds.map((k) => (
            <div className="stat" key={k}>
              <b>{fmtBytes(live.filter((a) => a.kind === k).reduce((s, a) => s + a.size, 0))}</b>
              <span>{k[0].toUpperCase() + k.slice(1)}s ({live.filter((a) => a.kind === k).length})</span>
            </div>
          ))}
          <div className="stat">
            <b>{kvBytes != null ? fmtBytes(kvBytes) : '…'}</b>
            <span>Design data</span>
          </div>
        </div>
      </Card>
      <Card title="Persistent storage" desc="Ask the browser not to evict Cream’s data when space runs low.">
        <Row label="Storage mode" desc={persisted ? 'Persistent — protected from automatic clean-up' : 'Best-effort — the browser may clear it under pressure'}>
          <button
            className="btn sm"
            disabled={!!persisted}
            onClick={async () => {
              const ok = await navigator.storage?.persist?.();
              setPersisted(!!ok);
              useApp.getState().toast(ok ? 'Storage is now persistent' : 'The browser declined persistent storage', ok ? 'success' : 'info');
            }}
          >
            {persisted ? 'Persistent' : 'Make persistent'}
          </button>
        </Row>
      </Card>
    </>
  );
}

function Teams() {
  const name = useApp((s) => s.settings.userName);
  return (
    <>
      <Card title="Your teams" desc="Teams are simulated in Cream — collaboration happens by sharing exported files and view links.">
        {[
          { n: `${name}’s personal space`, r: 'Owner', m: 1, c: '#8b3dff' },
          { n: 'Cream Design Co. (demo)', r: 'Brand designer', m: 12, c: '#00c4cc' },
        ].map((t) => (
          <div className="set-row" key={t.n}>
            <span className="team-ico" style={{ background: t.c }}>
              {t.n[0]}
            </span>
            <div className="grow">
              <div className="set-label">{t.n}</div>
              <div className="faint">
                {t.r} · {t.m} member{t.m > 1 ? 's' : ''}
              </div>
            </div>
            <button className="btn sm" onClick={() => useApp.getState().toast('Teams are a demo in local-first Cream')}>
              {t.r === 'Owner' ? 'Manage' : 'Leave team'}
            </button>
          </div>
        ))}
        <button className="btn" style={{ marginTop: 12 }} onClick={() => useApp.getState().toast('Teams are a demo in local-first Cream')}>
          <Icon name="Plus" size={16} /> Create a team
        </button>
      </Card>
      <Card title="Roles">
        {[
          ['Owner', 'Full control including billing and deletion'],
          ['Admin', 'Manage members, roles, content and permissions'],
          ['Brand designer', 'Manage Brand Kits and Brand Templates'],
          ['Member', 'Create and collaborate on designs'],
        ].map(([r, d]) => (
          <Row key={r} label={r} desc={d}>
            <span />
          </Row>
        ))}
      </Card>
    </>
  );
}

const PLANS = [
  { id: 'free', name: 'Free', price: '$0', per: '', storage: '5 GB', kits: '1', feats: ['1.6M+ templates', 'Basic AI uses', 'Watermark on premium assets'] },
  { id: 'pro', name: 'Pro', price: '$18', per: '/month · $180/year', storage: '100 GB', kits: '5', feats: ['Background remover & Magic Switch', 'Content scheduling', 'Version history', 'Premium assets & Cream AI'] },
  { id: 'business', name: 'Business', price: '$25', per: '/person/month', storage: '500 GB', kits: '100', feats: ['Everything in Pro', 'Admin controls & approvals', 'Brand controls', '10% off printing'] },
  { id: 'enterprise', name: 'Enterprise', price: 'Contact', per: 'sales', storage: '1 TB', kits: '1,000', feats: ['SSO & SCIM', 'Audit logs', 'Multi-team orgs', 'IP indemnification'] },
];

function Billing() {
  return (
    <>
      <div className="notice success">
        <Icon name="BadgeCheck" size={16} /> Every feature is unlocked in Cream — no subscription, no limits. The plan comparison below is for reference only.
      </div>
      <div className="plan-grid" data-testid="plan-grid">
        {PLANS.map((p) => (
          <div key={p.id} className={'plan' + (p.id === 'pro' ? ' current' : '')}>
            {p.id === 'pro' && <span className="plan-tag">Equivalent to what you have</span>}
            <h3>{p.name}</h3>
            <div className="plan-price">
              <b>{p.price}</b> <span className="faint">{p.per}</span>
            </div>
            <div className="plan-meta">
              <span>
                <Icon name="HardDrive" size={14} /> {p.storage} storage
              </span>
              <span>
                <Icon name="Crown" size={14} /> {p.kits} brand kit{p.kits === '1' ? '' : 's'}
              </span>
            </div>
            <ul>
              {p.feats.map((f) => (
                <li key={f}>
                  <Icon name="Check" size={14} /> {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Card title="Orders & invoices" desc="No orders yet. Print Shop orders are simulated and appear as notifications.">
        <span />
      </Card>
    </>
  );
}

export default function SettingsPage({ tab = 'profile' }: { tab?: string }) {
  const cur = TABS.find((t) => t.id === tab) ?? TABS[0];
  const go = (id: string) => useApp.getState().navigate({ name: 'home', section: 'settings', param: id });
  const groups = [...new Set(TABS.map((t) => t.group))];
  return (
    <div className="home-content settings" data-testid="settings-page">
      <h1 className="page-title">{cur.group}</h1>
      <div className="settings-layout">
        <aside className="settings-nav">
          {groups.map((g) => (
            <div key={g}>
              <div className="menu-title">{g}</div>
              {TABS.filter((t) => t.group === g).map((t) => (
                <button key={t.id} className={'nav-item sm' + (t.id === cur.id ? ' active' : '')} onClick={() => go(t.id)} data-testid={'settings-tab-' + t.id}>
                  <Icon name={t.icon} size={17} /> {t.label}
                </button>
              ))}
            </div>
          ))}
        </aside>
        <div className="settings-body">
          {cur.id === 'profile' && <Profile />}
          {cur.id === 'account' && <Account />}
          {cur.id === 'accessibility' && <AccessibilityTab />}
          {cur.id === 'messages' && <Messages />}
          {cur.id === 'privacy' && <Privacy />}
          {cur.id === 'storage' && <Storage />}
          {cur.id === 'teams' && <Teams />}
          {cur.id === 'billing' && <Billing />}
          {cur.id === 'ai' && (
            <Safe label="AI settings">
              <AISettings />
            </Safe>
          )}
        </div>
      </div>
    </div>
  );
}
