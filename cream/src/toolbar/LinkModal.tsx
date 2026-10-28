import { useState } from 'react';
import { useEditor, useSelected } from '../store/editor';
import { useApp } from '../store/app';
import { Icon, Modal } from '../ui/ui';
import './toolbar.css';

/** Link format: external URL (https://…, mailto:, tel:) or `#page=<pageId>` for a page in this design. */
export const pageLink = (pageId: string) => `#page=${pageId}`;

function normalizeUrl(v: string) {
  const s = v.trim();
  if (!s) return '';
  if (/^(https?:|mailto:|tel:|#)/i.test(s)) return s;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'mailto:' + s;
  return 'https://' + s;
}

export default function LinkModal({ onClose }: { onClose: () => void }) {
  const sel = useSelected();
  const pages = useEditor((s) => s.design?.pages ?? []);
  const current = sel[0]?.link ?? '';
  const [url, setUrl] = useState(current.startsWith('#page=') ? '' : current);
  const [pageId, setPageId] = useState(current.startsWith('#page=') ? current.slice(6) : '');
  const save = (value: string | undefined) => {
    useEditor.getState().updateSelected((e) => {
      if (value) e.link = value;
      else delete e.link;
    });
    useApp.getState().toast(value ? 'Link added' : 'Link removed');
    onClose();
  };
  if (!sel.length)
    return (
      <Modal title="Link" onClose={onClose} testId="link-modal">
        <div className="empty">Select an element to add a link.</div>
      </Modal>
    );
  return (
    <Modal
      title="Link"
      onClose={onClose}
      testId="link-modal"
      footer={
        <>
          {current && (
            <button className="btn ghost" style={{ marginRight: 'auto', color: 'var(--danger)' }} onClick={() => save(undefined)} data-testid="link-remove">
              <Icon name="Unlink" size={16} /> Remove link
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!url.trim() && !pageId} onClick={() => save(pageId ? pageLink(pageId) : normalizeUrl(url))} data-testid="link-save">
            Done
          </button>
        </>
      }
    >
      <div className="field">
        <label>Enter a link or search</label>
        <div className="search">
          <Icon name="Link" size={16} />
          <input
            autoFocus
            placeholder="https://example.com"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (e.target.value) setPageId('');
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && (url.trim() || pageId)) save(pageId ? pageLink(pageId) : normalizeUrl(url));
            }}
            data-testid="link-url"
          />
        </div>
      </div>
      {pages.length > 1 && (
        <div className="field">
          <label>Pages in this design</label>
          <div className="col" style={{ gap: 4, maxHeight: 240, overflow: 'auto' }}>
            {pages.map((p, i) => (
              <button
                key={p.id}
                className={'menu-item' + (pageId === p.id ? ' focus' : '')}
                onClick={() => {
                  setPageId(p.id);
                  setUrl('');
                }}
                data-testid={`link-page-${i + 1}`}
              >
                <Icon name="FileText" size={16} />
                <span className="grow">
                  Page {i + 1}
                  {p.title ? ` — ${p.title}` : ''}
                </span>
                {pageId === p.id && <Icon name="Check" size={16} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
