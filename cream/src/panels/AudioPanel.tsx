// Audio tab: Openverse CC music + sound effects with preview playback.
import { useState } from 'react';
import { Segmented, useDebounced } from '../ui/ui';
import type { AudioCategory, AudioLength } from '../assets/openverse';
import { ChipRow, PanelSearch } from './common';
import { AudioResults } from './browsers';

const MOODS = ['Upbeat', 'Chill', 'Cinematic', 'Lo-fi', 'Acoustic', 'Electronic', 'Jazz', 'Ambient', 'Piano', 'Rock', 'Happy', 'Corporate', 'Hip hop', 'Classical'];
const SFX = ['Whoosh', 'Click', 'Applause', 'Birds', 'Rain', 'Door', 'Explosion', 'Notification', 'Laugh', 'Wind'];

export default function AudioPanel() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Exclude<AudioCategory, ''>>('music');
  const [chip, setChip] = useState('');
  const [length, setLength] = useState<AudioLength>('');
  const dq = useDebounced(q, 400);
  const chips = cat === 'music' ? MOODS : SFX;
  const term = dq.trim() || chip || (cat === 'music' ? 'music' : 'sound');
  return (
    <div className="pn" data-testid="audio-panel">
      <div className="pn-sticky">
        <PanelSearch value={q} onChange={setQ} placeholder={cat === 'music' ? 'Search music' : 'Search sound effects'} testId="audio-search" autoFocus />
        <div className="row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
          <Segmented
            value={cat}
            onChange={(v) => {
              setCat(v);
              setChip('');
            }}
            options={[
              { value: 'music', label: 'Music' },
              { value: 'sound_effect', label: 'Sound effects' },
            ]}
          />
          <select className="select" style={{ width: 'auto', height: 30, fontSize: 12.5 }} value={length} onChange={(e) => setLength(e.target.value as AudioLength)} aria-label="Duration">
            <option value="">Any length</option>
            <option value="short">Under 30s</option>
            <option value="medium">30s – 2 min</option>
            <option value="long">Over 2 min</option>
          </select>
        </div>
        {!q && <ChipRow options={chips.map((t) => ({ value: t.toLowerCase(), label: t }))} value={chip} onChange={setChip} testId="audio-chips" />}
      </div>
      <AudioResults q={term} category={cat} length={length} />
    </div>
  );
}
