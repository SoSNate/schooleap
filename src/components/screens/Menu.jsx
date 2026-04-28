import { useState } from 'react';
import useGameStore from '../../store/useGameStore';
import { STEP_CONFIG } from '../../store/useGameStore';
import { vibe } from '../../utils/math';
import { GAMES, GAME_BY_ID, getGameColorClasses } from '../../utils/games';
import { getVisibleRank } from '../../utils/ranks';

const ASSIGNMENT_DONE_KEY = 'assignment_done_date';

function wasAssignmentCompletedToday() {
  try {
    const stored = localStorage.getItem(ASSIGNMENT_DONE_KEY);
    return stored === new Date().toDateString();
  } catch {
    return false;
  }
}

// ── StepPickerSheet — bottom-sheet that slides up when tapping a game card ──
function StepPickerSheet({ game, gameState, onPlay, onClose }) {
  const colors     = getGameColorClasses(game.colorToken);
  const totalSteps = STEP_CONFIG[game.id] || 5;
  const realStep   = gameState.step || gameState.lvl || 1;
  const setPracticeLevel = useGameStore(s => s.setPracticeLevel);
  const practiceLvl      = useGameStore(s => s.practiceLevels[game.id] || 0);

  const handlePick = (step) => {
    vibe(20);
    if (step === realStep) {
      // Play the real current step directly — clear any practice override
      setPracticeLevel(game.id, 0);
      onPlay();
    } else {
      // Set as practice step and play
      setPracticeLevel(game.id, step);
      onPlay();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        dir="rtl"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 rounded-t-3xl shadow-2xl animate-[slideUp_0.22s_ease-out]"
        style={{ maxHeight: '80dvh', overflowY: 'auto' }}
      >
        <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-600" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-2 pb-4 border-b border-slate-100 dark:border-slate-700">
          <span className="text-3xl">{game.emoji}</span>
          <div className="flex-1">
            <h2 className="font-black text-slate-800 dark:text-slate-100">{game.label}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
              שלב נוכחי: {realStep} מתוך {totalSteps}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl p-1">✕</button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pt-3">
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${colors.text?.replace('text-', 'bg-') || 'bg-green-400'}`}
              style={{ width: `${Math.round((realStep / totalSteps) * 100)}%` }}
            />
          </div>
        </div>

        {/* Step grid */}
        <div className="px-5 pt-4 pb-6">
          <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 mb-3 text-center">
            בחר שלב לשחק — כל השלבים שעברת פתוחים לתרגול
          </p>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
              const isDone    = step < realStep;
              const isCurrent = step === realStep;
              const isFuture  = step > realStep;
              const isPractice = practiceLvl === step && step !== realStep;

              return (
                <button
                  key={step}
                  onClick={() => handlePick(step)}
                  disabled={isFuture}
                  className={`
                    aspect-square rounded-2xl flex flex-col items-center justify-center
                    font-black text-sm transition-all active:scale-90
                    ${isFuture
                      ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                      : isCurrent
                      ? `${colors.bg} ${colors.text} ring-2 ${colors.border} shadow-md`
                      : isPractice
                      ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 ring-2 ring-teal-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }
                  `}
                >
                  {isFuture ? (
                    <span className="text-base">🔒</span>
                  ) : isDone ? (
                    <>
                      <span className="text-base leading-none">✓</span>
                      <span className="text-[9px] leading-none mt-0.5 opacity-70">{step}</span>
                    </>
                  ) : (
                    <>
                      <span>{step}</span>
                      {isCurrent && <span className="text-[8px] leading-none mt-0.5">★ עכשיו</span>}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Play current step CTA */}
          <button
            onClick={() => { setPracticeLevel(game.id, 0); onPlay(); }}
            className={`mt-5 w-full py-4 rounded-2xl font-black text-lg text-white shadow-xl transition-all active:scale-95 ${colors.text?.replace('text-', 'bg-') || 'bg-green-500'}`}
          >
            המשך מאיפה שעצרת — שלב {realStep} ▶
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Menu ──────────────────────────────────────────────────────────────────
export default function Menu({ goals = [] }) {
  const setScreen        = useGameStore((s) => s.setScreen);
  const locks            = useGameStore((s) => s.locks);
  const assignments      = useGameStore((s) => s.assignments);
  const equations        = useGameStore((s) => s.equations);
  const balance          = useGameStore((s) => s.balance);
  const tank             = useGameStore((s) => s.tank);
  const decimal          = useGameStore((s) => s.decimal);
  const fractionLab      = useGameStore((s) => s.fractionLab);
  const magicPatterns    = useGameStore((s) => s.magicPatterns);
  const grid             = useGameStore((s) => s.grid);
  const word             = useGameStore((s) => s.word);
  const multChamp        = useGameStore((s) => s.multChamp);
  const percentages      = useGameStore((s) => s.percentages);

  const gameStates = { equations, balance, tank, decimal, fractionLab, magicPatterns, grid, word, multChamp, percentages };

  // Which game's sheet is open (null = none)
  const [sheetFor, setSheetFor] = useState(null);

  // Assignment Wall state
  const completedToday    = wasAssignmentCompletedToday();
  const hasOpenAssignment = assignments.length > 0 && !completedToday;
  const currentAssignment = hasOpenAssignment ? assignments[0] : null;
  const currentGameMeta   = currentAssignment ? GAME_BY_ID[currentAssignment.game_name] : null;

  const isLocked = (gameId) => {
    if (!currentAssignment) return false;
    if (!GAME_BY_ID[currentAssignment.game_name]) return false;
    return currentAssignment.game_name !== gameId;
  };

  const openSheet = (gameId) => {
    if (isLocked(gameId)) { vibe(30); return; }
    vibe(10);
    setSheetFor(gameId);
  };

  const playGame = (gameId) => {
    setSheetFor(null);
    setScreen(gameId);
  };

  // Active sheet data
  const sheetGame = sheetFor ? GAMES.find(g => g.id === sheetFor) : null;
  const sheetState = sheetFor ? gameStates[sheetFor] : null;

  return (
    <div className="screen-enter flex flex-col items-center p-6 flex-1 min-h-[calc(100dvh-80px)]">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black tracking-tight">מרכז הלמידה</h2>
      </div>

      {/* Assignment Wall banner */}
      {currentAssignment && currentGameMeta && (
        <div dir="rtl" className="w-full max-w-sm mb-4 bg-gradient-to-l from-indigo-600 to-violet-600 text-white rounded-2xl p-4 shadow-lg border-2 border-indigo-300">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentGameMeta.emoji}</span>
            <div className="text-right flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-0.5">📋 משימה מהמורה</p>
              <p className="text-sm font-black">
                {currentAssignment.title || `הגע לרמה ${currentAssignment.target_level} ב${currentGameMeta.label}`}
              </p>
              <p className="text-[11px] text-indigo-100 mt-0.5">
                תוכל לשחק ברמות 1–{currentAssignment.target_level} • שאר המשחקים נעולים עד לסיום
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mission done banner */}
      {completedToday && assignments.length > 0 && (
        <div dir="rtl" className="w-full max-w-sm mb-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-2xl px-4 py-3 text-center">
          <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
            🎉 סיימת את משימת היום — שחק בחופשיות!
          </p>
        </div>
      )}

      {/* Goals banner */}
      {goals.length > 0 && (
        <div dir="rtl" className="w-full max-w-sm mb-4 space-y-2">
          <p className="text-xs font-black text-amber-600 dark:text-amber-400 px-1">🏆 הסכמי הפרסים שלך</p>
          {goals.map((g) => (
            <div key={g.id} className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl px-4 py-3">
              <span className="text-xl">🎁</span>
              <div className="text-right flex-1">
                <p className="text-xs font-black text-slate-700 dark:text-slate-200">{g.title}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">פרס: {g.reward}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Game cards */}
      {GAMES.map((g) => {
        const colors     = getGameColorClasses(g.colorToken);
        const locked     = isLocked(g.id);
        const realLvl    = gameStates[g.id].lvl;
        const realStep   = gameStates[g.id].step || realLvl;
        const totalSteps = STEP_CONFIG[g.id] || 5;
        const progressPct = Math.round((realStep / totalSteps) * 100);

        return (
          <div key={g.id} className="w-full max-w-sm">
            <button
              onClick={() => openSheet(g.id)}
              disabled={locked}
              className={`menu-btn ${colors.bg} ${colors.border} border-e-slate-200 border-s-slate-200 border-t-slate-200 dark:border-e-slate-700 dark:border-s-slate-700 dark:border-t-slate-700 group relative w-full ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <span className="text-3xl drop-shadow-sm">{g.emoji}</span>
              <div className="text-right flex-1 px-4 min-w-0">
                <h3 className="font-black">{g.label}</h3>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-1.5 mb-1">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${colors.text?.replace('text-', 'bg-') || 'bg-green-400'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    שלב {realStep}/{totalSteps}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${colors.text} ${colors.bg}`}>
                    ⭐ {gameStates[g.id].stars}
                  </span>
                </div>
              </div>
              {locked ? (
                <span className="text-xl">🔒</span>
              ) : (
                <span className="text-slate-300 dark:text-slate-600 group-hover:-translate-x-1 transition-transform">◀</span>
              )}
            </button>
          </div>
        );
      })}

      {/* Step picker sheet */}
      {sheetFor && sheetGame && sheetState && (
        <StepPickerSheet
          game={sheetGame}
          gameState={sheetState}
          onPlay={() => playGame(sheetFor)}
          onClose={() => setSheetFor(null)}
        />
      )}
    </div>
  );
}
