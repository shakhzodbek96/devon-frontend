import { BrowserRouter } from 'react-router-dom';
import Router from './router';
import { Toaster } from '@/components/ui/sonner';
import ExceptionModal from '@/components/common/ExceptionModal';
import { useMediaQuery } from '@/lib/use-media-query';

export default function App() {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  return (
    <BrowserRouter
      // No `basename` — the app is served from the domain root (`base: '/'`
      // in vite.config.ts). Passing `''` here (stripping the trailing slash
      // off `BASE_URL === '/'`) used to make React Router treat every route
      // as outside its scope, forcing a full page reload on every
      // client-side `navigate()` instead of an SPA transition.
      // Opt into the React Router v7 behaviors that v6 warns about on every
      // boot — `startTransition` wraps state updates during navigations,
      // and `relativeSplatPath` normalises route resolution inside splat
      // routes. Both are forward-compatible with v6 and silence the
      // ⚠️ React Router Future Flag Warning logs that otherwise show on
      // every page load.
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Router />
      <Toaster
        richColors
        closeButton
        position={isDesktop ? 'bottom-right' : 'top-center'}
      />
      <ExceptionModal />
    </BrowserRouter>
  );
}
