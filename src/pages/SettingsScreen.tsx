import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Target, Save, LogOut, Bell } from 'lucide-react';
import { useUser, type Role } from '../context/UserContext';

export default function SettingsScreen() {
  const { user, role, setRole, customMonthlyGoal, setCustomMonthlyGoal, customYearlyGoal, setCustomYearlyGoal, logout, updateUserName } = useUser();
  const [profileName, setProfileName] = useState(user?.displayName || '');
  const [isNameSaving, setIsNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
  };

  const handleSaveName = async () => {
    if (profileName !== (user?.displayName || '')) {
      setIsNameSaving(true);
      await updateUserName(profileName);
      setIsNameSaving(false);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    }
  };

  const [localMonthlyGoal, setLocalMonthlyGoal] = useState<number | string>(customMonthlyGoal);
  const [localYearlyGoal, setLocalYearlyGoal] = useState<number | string>(customYearlyGoal);

  useEffect(() => {
    setLocalMonthlyGoal(customMonthlyGoal);
  }, [customMonthlyGoal]);

  useEffect(() => {
    setLocalYearlyGoal(customYearlyGoal);
  }, [customYearlyGoal]);

  const validateAndSaveMonthly = () => {
    let val = Number(localMonthlyGoal);
    if (isNaN(val) || val < 1) val = 1;
    setLocalMonthlyGoal(val);
    setCustomMonthlyGoal(val);
  };

  const validateAndSaveYearly = () => {
    let val = Number(localYearlyGoal);
    if (isNaN(val) || val < 1) val = 1;
    setLocalYearlyGoal(val);
    setCustomYearlyGoal(val);
  };

  const handleSave = async () => {
    validateAndSaveMonthly();
    validateAndSaveYearly();
    if (profileName !== (user?.displayName || '')) {
      await updateUserName(profileName);
    }
    alert('Settings saved!');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="p-6 space-y-8 min-h-full pb-24"
    >
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {/* Profile Settings */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 space-y-6">
        <div className="flex items-center space-x-3 text-gray-900 dark:text-white mb-4">
          <User className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Profile Info</h2>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-500 dark:text-zinc-400">Full Name</label>
          <div className="flex space-x-3">
            <input 
              type="text" 
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Enter your name"
            />
            <button 
              onClick={handleSaveName}
              disabled={isNameSaving || profileName === (user?.displayName || '')}
              className={`px-6 py-3 font-bold rounded-lg transition-all duration-200 ease-in-out active:scale-95 text-sm shadow-md whitespace-nowrap
                ${nameSaved 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-primary text-white dark:text-[#121212] hover:bg-primaryHover disabled:opacity-50'
                }`}
            >
              {isNameSaving ? 'Saving...' : (nameSaved ? 'Saved!' : 'Save Name')}
            </button>
          </div>
        </div>
      </div>

      {/* Role Selection */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 space-y-6">
        <div className="flex items-center space-x-3 text-gray-900 dark:text-white mb-4">
          <User className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Service Role</h2>
        </div>
        
        <div className="space-y-3">
          {(['Publisher', 'Auxiliary Pioneer', 'Regular Pioneer', 'Custom'] as Role[]).map((r) => (
            <label key={r} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 cursor-pointer hover:border-primary transition">
              <input 
                type="radio" 
                name="role" 
                value={r}
                checked={role === r}
                onChange={() => setRole(r)}
                className="w-5 h-5 text-primary bg-white dark:bg-[#121212] border-gray-400 dark:border-zinc-600 focus:ring-primary focus:ring-2"
              />
              <span className="text-gray-900 dark:text-white font-medium">{r}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Custom Goals (Visible only if Custom) */}
      <div className={`bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 space-y-6 transition-opacity duration-300 ${role === 'Custom' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        <div className="flex items-center space-x-3 text-gray-900 dark:text-white mb-4">
          <Target className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Custom Goals</h2>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-zinc-400">Monthly Hours Goal</label>
            <input 
              type="number" 
              min="1"
              value={localMonthlyGoal}
              onChange={(e) => setLocalMonthlyGoal(e.target.value)}
              onBlur={validateAndSaveMonthly}
              disabled={role !== 'Custom'}
              className="px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-200 dark:disabled:bg-zinc-800"
              placeholder="e.g. 15"
            />
          </div>
          
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-zinc-400">Yearly Hours Goal</label>
            <input 
              type="number" 
              min="1"
              value={localYearlyGoal}
              onChange={(e) => setLocalYearlyGoal(e.target.value)}
              onBlur={validateAndSaveYearly}
              disabled={role !== 'Custom'}
              className="px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-200 dark:disabled:bg-zinc-800"
              placeholder="e.g. 180"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 space-y-6">
        <div className="flex items-center space-x-3 text-gray-900 dark:text-white mb-4">
          <Bell className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Notifications</h2>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">Idle Timer Reminders (3 hours)</span>
          {notificationsEnabled ? (
            <span className="text-sm font-bold text-green-500">Enabled</span>
          ) : (
            <button
              onClick={handleEnableNotifications}
              className="px-4 py-2 bg-primary text-white dark:text-[#121212] font-bold rounded-lg hover:bg-primaryHover transition-all duration-200 ease-in-out active:scale-95 text-sm shadow-md"
            >
              Enable
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <button 
          onClick={handleSave}
          className="w-full py-4 bg-primary text-white dark:text-[#121212] font-bold text-lg rounded-xl hover:bg-primaryHover transition-all duration-200 ease-in-out active:scale-95 flex items-center justify-center space-x-2"
        >
          <Save className="w-5 h-5" />
          <span>Save Settings</span>
        </button>

        <button 
          onClick={logout}
          className="w-full py-4 bg-white dark:bg-[#1e1e1e] text-danger font-bold text-lg rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all duration-200 ease-in-out active:scale-95 flex items-center justify-center space-x-2 border border-danger/30"
        >
          <LogOut className="w-5 h-5" />
          <span>Log Out</span>
        </button>
      </div>
    </motion.div>
  );
}
