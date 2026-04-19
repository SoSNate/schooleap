import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import useGameStore from '../../store/useGameStore';
import { ranks, vibe, anims } from '../../utils/math';
import { GAMES, GAME_BY_ID, getGameColorClasses } from '../../utils/games';

// Assignment Wall — המשימה הראשונה בתור חוסמת את שאר המשחקים.
// הנעילה היא ליום אחד בלבד: ברגע שמשימה נסגרה (DB trigger → assignments רענון),
// הפתק נשמר ב-localStorage והילד רשאי לשחק חופשי עד חצות.
const ASSIGNMENT_DONE_KEY = 'assignment_done_date';

function wasAssignmentCompletedToday() {
  try {
    const stored = localStorage.getItem(ASSIGNMENT_DONE_KEY);
    return stored === new Date().toDateString();
  } catch {
    return false;
  }
}

export default function Menu({ goals = [] }) {
  const setScreen       = useGameStore((s) => s.setScreen);
  const locks           = useGameStore((s) => s.locks);
  const cheatLevel      = useGameStore((s) => s.cheatLevel);
  const assignments     = useGameStore((s) => s.assignments);
  const equations       = useGameStore((s) => s.equations);
  const balance         = useGameStore((s) => s.balance);
  const tank            = useGameStore((s) => s.tank);
  const decimal         = useGameStore((s) => s.decimal);
  const fractionLab     = useGameStore((s) => s.fractionLab);
  const magicPatterns   = useGameStore((s) => s.magicPatterns);
  const grid            = useGameStore((s) => s.grid);
  const word            = useGameStore((s) => s.word);
  const multChamp       = useGameStore((s) => s.multChamp);

  const gameStates = { equations, balance, tank, decimal, fractionLab, magicPatterns, grid, word, multChamp };

  // Assignment Wall state
  const completedToday   = wasAssignmentCompletedToday();
  const hasOpenAssignment = assignments.length > 0 && !completedToday;
  const currentAssignment = hasOpenAssignment ? assignments[0] : null;
  const currentGameMeta   = currentAssignment ? GAME_BY_ID[currentAssignment.game_name] : null;

  const isLocked = (gameId) => currentAssignment && currentAssignment.game_name !== gameId;

  const startGame = (gameId) => {
    if (isLocked(gameId)) { vibe(30); return; }
    vibe(10);
    setScreen(gameId);
  };

  const handleCheatLevel = (e, gameId) => {
    if (isLocked(gameId)) return;
    e.stopPropagation();
    vibe(30);
    cheatLevel(gameId);
  };

  const getBadgeText = (gameId) => {
    const locked = locks[gameId] > 0;
    return (locked ? '🔒 ' : '') + ranks[gameStates[gameId].lvl];
  };

  return (
    <div className="screen-enter flex flex-col items-center p-6 flex-1 min-h-[calc(100dvh-80px)]">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black tracking-tight">מרכז הלמידה</h2>
        <p className="text-xs text-slate-400 dark:text-slate-400 font-bold mb-2">
          התקדמות כל 3 הצלחות (לחיצה על הדרגה לדילוג)
        </p>
        <div className="w-full max-w-[320px] h-32 md:h-40 opacity-90 mx-auto pointer-events-none">
          <DotLottieReact src={anims.menuHero} autoplay loop />
        </div>
      </div>

      {/* Assignment Wall banner — מוצג רק כשיש משימה פתוחה פעילה */}
      {currentAssignment && currentGameMeta && (
        <div dir="rtl" className="w-full max-w-sm mb-4 bg-gradient-to-l from-indigo-600 to-violet-600 text-white rounded-2xl p-4 shadow-lg border-2 border-indigo-300">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentGameMeta.emoji}</span>
            <div className="text-right flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-0.5">
                📋 משימה מהמורה
              </p>
              <p className="text-sm font-black">
                {currentAssignment.title || `הגע לרמה ${currentAssignment.target_level} ב${currentGameMeta.label}`}
              </p>
              <p className="text-[11px] text-indigo-100 mt-0.5">
                רמת יעד: {currentAssignment.target_level} • שאר המשחקים נעולים עד לסיום
              </p>
            </div>
          </div>
        </div>
      )}

      {/* הודעת שחרור — משימת היום הושלמה */}
      {completedToday && assignments.length > 0 && (
        <div dir="rtl" className="w-full max-w-sm mb-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-2xl px-4 py-3 text-center">
          <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
            🎉 סיימת את משימת היום — שחק בחופשיות!
          </p>
        </div>
      )}

      {/* Goals banner — מוצג רק אם ההורה הגדיר יעדים */}
      {goals.length > 0 && (
        <div dir="rtl" className="w-full max-w-sm mb-4 space-y-2">
          <p className="text-xs font-black text-amber-600 dark:text-amber-400 px-1">🏆 הסכמי הפרסים שלך</p>
          {goals.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl px-4 py-3"
            >
              <span className="text-xl">🎁</span>
              <div className="text-right flex-1">
                <p className="text-xs font-black text-slate-700 dark:text-slate-200">{g.title}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">פרס: {g.reward}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {GAMES.map((g) => {
        const colors = getGameColorClasses(g.colorToken);
        const locked = isLocked(g.id);
        return (
          <button
            key={g.id}
            onClick={() => startGame(g.id)}
            disabled={locked}
            className={`menu-btn ${colors.bg} ${colors.border} border-e-slate-200 border-s-slate-200 border-t-slate-200 dark:border-e-slate-700 dark:border-s-slate-700 dark:border-t-slate-700 group relative ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <span className="text-3xl drop-shadow-sm">{g.emoji}</span>
            <div className="text-right flex-1 px-4">
              <h3 className="font-black">{g.label}</h3>
              <div className="flex items-center gap-2 mt-1">
                <p
                  className="text-[10px] text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full inline-block lvl-badge whitespace-nowrap"
                  onClick={(e) => handleCheatLevel(e, g.id)}
                >
                  {getBadgeText(g.id)}
                </p>
                <p className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${colors.text} ${colors.bg}`}>
                  ⭐ {gameStates[g.id].stars}
                </p>
              </div>
            </div>
            {locked ? (
              <span className="text-xl">🔒</span>
            ) : (
              <span className="text-slate-300 dark:text-slate-600 group-hover:-translate-x-1 transition-transform">◀</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
