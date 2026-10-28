// Content Planner: month calendar of scheduled social posts (localStorage 'cream-planner').
import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useApp } from '../store/app';
import { uid } from '../model/defaults';
import { Icon, Modal } from '../ui/ui';
import { DesignThumb } from './Thumb';
import { openDesign } from './actions';
import { sortDesigns } from './Projects';

export interface PlannedPost {
  id: string;
  designId: string;
  platform: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  caption: string;
  createdAt: number;
}

const KEY = 'cream-planner';
export const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', color: '#e1306c', icon: 'Camera' },
  { id: 'facebook', label: 'Facebook', color: '#1877f2', icon: 'ThumbsUp' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0a66c2', icon: 'Briefcase' },
  { id: 'x', label: 'X', color: '#111111', icon: 'AtSign' },
  { id: 'pinterest', label: 'Pinterest', color: '#e60023', icon: 'Pin' },
  { id: 'tiktok', label: 'TikTok', color: '#25f4ee', icon: 'Music2' },
  { id: 'youtube', label: 'YouTube', color: '#ff0000', icon: 'SquarePlay' },
  { id: 'slack', label: 'Slack', color: '#4a154b', icon: 'Hash' },
  { id: 'tumblr', label: 'Tumblr', color: '#36465d', icon: 'Type' },
];
const platform = (id: string) => PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];

export function loadPosts(): PlannedPost[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}
function savePosts(p: PlannedPost[]) {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event('cream-planner'));
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function PostDialog({ initial, onClose }: { initial: Partial<PlannedPost>; onClose: () => void }) {
  const designs = useApp(useShallow((s) => Object.values(s.designs).filter((d) => !d.trashedAt)));
  const sorted = useMemo(() => sortDesigns(designs, 'activity'), [designs]);
  const [p, setP] = useState<PlannedPost>({
    id: initial.id ?? uid(),
    designId: initial.designId ?? sorted[0]?.id ?? '',
    platform: initial.platform ?? 'instagram',
    date: initial.date ?? ymd(new Date()),
    time: initial.time ?? '09:00',
    caption: initial.caption ?? '',
    createdAt: initial.createdAt ?? Date.now(),
  });
  const d = designs.find((x) => x.id === p.designId);
  const editing = !!initial.id;
  const save = () => {
    if (!p.designId) return;
    const all = loadPosts().filter((x) => x.id !== p.id);
    savePosts([...all, p]);
    useApp.getState().toast(`Post scheduled for ${new Date(p.date + 'T' + p.time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`, 'success');
    useApp.getState().notify(`Scheduled “${d?.title ?? 'design'}” to ${platform(p.platform).label}`, p.designId);
    onClose();
  };
  return (
    <Modal
      title={editing ? 'Edit scheduled post' : 'Schedule a post'}
      onClose={onClose}
      size="wide"
      testId="planner-dialog"
      footer={
        <>
          {editing && (
            <button
              className="btn danger"
              style={{ marginRight: 'auto' }}
              onClick={() => {
                savePosts(loadPosts().filter((x) => x.id !== p.id));
                onClose();
              }}
            >
              Delete
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!p.designId} onClick={save} data-testid="planner-save">
            {editing ? 'Save' : 'Schedule post'}
          </button>
        </>
      }
    >
      {!designs.length ? (
        <div className="empty">Create a design first, then schedule it here.</div>
      ) : (
        <div className="planner-form">
          <div>
            <div className="planner-preview">{d && <DesignThumb design={d} />}</div>
            <div className="field" style={{ marginTop: 10 }}>
              <label>Design</label>
              <select className="select" value={p.designId} onChange={(e) => setP({ ...p, designId: e.target.value })} data-testid="planner-design">
                {sorted.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="field">
              <label>Platform</label>
              <div className="chips">
                {PLATFORMS.map((pl) => (
                  <button key={pl.id} className={'chip' + (p.platform === pl.id ? ' active' : '')} onClick={() => setP({ ...p, platform: pl.id })} data-testid={'planner-platform-' + pl.id}>
                    <Icon name={pl.icon} size={14} /> {pl.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="row">
              <div className="field grow">
                <label>Date</label>
                <input className="input" type="date" value={p.date} onChange={(e) => setP({ ...p, date: e.target.value })} data-testid="planner-date" />
              </div>
              <div className="field grow">
                <label>Time</label>
                <input className="input" type="time" value={p.time} onChange={(e) => setP({ ...p, time: e.target.value })} data-testid="planner-time" />
              </div>
            </div>
            <div className="field">
              <label>Caption</label>
              <textarea className="textarea" rows={5} placeholder="Write a caption… #hashtags" value={p.caption} onChange={(e) => setP({ ...p, caption: e.target.value })} data-testid="planner-caption" />
              <span className="faint" style={{ textAlign: 'right' }}>
                {p.caption.length} / 2,200
              </span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Planner() {
  const [posts, setPosts] = useState<PlannedPost[]>(loadPosts);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [dialog, setDialog] = useState<Partial<PlannedPost> | null>(null);
  const designs = useApp((s) => s.designs);
  useEffect(() => {
    const h = () => setPosts(loadPosts());
    window.addEventListener('cream-planner', h);
    window.addEventListener('storage', h);
    return () => {
      window.removeEventListener('cream-planner', h);
      window.removeEventListener('storage', h);
    };
  }, []);

  const start = new Date(month);
  start.setDate(1 - start.getDay());
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const today = ymd(new Date());
  const byDay = useMemo(() => {
    const m: Record<string, PlannedPost[]> = {};
    posts.forEach((p) => (m[p.date] ??= []).push(p));
    Object.values(m).forEach((l) => l.sort((a, b) => a.time.localeCompare(b.time)));
    return m;
  }, [posts]);
  const upcoming = posts.filter((p) => p.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  return (
    <div className="home-content planner" data-testid="planner-page">
      <div className="page-head-row">
        <h1 className="page-title">Content Planner</h1>
        <span className="grow" />
        <button className="btn primary" onClick={() => setDialog({})} data-testid="planner-add">
          <Icon name="Plus" size={16} /> Schedule post
        </button>
      </div>
      <div className="planner-layout">
        <div className="cal">
          <div className="cal-head">
            <button className="icon-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month" data-testid="planner-prev">
              <Icon name="ChevronLeft" size={18} />
            </button>
            <h2 data-testid="planner-month">{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2>
            <button className="icon-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month" data-testid="planner-next">
              <Icon name="ChevronRight" size={18} />
            </button>
            <button
              className="btn sm"
              onClick={() => {
                const d = new Date();
                setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
              }}
            >
              Today
            </button>
          </div>
          <div className="cal-grid">
            {DOW.map((d) => (
              <div key={d} className="cal-dow">
                {d}
              </div>
            ))}
            {days.map((d) => {
              const k = ymd(d);
              const list = byDay[k] ?? [];
              return (
                <div
                  key={k}
                  className={'cal-day' + (d.getMonth() !== month.getMonth() ? ' out' : '') + (k === today ? ' today' : '') + (k < today ? ' past' : '')}
                  onClick={() => setDialog({ date: k })}
                  data-testid={'cal-' + k}
                >
                  <span className="cal-num">{d.getDate()}</span>
                  {list.slice(0, 3).map((p) => (
                    <button
                      key={p.id}
                      className="cal-post"
                      style={{ borderLeftColor: platform(p.platform).color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDialog(p);
                      }}
                      title={p.caption}
                      data-testid="cal-post"
                    >
                      <b>{p.time}</b> {designs[p.designId]?.title ?? 'Deleted design'}
                    </button>
                  ))}
                  {list.length > 3 && <span className="faint">+{list.length - 3} more</span>}
                </div>
              );
            })}
          </div>
        </div>
        <aside className="planner-side">
          <h3>Upcoming</h3>
          {!upcoming.length && <div className="faint">Nothing scheduled. Click a day to plan a post.</div>}
          {upcoming.slice(0, 12).map((p) => {
            const d = designs[p.designId];
            const pl = platform(p.platform);
            return (
              <div key={p.id} className="up-item" onClick={() => setDialog(p)}>
                <span className="up-ico" style={{ background: pl.color }}>
                  <Icon name={pl.icon} size={14} />
                </span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="ellipsis">
                    <b>{d?.title ?? 'Deleted design'}</b>
                  </div>
                  <div className="faint">
                    {new Date(p.date + 'T' + p.time).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {pl.label}
                  </div>
                </div>
                {d && (
                  <button
                    className="icon-btn"
                    title="Open design"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDesign(d.id);
                    }}
                  >
                    <Icon name="ExternalLink" size={15} />
                  </button>
                )}
              </div>
            );
          })}
          <div className="notice" style={{ marginTop: 16 }}>
            <Icon name="Info" size={16} /> Cream plans posts locally — when it’s time, open the design and download or share it to the platform.
          </div>
        </aside>
      </div>
      {dialog && <PostDialog initial={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
