import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import TimerScreen from '../pages/TimerScreen';
import DashboardScreen from '../pages/DashboardScreen';
import StudentsScreen from '../pages/StudentsScreen';
import SettingsScreen from '../pages/SettingsScreen';
import { Timer, LayoutDashboard, Settings, Users, LogOut, UserCircle, Cloud, CloudOff, RefreshCw, Sun, Moon } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useNetwork } from '../hooks/useNetwork';
import { useTheme } from '../context/ThemeContext';
import { useEffect, forwardRef } from 'react';
import { isLastDayOfMonth } from 'date-fns';

const MotionNavLink = motion(forwardRef<HTMLAnchorElement, any>((props, ref) => <NavLink ref={ref} {...props} />));

export default function Layout() {
  const { user, logout } = useUser();
  const { isOnline, hasPendingWrites } = useNetwork();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  useEffect(() => {
    const checkEndOfMonth = () => {
      const today = new Date();
      if (isLastDayOfMonth(today)) {
        const todayStr = today.toISOString().substring(0, 10);
        const lastReminded = localStorage.getItem('fst_eom_reminder');
        
        if (lastReminded !== todayStr) {
          if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification("End of Month Reminder", {
                body: "End of Month! Do not forget to submit your field service report.",
                icon: "/favicon.svg",
              });
              localStorage.setItem('fst_eom_reminder', todayStr);
            });
          }
        }
      }
    };

    checkEndOfMonth();
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-zinc-800 shadow-md z-10 safe-area-pt">
        <div className="flex items-center space-x-3">
          <UserCircle className="w-8 h-8 text-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px]">
              {user?.email || 'User'}
            </span>
            <div className="flex items-center space-x-1">
              {isOnline ? (
                hasPendingWrites ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Syncing</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3 h-3 text-green-500" />
                    <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Synced</span>
                  </>
                )
              ) : (
                <>
                  <CloudOff className="w-3 h-3 text-danger" />
                  <span className="text-[10px] text-danger font-bold uppercase tracking-wider">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <motion.button
            onClick={toggleTheme}
            className="p-2 text-gray-500 dark:text-zinc-400 hover:text-primary relative w-9 h-9 flex items-center justify-center"
            aria-label="Toggle dark mode"
            animate={{ rotate: theme === 'dark' ? 180 : 0, scale: 1 }}
            whileTap={{ scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          >
            <AnimatePresence initial={false}>
              <motion.div
                key={theme}
                initial={{ opacity: 0, rotate: -45 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 45 }}
                transition={{ duration: 0.2 }}
                className="absolute"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </motion.div>
            </AnimatePresence>
          </motion.button>
          <MotionNavLink 
            to="/settings"
            className="p-2 text-gray-500 dark:text-zinc-400 hover:text-primary transition-colors block"
            title="Settings"
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Settings className="w-5 h-5" />
          </MotionNavLink>
          <motion.button 
            onClick={logout}
            className="p-2 text-gray-500 dark:text-zinc-400 hover:text-danger transition-colors block"
            title="Log Out"
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <LogOut className="w-5 h-5" />
          </motion.button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 pt-4 relative">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route index element={<Navigate to="/timer" replace />} />
            <Route path="timer" element={<TimerScreen />} />
            <Route path="dashboard" element={<DashboardScreen />} />
            <Route path="students" element={<StudentsScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/timer" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white dark:bg-[#1e1e1e] border-t border-gray-200 dark:border-zinc-800 safe-area-pb">
        <div className="flex justify-around items-center h-16">
          <MotionNavLink
            to="/timer"
            className={({ isActive }: any) =>
              `flex flex-col items-center justify-center w-full h-full ${
                isActive ? 'text-primary' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`
            }
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Timer className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Timer</span>
          </MotionNavLink>

          <MotionNavLink
            to="/dashboard"
            className={({ isActive }: any) =>
              `flex flex-col items-center justify-center w-full h-full ${
                isActive ? 'text-primary' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`
            }
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <LayoutDashboard className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Dashboard</span>
          </MotionNavLink>

          <MotionNavLink
            to="/students"
            className={({ isActive }: any) =>
              `flex flex-col items-center justify-center w-full h-full ${
                isActive ? 'text-primary' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`
            }
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Users className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Students</span>
          </MotionNavLink>

          <MotionNavLink
            to="/settings"
            className={({ isActive }: any) =>
              `flex flex-col items-center justify-center w-full h-full ${
                isActive ? 'text-primary' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`
            }
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Settings</span>
          </MotionNavLink>
        </div>
      </nav>
    </div>
  );
}
