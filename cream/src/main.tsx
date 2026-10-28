import { createRoot } from 'react-dom/client';
import { App } from './App';
import { useApp } from './store/app';
import { useEditor } from './store/editor';
import './styles.css';

// Handy for debugging and for the Playwright suite.
(window as any).cream = { app: useApp, editor: useEditor };

createRoot(document.getElementById('root')!).render(<App />);
