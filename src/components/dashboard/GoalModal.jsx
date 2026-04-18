/**
 * Modal form for creating a new goal / reward agreement.
 *
 * Props:
 *  open     – boolean
 *  form     – { title, reward, target_hours }
 *  onChange – (field, value) => void
 *  onSubmit – (e) => void
 *  onClose  – () => void
 *  saving   – boolean
 *  error    – string
 */
export default function GoalModal({ open, form, onChange, onSubmit, onClose, saving, error }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl">
        <h3 className="text-xl font-black mb-5">יצירת הסכם פרס</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">
              מה היעד?
            </label>
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="סיים 10 משחקים ברמה 3"
              value={form.title}
              onChange={e => onChange('title', e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">
              מה הפרס?
            </label>
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="גלידה בערב 🍦"
              value={form.reward}
              onChange={e => onChange('reward', e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">
              יעד שעות למידה (אופציונלי)
            </label>
            <input
              type="number"
              min="1"
              max="200"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              placeholder="למשל: 20 שעות בחודש"
              value={form.target_hours}
              onChange={e => onChange('target_hours', e.target.value)}
            />
            <p className="text-[10px] text-slate-400 mt-1 leading-snug">
              אם תגדירו יעד, הילד יראה פרוגרס-בר לקראת הפרס. ללא יעד — הפרס נשמר בדשבורד בלבד.
            </p>
          </div>

          {/* In-modal error feedback */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 text-sm text-rose-600 font-bold">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-3 rounded-xl font-black text-sm shadow-lg shadow-indigo-100 active:scale-95 transition-all"
            >
              {saving ? '⏳ שומר...' : 'אשר חוזה ✅'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 text-slate-400 font-bold text-sm hover:text-slate-600"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
