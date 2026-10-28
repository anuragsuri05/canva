// Apps tab: Discover grid of built-in "apps" (each opens a panel, right panel or modal), search and Your apps.
import { useMemo, useState } from 'react';
import { useEditor, type Modal, type RightPanel, type SidePanel } from '../store/editor';
import { useApp } from '../store/app';
import { Icon } from '../ui/ui';
import { pushList, readList } from '../assets/recent';
import { EmptyBox, PanelSearch, SectionHead } from './common';
import { matches } from './catalog';
import { requestElementsSection } from './nav';

interface App {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  category: 'Media' | 'AI' | 'Design' | 'Productivity';
  open: { side?: Exclude<SidePanel, null>; right?: Exclude<RightPanel, null>; modal?: Exclude<Modal, null>; elements?: string };
}

export const APPS: App[] = [
  { id: 'photos', name: 'Photos', desc: 'Millions of free CC photos from Openverse', icon: 'Image', color: '#22b8cf', category: 'Media', open: { side: 'photos' } },
  { id: 'videos', name: 'Videos', desc: 'Free stock video from Wikimedia Commons', icon: 'Film', color: '#e8590c', category: 'Media', open: { side: 'videos' } },
  { id: 'audio', name: 'Audio', desc: 'Music and sound effects for your videos', icon: 'Music', color: '#8b3dff', category: 'Media', open: { side: 'audio' } },
  { id: 'magic-media', name: 'Magic Media', desc: 'Generate images from a text prompt', icon: 'Wand2', color: '#00c4cc', category: 'AI', open: { side: 'magic-media' } },
  { id: 'magic-write', name: 'Magic Write', desc: 'Draft, rewrite and summarise text', icon: 'PenLine', color: '#ae3ec9', category: 'AI', open: { right: 'magic-write' } },
  { id: 'translate', name: 'Translate', desc: 'Translate the text in your design', icon: 'Languages', color: '#1c7ed6', category: 'AI', open: { right: 'translate' } },
  { id: 'qr', name: 'QR Code', desc: 'Turn any link into a scannable QR code', icon: 'QrCode', color: '#212529', category: 'Productivity', open: { modal: 'qr' } },
  { id: 'charts', name: 'Charts', desc: 'Bar, line, pie, progress and more', icon: 'BarChart3', color: '#2f9e6e', category: 'Design', open: { side: 'charts' } },
  { id: 'backgrounds', name: 'Backgrounds', desc: 'Colours, gradients and photo backgrounds', icon: 'Wallpaper', color: '#f59f00', category: 'Design', open: { side: 'backgrounds' } },
  { id: 'stickies', name: 'Sticky notes', desc: 'Brainstorm with colourful notes', icon: 'StickyNote', color: '#fab005', category: 'Productivity', open: { side: 'stickies' } },
  { id: 'mockups', name: 'Mockups', desc: 'Place designs in phones, laptops and frames', icon: 'Smartphone', color: '#495057', category: 'Design', open: { elements: 'mockups' } },
  { id: 'emoji', name: 'Emoji', desc: 'Thousands of open-source emoji stickers', icon: 'Smile', color: '#fcc419', category: 'Media', open: { elements: 'stickers' } },
  { id: 'icons', name: 'Icons', desc: 'Search 400k+ open-source icons', icon: 'Shapes', color: '#5f3dc4', category: 'Media', open: { elements: 'icons' } },
  { id: '3d', name: '3D graphics', desc: 'Glossy 3D-style objects and emoji', icon: 'Box', color: '#0ca678', category: 'Media', open: { elements: '3d' } },
  { id: 'frames', name: 'Frames', desc: 'Shape, letter and device photo frames', icon: 'Frame', color: '#c2255c', category: 'Design', open: { elements: 'frames' } },
  { id: 'draw', name: 'Draw', desc: 'Pens, markers and highlighters', icon: 'PenTool', color: '#d6336c', category: 'Design', open: { side: 'draw' } },
  { id: 'styles', name: 'Styles', desc: 'One-click colour palettes and font sets', icon: 'Palette', color: '#f76707', category: 'Design', open: { side: 'styles' } },
  { id: 'logos', name: 'Logos', desc: 'Your brand logos in one place', icon: 'Hexagon', color: '#343a40', category: 'Design', open: { side: 'logos' } },
];

const RECENT_KEY = 'cream.recentApps';
const OPTIONAL_TABS: SidePanel[] = ['photos', 'videos', 'audio', 'charts', 'magic-media', 'backgrounds', 'styles', 'logos', 'stickies'];

export function openApp(app: App) {
  pushList(RECENT_KEY, app.id);
  const o = app.open;
  if (o.side) {
    // Canva pins an opened app to the side rail.
    if (OPTIONAL_TABS.includes(o.side)) {
      const tabs = useApp.getState().settings.editorTabs;
      if (!tabs.includes(o.side)) useApp.getState().updateSettings({ editorTabs: [...tabs, o.side] });
    }
    useEditor.setState({ side: o.side });
  } else if (o.right) useEditor.setState({ right: o.right });
  else if (o.modal) useEditor.setState({ modal: o.modal });
  else if (o.elements) {
    requestElementsSection(o.elements);
    useEditor.setState({ side: 'elements' });
  }
}

function AppCard({ a }: { a: App }) {
  return (
    <button className="pn-app" onClick={() => openApp(a)} data-testid={`app-${a.id}`} title={a.desc}>
      <span className="ico" style={{ background: a.color }}>
        <Icon name={a.icon} size={20} />
      </span>
      <span className="nm">{a.name}</span>
      <span className="ds">{a.desc}</span>
    </button>
  );
}

export default function AppsPanel() {
  const [q, setQ] = useState('');
  const recent = useMemo(() => readList(RECENT_KEY).map((id) => APPS.find((a) => a.id === id)).filter((a): a is App => !!a), []);
  const results = APPS.filter((a) => matches(q, a.name, a.desc, a.category));
  const cats = ['Media', 'AI', 'Design', 'Productivity'] as const;
  return (
    <div className="pn" data-testid="apps-panel">
      <div className="pn-sticky">
        <PanelSearch value={q} onChange={setQ} placeholder="Search apps" testId="apps-search" />
      </div>
      {q ? (
        results.length ? (
          <div className="pn-grid c2">
            {results.map((a) => (
              <AppCard key={a.id} a={a} />
            ))}
          </div>
        ) : (
          <EmptyBox>No apps match “{q}”.</EmptyBox>
        )
      ) : (
        <>
          {recent.length > 0 && (
            <>
              <SectionHead title="Your apps" />
              <div className="pn-row-scroll">
                {recent.map((a) => (
                  <button key={a.id} className="pn-tile sq" style={{ width: 70, background: 'transparent', gap: 4, display: 'flex', flexDirection: 'column', fontSize: 11 }} onClick={() => openApp(a)} title={a.name}>
                    <span className="pn-app" style={{ padding: 0, border: 0, background: 'none' }}>
                      <span className="ico" style={{ background: a.color }}>
                        <Icon name={a.icon} size={20} />
                      </span>
                    </span>
                    <span style={{ maxWidth: 66, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <SectionHead title="Discover" />
          {cats.map((c) => (
            <div key={c}>
              <h4>{c === 'AI' ? 'AI-powered' : c}</h4>
              <div className="pn-grid c2">
                {APPS.filter((a) => a.category === c).map((a) => (
                  <AppCard key={a.id} a={a} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
