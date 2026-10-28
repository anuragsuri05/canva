import { useState } from 'react';
import { Modal, Icon } from '../ui/ui';
import { useEditor, editDesign } from '../store/editor';
import { useApp } from '../store/app';
import type { Design } from '../model/types';
import './export.css';

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Awaiting review', color: 'var(--warn)' },
  approved: { label: 'Approved', color: 'var(--success)' },
  changes: { label: 'Changes requested', color: 'var(--danger)' },
};

export default function ApprovalModal({ onClose }: { onClose: () => void }) {
  const design = useEditor((s) => s.design) as Design;
  const people = design.share?.people ?? [];
  const ap = design.approval;
  const [reviewer, setReviewer] = useState(ap?.reviewer ?? people[0]?.name ?? '');
  const [due, setDue] = useState(ap?.due ?? '');
  const [notes, setNotes] = useState(ap?.notes ?? '');
  const app = useApp.getState();
  const active = ap && ap.status !== 'none';

  const request = () => {
    if (!reviewer.trim()) return app.toast('Add a reviewer', 'error');
    editDesign((d) => {
      d.approval = { status: 'pending', reviewer: reviewer.trim(), notes, due: due || undefined };
      // The reviewer needs access to the design.
      const share = d.share ?? { access: 'private', role: 'edit', people: [] };
      if (!share.people.some((p) => p.name === reviewer.trim())) share.people.push({ name: reviewer.trim(), role: 'comment' });
      d.share = share;
    });
    app.notify(`Approval requested from ${reviewer.trim()} for "${design.title}"${due ? ` (due ${due})` : ''}`, design.id);
    app.toast('Approval requested', 'success');
    onClose();
  };
  const decide = (status: 'approved' | 'changes' | 'none') => {
    editDesign((d) => {
      d.approval = status === 'none' ? { status: 'none' } : { ...(d.approval ?? { status }), status };
    });
    const msg = status === 'approved' ? `"${design.title}" was approved` : status === 'changes' ? `Changes requested on "${design.title}"` : `Approval request withdrawn for "${design.title}"`;
    app.notify(msg, design.id);
    app.toast(msg);
    onClose();
  };

  return (
    <Modal title="Request approval" onClose={onClose} testId="approval-modal">
      <div className="xp-modal">
        {active ? (
          <>
            <div className="row" style={{ gap: 10, marginBottom: 12 }}>
              <Icon name="BadgeCheck" size={22} style={{ color: STATUS[ap!.status]?.color }} />
              <div className="grow">
                <div style={{ fontWeight: 600 }} data-testid="approval-status">
                  {STATUS[ap!.status]?.label}
                </div>
                <div className="faint">
                  Reviewer: {ap!.reviewer}
                  {ap!.due ? ` · Due ${ap!.due}` : ''}
                </div>
              </div>
            </div>
            {ap!.notes && <div className="xp-note">{ap!.notes}</div>}
            <div className="xp-section">Review</div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn primary" onClick={() => decide('approved')} data-testid="approval-approve">
                <Icon name="Check" size={16} /> Approve
              </button>
              <button className="btn" onClick={() => decide('changes')} data-testid="approval-changes">
                Request changes
              </button>
              <span className="grow" />
              <button className="btn ghost" onClick={() => decide('none')} data-testid="approval-withdraw">
                Withdraw submission
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Ask a teammate to review this design before it's shared or published.
            </p>
            <div className="field">
              <label>Reviewer</label>
              <input className="input" list="approval-people" value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="Name or email" onKeyDown={(e) => e.stopPropagation()} data-testid="approval-reviewer" />
              <datalist id="approval-people">
                {people.map((p) => (
                  <option key={p.name} value={p.name} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label>Due date (optional)</label>
              <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} data-testid="approval-due" />
            </div>
            <div className="field">
              <label>Notes for the reviewer (optional)</label>
              <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} onKeyDown={(e) => e.stopPropagation()} data-testid="approval-notes" />
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={onClose}>
                Cancel
              </button>
              <button className="btn primary" onClick={request} data-testid="approval-submit">
                Request approval
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
