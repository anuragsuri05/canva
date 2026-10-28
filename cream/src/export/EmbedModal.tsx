import { useState } from 'react';
import { Modal, Icon, Segmented } from '../ui/ui';
import { useEditor } from '../store/editor';
import { useApp } from '../store/app';
import type { Design } from '../model/types';
import { copyText, viewLink, useWarmShareAssets } from './shareLinks';
import './export.css';

export default function EmbedModal({ onClose }: { onClose: () => void }) {
  const design = useEditor((s) => s.design) as Design;
  useWarmShareAssets(design);
  const [tab, setTab] = useState<'smart' | 'html'>('smart');
  const link = viewLink(design) + (viewLink(design).includes('?') ? '&' : '?') + 'embed=1';
  const ratio = ((design.pages[0]?.height ?? design.height) / design.width) * 100;
  const html = `<div style="position:relative;width:100%;height:0;padding-top:${ratio.toFixed(4)}%;overflow:hidden;border-radius:8px;box-shadow:0 2px 8px rgba(63,69,81,.16)">\n  <iframe loading="lazy" style="position:absolute;width:100%;height:100%;top:0;left:0;border:none" src="${link}" allowfullscreen allow="fullscreen"></iframe>\n</div>\n<a href="${viewLink(design)}" target="_blank" rel="noopener">${design.title.replace(/</g, '&lt;')}</a> made with Cream`;
  const code = tab === 'smart' ? link : html;
  return (
    <Modal title="Embed" onClose={onClose} testId="embed-modal">
      <div className="xp-modal">
        <p className="muted" style={{ marginTop: 0 }}>
          Embedding makes your design public. Paste a smart embed link into sites like Notion, or use HTML embed code on your own website.
        </p>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'smart', label: 'Smart embed link' },
            { value: 'html', label: 'HTML embed code' },
          ]}
        />
        <div className="xp-code" style={{ marginTop: 12 }} data-testid="embed-code">
          {code}
        </div>
        <button
          className="btn primary block"
          style={{ marginTop: 12 }}
          data-testid="embed-copy"
          onClick={async () => {
            await copyText(code);
            useApp.getState().toast(tab === 'smart' ? 'Embed link copied' : 'Embed code copied', 'success');
          }}
        >
          <Icon name="Copy" size={16} /> Copy {tab === 'smart' ? 'link' : 'code'}
        </button>
        <div className="xp-section">Preview</div>
        <div style={{ position: 'relative', width: '100%', paddingTop: `${Math.min(ratio, 70)}%`, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <iframe title="Embed preview" src={link} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
        </div>
      </div>
    </Modal>
  );
}
