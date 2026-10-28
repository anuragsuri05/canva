// Charts tab: every chart type as a live preview tile; click or drag to add.
import { useState } from 'react';
import { CHARTS, matches } from './catalog';
import { ChartTile } from './elementTiles';
import { EmptyBox, PanelSearch, SectionHead } from './common';

const GROUPS: { title: string; types: string[] }[] = [
  { title: 'Bar & column', types: ['bar', 'column', 'stacked-column', 'funnel'] },
  { title: 'Line & area', types: ['line', 'area', 'scatter', 'radar'] },
  { title: 'Pie & donut', types: ['pie', 'donut', 'pictogram'] },
  { title: 'Progress & numbers', types: ['progress-bar', 'progress-ring', 'number'] },
];

export default function ChartsPanel() {
  const [q, setQ] = useState('');
  const list = CHARTS.filter((c) => matches(q, c.label, c.keywords));
  return (
    <div className="pn" data-testid="charts-panel">
      <div className="pn-sticky">
        <PanelSearch value={q} onChange={setQ} placeholder="Search charts" testId="charts-search" />
      </div>
      {q ? (
        list.length ? (
          <div className="pn-grid c2">
            {list.map((c) => (
              <ChartTile key={c.type} type={c.type} wide />
            ))}
          </div>
        ) : (
          <EmptyBox>No charts match “{q}”.</EmptyBox>
        )
      ) : (
        GROUPS.map((g) => (
          <div key={g.title}>
            <SectionHead title={g.title} />
            <div className="pn-grid c2">
              {CHARTS.filter((c) => g.types.includes(c.type)).map((c) => (
                <ChartTile key={c.type} type={c.type} wide />
              ))}
            </div>
          </div>
        ))
      )}
      <p className="faint" style={{ marginTop: 14 }}>
        Tip: select a chart to edit its data, colours and labels.
      </p>
    </div>
  );
}
