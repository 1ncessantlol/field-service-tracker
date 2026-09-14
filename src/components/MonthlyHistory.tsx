import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '../firebase';
import { useUser } from '../context/UserContext';

interface Report {
  id: string;
  date: any; // Firestore Timestamp or string
  hours: number;
  notes?: string;
  [key: string]: any;
}

interface GroupedReports {
  [monthYear: string]: {
    records: Report[];
    totalHours: number;
  };
}

export default function MonthlyHistory() {
  const { user } = useUser();
  const [groupedReports, setGroupedReports] = useState<GroupedReports>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'reports'),
          where('uid', '==', user.uid),
          orderBy('date', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const reports: Report[] = [];
        
        querySnapshot.forEach((doc) => {
          reports.push({ id: doc.id, ...doc.data() } as Report);
        });

        // Group the fetched records by month and year using reduce
        const grouped = reports.reduce((acc: GroupedReports, report) => {
          // Handle both Firestore Timestamps and date strings
          let dateObj;
          if (report.date && typeof report.date.toDate === 'function') {
            dateObj = report.date.toDate();
          } else {
            dateObj = new Date(report.date || Date.now());
          }

          const monthYear = format(dateObj, 'MMMM yyyy');
          
          if (!acc[monthYear]) {
            acc[monthYear] = { records: [], totalHours: 0 };
          }
          
          acc[monthYear].records.push(report);
          acc[monthYear].totalHours += (Number(report.hours) || 0);
          
          return acc;
        }, {});

        setGroupedReports(grouped);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const groupKeys = Object.keys(groupedReports);

  if (groupKeys.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-zinc-400">
        No reports found.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto w-full">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Monthly History</h2>
      {groupKeys.map((monthYear) => {
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
              {group.records.map((report) => {
                const dateObj = report.date?.toDate 
                  ? report.date.toDate() 
                  : new Date(report.date || Date.now());
                  
                return (
                  <div key={report.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {format(dateObj, 'MMM d, yyyy')}
                      </span>
                      {report.notes && (
                        <span className="text-sm text-gray-500 dark:text-zinc-400 mt-1 line-clamp-1">
                          {report.notes}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {Number(report.hours || 0).toFixed(1)}h
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
