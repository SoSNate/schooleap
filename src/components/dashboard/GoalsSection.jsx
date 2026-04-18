import { Trophy, Gift, Plus, Trash2 } from 'lucide-react';

/**
 * Goal cards grid + dashed "add" button.
 *
 * Props:
 *  goals    – array of goal objects
 *  onAdd    – () => void  (opens GoalModal)
 *  onDelete – (id) => void
 */
export default function GoalsSection({ goals, onAdd, onDelete }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 px-1">
        <Trophy className="text-amber-500" size={16} /> הסכם הפרסים
      </h3>

      {/* Reward system explainer */}
      <div className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-4 space-y-2">
        <p className="text-xs font-black text-amber-800 flex items-center gap-1.5">
          <Trophy size={13} className="text-amber-600" /> כיצד עובד מערכת התגמול?
        </p>
        <p className="text-xs text-amber-700 leading-relaxed">
          אנחנו מאמינים שילד לומד טוב יותר כשיש לו מטרה ברורה. קבעו עם ילדכם יעד זמן למידה —
          למשל 20 שעות של פתרון תרגילים בחודש — ופרס מוסכם שיקבל בהגיעו ליעד.
        </p>
        <p className="text-xs text-amber-700 leading-relaxed">
          המערכת תציג לילד פרוגרס-בר עם ספירה לאחור לקראת הפרס. <strong>שימו לב:</strong> זמן למידה
          נמדד לפי תרגילים שפותרו בפועל — לא לפי זמן שהאפליקציה פתוחה.
        </p>
        <p className="text-xs text-slate-500 italic">
          💡 הפרוגרס-בר יוצג לילד רק אם הגדרתם הסכם — אחרת הממשק שלו נשאר נקי ומינימליסטי.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {goals.map(g => (
          <div key={g.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative group">
            <button
              onClick={() => onDelete(g.id)}
              className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"
            >
              <Trash2 size={14} />
            </button>
            <h4 className="font-bold text-sm mb-1">{g.title}</h4>
            <p className="text-xs text-pink-600 font-bold flex items-center gap-1.5">
              <Gift size={12} /> {g.reward}
            </p>
          </div>
        ))}
        <button
          onClick={onAdd}
          className="border-2 border-dashed border-slate-200 rounded-2xl p-5 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all flex flex-col items-center justify-center gap-2 min-h-[80px]"
        >
          <Plus size={20} />
          <span className="font-bold text-xs">הוסף הסכם חדש</span>
        </button>
      </div>
    </div>
  );
}
