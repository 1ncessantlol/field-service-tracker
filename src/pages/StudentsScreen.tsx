import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Users, Plus, Phone, Calendar, Loader2, Edit2, Trash2, X } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  phone: string;
  schedule: string;
  notes?: string;
  createdAt: any;
}

export default function StudentsScreen() {
  const { user } = useUser();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [schedule, setSchedule] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editStudentId, setEditStudentId] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setPhone('');
    setSchedule('');
    setNotes('');
    setEditStudentId(null);
    setShowForm(false);
  };

  useEffect(() => {
    if (!user?.uid) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'studies'),
      where('uid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const studentData: Student[] = [];
      snapshot.forEach((doc) => {
        studentData.push({ id: doc.id, ...doc.data() } as Student);
      });
      // Sort by createdAt descending in JS to avoid Firestore composite index requirement
      studentData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      setStudents(studentData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching students:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.uid]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editStudentId) {
        updateDoc(doc(db, 'studies', editStudentId), {
          name: name.trim(),
          phone: phone.trim(),
          schedule: schedule.trim(),
          notes: notes.trim()
        }).catch(err => console.error("Error updating student:", err));
      } else {
        addDoc(collection(db, 'studies'), {
          uid: user.uid,
          name: name.trim(),
          phone: phone.trim(),
          schedule: schedule.trim(),
          notes: notes.trim(),
          createdAt: serverTimestamp()
        }).catch(err => console.error("Error adding student:", err));
      }
      resetForm();
    } catch (err) {
      console.error("Error saving student", err);
      alert("Failed to save student. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditStudentId(student.id);
    setName(student.name);
    setPhone(student.phone || '');
    setSchedule(student.schedule || '');
    setNotes(student.notes || '');
    setShowForm(true);
  };

  const handleDeleteStudent = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this student?")) {
      try {
        deleteDoc(doc(db, 'studies', id)).catch(err => console.error("Error deleting student:", err));
      } catch (err) {
        console.error("Error deleting student", err);
        alert("Failed to delete student.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="p-6 space-y-6 min-h-full pb-24"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Students</h1>
        <motion.button 
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="p-3 bg-primary text-white dark:text-[#121212] rounded-full hover:bg-primaryHover transition-colors shadow-lg"
        >
          {showForm ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </motion.button>
      </div>

      <AnimatePresence>
      {showForm && (
        <motion.form 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          onSubmit={handleAddStudent} 
          className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-zinc-800 space-y-4"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{editStudentId ? 'Edit Student' : 'Add Student'}</h2>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1 block">Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="e.g. John Doe"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1 block">Phone Number</label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="e.g. +1 234 567 8900"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1 block">Scheduled Study</label>
            <input 
              type="text" 
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="e.g. Tuesdays at 4:00 PM"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1 block">Notes</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
              placeholder="Any details about the study..."
            />
          </div>
          <motion.button 
            type="submit" 
            disabled={isSubmitting}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="w-full py-3 bg-primary text-white dark:text-[#121212] font-bold rounded-xl hover:bg-primaryHover transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Save Student</span>}
          </motion.button>
        </motion.form>
      )}
      </AnimatePresence>

      <div className="space-y-4">
        {(!students || students.length === 0) && !showForm ? (
          <div className="text-center py-12 text-gray-500 dark:text-zinc-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No Bible students found.</p>
            <p className="text-sm mt-1">Tap the + button to add one.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {students?.map((student) => (
              <motion.div 
                key={student.id} 
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="bg-white dark:bg-[#1e1e1e] rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-zinc-800 flex flex-col space-y-3 overflow-hidden"
              >
                <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{student.name}</h3>
                <div className="flex items-center space-x-1">
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEditStudent(student)} 
                    className="p-2 text-gray-500 dark:text-zinc-400 hover:text-primary transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDeleteStudent(student.id)} 
                    className="p-2 text-gray-500 dark:text-zinc-400 hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
              {student.phone && (
                <div className="flex items-center space-x-2 text-gray-500 dark:text-zinc-400 text-sm">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>{student.phone}</span>
                </div>
              )}
              {student.schedule && (
                <div className="flex items-center space-x-2 text-gray-500 dark:text-zinc-400 text-sm">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{student.schedule}</span>
                </div>
              )}
              {student.notes && (
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">
                  {student.notes}
                </p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
