import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n';
import ThemeProvider from '@/components/common/ThemeProvider';
import { seedIfEmpty } from '@/lib/mock-backend';
import { useAuthStore } from '@/stores/useAuthStore';
import App from './App.tsx';

void seedIfEmpty().then(() => {
  // Resync any persisted session's fullName/roles against the (possibly
  // freshly-seeded) user record so renames in seed.ts surface immediately
  // without forcing the user to log out. Fire-and-forget — UI doesn't wait.
  void useAuthStore.getState().refreshSessionUser();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
});
