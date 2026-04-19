// ─── HintBubble ─────────────────────────────────────────────────────────────
// Overlay אמבר לטקסט רמז. מוצג מעל ה-layout וללא תזוזת תוכן אחר.
// האחראי על ניהול האורך הוא ה-useHint hook (מאפס `text` אחרי `durationMs`).
//
// Props:
//   text       — תוכן הרמז (null / '' => לא מוצג)
//   className  — override אופציונלי
// ─────────────────────────────────────────────────────────────────────────────

export default function HintBubble({ text, className = '' }) {
  if (!text) return null;
  return (
    <div
      dir="rtl"
      className={`max-w-md mx-auto mt-6 bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-300 dark:border-amber-700/60 rounded-2xl px-5 py-3 text-center shadow-md ${className}`}
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-bold text-amber-800 dark:text-amber-200">💡 {text}</p>
    </div>
  );
}
