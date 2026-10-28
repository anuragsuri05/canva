// Elements tab (Canva "Elements"): search across every source, Recently used, and browsable sections
// (Shapes, Lines, Graphics, Stickers, Icons, Photos, Videos, Audio, Charts, Tables, Frames, Grids, Gradients, 3D, Mockups).
import { useMemo, useState, type ReactNode } from 'react';
import { useDebounced } from '../ui/ui';
import { clearRecent, useRecent } from '../assets/recent';
import { usePaged } from '../assets/usePaged';
import { browseGroup, searchGroup, type IconGroup } from '../assets/iconify';
import { searchAudio, searchImages, type ImageCategory, type Orientation } from '../assets/openverse';
import { searchVideos } from '../assets/wikimedia';
import { matches } from './catalog';
import { AudioList, BackBar, EmptyBox, ErrorBox, IconTile, PanelSearch, PhotoTile, SectionHead, VideoTile } from './common';
import { AudioResults, IconResults, PhotoResults, VideoResults } from './browsers';
import { PhotoFilters } from './PhotosPanel';
import {
  ALL_FRAMES,
  ALL_GRIDS,
  ALL_SHAPES,
  CHARTS,
  ChartTile,
  FrameTile,
  GRADIENTS,
  GradientTile,
  GridTile,
  LINE_PRESETS,
  LineTile,
  MOCKUPS,
  RecentTile,
  ShapeTile,
  TABLE_PRESETS,
  TableTile,
} from './elementTiles';
import { Spinner } from '../ui/ui';
import { takeElementsSection } from './nav';

type SectionId =
  | 'recent'
  | 'shapes'
  | 'lines'
  | 'graphics'
  | 'stickers'
  | 'icons'
  | 'photos'
  | 'videos'
  | 'audio'
  | 'charts'
  | 'tables'
  | 'frames'
  | 'grids'
  | 'gradients'
  | '3d'
  | 'mockups';

const TITLES: Record<SectionId, string> = {
  recent: 'Recently used',
  shapes: 'Shapes',
  lines: 'Lines',
  graphics: 'Graphics',
  stickers: 'Stickers',
  icons: 'Icons',
  photos: 'Photos',
  videos: 'Videos',
  audio: 'Audio',
  charts: 'Charts',
  tables: 'Tables',
  frames: 'Frames',
  grids: 'Grids',
  gradients: 'Gradients',
  '3d': '3D',
  mockups: 'Mockups',
};

type SearchTab = 'all' | 'graphics' | 'photos' | 'videos' | 'audio' | 'shapes' | 'stickers' | 'icons' | 'charts' | 'tables' | 'frames' | 'grids';
const SEARCH_TABS: { id: SearchTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'graphics', label: 'Graphics' },
  { id: 'photos', label: 'Photos' },
  { id: 'videos', label: 'Videos' },
  { id: 'audio', label: 'Audio' },
  { id: 'shapes', label: 'Shapes' },
  { id: 'stickers', label: 'Stickers' },
  { id: 'icons', label: 'Icons' },
  { id: 'charts', label: 'Charts' },
  { id: 'tables', label: 'Tables' },
  { id: 'frames', label: 'Frames' },
  { id: 'grids', label: 'Grids' },
];

const ICON_GROUP: Partial<Record<SectionId, IconGroup>> = { graphics: 'graphics', stickers: 'stickers', icons: 'icons', '3d': '3d' };

export default function ElementsPanel() {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<SearchTab>('all');
  const [view, setView] = useState<SectionId | null>(() => takeElementsSection() as SectionId | null);
  const dq = useDebounced(q.trim(), 400);

  const onQ = (v: string) => {
    setQ(v);
    setView(null);
    if (!v) setTab('all');
  };

  return (
    <div className="pn" data-testid="elements-panel">
      <div className="pn-sticky">
        <PanelSearch value={q} onChange={onQ} placeholder="Search elements" testId="elements-search" autoFocus />
        {q && (
          <div className="pn-tabs" role="tablist">
            {SEARCH_TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)} data-testid={`elements-tab-${t.id}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {q ? (
        dq ? (
          <SearchResults q={dq} tab={tab} setTab={setTab} />
        ) : (
          <Spinner />
        )
      ) : view ? (
        <>
          <BackBar title={TITLES[view]} onBack={() => setView(null)} />
          <Section id={view} q="" full />
        </>
      ) : (
        <Home onSeeAll={setView} />
      )}
    </div>
  );
}

/* ---------- Home (browse) ---------- */
function Home({ onSeeAll }: { onSeeAll: (s: SectionId) => void }) {
  const recent = useRecent();
  const order: SectionId[] = ['shapes', 'graphics', 'stickers', 'photos', 'videos', 'lines', 'icons', 'audio', 'charts', 'tables', 'frames', 'grids', 'gradients', '3d', 'mockups'];
  return (
    <>
      {recent.length > 0 && (
        <>
          <div className="section-head">
            <h3>Recently used</h3>
            <button onClick={clearRecent} data-testid="recent-clear">
              Clear
            </button>
          </div>
          <div className="pn-row-scroll" data-testid="recent-row">
            {recent.map((r) => (
              <RecentTile key={r.key} r={r} />
            ))}
          </div>
        </>
      )}
      {order.map((id) => (
        <div key={id} data-testid={`section-${id}`}>
          <SectionHead title={TITLES[id]} onSeeAll={() => onSeeAll(id)} testId={`see-all-${id}`} />
          <Section id={id} q="" />
        </div>
      ))}
    </>
  );
}

/* ---------- One section, either a preview row or the full ("See all") list ---------- */
function Section({ id, q, full }: { id: SectionId; q: string; full?: boolean }) {
  const lim = (n: number) => (full ? Infinity : n);
  switch (id) {
    case 'shapes': {
      const list = ALL_SHAPES.filter((s) => matches(q, s.label, s.kind)).slice(0, lim(8));
      return list.length ? <div className="pn-grid">{list.map((s) => <ShapeTile key={s.kind} kind={s.kind} label={s.label} />)}</div> : <EmptyBox>No shapes match “{q}”.</EmptyBox>;
    }
    case 'lines': {
      const list = LINE_PRESETS.filter((l) => matches(q, l.label, 'line arrow connector')).slice(0, lim(4));
      return <div className="pn-grid">{list.map((l) => <LineTile key={l.id} id={l.id} />)}</div>;
    }
    case 'charts': {
      const list = CHARTS.filter((c) => matches(q, c.label, c.keywords, 'chart graph')).slice(0, lim(4));
      return list.length ? <div className={full ? 'pn-grid c2' : 'pn-grid'}>{list.map((c) => <ChartTile key={c.type} type={c.type} wide={full} />)}</div> : <EmptyBox>No charts match “{q}”.</EmptyBox>;
    }
    case 'tables': {
      const list = TABLE_PRESETS.slice(0, lim(4));
      return <div className="pn-grid">{list.map(([r, c]) => <TableTile key={`${r}x${c}`} r={r} c={c} />)}</div>;
    }
    case 'frames': {
      const list = ALL_FRAMES.filter((f) => matches(q, f.label, f.shape, 'frame photo')).slice(0, lim(4));
      return list.length ? <div className="pn-grid">{list.map((f) => <FrameTile key={f.shape + (f.letter ?? '')} shape={f.shape} letter={f.letter} label={f.label} />)}</div> : <EmptyBox>No frames match “{q}”.</EmptyBox>;
    }
    case 'grids': {
      const list = ALL_GRIDS.slice(0, lim(4));
      return <div className="pn-grid">{list.map((g) => <GridTile key={g} layout={g} />)}</div>;
    }
    case 'gradients': {
      if (!full) return <div className="pn-grid">{[0, 1, 2, 16].map((i) => <GradientTile key={i} idx={i} shape={i === 16 ? 'circle' : 'rect'} />)}</div>;
      return (
        <>
          <h4>Squares</h4>
          <div className="pn-grid">{GRADIENTS.map((g, i) => <GradientTile key={g.name} idx={i} />)}</div>
          <h4>Circles</h4>
          <div className="pn-grid">{GRADIENTS.map((g, i) => <GradientTile key={g.name} idx={i} shape="circle" />)}</div>
        </>
      );
    }
    case 'mockups':
      return <div className="pn-grid">{MOCKUPS.slice(0, lim(4)).map((m) => <FrameTile key={m.shape} shape={m.shape} label={m.label} />)}</div>;
    case 'graphics':
    case 'stickers':
    case 'icons':
    case '3d':
      return full ? <IconResults group={ICON_GROUP[id]!} q={q} /> : <IconPreview group={ICON_GROUP[id]!} q={q} />;
    case 'photos':
      return full ? <FullPhotos q={q} /> : <PhotoPreview q={q} />;
    case 'videos':
      return full ? <VideoResults q={q || 'nature timelapse'} /> : <VideoPreview q={q} />;
    case 'audio':
      return full ? <AudioResults q={q || 'music'} category={q ? undefined : 'music'} /> : <AudioPreview q={q} />;
    case 'recent':
      return null;
  }
}

/* ---------- Remote previews (first few items, no infinite scroll) ---------- */
function Preview<T>({ p, render, empty }: { p: { items: T[]; loading: boolean; error: string | null; retry: () => void }; render: (items: T[]) => ReactNode; empty?: string }) {
  if (p.error) return <ErrorBox message={p.error} onRetry={p.retry} />;
  if (!p.items.length && p.loading) return <div style={{ height: 70, display: 'grid', placeItems: 'center' }}><Spinner /></div>;
  if (!p.items.length) return <div className="faint" style={{ padding: '6px 0' }}>{empty ?? 'No results'}</div>;
  return <>{render(p.items)}</>;
}

function IconPreview({ group, q, n = 4 }: { group: IconGroup; q: string; n?: number }) {
  const sp = usePaged(q ? `${group}|${q}` : null, (page, signal) => searchGroup(group, q, page, signal));
  const bp = usePaged(q ? null : `browse|${group}`, (page, signal) => browseGroup(group, page, signal));
  const p = q ? sp : bp;
  return <Preview p={p} empty={`No ${group} match “${q}”.`} render={(items) => <div className="pn-grid">{items.slice(0, n).map((i) => <IconTile key={i.id} i={i} mono={group === 'icons'} />)}</div>} />;
}

function PhotoPreview({ q, n = 6 }: { q: string; n?: number }) {
  const query = { q: q || 'colorful', category: 'photograph' as const };
  const p = usePaged(JSON.stringify(query), (page, signal) => searchImages(query, page, signal));
  return <Preview p={p} empty={`No photos match “${q}”.`} render={(items) => <div className="pn-row-scroll">{items.slice(0, n).map((x) => <PhotoTile key={x.id} p={x} height={84} />)}</div>} />;
}

function VideoPreview({ q, n = 5 }: { q: string; n?: number }) {
  const term = q || 'nature timelapse';
  const p = usePaged(term, (page, signal) => searchVideos(term, page, signal));
  return <Preview p={p} empty={`No videos match “${q}”.`} render={(items) => <div className="pn-row-scroll">{items.slice(0, n).map((v) => <VideoTile key={v.id} v={v} height={84} />)}</div>} />;
}

function AudioPreview({ q, n = 3 }: { q: string; n?: number }) {
  const term = q || 'upbeat music';
  const p = usePaged(term, (page, signal) => searchAudio({ q: term }, page, signal));
  return <Preview p={p} empty={`No audio matches “${q}”.`} render={(items) => <AudioList items={items.slice(0, n)} />} />;
}

function FullPhotos({ q }: { q: string }) {
  const [orientation, setOrientation] = useState<Orientation>('');
  const [color, setColor] = useState('');
  const [category, setCategory] = useState<ImageCategory>('photograph');
  const [commercial, setCommercial] = useState(false);
  const query = useMemo(() => ({ q: [color, q || 'colorful'].filter(Boolean).join(' '), orientation, category, commercial }), [q, color, orientation, category, commercial]);
  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <PhotoFilters {...{ orientation, setOrientation, color, setColor, category, setCategory, commercial, setCommercial }} />
      </div>
      <PhotoResults query={query} />
    </>
  );
}

/* ---------- Search results ---------- */
function SearchResults({ q, tab, setTab }: { q: string; tab: SearchTab; setTab: (t: SearchTab) => void }) {
  if (tab !== 'all') return <Section id={tab as SectionId} q={q} full />;
  const local = (id: SectionId, has: boolean) =>
    has ? (
      <div key={id}>
        <SectionHead title={TITLES[id]} onSeeAll={() => setTab(id as SearchTab)} />
        <Section id={id} q={q} />
      </div>
    ) : null;
  const shapeHit = ALL_SHAPES.some((s) => matches(q, s.label, s.kind));
  const chartHit = CHARTS.some((c) => matches(q, c.label, c.keywords, 'chart graph'));
  const frameHit = ALL_FRAMES.some((f) => matches(q, f.label, f.shape, 'frame photo'));
  const lineHit = LINE_PRESETS.some((l) => matches(q, l.label, 'line arrow connector'));
  const tableHit = matches(q, 'table grid rows columns');
  const gridHit = matches(q, 'grid collage photo grid');
  return (
    <div data-testid="elements-results">
      {local('shapes', shapeHit)}
      {local('lines', lineHit)}
      <SectionHead title="Graphics" onSeeAll={() => setTab('graphics')} />
      <IconPreview group="graphics" q={q} />
      <SectionHead title="Photos" onSeeAll={() => setTab('photos')} />
      <PhotoPreview q={q} />
      <SectionHead title="Stickers" onSeeAll={() => setTab('stickers')} />
      <IconPreview group="stickers" q={q} />
      <SectionHead title="Videos" onSeeAll={() => setTab('videos')} />
      <VideoPreview q={q} />
      <SectionHead title="Icons" onSeeAll={() => setTab('icons')} />
      <IconPreview group="icons" q={q} />
      <SectionHead title="Audio" onSeeAll={() => setTab('audio')} />
      <AudioPreview q={q} />
      {local('charts', chartHit)}
      {local('frames', frameHit)}
      {local('tables', tableHit)}
      {local('grids', gridHit)}
    </div>
  );
}
