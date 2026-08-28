import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTimer } from '../hooks/useTimer';
import { Play, Square, Plus, Minus, BookOpen } from 'lucide-react';

export default function TimerScreen() {
  const { isRunning, elapsedTimeMs, startTimer, stopTimer } = useTimer();
  const [studies, setStudies] = useState(0);

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

  const handleToggleTimer = () => {
    if (isRunning) {
      if (window.confirm("End this session?")) {
        stopTimer(studies);
        setStudies(0); // Reset studies for next session
      }
    } else {
      startTimer();
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

      <motion.button
        onClick={handleToggleTimer}
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={`relative flex items-center justify-center w-48 h-48 rounded-full shadow-2xl transition-colors duration-300 ease-in-out ${
          isRunning 
            ? 'bg-white dark:bg-[#1e1e1e] border-4 border-danger text-danger' 
            : 'bg-primary text-white dark:text-[#121212] hover:bg-primaryHover'
        }`}
      >
        {isRunning ? (
          <Square className="w-16 h-16 fill-current" />
        ) : (
          <Play className="w-20 h-20 fill-current ml-2" />
        )}
      </motion.button>

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
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex-1 flex items-center justify-center py-3 bg-gray-100 dark:bg-zinc-900 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors text-gray-900 dark:text-white"
          >
            <Minus className="w-6 h-6" />
          </motion.button>
          <motion.button 
            onClick={() => setStudies(studies + 1)}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex-1 flex items-center justify-center py-3 bg-primary rounded-xl hover:bg-primaryHover transition-colors text-white dark:text-[#121212]"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
