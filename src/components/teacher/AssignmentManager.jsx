import { useEffect, useState, useCallback } from 'react';
import { Plus, Target, Check, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GAMES } from '../../utils/games';

/**
 * AssignmentManager — המורה יוצר משימות לכיתה וצופה בהן.
 * כל INSERT ל-assignments מפעיל DB trigger שמייצר pending לכל התלמידים.
 */
export default function AssignmentManager({ teacherId, readOnly = false }) {
  const [assignments, setAssignments] = useState([]);
  const [statuses,    setStatuses]    = useState([]); // child_assignments_status rows
  const [loading,     setLoading]     = useState(true);
  const [open,        setOpen]        = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState(null);

  const [game,  setGame]  = useState(GAMES[0].id);
  const [level, setLevel] = useState(3);
  const [title, setTitle] = useState('');

  const load = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      const { data: asns } = await supabase
        .from('assignments')
        .select('id, game_name, target_level, title, due_at, created_at')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })
        .limit(30);
      setAssignments(asns || []);

      const ids = (asns || []).map(a => a.id);
      if (ids.length) {
        const { data: st } = await supabase
          .from('child_assignments_status')
          .select('assignment_id, status')
          .in('assignment_id', ids);
        setStatuses(st || []);
      } else {
        setStatuses([]);
      }
    } catch (e) {
      console.error('[AssignmentManager] load:', e);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (readOnly) return;
    setErr(null);
    setSaving(true);
    try {
      const { error } = await supabase.from('assignments').insert({
        teacher_id:   teacherId,
        game_name:    game,
        target_level: Number(level),
        title:        title.trim() || null,
      });
      if (error) throw error;
      setOpen(false);
      setTitle('');
      await load();
    } catch (e) {
      console.error('[AssignmentManager] create:', e);
      setErr('שגיאה ביצירת המשימה');
    } finally {
      setSaving(false);
    }
  }

  function countsFor(assignmentId) {
    const rows = statuses.filter(s => s.assignment_id === assignmentId);
    const done = rows.filter(s => s.status === 'done').length;
    return { done, total: rows.length };
  }

  return (
    <div dir="rtl" className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-indigo-600" />
          <h3 className="text-sm font-black text-slate-800">משימות הכיתה</h3>
        </div>
        {!readOnly && (
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1 text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl transition-all active:scale-95"
          >
            <Plus size={14} /> חדשה
          </button>
        )}
      </div>

      {open && !readOnly && (
        <form onSubmit={handleCreate} className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">משחק</label>
            <select
              value={game}
              onChange={e => setGame(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {GAMES.map(g => (
                <option key={g.id} value={g.id}>{g.emoji} {g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
              רמת יעד: {level}
            </label>
            <input
              type="range" min={1} max={5} value={level}
              onChange={e => setLevel(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-0.5">
              {[1,2,3,4,5].map(n => <span key={n}>{n}</span>)}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
              כותרת (אופציונלי)
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="למשל: שיעורי בית לסוף שבוע"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          {err && <p className="text-red-500 text-xs font-bold">{err}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-2 rounded-xl text-sm hover:bg-slate-50"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-2 rounded-xl text-sm"
            >
              {saving ? 'יוצר...' : 'שלח לכיתה'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="w-6 h-6 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : assignments.length === 0 ? (
        <p className="text-center text-slate-400 text-xs py-6">
          עוד אין משימות. {readOnly ? '' : 'לחץ "חדשה" כדי להתחיל.'}
        </p>
      ) : (
        <div className="space-y-2">
          {assignments.map(a => {
            const g = GAMES.find(x => x.id === a.game_name);
            const { done, total } = countsFor(a.id);
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={a.id} className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{g?.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate">
                      {a.title || `רמה ${a.target_level} ב${g?.label || a.game_name}`}
                    </p>
                    <p className="text-[11px] text-slate-400">יעד: רמה {a.target_level}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-black text-slate-600">
                    {done === total && total > 0 ? <Check size={14} className="text-emerald-500" /> : <Clock size={14} className="text-amber-500" />}
                    {done}/{total}
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
