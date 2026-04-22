import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import useGameStore from '../../store/useGameStore';
import { anims, vibe } from '../../utils/math';

// ממפה currentScreen → מפתח הגיים ב-store.
const SCREEN_TO_GAME = {
  equations: 'equations',
  balance: 'balance',
  tank: 'tank',
  decimal: 'decimal',
  fractionLab: 'fractionLab',
  magicPatterns: 'magicPatterns',
  grid: 'grid',
  word: 'word',
  multChamp: 'multChamp',
  percentages: 'percentages',
};

// דרגה לפי רמה: טירון (L1–2), מתקדם (L3), אלוף (L4), רמטכ״ל (L5).
function rankFor(lvl) {
  if (lvl >= 5) return { label: 'רמטכ״ל', cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50' };
  if (lvl === 4) return { label: 'אלוף',   cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50' };
  if (lvl === 3) return { label: 'מתקדם',  cls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/50' };
  return { label: 'טירון', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50' };
}

export default function Header() {
  const totalStars = useGameStore((s) => s.totalStars);
  const currentScreen = useGameStore((s) => s.currentScreen);
  const setScreen = useGameStore((s) => s.setScreen);
  const toggleDarkMode = useGameStore((s) => s.toggleDarkMode);
  const darkMode = useGameStore((s) => s.darkMode);

  // שלוף את רמת המשחק הנוכחי (אם קיים).
  const gameKey = SCREEN_TO_GAME[currentScreen];
  const gameLvl = useGameStore((s) => gameKey ? s[gameKey]?.lvl : null);
  const rank = gameLvl ? rankFor(gameLvl) : null;

  const navigate = (screen) => {
    vibe(10);
    setScreen(screen);
  };

  return (
    <header className="h-14 sm:h-16 px-3 sm:px-4 md:px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 z-50 shadow-sm transition-colors overflow-hidden">
      {/* ── Left: logo + title (title hidden on tiny screens to save space) ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-shrink">
        <div className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
          <DotLottieReact src={anims.logo} autoplay loop speed={1.2} />
        </div>
        <h1 className="font-black text-base sm:text-lg md:text-xl tracking-tight hidden xs:block sm:block truncate">
          חשבונאוטיקה
        </h1>
        {rank && (
          <span
            className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${rank.cls} transition-colors flex-shrink-0`}
            title={`דרגה נוכחית במשחק: ${rank.label}`}
            aria-label={`דרגה: ${rank.label}`}
          >
            {rank.label}
          </span>
        )}
      </div>

      {/* ── Right: actions — flex-shrink-0 so buttons never get clipped ── */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
        {/* Rank badge — mobile only (shown instead of left-side badge) */}
        {rank && (
          <span
            className={`sm:hidden inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${rank.cls} transition-colors`}
            aria-label={`דרגה: ${rank.label}`}
          >
            {rank.label}
          </span>
        )}

        {/* Stars counter */}
        <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 sm:px-3 py-1 rounded-full text-xs font-bold border border-amber-100 dark:border-amber-800/50 whitespace-nowrap flex items-center gap-1 transition-colors">
          ⭐ <span>{totalStars}</span>
        </div>

        {/* Settings */}
        <button
          onClick={() => navigate('settings')}
          className="bg-slate-100 dark:bg-slate-700 p-2 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center rounded-xl text-base sm:text-lg transition-transform hover:scale-110 active:scale-95"
          title="מאחורי הקלעים"
        >
          ⚙️
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={() => { vibe(10); toggleDarkMode(); }}
          className="bg-slate-100 dark:bg-slate-700 p-2 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center rounded-xl text-base sm:text-lg transition-transform hover:scale-110 active:scale-95"
          title={darkMode ? 'מצב יום' : 'מצב לילה'}
          aria-label={darkMode ? 'מצב יום' : 'מצב לילה'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {/* Home — always visible when not on menu */}
        {currentScreen !== 'menu' && (
          <button
            onClick={() => navigate('menu')}
            className="bg-slate-100 dark:bg-slate-700 p-2 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center rounded-xl text-base sm:text-lg transition-transform hover:scale-110 active:scale-95"
            title="חזרה לתפריט"
            aria-label="חזרה לתפריט"
          >
            🏠
          </button>
        )}
      </div>
    </header>
  );
}
