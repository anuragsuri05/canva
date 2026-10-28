// Videos tab: Wikimedia Commons video search with poster thumbnails, duration and hover preview.
import { useState } from 'react';
import { useDebounced } from '../ui/ui';
import { ChipRow, PanelSearch } from './common';
import { VideoResults } from './browsers';

const TOPICS = ['Nature', 'Ocean', 'City', 'Space', 'Animals', 'Timelapse', 'Sky', 'Fire', 'Rain', 'Mountains', 'Birds', 'Sport'];

export default function VideosPanel() {
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState('');
  const dq = useDebounced(q, 400);
  return (
    <div className="pn" data-testid="videos-panel">
      <div className="pn-sticky">
        <PanelSearch value={q} onChange={setQ} placeholder="Search videos" testId="videos-search" autoFocus />
        {!q && <ChipRow options={TOPICS.map((t) => ({ value: t.toLowerCase(), label: t }))} value={topic} onChange={setTopic} />}
      </div>
      <p className="faint" style={{ margin: '0 0 8px' }}>
        Free videos from Wikimedia Commons. Hover to preview, click to add.
      </p>
      <VideoResults q={dq.trim() || topic || 'nature timelapse'} />
    </div>
  );
}
