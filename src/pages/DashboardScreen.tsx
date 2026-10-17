import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Clock, BookOpen, Target, Plus, Trash2, Edit2, List, Trophy, Sparkles, TrendingUp } from 'lucide-react';
import { useUser, type Session } from '../context/UserContext';
import LogPastSessionModal from '../components/LogPastSessionModal';
import { db } from '../firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { BarChart as BarChartIcon } from 'lucide-react';

const CELEBRATION_MESSAGES = [
  'Monthly goal unlocked!',
  'Incredible consistency!',
  'Target crushed. Outstanding work!',
  'Hours secured. You killed it this month!',
  'Phenomenal effort! Keep up the great pace.',
  'Milestone achieved! Enjoy the satisfaction of a job well done.',
  'You set a goal and smashed it!',
  'Fantastic dedication this month!'
];

export default function DashboardScreen() {
  const {
    user,
    role,
    customMonthlyGoal,
    customYearlyGoal,
    currentMonthlyHours,
    currentYearlyHours,
    monthlyStudies,
    sessions
  } = useUser();
  const { theme } = useTheme();

  const [showManualLog, setShowManualLog] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);

  // Determine goals based on role
  let monthlyGoal = 0;
  let yearlyGoal = 0;
  const showHours = role !== 'Publisher';
  let showYearly = false;

  switch (role) {
    case 'Auxiliary Pioneer':
      monthlyGoal = 30;
      break;
    case 'Regular Pioneer':
      monthlyGoal = 50;
      yearlyGoal = 600;
      showYearly = true;
      break;
    case 'Custom':
      monthlyGoal = customMonthlyGoal;
      yearlyGoal = customYearlyGoal;
      showYearly = customYearlyGoal > 0;
      break;
  }

  const monthlyPercentage = monthlyGoal > 0 ? Math.min((currentMonthlyHours / monthlyGoal) * 100, 100) : 0;
  const yearlyPercentage = yearlyGoal > 0 ? Math.min((currentYearlyHours / yearlyGoal) * 100, 100) : 0;

  // Dynamic Pace Calculation for Monthly Goal
  const { daysRemaining, currentMonthName, hoursRemaining, surplusHours, formattedPace } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    const currentMonthName = format(now, 'MMMM');
    const totalDaysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
    const todayDate = now.getDate();
    const daysRemaining = Math.max(1, totalDaysInMonth - todayDate + 1);

    const hoursRemaining = Math.max(0, Number((monthlyGoal - currentMonthlyHours).toFixed(1)));
    const surplusHours = Number((currentMonthlyHours - monthlyGoal).toFixed(1));

    let formattedPace = '';
    if (hoursRemaining > 0) {
      const dailyPaceHours = hoursRemaining / daysRemaining;
      const totalMinutesPerDay = Math.ceil(dailyPaceHours * 60);
      const paceHours = Math.floor(totalMinutesPerDay / 60);
      const paceMins = totalMinutesPerDay % 60;

      if (paceHours > 0 && paceMins > 0) {
        formattedPace = `${paceHours}h ${paceMins}m / day`;
      } else if (paceHours > 0) {
        formattedPace = `${paceHours}h / day`;
      } else {
        formattedPace = `${paceMins}m / day`;
      }
    }

    return { daysRemaining, currentMonthName, hoursRemaining, surplusHours, formattedPace };
  }, [monthlyGoal, currentMonthlyHours]);

  // Chart Data Aggregation
  const chartData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => {
    let total = 0;
    sessions?.forEach(s => {
      const d = s.manualDate ? new Date(s.manualDate + 'T12:00:00') : new Date(s.startTime);
      if (format(d, 'MMM') === month) {
        total += (s.durationMs / 3600000);
      }
    });
    return { month, hours: Number(total.toFixed(1)) };
  });

  const handleShare = async () => {
    const monthName = format(new Date(), 'MMMM yyyy');
    const name = user?.displayName || 'Unknown';

    const reportText = `Field Service Report\nName: ${name}\nStatus: ${role}\nMonth: ${monthName}\n\nHours: ${currentMonthlyHours}\nBible Studies: ${monthlyStudies}\n\n[Generated via Field Service Tracker]`;

    if (navigator.share) {
      try {
        await navigator.share({
          text: reportText
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Error sharing:", err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(reportText);
        alert("Report copied to clipboard!");
      } catch (err) {
        console.error("Failed to copy:", err);
        alert("Failed to copy report to clipboard.");
      }
    }
  };

  const handleEditSession = (session: Session) => {
    setEditSession(session);
    setShowManualLog(true);
  };

  const handleDeleteSession = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this session? This will recalculate your progress.")) {
      try {
        deleteDoc(doc(db, 'sessions', id)).catch(err => console.error("Error deleting session:", err));
      } catch (err) {
        console.error("Error deleting session", err);
        alert("Failed to delete session.");
      }
    }
  };

  const activeMonthlyGoal = monthlyGoal > 0 ? monthlyGoal : 30;
  const isGoalReached = showHours && currentMonthlyHours >= activeMonthlyGoal;

  const celebrationMessage = useMemo(() => {
    if (!isGoalReached) return '';
    const randomIndex = Math.floor(Math.random() * CELEBRATION_MESSAGES.length);
    return CELEBRATION_MESSAGES[randomIndex];
  }, [isGoalReached]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="p-6 space-y-8 min-h-full pb-24"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {user?.displayName ? `Welcome, ${user.displayName.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <p className="text-primary font-medium mt-1">{role}</p>
        </div>
        <div className="flex space-x-3">
          <motion.button
            onClick={() => {
              setEditSession(null);
              setShowManualLog(true);
            }}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-white dark:bg-[#1e1e1e] rounded-full text-xs font-semibold text-gray-900 dark:text-white hover:text-primary transition-colors border border-gray-200 dark:border-zinc-800 shadow-sm"
            title="Log Past Session"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Log Past Session</span>
          </motion.button>
          <motion.button
            onClick={handleShare}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="p-3 bg-white dark:bg-[#1e1e1e] rounded-full text-gray-900 dark:text-white hover:text-primary transition-colors border border-gray-200 dark:border-zinc-800 shadow-sm"
            title="Share Report"
          >
            <Share2 className="w-6 h-6" />
          </motion.button>
        </div>
      </div>

      {/* Goal Reached Celebration Banner */}
      <AnimatePresence>
        {isGoalReached && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 rounded-2xl p-6 shadow-xl shadow-amber-500/20 text-white mb-8"
          >
            <div className="absolute -right-4 -top-4 opacity-20 transform rotate-12 pointer-events-none">
              <Trophy className="w-32 h-32" />
            </div>
            <div className="absolute left-1/4 top-2 opacity-30 animate-pulse pointer-events-none">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="relative z-10 flex items-center space-x-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm shadow-sm">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold flex items-center text-white">
                  Goal Reached!
                  <Sparkles className="w-5 h-5 ml-2 text-yellow-200 animate-pulse" />
                </h2>
                <p className="text-amber-50 font-medium text-sm mt-1">
                  {celebrationMessage}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log Past Session Modal */}
      <LogPastSessionModal
        isOpen={showManualLog}
        onClose={() => {
          setShowManualLog(false);
          setEditSession(null);
        }}
        sessionToEdit={editSession}
      />

      {/* Monthly Progress */}
      {showHours && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.05 }}
          className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 space-y-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-gray-900 dark:text-white">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Monthly Goal</h2>
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">
              {currentMonthlyHours} / {monthlyGoal} hrs
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-4 w-full bg-gray-100 dark:bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-1000 ease-out"
              style={{ width: `${monthlyPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-400 text-right">
            {Math.max(Number((monthlyGoal - currentMonthlyHours).toFixed(1)), 0)} hours remaining
          </p>

          {/* Dynamic Pace Calculator Badge */}
          {monthlyGoal > 0 && (
            <div
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                hoursRemaining <= 0
                  ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200'
                  : 'bg-primary/10 dark:bg-primary/10 border-primary/20 text-gray-800 dark:text-zinc-200'
              }`}
            >
              {hoursRemaining <= 0 ? (
                <div className="flex items-center justify-between w-full flex-wrap gap-1">
                  <span className="flex items-center space-x-1.5 font-semibold text-amber-800 dark:text-amber-200">
                    <span>Monthly goal reached! 🎉</span>
                  </span>
                  {surplusHours > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-100 font-bold text-[11px]">
                      +{surplusHours} hrs above goal
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between w-full flex-wrap gap-1">
                  <div className="flex items-center space-x-1.5">
                    <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-gray-700 dark:text-zinc-300">
                      Pace needed:{' '}
                      <strong className="font-bold text-gray-900 dark:text-white">
                        {formattedPace}
                      </strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                    ({daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left in {currentMonthName})
                  </span>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Yearly Progress */}
      {showHours && showYearly && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
          className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 space-y-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-gray-900 dark:text-white">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Yearly Goal</h2>
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">
              {currentYearlyHours} / {yearlyGoal} hrs
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-4 w-full bg-gray-100 dark:bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-1000 ease-out"
              style={{ width: `${yearlyPercentage}%` }}
            />
          </div>
        </motion.div>
      )}

      {/* Analytics Chart */}
      {showHours && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.15 }}
          className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 space-y-4"
        >
          <div className="flex items-center space-x-2 text-gray-900 dark:text-white mb-4">
            <BarChartIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Hours Distribution</h2>
          </div>
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke={theme === 'dark' ? '#a1a1aa' : '#71717a'} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={theme === 'dark' ? '#a1a1aa' : '#71717a'} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: theme === 'dark' ? '#27272a' : '#f4f4f5' }}
                  contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7', borderRadius: '8px', color: theme === 'dark' ? '#ffffff' : '#000000' }}
                />
                <Bar dataKey="hours" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.2 }}
        className={`grid gap-4 ${showHours ? 'grid-cols-2' : 'grid-cols-1'}`}
      >
        {showHours && (
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
            <Clock className="w-8 h-8 text-primary mb-3" />
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{currentMonthlyHours}</span>
            <span className="text-xs text-gray-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">Hours</span>
          </div>
        )}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
          <BookOpen className="w-8 h-8 text-primary mb-3" />
          <span className="text-3xl font-bold text-gray-900 dark:text-white">{monthlyStudies}</span>
          <span className="text-xs text-gray-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">Studies</span>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.25 }}
        className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 space-y-4"
      >
        <div className="flex items-center space-x-2 text-gray-900 dark:text-white mb-4">
          <List className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        {(!sessions || sessions.length === 0) ? (
          <p className="text-sm text-gray-500 dark:text-zinc-400 text-center py-4">No sessions logged yet.</p>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {sessions.slice(0, 10).map(session => (
                <motion.div
                  key={session.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="flex items-center justify-between p-4 bg-gray-100 dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {session.manualDate ? format(new Date(session.manualDate + 'T12:00:00'), 'MMM d, yyyy') : format(new Date(session.startTime), 'MMM d, yyyy')}
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-zinc-400 mt-1">
                      {showHours && (
                        <span>{Number((session.durationMs / (1000 * 60 * 60)).toFixed(1))} hrs</span>
                      )}
                      <span>{session.studies} studies</span>
                    </div>
                    {session.notes && (
                      <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1 italic line-clamp-1">
                        "{session.notes}"
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEditSession(session)}
                      className="p-2 text-gray-500 dark:text-zinc-400 hover:text-primary transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteSession(session.id)}
                      className="p-2 text-gray-500 dark:text-zinc-400 hover:text-danger transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
