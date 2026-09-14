import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '../firebase';
import { useUser } from '../context/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, X, Loader2 } from 'lucide-react';

interface Report {
  id: string;
  durationMs: number;
  startTime: number;
  manualDate?: string;
  status: string;
  studies?: number;
  [key: string]: any;
}

interface GroupedReports {
  [monthYear: string]: {
    records: Report[];
    totalHours: number;
  };
}

export default function MonthlyHistory() {
  const { user, role } = useUser();
  const [groupedReports, setGroupedReports] = useState<GroupedReports>({});
  const [loading, setLoading] = useState(true);

  // Edit State
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualStudies, setManualStudies] = useState('0');
  const [isLogging, setIsLogging] = useState(false);
  const [editSessionId, setEditSessionId] = useState<string | null>(null);

  const showHours = role !== 'Publisher';

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'sessions'),
      where('uid', '==', user.uid)
    );

    // Using onSnapshot so the list auto-updates when we edit/delete a log
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reports: Report[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'completed') {
          reports.push({ id: docSnap.id, ...data } as Report);
        }
      });

      // Sort descending by startTime
      reports.sort((a, b) => b.startTime - a.startTime);

      // Group the fetched records by month and year using reduce
      const grouped = reports.reduce((acc: GroupedReports, report) => {
        const dateObj = report.manualDate 
          ? new Date(report.manualDate + 'T12:00:00') 
          : new Date(report.startTime);

        const monthYear = format(dateObj, 'MMMM yyyy');
        
        if (!acc[monthYear]) {
          acc[monthYear] = { records: [], totalHours: 0 };
        }
        
        acc[monthYear].records.push(report);
        acc[monthYear].totalHours += (report.durationMs / (1000 * 60 * 60));
        
        return acc;
      }, {});

      setGroupedReports(grouped);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleEditSession = (session: Report) => {
    const d = new Date(session.startTime);
    const dateStr = session.manualDate || d.toISOString().substring(0, 10);
    setManualDate(dateStr);
    
    const totalMins = Math.floor(session.durationMs / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    
    setManualHours(hrs > 0 ? hrs.toString() : '');
    setManualMinutes(mins > 0 ? mins.toString() : '');
    setManualStudies(session.studies && session.studies > 0 ? session.studies.toString() : '0');
    
    setEditSessionId(session.id);
    setShowManualLog(true);
  };

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editSessionId) return;

    const hrs = parseInt(manualHours) || 0;
    const mins = parseInt(manualMinutes) || 0;
    const stds = parseInt(manualStudies) || 0;
    
    if (hrs === 0 && mins === 0 && stds === 0) {
      alert("Please enter at least some time or studies.");
      return;
    }

    const durationMs = (hrs * 60 * 60 * 1000) + (mins * 60 * 1000);
    const monthYear = manualDate.substring(0, 7);
    const startTime = new Date(`${manualDate}T12:00:00`).getTime();
    
    setIsLogging(true);
    try {
      await updateDoc(doc(db, 'sessions', editSessionId), {
        durationMs,
        studies: stds,
        monthYear,
        manualDate,
        startTime,
      });
      
      setManualHours('');
      setManualMinutes('');
      setManualStudies('0');
      setEditSessionId(null);
      setShowManualLog(false);
    } catch (err) {
      console.error("Error updating session:", err);
      alert("Failed to save entry.");
    } finally {
      setIsLogging(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this session? This will recalculate your progress.")) {
      try {
        await deleteDoc(doc(db, 'sessions', id));
      } catch (err) {
        console.error("Error deleting session", err);
        alert("Failed to delete session.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const groupKeys = Object.keys(groupedReports);

  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto w-full pb-24 relative">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Monthly History</h2>
      
      {groupKeys.length === 0 ? (
        <div className="text-center p-8 text-gray-500 dark:text-zinc-400">
          No sessions logged yet.
        </div>
      ) : (
        groupKeys.map((monthYear) => {
          const group = groupedReports[monthYear];
          return (
            <div 
              key={monthYear} 
              className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden"
            >
              <div className="bg-gray-50 dark:bg-zinc-800/50 px-4 py-3 flex justify-between items-center border-b border-gray-100 dark:border-zinc-800">
                <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">{monthYear}</h3>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  {group.totalHours.toFixed(1)} hrs
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-zinc-800/50">
                <AnimatePresence initial={false}>
                  {group.records.map((report) => {
                    const dateObj = report.manualDate 
                      ? new Date(report.manualDate + 'T12:00:00') 
                      : new Date(report.startTime);
                      
                    return (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        key={report.id} 
                        className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {format(dateObj, 'MMM d, yyyy')}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                            {report.studies || 0} {report.studies === 1 ? 'study' : 'studies'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          {showHours && (
                            <div className="font-bold text-gray-900 dark:text-white">
                              {Number(report.durationMs / (1000 * 60 * 60)).toFixed(1)}h
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <motion.button 
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleEditSession(report)} 
                              className="p-2 text-gray-500 dark:text-zinc-400 hover:text-primary transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </motion.button>
                            <motion.button 
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDeleteSession(report.id)} 
                              className="p-2 text-gray-500 dark:text-zinc-400 hover:text-danger transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })
      )}

      {/* Edit Session Modal */}
      <AnimatePresence>
      {showManualLog && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 dark:bg-black/80 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="bg-white dark:bg-[#1e1e1e] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Time</h2>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setShowManualLog(false);
                  setEditSessionId(null);
                  setManualHours('');
                  setManualMinutes('');
                  setManualStudies('0');
                  setManualDate(new Date().toISOString().substring(0, 10));
                }} 
                className="text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>
            
            <form onSubmit={handleManualLog} className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 dark:text-zinc-400 mb-1 block">Date</label>
                <input 
                  type="date" 
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                  required
                />
              </div>
              
              {showHours && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-zinc-400 mb-1 block">Hours</label>
                    <input 
                      type="number" 
                      min="0"
                      value={manualHours}
                      onChange={(e) => setManualHours(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-zinc-400 mb-1 block">Minutes</label>
                    <input 
                      type="number" 
                      min="0"
                      max="59"
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-500 dark:text-zinc-400 mb-1 block">Bible Studies</label>
                <input 
                  type="number" 
                  min="0"
                  value={manualStudies}
                  onChange={(e) => setManualStudies(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <motion.button 
                type="submit" 
                disabled={isLogging}
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="w-full py-4 mt-2 bg-primary text-white dark:text-[#121212] font-bold rounded-xl hover:bg-primaryHover transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isLogging ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Save Changes</span>}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
