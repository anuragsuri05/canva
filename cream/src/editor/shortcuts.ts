import { useEffect } from 'react';
import { useEditor, selectedEls, currentPage } from '../store/editor';
import { useApp } from '../store/app';
import { insertText, insertShape, insertLine } from './dnd';
import { saveNow } from './Header';

const inField = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

/** Global editor keyboard shortcuts (Canva set). */
export function useEditorShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useEditor.getState();
      if (!s.design) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      const editingText = inField(e.target);

      // Shortcuts that work even while typing
      if (mod && k === 's') {
        e.preventDefault();
        saveNow();
        useApp.getState().toast('All changes saved');
        return;
      }
      if (editingText) {
        if (e.key === 'Escape') useEditor.setState({ editingId: null });
        return;
      }
      if (s.modal) return;
      if ((e.target as HTMLElement)?.closest?.('.popover, .menu')) return;
      if (e.key === 'Escape' && document.querySelector('.popover, .menu')) return;

      const sel = selectedEls(s);
      const textSel = sel.filter((x) => x.type === 'text');
      const prevent = () => e.preventDefault();

      if (mod && e.altKey && (k === 'p' || e.code === 'KeyP')) {
        prevent();
        saveNow();
        useApp.getState().navigate({ name: 'present', id: s.design.id, mode: 'full' });
        return;
      }
      if (mod && e.altKey && (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3')) {
        prevent();
        useEditor.setState({ view: e.code === 'Digit1' ? 'scroll' : e.code === 'Digit2' ? 'thumbs' : 'grid' });
        return;
      }
      if (mod && e.altKey && e.code === 'KeyC') return prevent(), s.copyStyle();
      if (mod && e.altKey && e.code === 'KeyV') return prevent(), s.pasteStyle();
      if (mod && e.altKey && e.code === 'KeyN') {
        prevent();
        useEditor.setState({ right: 'comments', mode: 'comment' });
        return;
      }
      if (mod && e.altKey && (e.code === 'BracketRight' || e.code === 'BracketLeft')) return prevent(), s.arrange(e.code === 'BracketRight' ? 'front' : 'back');
      if (mod && e.altKey && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
        prevent();
        s.updateSelected((el) => {
          if (el.type === 'text') el.lineHeight = Math.max(0.5, Math.round((el.lineHeight + (e.code === 'ArrowUp' ? 0.1 : -0.1)) * 10) / 10);
        });
        return;
      }
      if (mod && e.altKey && (e.code === 'Comma' || e.code === 'Period')) {
        prevent();
        s.updateSelected((el) => {
          if (el.type === 'text') el.letterSpacing += e.code === 'Period' ? 10 : -10;
        });
        return;
      }
      if (mod && e.shiftKey && textSel.length) {
        const align = { KeyL: 'left', KeyC: 'center', KeyR: 'right', KeyJ: 'justify' }[e.code] as any;
        if (align) return prevent(), s.updateSelected((el) => void (el.type === 'text' && (el.align = align)));
        if (e.code === 'KeyK') return prevent(), s.updateSelected((el) => void (el.type === 'text' && (el.uppercase = !el.uppercase)));
        if (e.code === 'Digit7' || e.code === 'Digit8') {
          prevent();
          const v = e.code === 'Digit7' ? 'number' : 'bullet';
          return s.updateSelected((el) => void (el.type === 'text' && (el.list = el.list === v ? undefined : v)));
        }
        const anchor = { KeyH: 'top', KeyM: 'middle', KeyB: 'bottom' }[e.code] as any;
        if (anchor) return prevent(), s.updateSelected((el) => void (el.type === 'text' && ((el.anchor = anchor), (el.autoHeight = false))));
        if (e.code === 'Comma' || e.code === 'Period') {
          prevent();
          return s.updateSelected((el) => void (el.type === 'text' && (el.fontSize = Math.max(1, Math.round(el.fontSize * (e.code === 'Period' ? 1.1 : 0.9))))), { coalesce: 'fs' });
        }
        if (e.code === 'KeyF') return prevent(), useEditor.setState({ right: 'font' });
      }
      if (mod && e.shiftKey && e.code === 'KeyG') return prevent(), s.ungroup();
      if (mod && e.shiftKey && (k === 'z')) return prevent(), s.redo();

      if (mod && !e.altKey) {
        switch (k) {
          case 'z':
            return prevent(), s.undo();
          case 'y':
            return prevent(), s.redo();
          case 'c':
            if (sel.length) return prevent(), s.copy();
            return;
          case 'x':
            if (sel.length) return prevent(), s.cut();
            return;
          case 'v':
            prevent();
            return s.paste();
          case 'd':
            return prevent(), s.duplicateSelected();
          case 'a':
            return prevent(), s.selectAll();
          case 'g':
            return prevent(), s.group();
          case 'b':
            if (textSel.length) return prevent(), s.updateSelected((el) => void (el.type === 'text' && (el.fontWeight = el.fontWeight >= 600 ? 400 : 700)));
            return;
          case 'i':
            if (textSel.length) return prevent(), s.updateSelected((el) => void (el.type === 'text' && (el.italic = !el.italic)));
            return;
          case 'u':
            if (textSel.length) return prevent(), s.updateSelected((el) => void (el.type === 'text' && (el.underline = !el.underline)));
            return;
          case 'k':
            if (sel.length) return prevent(), useEditor.setState({ modal: 'link' });
            return;
          case 'f':
            return prevent(), useEditor.setState({ right: 'find-replace' });
          case ']':
            return prevent(), s.arrange('forward');
          case '[':
            return prevent(), s.arrange('backward');
          case '=':
          case '+':
            prevent();
            return useEditor.setState({ zoom: Math.min(5, (s.fit ? (s as any).fitZoomValue ?? 0.5 : s.zoom) * 1.25), fit: false });
          case '-':
            prevent();
            return useEditor.setState({ zoom: Math.max(0.05, (s.fit ? (s as any).fitZoomValue ?? 0.5 : s.zoom) / 1.25), fit: false });
          case '0':
            prevent();
            if (e.altKey) return useEditor.setState({ fit: true });
            if (e.shiftKey) return useEditor.setState({ zoom: ((s as any).fitZoomValue ?? 0.5) * 1.35, fit: false });
            return useEditor.setState({ zoom: 1, fit: false });
          case 'enter':
            return prevent(), s.addPage(s.pageId ?? undefined);
          case 'backspace':
          case 'delete': {
            const p = currentPage(s);
            if (p && !p.elements.length) return prevent(), s.deletePage(p.id);
            return;
          }
          case '/':
            return prevent(), useEditor.setState({ modal: 'shortcuts' });
        }
      }
      if (e.altKey && e.shiftKey && e.code === 'KeyL') return prevent(), s.toggleLock();
      if (e.altKey && e.shiftKey && e.code === 'KeyT') return prevent(), s.tidyUp();

      if (mod) return;
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (sel.length) {
            prevent();
            s.deleteSelected();
          }
          return;
        case 'Escape':
          if (s.cropId) {
            s.commit();
            useEditor.setState({ cropId: null });
          } else if (s.draw) useEditor.setState({ draw: null });
          else if (s.mode === 'comment') useEditor.setState({ mode: 'edit' });
          else s.deselect();
          useEditor.setState({ ctxMenu: null });
          return;
        case 'Enter':
          if (sel.length === 1 && ['text', 'shape', 'sticky', 'table'].includes(sel[0].type)) {
            prevent();
            useEditor.setState({ editingId: sel[0].id });
          }
          return;
        case 'Tab': {
          const p = currentPage(s);
          if (!p?.elements.length) return;
          prevent();
          const i = sel.length ? p.elements.findIndex((x) => x.id === sel[0].id) : -1;
          const n = (i + (e.shiftKey ? -1 : 1) + p.elements.length) % p.elements.length;
          s.select([p.elements[n].id]);
          return;
        }
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown': {
          if (!sel.length) {
            // move between pages
            const d = s.design;
            const i = d.pages.findIndex((p) => p.id === s.pageId);
            const j = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : i - 1;
            if (d.pages[j]) useEditor.setState({ pageId: d.pages[j].id });
            return;
          }
          prevent();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          s.nudge(dx, dy);
          return;
        }
      }
      if (e.shiftKey && e.code === 'KeyR') {
        prevent();
        s.update((d) => void (d.settings = { ...(d.settings ?? {}), rulers: !d.settings?.rulers }));
        return;
      }
      if (e.shiftKey && e.key === '?') {
        prevent();
        useEditor.setState({ modal: 'shortcuts' });
        return;
      }
      if (e.shiftKey || e.altKey) return;
      switch (k) {
        case 't':
          prevent();
          insertText('body');
          return;
        case 'r':
          prevent();
          insertShape('rect');
          return;
        case 'c':
          prevent();
          insertShape('circle');
          return;
        case 'l':
          prevent();
          insertLine();
          return;
        case 'd':
          prevent();
          useEditor.setState({ side: 'draw', draw: s.draw ?? { tool: 'pen', color: '#1f1f1f', width: 6, opacity: 1 } });
          return;
        case 's':
          if (s.design.category === 'whiteboard') {
            prevent();
            import('./dnd').then((m) => m.insertSticky());
          }
          return;
        case ' ':
          if (s.showTimeline || s.design.category === 'video') {
            prevent();
            useEditor.setState({ playing: !s.playing });
          }
          return;
        case 'm':
          if (sel[0]?.type === 'video') s.updateSelected((el) => void (el.type === 'video' && (el.volume = el.volume > 0 ? 0 : 1)));
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
