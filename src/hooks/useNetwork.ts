import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { waitForPendingWrites } from 'firebase/firestore';

export function useNetwork() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkPendingWrites();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (navigator.onLine) {
      checkPendingWrites();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkPendingWrites = async () => {
    setHasPendingWrites(true);
    try {
      // Race the pending writes against a 3-second timeout to prevent infinite spinner
      await Promise.race([
        waitForPendingWrites(db),
        new Promise((resolve) => setTimeout(resolve, 3000))
      ]);
    } catch (error) {
      console.error("Error waiting for pending writes:", error);
    } finally {
      setHasPendingWrites(false);
    }
  };

  // Expose checkPendingWrites so components can manually trigger the sync indicator after a write
  return { isOnline, hasPendingWrites, checkPendingWrites };
}
