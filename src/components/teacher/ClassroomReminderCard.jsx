import { useState } from 'react';
import { Send, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';

/**
 * Teacher classroom reminder card
 * Send reminders to individual students or the whole class
 */
export default function ClassroomReminderCard({ students }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [sending, setSending] = useState(false);

  // ─── Send reminder to student ────────────────────────────────
  const handleSendReminder = async (student) => {
    if (!student?.magic_token) return;

    setSending(true);
    try {
      const response = await supabase.functions.invoke('send-push', {
        body: {
          p_token: student.magic_token,
          title: '⏰ תזכורת מהמורה',
          body: 'חזור ללמוד! 📚',
          url: '/play',
          delay_ms: 0,
        },
      });

      if (response.error) throw response.error;

      Swal.fire({
        title: '✅ תזכורת נשלחה',
        text: `${student.name} יקבל תזכורת עכשיו`,
        icon: 'success',
        toast: true,
        position: 'top-start',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        title: '❌ שגיאה',
        text: err.message || 'לא ניתן לשלוח תזכורת',
        icon: 'error',
      });
    } finally {
      setSending(false);
    }
  };

  // ─── Send reminder to all students ───────────────────────────
  const handleSendToAll = async () => {
    if (students.length === 0) return;

    const { isConfirmed } = await Swal.fire({
      title: 'שלח תזכורת לכולם?',
      text: `תשלח תזכורת ל-${students.length} תלמידים`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'כן, שלח',
      cancelButtonText: 'ביטול',
    });

    if (!isConfirmed) return;

    setSending(true);
    let sent = 0;
    let failed = 0;

    for (const student of students) {
      try {
        const response = await supabase.functions.invoke('send-push', {
          body: {
            p_token: student.magic_token,
            title: '⏰ תזכורת מהמורה',
            body: 'חזור ללמוד! 📚',
            url: '/play',
            delay_ms: 0,
          },
        });

        if (response.error) {
          failed++;
        } else {
          sent++;
        }
      } catch (err) {
        failed++;
      }
    }

    setSending(false);

    Swal.fire({
      title: `✅ בוצע`,
      text: `נשלחו ${sent}/${students.length} תזכורות`,
      icon: sent === students.length ? 'success' : 'warning',
      toast: true,
      position: 'top-start',
      timer: 3000,
      showConfirmButton: false,
    });
  };

  if (students.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Bell size={18} className="text-indigo-600" />
        <h3 className="font-bold text-base text-slate-700 dark:text-slate-200">תזכורות לכיתה 🔔</h3>
      </div>

      {/* Send to all button */}
      <button
        onClick={handleSendToAll}
        disabled={sending || students.length === 0}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95 disabled:opacity-60 text-sm"
      >
        <Send size={14} />
        {sending ? 'שולח...' : '📢 שלח תזכורת לכולם'}
      </button>

      {/* Student list */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">או לתלמיד ספציפי:</p>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {students.map((student) => (
            <button
              key={student.id}
              onClick={() => handleSendReminder(student)}
              disabled={sending}
              className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-bold transition-colors active:scale-95 disabled:opacity-60"
            >
              <Send size={12} />
              <span className="truncate">{student.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
        <p className="text-xs text-blue-900 dark:text-blue-200">
          💡 תלמידים יקבלו תזכורת מיידית בהתקנים שלהם
        </p>
      </div>
    </div>
  );
}
