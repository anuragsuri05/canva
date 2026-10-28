import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditor, findEl } from '../store/editor';
import { useApp } from '../store/app';
import { uid } from '../model/defaults';
import type { Comment, Design } from '../model/types';
import { Icon, Menu, fmtDate } from '../ui/ui';
import { takePendingComment, takePendingFocus, type AddCommentDetail } from './commentBus';
import './collab.css';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '👀', '🙏'];
const COLORS = ['#8b3dff', '#00c4cc', '#2f9e6e', '#f59f00', '#1c7ed6', '#ae3ec9', '#0ca678'];
const colorOf = (n: string) => COLORS[[...n].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length];
const ini = (n: string) =>
  n
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('') || '?';

function Av({ name }: { name: string }) {
  return (
    <span className="cm-avatar" style={{ background: colorOf(name) }} title={name}>
      {ini(name)}
    </span>
  );
}

type Filter = 'all' | 'page' | 'you' | 'open' | 'resolved';

function mentionsIn(text: string, people: string[]) {
  return people.filter((p) => text.toLowerCase().includes('@' + p.toLowerCase()));
}

function RichText({ text, people }: { text: string; people: string[] }) {
  if (!people.length) return <>{text}</>;
  const sorted = [...people].sort((a, b) => b.length - a.length).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(@(?:${sorted.join('|')}))`, 'gi');
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="cm-mention">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** Textarea with @mention autocomplete. */
function MentionBox({
  value,
  onChange,
  people,
  placeholder,
  onSubmit,
  autoFocus,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  people: string[];
  placeholder: string;
  onSubmit: () => void;
  autoFocus?: boolean;
  testId?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [q, setQ] = useState<{ start: number; text: string } | null>(null);
  const [active, setActive] = useState(0);
  const caret = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (caret.current != null && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  }, [value]);
  const matches = q ? people.filter((p) => p.toLowerCase().includes(q.text.toLowerCase())).slice(0, 6) : [];
  const detect = (v: string, caret: number) => {
    const before = v.slice(0, caret);
    const m = /(^|\s)@([^\s@]*)$/.exec(before);
    setQ(m ? { start: caret - m[2].length - 1, text: m[2] } : null);
    setActive(0);
  };
  const pick = (name: string) => {
    if (!q) return;
    const at = ref.current?.selectionStart ?? value.length;
    const next = value.slice(0, q.start) + '@' + name + ' ' + value.slice(at);
    caret.current = q.start + name.length + 2;
    onChange(next);
    setQ(null);
  };
  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={ref}
        className="textarea"
        rows={2}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        data-testid={testId}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (q && matches.length) {
            if (e.key === 'ArrowDown') return e.preventDefault(), setActive((a) => (a + 1) % matches.length);
            if (e.key === 'ArrowUp') return e.preventDefault(), setActive((a) => (a - 1 + matches.length) % matches.length);
            if (e.key === 'Enter' || e.key === 'Tab') return e.preventDefault(), pick(matches[active]);
            if (e.key === 'Escape') return setQ(null);
          }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      {q && matches.length > 0 && (
        <div className="cm-mention-list" data-testid="mention-list">
          {matches.map((m, i) => (
            <button key={m} className={i === active ? 'active' : ''} onMouseDown={(e) => (e.preventDefault(), pick(m))}>
              <Av name={m} /> {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmojiButton({ onPick }: { onPick: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative' }}>
      <button className="cm-icon" title="Add reaction" onClick={(e) => (e.stopPropagation(), setOpen((o) => !o))} data-testid="comment-react">
        <Icon name="SmilePlus" size={15} />
      </button>
      {open && (
        <div className="cm-emoji-pop" style={{ right: 0, top: 28 }} onMouseLeave={() => setOpen(false)}>
          {EMOJIS.map((em) => (
            <button
              key={em}
              onClick={(e) => {
                e.stopPropagation();
                onPick(em);
                setOpen(false);
              }}
            >
              {em}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

const update = (fn: (c: Comment[], d: Design) => void) =>
  useEditor.getState().update((d) => {
    if (!d.comments) d.comments = [];
    fn(d.comments as Comment[], d as Design);
  });

export default function CommentsPanel() {
  const { comments, pages, people, title, designId } = useEditor(
    useShallow((s) => ({ comments: s.design?.comments, pages: s.design?.pages, people: s.design?.share?.people, title: s.design?.title, designId: s.design?.id })),
  );
  const pageId = useEditor((s) => s.pageId);
  const me = useApp((s) => s.settings.userName) || 'You';
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<'page' | 'recent'>('page');
  const [draft, setDraft] = useState<(AddCommentDetail & { text: string; assign: boolean }) | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const names = useMemo(() => {
    const s = new Set<string>([me, ...(people ?? []).map((p) => p.name)]);
    return [...s];
  }, [people, me]);

  useEffect(() => {
    const start = (d: AddCommentDetail | null) => d && setDraft({ ...d, text: '', assign: false });
    start(takePendingComment());
    const f = takePendingFocus();
    if (f) setFocus(f);
    const onAdd = (e: Event) => {
      takePendingComment();
      start((e as CustomEvent).detail);
    };
    const onFocus = (e: Event) => {
      takePendingFocus();
      setFocus((e as CustomEvent).detail);
      setFilter((f) => (f === 'resolved' ? 'all' : f));
    };
    window.addEventListener('cream:add-comment', onAdd);
    window.addEventListener('cream:focus-comment', onFocus);
    return () => {
      window.removeEventListener('cream:add-comment', onAdd);
      window.removeEventListener('cream:focus-comment', onFocus);
    };
  }, []);

  useEffect(() => {
    if (focus) listRef.current?.querySelector(`[data-comment-id="${focus}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focus]);

  const pageNo = (pid: string) => (pages?.findIndex((p) => p.id === pid) ?? -1) + 1;
  const all = comments ?? [];
  const forYou = (c: Comment) => c.assignee === me || mentionsIn(c.text, [me]).length > 0 || c.replies.some((r) => mentionsIn(r.text, [me]).length > 0);
  const shown = all
    .filter((c) => (filter === 'resolved' ? c.resolved : filter === 'open' ? !c.resolved : filter === 'page' ? c.pageId === pageId && !c.resolved : filter === 'you' ? forYou(c) && !c.resolved : !c.resolved))
    .sort((a, b) => (sort === 'recent' ? b.createdAt - a.createdAt : pageNo(a.pageId) - pageNo(b.pageId) || a.createdAt - b.createdAt));

  const notifyMentions = (text: string) => {
    for (const n of mentionsIn(text, names)) if (n !== me) useApp.getState().notify(`${me} mentioned ${n} in a comment on "${title}"`, designId);
  };

  const submitDraft = () => {
    if (!draft || !draft.text.trim()) return;
    const mentioned = mentionsIn(draft.text, names);
    const c: Comment = {
      id: uid(),
      pageId: draft.pageId || pageId || pages?.[0]?.id || '',
      elId: draft.elId,
      x: draft.x,
      y: draft.y,
      author: me,
      text: draft.text.trim(),
      createdAt: Date.now(),
      resolved: false,
      replies: [],
      assignee: draft.assign && mentioned[0] ? mentioned[0] : undefined,
    };
    update((cs) => void cs.push(c));
    notifyMentions(c.text);
    if (c.assignee && c.assignee !== me) useApp.getState().notify(`${me} assigned a task to ${c.assignee} on "${title}"`, designId);
    setDraft(null);
    setFocus(c.id);
  };

  const go = (c: Comment) => {
    setFocus(c.id);
    const ed = useEditor.getState();
    if (c.elId && ed.design && findEl(ed.design, c.elId)) ed.select([c.elId]);
    else ed.setPage(c.pageId);
  };

  const draftMentions = draft ? mentionsIn(draft.text, names) : [];
  let lastPage = -1;
  return (
    <div data-testid="comments-panel">
      <div className="cm-tools">
        <select className="select grow" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} data-testid="comments-filter">
          <option value="all">All</option>
          <option value="page">Current page</option>
          <option value="you">For you</option>
          <option value="open">Unresolved</option>
          <option value="resolved">Resolved</option>
        </select>
        <select className="select" style={{ width: 110 }} value={sort} onChange={(e) => setSort(e.target.value as 'page' | 'recent')} data-testid="comments-sort">
          <option value="page">By page</option>
          <option value="recent">Recent</option>
        </select>
      </div>
      {!draft && (
        <button className="btn block" style={{ marginBottom: 12 }} onClick={() => setDraft({ pageId: pageId ?? pages?.[0]?.id ?? '', text: '', assign: false, elId: useEditor.getState().selection[0] })} data-testid="comment-new">
          <Icon name="MessageSquarePlus" size={16} /> Add a comment
        </button>
      )}
      {draft && (
        <div className="cm-draft" data-testid="comment-draft">
          <div className="cm-meta" style={{ marginBottom: 6 }}>
            <Av name={me} /> <b style={{ color: 'var(--text)' }}>{me}</b> · Page {pageNo(draft.pageId) || 1}
            {draft.elId && ' · on element'}
          </div>
          <MentionBox value={draft.text} onChange={(text) => setDraft({ ...draft, text })} people={names} placeholder="Add a comment or @mention" onSubmit={submitDraft} autoFocus testId="comment-input" />
          {draftMentions.filter((n) => n !== me).length > 0 && (
            <label className="row" style={{ fontSize: 12.5, margin: '6px 0', cursor: 'pointer' }}>
              <input type="checkbox" checked={draft.assign} onChange={(e) => setDraft({ ...draft, assign: e.target.checked })} data-testid="comment-assign" />
              Assign to {draftMentions.filter((n) => n !== me)[0]}
            </label>
          )}
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
            <button className="btn sm ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button className="btn sm primary" onClick={submitDraft} disabled={!draft.text.trim()} data-testid="comment-submit">
              Comment
            </button>
          </div>
        </div>
      )}
      <div ref={listRef}>
        {!shown.length && (
          <div className="empty" data-testid="comments-empty">
            <Icon name="MessageSquare" size={28} />
            <div style={{ marginTop: 8 }}>{filter === 'resolved' ? 'No resolved comments' : 'No comments yet. Add one to start a conversation.'}</div>
          </div>
        )}
        {shown.map((c) => {
          const pn = pageNo(c.pageId);
          const header: ReactNode =
            sort === 'page' && pn !== lastPage ? (
              <div className="faint" style={{ margin: '8px 0 6px', fontWeight: 600 }}>
                Page {pn}
              </div>
            ) : null;
          lastPage = pn;
          return (
            <div key={c.id}>
              {header}
              <Thread c={c} me={me} names={names} focused={focus === c.id} onGo={() => go(c)} notifyMentions={notifyMentions} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Thread({ c, me, names, focused, onGo, notifyMentions }: { c: Comment; me: string; names: string[]; focused: boolean; onGo: () => void; notifyMentions: (t: string) => void }) {
  const [reply, setReply] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const patch = (fn: (x: Comment) => void) =>
    update((cs) => {
      const x = cs.find((y) => y.id === c.id);
      if (x) fn(x);
    });
  const send = () => {
    if (!reply.trim()) return;
    const text = reply.trim();
    patch((x) => void x.replies.push({ id: uid(), author: me, text, createdAt: Date.now() }));
    notifyMentions(text);
    setReply('');
  };
  return (
    <div className={'cm-card' + (focused ? ' focus' : '') + (c.resolved ? ' resolved' : '')} data-comment-id={c.id} data-testid="comment-thread" onClick={onGo}>
      <div className="cm-head">
        <Av name={c.author} />
        <div className="grow">
          <div className="cm-author">{c.author}</div>
          <div className="cm-time">{fmtDate(c.createdAt)}</div>
        </div>
        {c.resolved ? (
          <button className="btn sm" onClick={(e) => (e.stopPropagation(), patch((x) => void (x.resolved = false)))} data-testid="comment-restore">
            Restore
          </button>
        ) : (
          <button
            className="cm-icon"
            title="Resolve"
            data-testid="comment-resolve"
            onClick={(e) => {
              e.stopPropagation();
              patch((x) => void (x.resolved = true));
              useApp.getState().toast('Comment resolved');
            }}
          >
            <Icon name="Check" size={16} />
          </button>
        )}
        <EmojiButton onPick={(em) => patch((x) => void (x.reactions = { ...(x.reactions ?? {}), [em]: (x.reactions?.[em] ?? 0) + 1 }))} />
        <button className="cm-icon" title="More" onClick={(e) => (e.stopPropagation(), setMenu(e.currentTarget))} data-testid="comment-more">
          <Icon name="MoreHorizontal" size={16} />
        </button>
        {menu && (
          <Menu
            anchor={menu}
            onClose={() => setMenu(null)}
            placement="bottom-end"
            items={[
              { label: 'Edit', icon: 'Pencil', onClick: () => setEditing(c.text), disabled: c.author !== me, testId: 'comment-edit' },
              { label: c.resolved ? 'Restore' : 'Resolve', icon: 'Check', onClick: () => patch((x) => void (x.resolved = !x.resolved)) },
              { label: c.assignee ? 'Unassign' : 'Assign to me', icon: 'UserCheck', onClick: () => patch((x) => void (x.assignee = x.assignee ? undefined : me)) },
              { sep: true },
              { label: 'Delete thread', icon: 'Trash2', danger: true, testId: 'comment-delete', onClick: () => update((cs) => void cs.splice(cs.findIndex((y) => y.id === c.id), 1)) },
            ]}
          />
        )}
      </div>
      {editing != null ? (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 6 }}>
          <MentionBox value={editing} onChange={setEditing} people={names} placeholder="Edit comment" onSubmit={() => (patch((x) => void (x.text = editing.trim() || x.text)), setEditing(null))} autoFocus testId="comment-edit-input" />
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="btn sm ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button className="btn sm primary" onClick={() => (patch((x) => void (x.text = editing.trim() || x.text)), setEditing(null))} data-testid="comment-edit-save">
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="cm-text" data-testid="comment-text">
          <RichText text={c.text} people={names} />
        </div>
      )}
      <div className="cm-meta">
        {c.elId && (
          <span>
            <Icon name="MousePointer2" size={11} /> On element
          </span>
        )}
        {c.assignee && (
          <span className="badge" data-testid="comment-assignee">
            Assigned to {c.assignee}
          </span>
        )}
        {Object.entries(c.reactions ?? {}).map(([em, n]) => (
          <button key={em} className="cm-react" onClick={(e) => (e.stopPropagation(), patch((x) => void (x.reactions = { ...(x.reactions ?? {}), [em]: n + 1 })))}>
            {em} {n}
          </button>
        ))}
      </div>
      {c.replies.map((r) => (
        <div key={r.id} className="cm-reply">
          <div className="cm-head">
            <Av name={r.author} />
            <span className="cm-author">{r.author}</span>
            <span className="cm-time">{fmtDate(r.createdAt)}</span>
            <span className="grow" />
            {r.author === me && (
              <button className="cm-icon" title="Delete reply" onClick={(e) => (e.stopPropagation(), patch((x) => void (x.replies = x.replies.filter((y) => y.id !== r.id))))}>
                <Icon name="X" size={13} />
              </button>
            )}
          </div>
          <div className="cm-text">
            <RichText text={r.text} people={names} />
          </div>
        </div>
      ))}
      {!c.resolved && (focused || c.replies.length > 0) && (
        <div className="cm-reply" onClick={(e) => e.stopPropagation()}>
          <MentionBox value={reply} onChange={setReply} people={names} placeholder="Reply or @mention" onSubmit={send} testId="comment-reply-input" />
          {reply.trim() && (
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn sm primary" onClick={send} data-testid="comment-reply-send">
                Reply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
