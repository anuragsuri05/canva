// Photos tab: Openverse CC photo search with category, orientation, colour and licence filters.
import { useState } from 'react';
import { useDebounced } from '../ui/ui';
import type { ImageCategory, Orientation } from '../assets/openverse';
import { ChipRow, PanelSearch } from './common';
import { PhotoResults } from './browsers';

const TOPICS = ['Nature', 'Business', 'Food', 'Travel', 'Abstract', 'Animals', 'Technology', 'People', 'Texture', 'City', 'Flowers', 'Sky', 'Office', 'Fitness'];
export const ORIENTATIONS: { value: Orientation; label: string }[] = [
  { value: '', label: 'Any orientation' },
  { value: 'wide', label: 'Horizontal' },
  { value: 'tall', label: 'Vertical' },
  { value: 'square', label: 'Square' },
];
export const COLORS = ['', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'black', 'white'];
const COLOR_HEX: Record<string, string> = { red: '#e5484d', orange: '#ff8a4c', yellow: '#fcc419', green: '#51cf66', blue: '#339af0', purple: '#8b3dff', pink: '#f06595', black: '#1d1a26', white: '#ffffff' };

export function PhotoFilters({
  orientation,
  setOrientation,
  color,
  setColor,
  category,
  setCategory,
  commercial,
  setCommercial,
}: {
  orientation: Orientation;
  setOrientation: (o: Orientation) => void;
  color: string;
  setColor: (c: string) => void;
  category: ImageCategory;
  setCategory: (c: ImageCategory) => void;
  commercial: boolean;
  setCommercial: (b: boolean) => void;
}) {
  return (
    <>
      <div className="pn-chips-scroll" data-testid="photo-filters">
        <select className="select" style={{ height: 28, width: 'auto', fontSize: 12.5, borderRadius: 999 }} value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)} data-testid="photo-orientation" aria-label="Orientation">
          {ORIENTATIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select className="select" style={{ height: 28, width: 'auto', fontSize: 12.5, borderRadius: 999 }} value={category} onChange={(e) => setCategory(e.target.value as ImageCategory)} aria-label="Type">
          <option value="">All types</option>
          <option value="photograph">Photographs</option>
          <option value="illustration">Illustrations</option>
          <option value="digitized_artwork">Artwork</option>
        </select>
        <button className={'chip' + (commercial ? ' active' : '')} onClick={() => setCommercial(!commercial)} title="Only show images licensed for commercial use">
          Commercial use
        </button>
      </div>
      <div className="row" style={{ gap: 5, marginTop: 8 }} aria-label="Colour">
        {COLORS.map((c) => (
          <button
            key={c || 'any'}
            title={c ? c[0].toUpperCase() + c.slice(1) : 'Any colour'}
            aria-label={c || 'Any colour'}
            onClick={() => setColor(c)}
            className={'swatch' + (color === c ? ' active' : '')}
            style={{ width: 20, height: 20, flex: 'none', background: c ? COLOR_HEX[c] : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
          />
        ))}
      </div>
    </>
  );
}

export default function PhotosPanel() {
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState('');
  const [orientation, setOrientation] = useState<Orientation>('');
  const [color, setColor] = useState('');
  const [category, setCategory] = useState<ImageCategory>('photograph');
  const [commercial, setCommercial] = useState(false);
  const dq = useDebounced(q, 400);
  const base = dq.trim() || topic || 'landscape';
  const query = { q: [color, base].filter(Boolean).join(' '), orientation, category, commercial };
  return (
    <div className="pn" data-testid="photos-panel">
      <div className="pn-sticky">
        <PanelSearch value={q} onChange={setQ} placeholder="Search photos" testId="photos-search" autoFocus />
        {!q && <ChipRow options={TOPICS.map((t) => ({ value: t.toLowerCase(), label: t }))} value={topic} onChange={setTopic} />}
        <PhotoFilters {...{ orientation, setOrientation, color, setColor, category, setCategory, commercial, setCommercial }} />
      </div>
      <PhotoResults query={query} />
    </div>
  );
}
