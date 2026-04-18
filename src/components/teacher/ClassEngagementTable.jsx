import EngagementBadge from './EngagementBadge';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}

/**
 * Class-wide engagement table. No student comparison — each student
 * is measured against themselves only.
 *
 * Props:
 *  students – array from get_teacher_class_overview()
 *  onSelect – (student) => void  (open detail drawer)
 */
export default function ClassEngagementTable({ students, onSelect }) {
  if (!students || students.length === 0) {
    return (
      <div className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-sm text-center space-y-3">
        <div className="text-5xl">🎓</div>
        <p className="text-slate-500 text-sm font-bold">אין תלמידים רשומים</p>
        <p className="text-slate-400 text-xs">הוסף תלמיד כדי לקבל קוד כניסה</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-700">רשימת כיתה ({students.length} תלמידים)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <th className="text-right px-4 py-3">שם</th>
              <th className="text-right px-4 py-3">קוד כניסה</th>
              <th className="text-right px-4 py-3">סטטוס</th>
              <th className="text-right px-4 py-3">כניסה אחרונה</th>
              <th className="text-right px-4 py-3">השבוע</th>
              <th className="text-right px-4 py-3">ימים פעיל (30)</th>
              <th className="text-right px-4 py-3">הצלחה</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr
                key={s.child_id}
                onClick={() => onSelect(s)}
                className="border-t border-slate-50 hover:bg-indigo-50/40 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-bold text-slate-800">{s.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600 tracking-wider">{s.access_code}</td>
                <td className="px-4 py-3"><EngagementBadge lastLogin={s.last_login} /></td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDate(s.last_login)}</td>
                <td className="px-4 py-3 text-sm font-bold text-indigo-600">{Number(s.games_this_week) || 0}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{Number(s.active_days_this_month) || 0}/30</td>
                <td className="px-4 py-3 text-sm font-bold">
                  {s.total_games > 0
                    ? <span className={Number(s.success_rate) >= 70 ? 'text-green-600' : Number(s.success_rate) >= 50 ? 'text-amber-600' : 'text-red-500'}>{s.success_rate}%</span>
                    : <span className="text-slate-300">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
