import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginScreen from './pages/LoginScreen';
import { useUser } from './context/UserContext';
import { Loader2 } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

function App() {
  const { user, loading } = useUser();
  
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#121212]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-zinc-950 dark:text-gray-100 antialiased selection:bg-primary selection:text-white">
      {needRefresh && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-primary text-white dark:text-[#121212] px-4 py-3 shadow-lg flex items-center justify-between safe-area-pt">
          <span className="text-sm font-bold">New version available!</span>
          <button 
            onClick={() => updateServiceWorker(true)}
            className="px-4 py-1.5 bg-white dark:bg-[#121212] text-primary rounded-full text-xs font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 transition shadow-sm"
          >
            Refresh
          </button>
        </div>
      )}
      <BrowserRouter>
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<LoginScreen />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <Route path="/*" element={<Layout />} />
          )}
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
