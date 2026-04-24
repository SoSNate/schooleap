// ─── HintBubble ─────────────────────────────────────────────────────────────
// מרחף מעל ה-layout — לא מזיז תוכן. מוצג כ-fixed overlay בתחתית המסך.
// ─────────────────────────────────────────────────────────────────────────────

export default function HintBubble({ text, className = '' }) {
  if (!text) return null;
  return (
    <div
      dir="rtl"
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md
        bg-amber-50 dark:bg-amber-900/40 border-2 border-amber-300 dark:border-amber-600
        rounded-2xl px-5 py-3 text-center shadow-xl
        animate-[hint-pop_0.25s_ease-out] ${className}`}
      role="status"
      aria-live="polite"
    >
      <style>{`@keyframes hint-pop{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
      <p className="text-sm font-bold text-amber-800 dark:text-amber-200">💡 {text}</p>
    </div>
  );
}
