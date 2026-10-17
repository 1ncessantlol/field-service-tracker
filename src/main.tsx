import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './context/UserContext.tsx'
import { ThemeProvider } from './context/ThemeContext.tsx'

// Automatic recovery for chunk/script load errors after new deployments
const CHUNK_RELOAD_KEY = 'fst_chunk_reload_timestamp';

const recoverFromChunkError = async () => {
  try {
    const lastReload = sessionStorage.getItem(CHUNK_RELOAD_KEY);
    const now = Date.now();
    // Ensure we haven't reloaded in the last 10 seconds to avoid infinite loops
    if (lastReload && now - parseInt(lastReload, 10) < 10000) {
      console.warn('Chunk reload suppressed to prevent reload loop.');
      return;
    }
    sessionStorage.setItem(CHUNK_RELOAD_KEY, now.toString());

    // Unregister any active service workers
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    // Delete all caches via caches.keys()
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  } catch (err) {
    console.error('Error during automatic chunk recovery:', err);
  } finally {
    window.location.reload();
  }
};

// Vite-specific dynamic import preload error
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  recoverFromChunkError();
});

// Global script load errors (capturing phase)
window.addEventListener(
  'error',
  (event) => {
    const target = event.target as HTMLElement | null;
    const isScript = target && target.tagName === 'SCRIPT';
    const isChunkError =
      event.message &&
      (event.message.includes('dynamically imported module') ||
        event.message.includes('Loading chunk') ||
        event.message.includes('Failed to fetch'));

    if (isScript || isChunkError) {
      recoverFromChunkError();
    }
  },
  true
);

// Unhandled promise rejections from failed dynamic imports
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = (typeof reason === 'string' ? reason : reason?.message) || '';
  if (
    message.includes('dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Failed to fetch')
  ) {
    recoverFromChunkError();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </ThemeProvider>
  </StrictMode>,
)
