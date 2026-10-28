import { Suspense, lazy, useEffect } from 'react';
import { useApp } from './store/app';
import { Editor } from './editor/Editor';
import { Spinner } from './ui/ui';
import { ensureAnimCss } from './render/animation';
import { ensureFont, loadCatalogue } from './assets/fonts';

const Home = lazy(() => import('./home/Home'));
const Present = lazy(() => import('./present/Present'));
const ViewPage = lazy(() => import('./present/ViewPage'));

export function App() {
  const ready = useApp((s) => s.ready);
  const route = useApp((s) => s.route);
  const settings = useApp((s) => s.settings);

  useEffect(() => {
    useApp.getState().init();
    ensureAnimCss();
    ensureFont('Inter', 400);
    ensureFont('Inter', 700);
    loadCatalogue();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
    root.setAttribute('data-contrast', settings.highContrast ? 'high' : 'normal');
    root.setAttribute('data-reduce-motion', String(settings.reduceMotion));
  }, [settings.theme, settings.highContrast, settings.reduceMotion]);

  if (!ready) return <Spinner />;
  return (
    <>
      <Suspense fallback={<Spinner />}>
        {route.name === 'editor' ? (
          <Editor key={route.id} id={route.id} />
        ) : route.name === 'present' ? (
          <Present designId={route.id} mode={route.mode} />
        ) : route.name === 'view' ? (
          <ViewPage id={route.id} />
        ) : (
          <Home />
        )}
      </Suspense>
      <Toasts />
    </>
  );
}

function Toasts() {
  const toasts = useApp((s) => s.toasts);
  return (
    <div className="toasts" data-testid="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={'toast ' + (t.kind ?? '')}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
