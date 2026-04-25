import { useState } from 'react';
import { Bell, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';

const PREDEFINED_TIMES = [
  { label: '🌅 בוקר (08:00)', value: '08:00' },
  { label: '🏫 אחרי הלימודים (15:00)', value: '15:00' },
  { label: '🌙 ערב (19:00)', value: '19:00' },
];

/**
 * Simplified Parent Reminder Settings Card
 * Send reminders at specific times, quiet otherwise
 */
export default function PushSettingsCard({ childToken, parentToken, childName }) {
  const [selectedTimes, setSelectedTimes] = useState(['08:00', '15:00']); // Default: morning + afternoon
  const [sending, setSending] = useState(false);

  // ─── Toggle time selection ───────────────────────────────────
  const toggleTime = (time) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  // ─── Send immediate reminder ─────────────────────────────────
  const handleSendReminder = async () => {
    if (!childToken) return;

    setSending(true);
    try {
      const response = await supabase.functions.invoke('send-push', {
        body: {
          p_token: childToken,
          title: '⏰ תזכורת',
          body: `היי ${childName}! חזור ללמוד 📚`,
          url: '/play',
          delay_ms: 0,
        },
      });

      if (response.error) throw response.error;

      Swal.fire({
        title: '✅ תזכורת נשלחה',
        text: `${childName} יקבל תזכורת עכשיו`,
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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Bell size={18} className="text-indigo-600" />
        <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">תזכורות 🔔</h3>
      </div>

      {/* Send reminder button */}
      <button
        onClick={handleSendReminder}
        disabled={sending}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95 disabled:opacity-60"
      >
        <Send size={16} />
        {sending ? 'שולח...' : '⏰ שלח תזכורת עכשיו'}
      </button>

      {/* Predefined notification times */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
          📅 זמנים קבועים (אופציונלי - Phase 2):
        </p>
        <div className="flex flex-col gap-2">
          {PREDEFINED_TIMES.map((time) => (
            <label key={time.value} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 p-2 rounded-lg">
              <input
                type="checkbox"
                checked={selectedTimes.includes(time.value)}
                onChange={() => toggleTime(time.value)}
                disabled={sending}
                className="w-4 h-4 accent-indigo-600"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{time.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
        <p className="text-xs text-blue-900 dark:text-blue-200">
          💡 {childName} יקבל תזכורות רק בזמנים שבחרת. שאר הזמן - שקט לגמרי.
        </p>
      </div>
    </div>
  );
}
