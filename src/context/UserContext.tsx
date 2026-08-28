import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, updateProfile, type User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

export type Role = 'Publisher' | 'Auxiliary Pioneer' | 'Regular Pioneer' | 'Custom';

export interface Session {
  id: string;
  durationMs: number;
  studies: number;
  startTime: number;
  status: string;
  monthYear: string;
  manualDate?: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateUserName: (name: string) => Promise<void>;
  sessions: Session[];
  
  role: Role;
  setRole: (role: Role) => void;
  customMonthlyGoal: number;
  setCustomMonthlyGoal: (goal: number) => void;
  customYearlyGoal: number;
  setCustomYearlyGoal: (goal: number) => void;

  currentMonthlyHours: number;
  currentYearlyHours: number;
  monthlyStudies: number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // User Settings State
  const [role, setRoleState] = useState<Role>(() => {
    return (localStorage.getItem('fst_role') as Role) || 'Regular Pioneer';
  });
  const [customMonthlyGoal, setCustomMonthlyGoal] = useState<number>(50);
  const [customYearlyGoal, setCustomYearlyGoal] = useState<number>(600);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Current stats state
  const [currentMonthlyHours, setCurrentMonthlyHours] = useState<number>(0);
  const [currentYearlyHours, setCurrentYearlyHours] = useState<number>(0);
  const [monthlyStudies, setMonthlyStudies] = useState<number>(0);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Firestore User Settings & Stats Listener
  useEffect(() => {
    if (!user) {
      setCurrentMonthlyHours(0);
      setCurrentYearlyHours(0);
      setMonthlyStudies(0);
      setSessions([]);
      return;
    }

    // 1. Settings listener
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoleState(data.role || 'Regular Pioneer');
        setCustomMonthlyGoal(data.customMonthlyGoal || 50);
        setCustomYearlyGoal(data.customYearlyGoal || 600);
      } else {
        // Create initial default doc
        setDoc(userDocRef, {
          role: 'Regular Pioneer',
          customMonthlyGoal: 50,
          customYearlyGoal: 600
        }, { merge: true });
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching user data:", err);
      setLoading(false);
    });

    // 2. Sessions listener for current Service Year (Sept 1st to Aug 31st)
    const now = new Date();
    const currentMonthIndex = now.getMonth();
    let serviceYearStartYear = now.getFullYear();
    if (currentMonthIndex < 8) { // If before September
      serviceYearStartYear -= 1;
    }
    const serviceYearStart = new Date(serviceYearStartYear, 8, 1).getTime();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const sessionsQuery = query(
      collection(db, 'sessions'), 
      where('uid', '==', user.uid)
    );
    
    const unsubscribeSessions = onSnapshot(sessionsQuery, (querySnapshot) => {
      let monthlyDurationMs = 0;
      let monthlyStudiesTotal = 0;
      let yearlyDurationMs = 0;
      const allSessions: Session[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status !== 'completed') return;
        
        const duration = data.durationMs || 0;
        const studies = data.studies || 0;
        const startTime = data.startTime || 0;

        allSessions.push({ id: doc.id, ...data } as Session);

        if (startTime >= serviceYearStart) {
          // Add to yearly totals
          yearlyDurationMs += duration;

          // Add to monthly totals if it falls in the current month
          if (startTime >= currentMonthStart) {
            monthlyDurationMs += duration;
            monthlyStudiesTotal += studies;
          }
        }
      });
      
      // Sort sessions by startTime descending
      allSessions.sort((a, b) => b.startTime - a.startTime);
      
      setCurrentMonthlyHours(Number((monthlyDurationMs / (1000 * 60 * 60)).toFixed(1)));
      setCurrentYearlyHours(Number((yearlyDurationMs / (1000 * 60 * 60)).toFixed(1)));
      setMonthlyStudies(monthlyStudiesTotal);
      setSessions(allSessions);
    }, (error) => {
      console.error("Error fetching sessions:", error);
    });

    return () => {
      unsubscribeUser();
      unsubscribeSessions();
    };
  }, [user?.uid]);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    localStorage.setItem('fst_role', newRole);
    if (user) setDoc(doc(db, 'users', user.uid), { role: newRole }, { merge: true });
  };

  const setCustomMonthlyGoalWrapper = (val: number) => {
    setCustomMonthlyGoal(val);
    if (user) setDoc(doc(db, 'users', user.uid), { customMonthlyGoal: val }, { merge: true });
  };

  const setCustomYearlyGoalWrapper = (val: number) => {
    setCustomYearlyGoal(val);
    if (user) setDoc(doc(db, 'users', user.uid), { customYearlyGoal: val }, { merge: true });
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateUserName = async (name: string) => {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: name });
      // Trigger a re-render by shallow-copying the user object (or simply setting to auth.currentUser might work if ref changes, but cloning ensures it)
      setUser(Object.assign({}, auth.currentUser) as User);
    }
  };

  return (
    <UserContext.Provider value={{
      user, loading, logout, updateUserName,
      role, setRole,
      customMonthlyGoal, setCustomMonthlyGoal: setCustomMonthlyGoalWrapper,
      customYearlyGoal, setCustomYearlyGoal: setCustomYearlyGoalWrapper,
      currentMonthlyHours, currentYearlyHours, monthlyStudies, sessions
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
