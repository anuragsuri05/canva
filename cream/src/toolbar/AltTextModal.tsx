import { useState } from 'react';
import { useEditor, useSelected } from '../store/editor';
import { useApp } from '../store/app';
import { Modal, Toggle } from '../ui/ui';
import './toolbar.css';

export default function AltTextModal({ onClose }: { onClose: () => void }) {
  const sel = useSelected();
  const el = sel[0];
  const [alt, setAlt] = useState(el?.alt ?? '');
  const [decorative, setDecorative] = useState(!!el?.decorative);
  const save = () => {
    useEditor.getState().updateSelected((e) => {
      if (decorative) {
        e.decorative = true;
        delete e.alt;
      } else {
        delete e.decorative;
        if (alt.trim()) e.alt = alt.trim();
        else delete e.alt;
      }
    });
    useApp.getState().toast('Alternative text saved');
    onClose();
  };
  if (!el)
    return (
      <Modal title="Alternative text" onClose={onClose} testId="alt-modal">
        <div className="empty">Select an element first.</div>
      </Modal>
    );
  return (
    <Modal
      title="Alternative text"
      onClose={onClose}
      testId="alt-modal"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} data-testid="alt-save">
            Save
          </button>
        </>
      }
    >
      <p className="muted" style={{ marginTop: 0 }}>
        Describe this {el.type === 'image' ? 'image' : 'element'} for people who use screen readers. Alt text is included when you share or export accessible formats.
      </p>
      <textarea
        className="textarea"
        rows={4}
        maxLength={250}
        value={alt}
        disabled={decorative}
        placeholder="e.g. A golden retriever running on a beach at sunset"
        onChange={(e) => setAlt(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        autoFocus
        data-testid="alt-text"
      />
      <div className="faint" style={{ textAlign: 'right', marginBottom: 8 }}>{alt.length}/250</div>
      <Toggle label="Mark as decorative" on={decorative} onChange={setDecorative} testId="alt-decorative" />
      <div className="faint">Decorative elements are skipped by screen readers.</div>
    </Modal>
  );
}
