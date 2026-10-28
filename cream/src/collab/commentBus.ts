// Buffers `cream:add-comment` requests so a draft isn't lost when the Comments panel is
// still lazy-loading at the moment the canvas / context menu dispatches the event.
// (Import this module eagerly from the editor to catch the very first request.)

export interface AddCommentDetail {
  pageId: string;
  x?: number;
  y?: number;
  elId?: string;
}

let pending: { detail: AddCommentDetail; at: number } | null = null;
let pendingFocus: { id: string; at: number } | null = null;

if (typeof window !== 'undefined' && !(window as any).__creamCommentBus) {
  (window as any).__creamCommentBus = true;
  window.addEventListener('cream:add-comment', (e) => {
    pending = { detail: (e as CustomEvent).detail, at: Date.now() };
  });
  window.addEventListener('cream:focus-comment', (e) => {
    pendingFocus = { id: (e as CustomEvent).detail, at: Date.now() };
  });
}

/** Take a buffered add-comment request (if it happened in the last few seconds). */
export function takePendingComment(): AddCommentDetail | null {
  const p = pending;
  pending = null;
  return p && Date.now() - p.at < 5000 ? p.detail : null;
}

export function takePendingFocus(): string | null {
  const p = pendingFocus;
  pendingFocus = null;
  return p && Date.now() - p.at < 5000 ? p.id : null;
}
