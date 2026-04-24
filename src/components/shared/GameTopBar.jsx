import HintButton from './HintButton';
import Hearts from './Hearts';

// Tailwind needs full class strings to include them in the build
const LVL_BG = {
  sky:     'bg-sky-600',
  amber:   'bg-amber-500',
  rose:    'bg-rose-500',
  emerald: 'bg-emerald-600',
  violet:  'bg-violet-600',
  red:     'bg-red-600',
  orange:  'bg-orange-500',
  lime:    'bg-lime-600',
  cyan:    'bg-cyan-600',
  blue:    'bg-blue-600',
};

// ─── GameTopBar ───────────────────────────────────────────────────────────────
// כרטיס עליון אחיד: מספר רמה + כפתור רמז + כוכבים (+ Hearts אם יש lives)
//
// Props:
//   level       — מספר הרמה (1–5)
//   stars       — מספר הכוכבים
//   hintCooldown — שניות cooldown לכפתור הרמז
//   onHint      — callback ללחיצה על רמז
//   colorToken  — 'sky' | 'amber' | 'violet' | 'red' | 'emerald' | ...
//   lives       — (אופציונלי) מספר חיים נוכחי → מציג Hearts מתחת לכרטיס
//   maxLives    — (ברירת מחדל 5)
//   justLost    — (ברירת מחדל false) אנימציית אובדן לב
// ─────────────────────────────────────────────────────────────────────────────
export default function GameTopBar({
  level,
  stars,
  hintCooldown = 0,
  onHint,
  colorToken = 'sky',
  lives,
  maxLives = 5,
  justLost = false,
}) {
  const lvlBg = LVL_BG[colorToken] || 'bg-sky-600';

  return (
    <div className="flex flex-col items-center gap-2 mb-3">
      <div className="flex items-center justify-center gap-2 sm:gap-3 bg-white dark:bg-slate-800 rounded-2xl px-3 sm:px-4 py-2 border border-slate-100 dark:border-slate-700 shadow-sm w-fit mx-auto">
        {/* Level badge */}
        <div className={`${lvlBg} text-white w-10 h-10 flex items-center justify-center rounded-xl font-black text-base shadow-md`}>
          {level}
        </div>
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
        {/* Hint button */}
        <HintButton cooldown={hintCooldown} onClick={onHint} colorToken={colorToken} />
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
        {/* Stars */}
        <div className="flex items-center gap-1.5 bg-sky-50 dark:bg-sky-900/30 border border-sky-100 dark:border-sky-800 rounded-xl px-2.5 py-1">
          <span>⭐</span>
          <span className="text-sm font-black text-sky-700 dark:text-sky-300">{stars}</span>
        </div>
      </div>
      {/* Hearts — optional */}
      {lives !== undefined && (
        <Hearts lives={lives} maxLives={maxLives} justLost={justLost} />
      )}
    </div>
  );
}
