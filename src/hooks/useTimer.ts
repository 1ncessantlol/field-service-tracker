import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { useUser } from '../context/UserContext';

interface UseTimerResult {
  isRunning: boolean;
  elapsedTimeMs: number;
  startTimer: () => Promise<void>;
  stopTimer: (studies: number) => Promise<void>;
}

const STORAGE_KEY = 'fst_active_session_id';
const START_TIME_KEY = 'fst_active_start_time';

export function useTimer(): UseTimerResult {
  const { user } = useUser();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);

  // Initialize state from localStorage on mount and on visibility change
  useEffect(() => {
    const hydrateState = () => {
      const storedSessionId = localStorage.getItem(STORAGE_KEY);
      const storedStartTime = localStorage.getItem(START_TIME_KEY);
      
      if (storedSessionId && storedStartTime) {
        const startTime = parseInt(storedStartTime, 10);
        setIsRunning(true);
        setElapsedTimeMs(Date.now() - startTime);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        hydrateState();
      } else if (document.visibilityState === 'hidden') {
        // Ensure state is locked in (though we save it on start, it's good practice to verify)
        if (isRunning) {
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
  }, [isRunning]);

  // Timer tick effect
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (isRunning) {
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
  }, [isRunning]);

  const startTimer = useCallback(async () => {
    if (!user) return;
    
    const now = Date.now();
    const newSessionRef = doc(collection(db, 'sessions'));
    const sessionId = newSessionRef.id;
    
    // Save to local storage for background-safe UI ticking
    localStorage.setItem(STORAGE_KEY, sessionId);
    localStorage.setItem(START_TIME_KEY, now.toString());
    localStorage.removeItem('fst_notified');
    setIsRunning(true);
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

  const stopTimer = useCallback(async (studies: number) => {
    if (!user) return;
    
    const sessionId = localStorage.getItem(STORAGE_KEY);
    const storedStartTime = localStorage.getItem(START_TIME_KEY);
    
    if (!sessionId || !storedStartTime) return;

    const startTime = parseInt(storedStartTime, 10);
    const endTime = Date.now();
    const durationMs = endTime - startTime;

    // Backup state locally before clearing active timer just in case
    const sessionData = {
      endTime,
      durationMs,
      studies,
      status: 'completed'
    };
    localStorage.setItem(`fst_backup_${sessionId}`, JSON.stringify(sessionData));

    // Clear local state
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(START_TIME_KEY);
    localStorage.removeItem('fst_notified');
    setIsRunning(false);

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
    isRunning,
    elapsedTimeMs,
    startTimer,
    stopTimer,
  };
}
