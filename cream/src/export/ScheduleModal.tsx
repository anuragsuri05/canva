import { useState } from 'react';
import { Modal, Icon } from '../ui/ui';
import { useEditor } from '../store/editor';
import { useApp } from '../store/app';
import { uid } from '../model/defaults';
import type { Design } from '../model/types';
import { PageView } from '../render/PageView';
import './export.css';

export interface PlannedPost {
  id: string;
  designId: string;
  platform: string;
  date: string; // ISO datetime
  caption: string;
  pageId?: string;
  title?: string;
  createdAt?: number;
}

export const PLANNER_KEY = 'cream-planner';
export const PLATFORMS = [
  { id: 'instagram', label: 'Instagram Business', icon: 'Instagram' },
  { id: 'facebook', label: 'Facebook Page', icon: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'Linkedin' },
  { id: 'pinterest', label: 'Pinterest', icon: 'Pin' },
  { id: 'x', label: 'X (Twitter)', icon: 'Twitter' },
  { id: 'tiktok', label: 'TikTok', icon: 'Music2' },
  { id: 'youtube', label: 'YouTube', icon: 'Youtube' },
  { id: 'slack', label: 'Slack', icon: 'MessageSquare' },
  { id: 'tumblr', label: 'Tumblr', icon: 'Type' },
];

export function loadPlanner(): PlannedPost[] {
  try {
    return JSON.parse(localStorage.getItem(PLANNER_KEY) || '[]');
  } catch {
    return [];
  }
}

export function savePlanner(posts: PlannedPost[]) {
  localStorage.setItem(PLANNER_KEY, JSON.stringify(posts));
}

const pad = (n: number) => String(n).padStart(2, '0');
function defaultDate() {
  const d = new Date(Date.now() + 86400000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ScheduleModal({ onClose }: { onClose: () => void }) {
  const design = useEditor((s) => s.design) as Design;
  const pageId = useEditor((s) => s.pageId);
  const [platform, setPlatform] = useState('instagram');
  const [date, setDate] = useState(defaultDate());
  const [time, setTime] = useState('09:00');
  const [caption, setCaption] = useState('');
  const [page, setPage] = useState(pageId ?? design.pages[0].id);
  const pg = design.pages.find((p) => p.id === page) ?? design.pages[0];
  const scale = 160 / Math.max(design.width, pg.height ?? design.height);
  const schedule = () => {
    const when = new Date(`${date}T${time}`);
    if (isNaN(when.getTime())) return useApp.getState().toast('Pick a valid date and time', 'error');
    const post: PlannedPost = { id: uid(), designId: design.id, platform, date: when.toISOString(), caption, pageId: page, title: design.title, createdAt: Date.now() };
    savePlanner([...loadPlanner(), post]);
    const pl = PLATFORMS.find((p) => p.id === platform)!.label;
    useApp.getState().notify(`Post scheduled to ${pl} for ${when.toLocaleString()}`, design.id);
    useApp.getState().toast(`Scheduled for ${when.toLocaleString()}`, 'success');
    onClose();
  };
  return (
    <Modal title="Schedule" onClose={onClose} testId="schedule-modal">
      <div className="xp-modal">
        <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
          <div className="col" style={{ alignItems: 'center' }}>
            <div style={{ borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <PageView design={design} page={pg} scale={scale} ctx={{ mode: 'static', pageIndex: design.pages.indexOf(pg), pageCount: design.pages.length }} />
            </div>
            {design.pages.length > 1 && (
              <select className="select" value={page} onChange={(e) => setPage(e.target.value)} style={{ width: 160 }}>
                {design.pages.map((p, i) => (
                  <option key={p.id} value={p.id}>
                    Page {i + 1}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="grow">
            <div className="field">
              <label>Channel</label>
              <select className="select" value={platform} onChange={(e) => setPlatform(e.target.value)} data-testid="schedule-platform">
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="xp-split">
              <div className="field">
                <label>Date</label>
                <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="schedule-date" />
              </div>
              <div className="field">
                <label>Time</label>
                <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Caption</label>
              <textarea className="textarea" rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write a caption… #hashtags" onKeyDown={(e) => e.stopPropagation()} data-testid="schedule-caption" />
              <span className="faint">{caption.length} / 2200</span>
            </div>
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn" onClick={() => useApp.getState().navigate({ name: 'home', section: 'planner' })}>
            <Icon name="CalendarDays" size={16} /> Content Planner
          </button>
          <button className="btn primary" onClick={schedule} data-testid="schedule-submit">
            Schedule post
          </button>
        </div>
      </div>
    </Modal>
  );
}
