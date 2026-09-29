import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { useUser } from '../context/UserContext';

interface UseTimerResult {
  status: 'idle' | 'running' | 'paused';
  elapsedTimeMs: number;
  startTimer: () => Promise<void>;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: (studies: number) => Promise<void>;
}

const STORAGE_KEY = 'fst_active_session_id';
const START_TIME_KEY = 'fst_active_start_time';
const ACCUMULATED_TIME_KEY = 'fst_accumulated_time'; // Legacy, keep for a bit if needed
const PAUSE_TIME_KEY = 'fst_pause_time';
const STATUS_KEY = 'fst_timer_status';

export function useTimer(): UseTimerResult {
  const { user } = useUser();
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);

  // Initialize state from localStorage on mount and on visibility change
  useEffect(() => {
    const hydrateState = () => {
      const storedSessionId = localStorage.getItem(STORAGE_KEY);
      const storedStatus = localStorage.getItem(STATUS_KEY) as 'running' | 'paused' | null;
      const storedStartTime = localStorage.getItem(START_TIME_KEY);
      const storedPauseTime = localStorage.getItem(PAUSE_TIME_KEY);
      const storedAccumulated = localStorage.getItem(ACCUMULATED_TIME_KEY); // Legacy fallback
      
      if (storedSessionId && storedStartTime) {
        const startTime = parseInt(storedStartTime, 10);
        
        if (storedStatus === 'paused') {
          setStatus('paused');
          if (storedPauseTime) {
            setElapsedTimeMs(parseInt(storedPauseTime, 10) - startTime);
          } else {
            // Fallback for legacy pause state
            setElapsedTimeMs(parseInt(storedAccumulated || '0', 10));
          }
        } else {
          setStatus('running');
          setElapsedTimeMs(Date.now() - startTime);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        hydrateState();
      } else if (document.visibilityState === 'hidden') {
        // Ensure state is locked in (though we save it on start, it's good practice to verify)
        if (status === 'running') {
          const currentStartTime = localStorage.getItem(START_TIME_KEY);
          if (currentStartTime) {
            localStorage.setItem(START_TIME_KEY, currentStartTime);
          }
        }
      }
    };

    // Hydrate immediately on mount
    hydrateState();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status]);

  // Timer tick effect
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (status === 'running') {
      intervalId = setInterval(() => {
        const storedStartTime = localStorage.getItem(START_TIME_KEY);
        if (storedStartTime) {
          const startTime = parseInt(storedStartTime, 10);
          const elapsed = Date.now() - startTime;
          setElapsedTimeMs(elapsed);

          // Idle Timer Check: 10 seconds for testing (10000 ms)
          if (elapsed >= 10000 && !localStorage.getItem('fst_notified')) {
            localStorage.setItem('fst_notified', 'true');
            if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification("Timer Still Running?", {
                  body: "You have been tracking for 3 hours. Don't forget to stop the timer if you are done.",
                  icon: "/favicon.svg",
                });
              });
            }
          }
        }
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status]);

  const startTimer = useCallback(async () => {
    if (!user) return;
    
    const now = Date.now();
    const newSessionRef = doc(collection(db, 'sessions'));
    const sessionId = newSessionRef.id;
    
    // Save to local storage for background-safe UI ticking
    localStorage.setItem(STORAGE_KEY, sessionId);
    localStorage.setItem(START_TIME_KEY, now.toString());
    localStorage.setItem(STATUS_KEY, 'running');
    localStorage.removeItem(PAUSE_TIME_KEY);
    localStorage.removeItem(ACCUMULATED_TIME_KEY);
    localStorage.removeItem('fst_notified');
    setStatus('running');
    setElapsedTimeMs(0);

    // Save active session to Firestore
    try {
      if (!navigator.onLine) {
        alert("Started offline! Will sync automatically when connection returns");
      }
      setDoc(doc(db, 'sessions', sessionId), {
        uid: user.uid,
        startTime: now,
        status: 'active',
        monthYear: new Date(now).toISOString().substring(0, 7) // e.g. "2026-08"
      }).catch(err => {
        console.error("Error starting session in Firestore:", err);
      });
    } catch (err) {
      console.error("Error initiating session start:", err);
    }
  }, [user]);

  const pauseTimer = useCallback(() => {
    if (status !== 'running') return;
    
    const now = Date.now();
    localStorage.setItem(PAUSE_TIME_KEY, now.toString());
    localStorage.setItem(STATUS_KEY, 'paused');
    
    const storedStartTime = localStorage.getItem(START_TIME_KEY);
    if (storedStartTime) {
      setElapsedTimeMs(now - parseInt(storedStartTime, 10));
    }
    setStatus('paused');
  }, [status]);

  const resumeTimer = useCallback(() => {
    if (status !== 'paused') return;
    
    const storedStartTime = localStorage.getItem(START_TIME_KEY);
    const storedPauseTime = localStorage.getItem(PAUSE_TIME_KEY);
    const storedAccumulated = localStorage.getItem(ACCUMULATED_TIME_KEY);
    
    let newStartTime = Date.now();
    if (storedStartTime && storedPauseTime) {
      const pausedDuration = Date.now() - parseInt(storedPauseTime, 10);
      newStartTime = parseInt(storedStartTime, 10) + pausedDuration;
    } else if (storedAccumulated) {
      // Legacy fallback
      newStartTime = Date.now() - parseInt(storedAccumulated, 10);
    }
    
    localStorage.setItem(START_TIME_KEY, newStartTime.toString());
    localStorage.setItem(STATUS_KEY, 'running');
    localStorage.removeItem(PAUSE_TIME_KEY);
    localStorage.removeItem(ACCUMULATED_TIME_KEY);
    
    setStatus('running');
  }, [status]);

  const stopTimer = useCallback(async (studies: number) => {
    if (!user) return;
    
    const sessionId = localStorage.getItem(STORAGE_KEY);
    const storedStatus = localStorage.getItem(STATUS_KEY);
    const storedStartTime = localStorage.getItem(START_TIME_KEY);
    const storedPauseTime = localStorage.getItem(PAUSE_TIME_KEY);
    
    if (!sessionId || !storedStartTime) return;

    const startTime = parseInt(storedStartTime, 10);
    const endTime = Date.now();
    let finalDurationMs = 0;
    let finalEndTime = endTime;
    
    if (storedStatus === 'paused' && storedPauseTime) {
      finalEndTime = parseInt(storedPauseTime, 10);
      finalDurationMs = finalEndTime - startTime;
    } else {
      finalDurationMs = finalEndTime - startTime;
    }

    if (finalDurationMs < 0) finalDurationMs = 0;

    // Backup state locally before clearing active timer just in case
    const sessionData = {
      endTime: finalEndTime,
      durationMs: finalDurationMs,
      studies,
      status: 'completed'
    };
    localStorage.setItem(`fst_backup_${sessionId}`, JSON.stringify(sessionData));

    // Clear local state
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(START_TIME_KEY);
    localStorage.removeItem(PAUSE_TIME_KEY);
    localStorage.removeItem(ACCUMULATED_TIME_KEY);
    localStorage.removeItem(STATUS_KEY);
    localStorage.removeItem('fst_notified');
    setStatus('idle');
    setElapsedTimeMs(0);

    // Save completed session to Firestore
    try {
      if (!navigator.onLine) {
        alert("Saved offline! Will sync automatically when connection returns");
      }
      updateDoc(doc(db, 'sessions', sessionId), sessionData)
        .then(() => {
          localStorage.removeItem(`fst_backup_${sessionId}`);
        })
        .catch(err => {
          console.error("Error stopping session in Firestore:", err);
        });
    } catch (err) {
      console.error("Error initiating session save:", err);
    }
  }, [user]);

  return {
    status,
    elapsedTimeMs,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  };
}
