import { useState } from 'react';
import useGameStore from '../../store/useGameStore';
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

export default function Menu({ goals = [] }) {
  const setScreen        = useGameStore((s) => s.setScreen);
  const locks            = useGameStore((s) => s.locks);
  const practiceLevels   = useGameStore((s) => s.practiceLevels);
  const setPracticeLevel = useGameStore((s) => s.setPracticeLevel);
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

  // Which game's picker is currently open (null = none)
  const [pickerFor, setPickerFor] = useState(null);

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

  const startGame = (gameId) => {
    if (isLocked(gameId)) { vibe(30); return; }
    if (pickerFor) { setPickerFor(null); return; } // close picker on card tap
    vibe(10);
    setScreen(gameId);
  };

  const handleBadgeTap = (e, gameId) => {
    if (isLocked(gameId)) return;
    e.stopPropagation();
    vibe(20);
    setPickerFor(pickerFor === gameId ? null : gameId);
  };

  const handlePickLevel = (e, gameId, lvl) => {
    e.stopPropagation();
    vibe(30);
    // Same level tapped again → cancel practice mode
    if (practiceLevels[gameId] === lvl) {
      setPracticeLevel(gameId, 0);
    } else {
      setPracticeLevel(gameId, lvl);
    }
    setPickerFor(null);
  };

  const getBadgeContent = (gameId) => {
    const pl = practiceLevels[gameId];
    const locked = locks[gameId] > 0;
    if (pl > 0) return { text: `🎯 רמה ${pl}`, practicing: true };
    const rank = getVisibleRank(gameStates[gameId].lvl);
    return { text: (locked ? '🔒 ' : '') + rank.emoji + ' ' + rank.name, practicing: false };
  };

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

      {GAMES.map((g) => {
        const colors  = getGameColorClasses(g.colorToken);
        const locked  = isLocked(g.id);
        const badge   = getBadgeContent(g.id);
        const isPicking = pickerFor === g.id;
        const realLvl   = gameStates[g.id].lvl;

        return (
          <div key={g.id} className="w-full max-w-sm">
            <button
              onClick={() => startGame(g.id)}
              disabled={locked}
              className={`menu-btn ${colors.bg} ${colors.border} border-e-slate-200 border-s-slate-200 border-t-slate-200 dark:border-e-slate-700 dark:border-s-slate-700 dark:border-t-slate-700 group relative w-full ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <span className="text-3xl drop-shadow-sm">{g.emoji}</span>
              <div className="text-right flex-1 px-4">
                <h3 className="font-black">{g.label}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {/* Level badge — tap to open practice picker */}
                  <p
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block lvl-badge whitespace-nowrap transition-colors ${
                      badge.practicing
                        ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 ring-1 ring-teal-400'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                    onClick={(e) => handleBadgeTap(e, g.id)}
                  >
                    {badge.text}
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

            {/* Practice level picker — inline below card */}
            {isPicking && !locked && (
              <div
                dir="rtl"
                className="mx-1 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-3 shadow-lg animate-[slideDown_0.18s_ease-out]"
                onClick={(e) => e.stopPropagation()}
              >
                <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-2 text-center">
                  🎯 בחר רמה לתרגול — ההתקדמות שלך לא תשתנה
                </p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => {
                    const isReal     = lvl === realLvl;
                    const isPractice = practiceLevels[g.id] === lvl;
                    return (
                      <button
                        key={lvl}
                        onClick={(e) => handlePickLevel(e, g.id, lvl)}
                        className={`w-10 h-10 rounded-xl font-black text-sm transition-all active:scale-90 ${
                          isPractice
                            ? 'bg-teal-500 text-white shadow-md ring-2 ring-teal-300'
                            : isReal
                            ? `${colors.bg} ${colors.text} ring-2 ${colors.border}`
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {lvl}
                        {isReal && !isPractice && <span className="block text-[8px] leading-none">★</span>}
                      </button>
                    );
                  })}
                  {/* Cancel button */}
                  {practiceLevels[g.id] > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPracticeLevel(g.id, 0); setPickerFor(null); vibe(20); }}
                      className="w-10 h-10 rounded-xl font-black text-sm bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 transition-all active:scale-90"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
