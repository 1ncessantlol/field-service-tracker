import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Calendar, Clock, BookOpen, FileText } from 'lucide-react';
import { useUser, type Session } from '../context/UserContext';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';

interface LogPastSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToEdit?: Session | null;
}

/**
 * Safe haptic helper function for mobile feedback
 */
const triggerHaptic = (pattern: number | number[]) => {
  try {
    if (
      typeof window !== 'undefined' &&
      'vibrate' in navigator &&
      typeof navigator.vibrate === 'function'
    ) {
      window.navigator.vibrate(pattern);
    }
  } catch {
    // Fail silently in unsupported browsers or restricted contexts
  }
};

export default function LogPastSessionModal({
  isOpen,
  onClose,
  sessionToEdit,
}: LogPastSessionModalProps) {
  const { user } = useUser();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Isolated local state - completely separated from live stopwatch state
  const [pastDate, setPastDate] = useState(todayStr);
  const [pastHours, setPastHours] = useState('');
  const [pastMinutes, setPastMinutes] = useState('');
  const [pastStudies, setPastStudies] = useState('0');
  const [pastNotes, setPastNotes] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Synchronous ref to prevent double-tap submissions
  const isSubmittingRef = useRef(false);

  // Populate form if editing an existing session
  useEffect(() => {
    if (sessionToEdit) {
      const d = new Date(sessionToEdit.startTime);
      const dateStr = sessionToEdit.manualDate || format(d, 'yyyy-MM-dd');
      setPastDate(dateStr);

      const totalMins = Math.floor(sessionToEdit.durationMs / 60000);
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;

      setPastHours(hrs > 0 ? hrs.toString() : '');
      setPastMinutes(mins > 0 ? mins.toString() : '');
      setPastStudies(sessionToEdit.studies > 0 ? sessionToEdit.studies.toString() : '0');
      setPastNotes(sessionToEdit.notes || '');
    } else {
      setPastDate(todayStr);
      setPastHours('');
      setPastMinutes('');
      setPastStudies('0');
      setPastNotes('');
    }
  }, [sessionToEdit, isOpen, todayStr]);

  const handleClose = () => {
    if (isSubmittingManual) return;
    setPastDate(todayStr);
    setPastHours('');
    setPastMinutes('');
    setPastStudies('0');
    setPastNotes('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation & Debounce Lock
    if (isSubmittingRef.current || isSubmittingManual) return;

    const hrs = Math.max(0, parseInt(pastHours, 10) || 0);
    const mins = Math.max(0, parseInt(pastMinutes, 10) || 0);
    const stds = Math.max(0, parseInt(pastStudies, 10) || 0);

    // Prevent submission if both Hours and Minutes are 0 or negative
    if (hrs <= 0 && mins <= 0 && stds <= 0) {
      alert('Please enter at least some hours, minutes, or Bible studies.');
      return;
    }

    // Trigger subtle haptic pulse on save
    triggerHaptic(40);

    isSubmittingRef.current = true;
    setIsSubmittingManual(true);

    // Convert hours and minutes into exact duration in milliseconds
    const durationMs = (hrs * 3600000) + (mins * 60000);
    const monthYear = pastDate.substring(0, 7);
    const startTime = new Date(`${pastDate}T12:00:00`).getTime();

    const sessionData: Record<string, any> = {
      uid: user.uid,
      durationMs,
      studies: stds,
      status: 'completed',
      monthYear,
      manualDate: pastDate,
      startTime,
      notes: pastNotes.trim() || undefined,
    };

    try {
      if (!navigator.onLine) {
        alert('Saved offline! Will sync automatically when connection returns.');
      }

      if (sessionToEdit?.id) {
        // Fire-and-forget update to allow seamless offline caching without freezing
        updateDoc(doc(db, 'sessions', sessionToEdit.id), sessionData).catch((err) =>
          console.error('Error updating past session:', err)
        );
      } else {
        sessionData.createdAt = serverTimestamp();
        // Fire-and-forget add to allow seamless offline caching without freezing
        addDoc(collection(db, 'sessions'), sessionData).catch((err) =>
          console.error('Error logging past session:', err)
        );
      }

      // Close modal and reset inputs immediately
      handleClose();
    } catch (err) {
      console.error('Error saving past session:', err);
      alert('Failed to save session. Please try again.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmittingManual(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 dark:bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="bg-white dark:bg-[#1e1e1e] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {sessionToEdit ? 'Edit Past Session' : 'Log Past Session'}
                </h2>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                disabled={isSubmittingManual}
                className="text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white p-1 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date Input */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Date</span>
                </label>
                <input
                  type="date"
                  value={pastDate}
                  max={todayStr}
                  onChange={(e) => setPastDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-primary transition-colors text-sm"
                  required
                />
              </div>

              {/* Hours & Minutes Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Hours</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="1"
                    value={pastHours}
                    onChange={(e) => setPastHours(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Minutes</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={pastMinutes}
                    onChange={(e) => setPastMinutes(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Bible Studies Input */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span>Bible Studies</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={pastStudies}
                  onChange={(e) => setPastStudies(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>

              {/* Optional Notes / Description */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1.5 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>Notes / Description (Optional)</span>
                </label>
                <input
                  type="text"
                  value={pastNotes}
                  onChange={(e) => setPastNotes(e.target.value)}
                  placeholder="e.g. Return visits, cart witnessing"
                  maxLength={120}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-primary transition-colors text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                />
              </div>

              {/* Save Session Button with Debounce Lock */}
              <motion.button
                type="submit"
                disabled={isSubmittingManual}
                whileTap={isSubmittingManual ? undefined : { scale: 0.96 }}
                whileHover={isSubmittingManual ? undefined : { scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="w-full py-3.5 mt-2 bg-primary text-white dark:text-[#121212] font-bold rounded-xl hover:bg-primaryHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-md"
              >
                {isSubmittingManual ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving Session...</span>
                  </>
                ) : (
                  <span>Save Session</span>
                )}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
