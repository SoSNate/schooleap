// ─── HintBubble ─────────────────────────────────────────────────────────────
// מרחף מעל ה-layout — לא מזיז תוכן. מוצג כ-fixed overlay בתחתית המסך.
// colorToken — צבע ערכת הנושא של המשחק (amber | sky | emerald | violet | orange | teal | lime | red)
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  amber:   { bg: 'bg-amber-100  dark:bg-amber-900',   border: 'border-amber-400  dark:border-amber-500',  text: 'text-amber-800  dark:text-amber-200'  },
  sky:     { bg: 'bg-sky-100    dark:bg-sky-900',     border: 'border-sky-400    dark:border-sky-500',    text: 'text-sky-800    dark:text-sky-200'    },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900', border: 'border-emerald-400 dark:border-emerald-500', text: 'text-emerald-800 dark:text-emerald-200' },
  violet:  { bg: 'bg-violet-100 dark:bg-violet-900',  border: 'border-violet-400 dark:border-violet-500', text: 'text-violet-800 dark:text-violet-200'  },
  orange:  { bg: 'bg-orange-100 dark:bg-orange-900',  border: 'border-orange-400 dark:border-orange-500', text: 'text-orange-800 dark:text-orange-200'  },
  teal:    { bg: 'bg-teal-100   dark:bg-teal-900',    border: 'border-teal-400   dark:border-teal-500',   text: 'text-teal-800   dark:text-teal-200'   },
  lime:    { bg: 'bg-lime-100   dark:bg-lime-900',    border: 'border-lime-400   dark:border-lime-500',   text: 'text-lime-800   dark:text-lime-200'   },
  red:     { bg: 'bg-red-100    dark:bg-red-900',     border: 'border-red-400    dark:border-red-500',    text: 'text-red-800    dark:text-red-200'    },
};

export default function HintBubble({ text, colorToken = 'amber', className = '' }) {
  if (!text) return null;
  const c = COLOR_MAP[colorToken] ?? COLOR_MAP.amber;
  return (
    <div
      dir="rtl"
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md
        ${c.bg} border-2 ${c.border}
        rounded-2xl px-5 py-3 text-center shadow-xl
        animate-[hint-pop_0.25s_ease-out] ${className}`}
      role="status"
      aria-live="polite"
    >
      <style>{`@keyframes hint-pop{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
      <p className={`text-sm font-bold ${c.text}`}>💡 {text}</p>
    </div>
  );
}
