import { useState } from 'react';
import { Share2, Clock, BookOpen, Target, Plus, X, Loader2, Trash2, Edit2, List } from 'lucide-react';
import { useUser, type Session } from '../context/UserContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { BarChart as BarChartIcon } from 'lucide-react';

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
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualStudies, setManualStudies] = useState('0');
  const [isLogging, setIsLogging] = useState(false);
  const [editSessionId, setEditSessionId] = useState<string | null>(null);

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

  const handleShare = () => {
    const monthName = format(new Date(), 'MMMM yyyy');
    let reportText = `Field Service Report\n`;
    reportText += `Name: ${user?.email || 'Publisher'}\n`;
    reportText += `Month: ${monthName}\n\n`;

    if (showHours) {
      reportText += `Hours: ${currentMonthlyHours}\n`;
    }
    reportText += `Bible Studies: ${monthlyStudies}\n\n`;
    reportText += `[Generated via Field Service Tracker]`;

    if (navigator.share) {
      navigator.share({
        title: `Service Report - ${monthName}`,
        text: reportText,
      }).catch(console.error);
    } else {
      alert("Web Share API not supported in this browser. Here is your report to copy:\n\n" + reportText);
    }
  };

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const hrs = parseInt(manualHours) || 0;
    const mins = parseInt(manualMinutes) || 0;
    const stds = parseInt(manualStudies) || 0;
    
    if (hrs === 0 && mins === 0 && stds === 0) {
      alert("Please enter at least some time or studies.");
      return;
    }

    const durationMs = (hrs * 60 * 60 * 1000) + (mins * 60 * 1000);
    // Use the selected date to derive monthYear and startTime
    const monthYear = manualDate.substring(0, 7);
    const startTime = new Date(`${manualDate}T12:00:00`).getTime();
    
    setIsLogging(true);
    try {
      if (editSessionId) {
        updateDoc(doc(db, 'sessions', editSessionId), {
          durationMs,
          studies: stds,
          monthYear,
          manualDate,
          startTime,
        }).catch(err => console.error("Error updating session:", err));
      } else {
        addDoc(collection(db, 'sessions'), {
          uid: user.uid,
          durationMs,
          studies: stds,
          status: 'completed',
          monthYear,
          manualDate,
          startTime,
          createdAt: serverTimestamp()
        }).catch(err => console.error("Error adding session:", err));
      }
      
      setManualHours('');
      setManualMinutes('');
      setManualStudies('0');
      setEditSessionId(null);
      setShowManualLog(false);
    } catch (err) {
      console.error("Error logging manual time", err);
      alert("Failed to save entry.");
    } finally {
      setIsLogging(false);
    }
  };

  const handleEditSession = (session: Session) => {
    const d = new Date(session.startTime);
    const dateStr = session.manualDate || d.toISOString().substring(0, 10);
    setManualDate(dateStr);
    
    const totalMins = Math.floor(session.durationMs / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    
    setManualHours(hrs > 0 ? hrs.toString() : '');
    setManualMinutes(mins > 0 ? mins.toString() : '');
    setManualStudies(session.studies > 0 ? session.studies.toString() : '0');
    
    setEditSessionId(session.id);
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

  return (
    <div className="p-6 space-y-8 min-h-full pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-primary font-medium mt-1">{role}</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowManualLog(true)}
            className="p-3 bg-white dark:bg-[#1e1e1e] rounded-full text-gray-900 dark:text-white hover:text-primary transition border border-gray-200 dark:border-zinc-800"
            title="Log Manually"
          >
            <Plus className="w-6 h-6" />
          </button>
          <button 
            onClick={handleShare}
            className="p-3 bg-white dark:bg-[#1e1e1e] rounded-full text-gray-900 dark:text-white hover:text-primary transition border border-gray-200 dark:border-zinc-800"
            title="Share Report"
          >
            <Share2 className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Manual Log Modal */}
      {showManualLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editSessionId ? 'Edit Time' : 'Log Time'}</h2>
              <button onClick={() => {
                setShowManualLog(false);
                setEditSessionId(null);
                setManualHours('');
                setManualMinutes('');
                setManualStudies('0');
                setManualDate(new Date().toISOString().substring(0, 10));
              }} className="text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white">
                <X className="w-6 h-6" />
              </button>
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

              <button 
                type="submit" 
                disabled={isLogging}
                className="w-full py-4 mt-2 bg-primary text-white dark:text-[#121212] font-bold rounded-xl hover:bg-primaryHover transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isLogging ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Save Entry</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Monthly Progress */}
      {showHours && (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 space-y-4">
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
        </div>
      )}

      {/* Yearly Progress */}
      {showHours && showYearly && (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 space-y-4">
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
        </div>
      )}

      {/* Analytics Chart */}
      {showHours && (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 space-y-4">
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
        </div>
      )}

      {/* Stats Grid */}
      <div className={`grid gap-4 ${showHours ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center space-x-2 text-gray-900 dark:text-white mb-4">
          <List className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        {(!sessions || sessions.length === 0) ? (
          <p className="text-sm text-gray-500 dark:text-zinc-400 text-center py-4">No sessions logged yet.</p>
        ) : (
          <div className="space-y-3">
            {sessions.slice(0, 10).map(session => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-gray-100 dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
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
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => handleEditSession(session)} className="p-2 text-gray-500 dark:text-zinc-400 hover:text-primary transition">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteSession(session.id)} className="p-2 text-gray-500 dark:text-zinc-400 hover:text-danger transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
