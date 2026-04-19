import { Lightbulb } from 'lucide-react';

// ─── HintButton ─────────────────────────────────────────────────────────────
// כפתור 💡 משותף. כאשר `cooldown > 0` מציג ספירה לאחור וחוסם לחיצה.
// colorToken מאפשר להתאים לגוון המשחק; ברירת המחדל amber כמו במעבדת אחוזים.
//
// Props:
//   cooldown   — מספר שניות שנותרו עד ששוב ניתן לבקש רמז (0 = מוכן)
//   onClick    — callback
//   colorToken — 'amber' | 'sky' | 'emerald' | ... (ברירת מחדל 'amber')
//   title      — tooltip, ברירת מחדל "רמז"
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_CLASSES = {
  amber: {
    ready:   'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700/50 text-amber-600',
  },
  sky: {
    ready:   'bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700/50 text-sky-600',
  },
  emerald: {
    ready:   'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700/50 text-emerald-600',
  },
};

const DISABLED = 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-300 dark:text-slate-500';

export default function HintButton({ cooldown = 0, onClick, colorToken = 'amber', title = 'רמז' }) {
  const disabled = cooldown > 0;
  const ready = (COLOR_CLASSES[colorToken] || COLOR_CLASSES.amber).ready;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      title={title}
      className={`w-11 h-11 flex items-center justify-center rounded-2xl border-2 transition-all active:scale-95 ${
        disabled ? DISABLED : `${ready} hover:scale-105`
      }`}
    >
      {disabled ? (
        <span className="text-xs font-bold">{cooldown}s</span>
      ) : (
        <Lightbulb size={18} />
      )}
    </button>
  );
}
