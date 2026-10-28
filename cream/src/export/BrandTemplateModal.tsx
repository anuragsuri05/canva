import { useState } from 'react';
import { Modal, Icon, Toggle } from '../ui/ui';
import { useEditor, editDesign } from '../store/editor';
import { useApp } from '../store/app';
import type { Design } from '../model/types';
import './export.css';

export default function BrandTemplateModal({ onClose }: { onClose: () => void }) {
  const design = useEditor((s) => s.design) as Design;
  const kits = useApp((s) => s.brandKits);
  const [kit, setKit] = useState(design.brandKitId ?? kits[0]?.id ?? '');
  const [lockLogos, setLockLogos] = useState(true);
  const [lockBg, setLockBg] = useState(true);
  const [lockHeadings, setLockHeadings] = useState(false);
  const isTpl = !!design.isBrandTemplate;

  const publish = () => {
    editDesign((d) => {
      d.isBrandTemplate = true;
      d.brandKitId = kit || undefined;
      for (const p of d.pages)
        p.elements.forEach((e, i) => {
          const isBg = i === 0 && e.w >= d.width * 0.9 && e.h >= (p.height ?? d.height) * 0.9;
          const isLogo = (e.type === 'image' || e.type === 'svg') && /logo/i.test(e.name ?? '');
          const isHeading = e.type === 'text' && (e.role === 'heading' || e.fontSize >= 48);
          if ((lockBg && isBg) || (lockLogos && isLogo) || (lockHeadings && isHeading)) e.brandLocked = true;
        });
    });
    useApp.getState().notify(`"${design.title}" was published as a brand template`, design.id);
    useApp.getState().toast('Published as brand template', 'success');
    onClose();
  };
  const unpublish = () => {
    editDesign((d) => {
      d.isBrandTemplate = false;
      d.pages.forEach((p) => p.elements.forEach((e) => delete e.brandLocked));
    });
    useApp.getState().toast('Removed from brand templates');
    onClose();
  };

  return (
    <Modal title="Brand template" onClose={onClose} testId="brand-template-modal">
      <div className="xp-modal">
        <p className="muted" style={{ marginTop: 0 }}>
          Brand templates let your team create on-brand designs from a starting point. Everyone who uses this template gets their own copy.
        </p>
        {isTpl && (
          <div className="xp-note" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
            <Icon name="Crown" size={14} /> This design is published as a brand template.
          </div>
        )}
        <div className="field">
          <label>Brand Kit</label>
          <select className="select" value={kit} onChange={(e) => setKit(e.target.value)}>
            {kits.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>
        <div className="xp-section">Lock elements for template users</div>
        <Toggle label="Lock backgrounds" on={lockBg} onChange={setLockBg} />
        <Toggle label="Lock logos" on={lockLogos} onChange={setLockLogos} />
        <Toggle label="Lock headings" on={lockHeadings} onChange={setLockHeadings} />
        <div className="xp-note">Tip: to lock any individual element, select it and use Lock in the toolbar. Locked elements can't be moved or deleted by template users.</div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
          {isTpl && (
            <button className="btn" onClick={unpublish} data-testid="brand-template-unpublish">
              Remove brand template
            </button>
          )}
          <button className="btn primary" onClick={publish} data-testid="brand-template-publish">
            {isTpl ? 'Update brand template' : 'Publish brand template'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
