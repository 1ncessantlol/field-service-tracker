import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimer } from '../hooks/useTimer';
import { Play, Square, Plus, Minus, BookOpen, Pause, Loader2 } from 'lucide-react';

/**
 * Safe helper function for mobile haptic feedback.
 * Checks if 'vibrate' in navigator is supported and wraps calls in a try/catch
 * block so unsupported browsers or restricted contexts never throw an error.
 */
const triggerHaptic = (pattern: number | number[]) => {
  try {
    if (
      typeof window !== 'undefined' &&
      'navigator' in window &&
      'vibrate' in navigator &&
      typeof navigator.vibrate === 'function'
    ) {
      navigator.vibrate(pattern);
    }
  } catch (error) {
    // Fail silently in unsupported environments or restricted contexts
    console.debug('Haptic feedback not supported or blocked:', error);
  }
};

export default function TimerScreen() {
  const { status, elapsedTimeMs, startTimer, pauseTimer, resumeTimer, stopTimer } = useTimer();
  const [studies, setStudies] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Synchronous refs for immediate duplicate-tap prevention before re-render
  const isSavingRef = useRef(false);
  const isStartingRef = useRef(false);
  const lastToggleRef = useRef(0);

  // Format elapsed time as HH:MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = async () => {
    if (isStartingRef.current || isStarting || status !== 'idle') return;
    isStartingRef.current = true;
    setIsStarting(true);

    // Light, crisp haptic tap for Play
    triggerHaptic(15);

    try {
      await startTimer();
    } catch (err) {
      console.error("Error starting timer session:", err);
    } finally {
      isStartingRef.current = false;
      setIsStarting(false);
    }
  };

  const handleTogglePauseResume = () => {
    if (isSavingRef.current || isSaving) return;
    const now = Date.now();
    // Debounce rapid multi-taps (250ms)
    if (now - lastToggleRef.current < 250) return;
    lastToggleRef.current = now;

    // Light, crisp haptic tap for Pause / Resume
    triggerHaptic(15);

    if (status === 'running') {
      pauseTimer();
    } else {
      resumeTimer();
    }
  };

  const handleStopTimer = async () => {
    // Duplicate submission protection (debounce lock)
    if (isSavingRef.current || isSaving) return;
    isSavingRef.current = true;
    setIsSaving(true);

    // Distinct double-pulse vibration for Stop/Save
    triggerHaptic([20, 50, 20]);

    try {
      if (window.confirm("End this session?")) {
        await stopTimer(studies);
        setStudies(0); // Reset studies for next session
      }
    } catch (err) {
      console.error("Error stopping timer session:", err);
    } finally {
      // Reset isSaving back to false in a finally block only after
      // timer state has completely reset to 00:00:00 (or if user canceled confirm)
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center min-h-full p-6 space-y-12"
    >
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <h1 className="text-xl font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
          Current Session
        </h1>
        <div className="text-7xl font-light text-gray-900 dark:text-white tabular-nums">
          {formatTime(elapsedTimeMs)}
        </div>
      </motion.div>

      <div className="relative flex items-center justify-center h-48 w-full max-w-sm">
        <AnimatePresence>
          {status === 'idle' ? (
            <motion.button
              key="start-btn"
              onClick={handleStartTimer}
              disabled={isStarting}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileTap={isStarting ? undefined : { scale: 0.96 }}
              whileHover={isStarting ? undefined : { scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={`absolute bg-primary text-white dark:text-[#121212] hover:bg-primaryHover rounded-full w-48 h-48 flex items-center justify-center shadow-2xl z-10 ${
                isStarting ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''
              }`}
              title="Start Timer"
              aria-label="Start timer"
            >
              {isStarting ? (
                <Loader2 className="w-16 h-16 animate-spin text-white dark:text-[#121212]" />
              ) : (
                <Play className="w-20 h-20 fill-current ml-2" />
              )}
            </motion.button>
          ) : (
            <motion.div
              key="active-controls"
              className="absolute flex items-center space-x-6 z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.button
                onClick={handleTogglePauseResume}
                disabled={isSaving}
                initial={{ x: 80, opacity: 0, scale: 0.5 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: 80, opacity: 0, scale: 0.5 }}
                whileTap={isSaving ? undefined : { scale: 0.95 }}
                whileHover={isSaving ? undefined : { scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`w-32 h-32 rounded-full shadow-xl flex items-center justify-center border-4 transition-colors duration-300 ease-in-out ${
                  isSaving ? 'opacity-50 cursor-not-allowed pointer-events-none ' : ''
                }${status === 'paused'
                    ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-500 text-amber-500'
                    : 'bg-white dark:bg-[#1e1e1e] border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:border-primary hover:text-primary'
                  }`}
                title={status === 'paused' ? 'Resume Session' : 'Pause Session'}
                aria-label={status === 'paused' ? 'Resume session' : 'Pause session'}
              >
                <div className={status === 'paused' ? 'animate-pulse' : ''}>
                  {status === 'paused' ? (
                    <Play className="w-12 h-12 fill-current ml-1" />
                  ) : (
                    <Pause className="w-12 h-12 fill-current" />
                  )}
                </div>
              </motion.button>

              <motion.button
                onClick={handleStopTimer}
                disabled={isSaving}
                initial={{ x: -80, opacity: 0, scale: 0.5 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: -80, opacity: 0, scale: 0.5 }}
                whileTap={isSaving ? undefined : { scale: 0.95 }}
                whileHover={isSaving ? undefined : { scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`w-32 h-32 rounded-full shadow-xl flex items-center justify-center bg-white dark:bg-[#1e1e1e] border-4 border-danger text-danger hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors ${
                  isSaving ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                }`}
                title="Stop & Save Session"
                aria-label="Stop and save session"
              >
                {isSaving ? (
                  <Loader2 className="w-12 h-12 animate-spin text-danger" />
                ) : (
                  <Square className="w-12 h-12 fill-current" />
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className="w-full max-w-sm bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.05 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="text-primary w-6 h-6" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Bible Studies</h2>
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{studies}</span>
        </div>

        <div className="flex space-x-4">
          <motion.button
            onClick={() => setStudies(Math.max(0, studies - 1))}
            disabled={isSaving}
            whileTap={isSaving ? undefined : { scale: 0.96 }}
            whileHover={isSaving ? undefined : { scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex-1 flex items-center justify-center py-3 bg-gray-100 dark:bg-zinc-900 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus className="w-6 h-6" />
          </motion.button>
          <motion.button
            onClick={() => setStudies(studies + 1)}
            disabled={isSaving}
            whileTap={isSaving ? undefined : { scale: 0.96 }}
            whileHover={isSaving ? undefined : { scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex-1 flex items-center justify-center py-3 bg-primary rounded-xl hover:bg-primaryHover transition-colors text-white dark:text-[#121212] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
