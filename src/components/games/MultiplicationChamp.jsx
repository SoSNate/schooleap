import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import Fraction from '../shared/Fraction';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';

const ONBOARD_KEY = 'onboard_multichamp';

// Level configs
const LEVELS = [
  null, // index 0 unused
  { name: 'טירון', numRange: [1, 5],  isFraction: false, timeLimit: 60 },
  { name: 'קצין',  numRange: [1, 12], isFraction: false, timeLimit: 60 },
  { name: 'אלוף',  numRange: [1, 10], isFraction: false, timeLimit: 45 }, // harder number combos
  { name: 'מאסטר', isFraction: true, hard: false, timeLimit: 90 },
  { name: 'אגדה',  isFraction: true, hard: true,  timeLimit: 90 },
];

// Fraction definitions
const EASY_FRACS = [
  { n: 1, d: 2 }, { n: 1, d: 3 }, { n: 2, d: 3 },
  { n: 1, d: 4 }, { n: 3, d: 4 }, { n: 1, d: 5 },
  { n: 2, d: 5 }, { n: 3, d: 5 },
];
const HARD_FRACS = [
  { n: 2, d: 3 }, { n: 3, d: 4 }, { n: 2, d: 5 }, { n: 3, d: 5 },
  { n: 3, d: 7 }, { n: 2, d: 7 }, { n: 4, d: 5 }, { n: 5, d: 6 },
  { n: 4, d: 7 }, { n: 3, d: 8 },
];

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
function simplify(n, d) { const g = gcd(n, d); return { n: n / g, d: d / g }; }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function FracDisplay({ n, d, size = 'md' }) {
  const cls = size === 'sm' ? { num: 'text-base', den: 'text-base', line: 'my-0.5' } : { num: 'text-lg', den: 'text-lg', line: 'my-0.5' };
  return (
    <div className="flex flex-col items-center leading-none" dir="ltr">
      <span className={`${cls.num} font-black`}>{n}</span>
      <div className={`w-full border-t-2 border-current ${cls.line}`} />
      <span className={`${cls.den} font-black`}>{d}</span>
    </div>
  );
}

// Generate a round (target + 16 tiles)
function generateRound(lvl) {
  const cfg = LEVELS[lvl];
  if (!cfg.isFraction) {
    const [lo, hi] = cfg.numRange;
    const allNums = [];
    for (let i = lo; i <= hi; i++) allNums.push(i);

    // Pick two operands whose product is unique among distractors
    let a, b, target;
    let tries = 0;
    do {
      a = lo + Math.floor(Math.random() * (hi - lo + 1));
      b = lo + Math.floor(Math.random() * (hi - lo + 1));
      target = a * b;
      tries++;
    } while (tries < 20 && (target < 2));

    // Build 16 tiles: include a and b, fill rest with numbers from range
    const pool = allNums.filter(x => x !== a && x !== b);
    const extras = shuffle(pool).slice(0, 14);
    const tiles = shuffle([a, b, ...extras]);

    return {
      isFraction: false,
      target,
      tiles,        // array of numbers
      correctA: a,
      correctB: b,
      targetLabel: String(target),
    };
  } else {
    // Fraction round
    const fracPool = cfg.hard ? HARD_FRACS : EASY_FRACS;
    const f1 = fracPool[Math.floor(Math.random() * fracPool.length)];
    let f2;
    do { f2 = fracPool[Math.floor(Math.random() * fracPool.length)]; } while (f2 === f1);

    const rawN = f1.n * f2.n;
    const rawD = f1.d * f2.d;
    const result = simplify(rawN, rawD);

    // Build 16 fraction tiles: include f1 and f2, fill with others
    const others = fracPool.filter(f => f !== f1 && f !== f2);
    const extras = shuffle(others).slice(0, 14);
    const tiles = shuffle([f1, f2, ...extras]);

    return {
      isFraction: true,
      target: result,
      tiles,
      correctA: f1,
      correctB: f2,
      targetLabel: `${result.n}/${result.d}`,
    };
  }
}

function tilesEqual(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  if (a && b && typeof a === 'object') return a.n === b.n && a.d === b.d;
  return false;
}

export default function MultiplicationChamp() {
  const gameState = useGameStore((s) => s.multChamp);
  const handleWin = useGameStore((s) => s.handleWin);
  const handleGameFail = useGameStore((s) => s.handleGameFail);
  const setScreen = useGameStore((s) => s.setScreen);

  const [round, setRound] = useState(null);
  const [selected, setSelected] = useState([]); // indices of selected tiles
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [flash, setFlash] = useState(null); // 'correct' | 'wrong'
  const [feedback, setFeedback] = useState({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
  const [showHint, setShowHint] = useState(false);
  const [correctPairs, setCorrectPairs] = useState(0); // pairs found in this timer session

  const timerRef = useRef(null);
  const timersRef = useRef([]);

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    clearInterval(timerRef.current);
  }, []);

  const startRound = useCallback(() => {
    const r = generateRound(gameState.lvl);
    setRound(r);
    setSelected([]);
    setFlash(null);
  }, [gameState.lvl]);

  const startGame = useCallback(() => {
    const cfg = LEVELS[gameState.lvl];
    setScore(0);
    setCorrectPairs(0);
    setTimeLeft(cfg.timeLimit);
    setGameOver(false);
    startRound();
  }, [gameState.lvl, startRound]);

  useEffect(() => { startGame(); }, [startGame]);

  // Timer
  useEffect(() => {
    if (gameOver) { clearInterval(timerRef.current); return; }
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameOver, gameState.lvl]);

  // When game ends
  useEffect(() => {
    if (!gameOver) return;
    clearInterval(timerRef.current);
    const needed = LEVELS[gameState.lvl]?.isFraction ? 3 : 5;
    if (correctPairs >= needed) {
      const result = handleWin('multChamp');
      timersRef.current.push(setTimeout(() => {
        setFeedback({ visible: true, isLevelUp: result.isLevelUp, unlocked: result.unlocked, pts: result.pts });
      }, 300));
    } else {
      handleGameFail('multChamp');
      Swal.fire({
        title: 'הזמן נגמר ⏱️',
        html: `<div class="text-center">מצאת <b>${correctPairs}</b> מהזוגות הנכונים.<br>צריך לפחות <b>${needed}</b> כדי להתקדם!</div>`,
        confirmButtonText: 'נסה שוב',
        confirmButtonColor: '#ca8a04',
        customClass: { popup: 'rounded-3xl' },
      }).then(() => setScreen('menu'));
    }
  }, [gameOver]);

  // Onboarding
  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARD_KEY)) {
        Swal.fire({
          title: 'אלוף הכפל ✖️',
          html: '<div class="text-right text-sm leading-relaxed">בחר <b>שני מספרים</b> (או שברים) שמכפלתם שווה למטרה המוצגת.<br><br>⏱️ יש לך זמן מוגבל — מצא כמה שיותר זוגות!<br>🏆 צבור ניקוד וטפס ברמות!</div>',
          confirmButtonText: 'קדימה!',
          confirmButtonColor: '#ca8a04',
          customClass: { popup: 'rounded-3xl' },
        });
        localStorage.setItem(ONBOARD_KEY, '1');
      }
    } catch {}
  }, []);

  const handleTileClick = (idx) => {
    if (gameOver || flash) return;
    vibe(10);

    const alreadyIdx = selected.indexOf(idx);
    if (alreadyIdx !== -1) {
      // Deselect
      setSelected(selected.filter((_, i) => i !== alreadyIdx));
      return;
    }

    const newSel = [...selected, idx];
    if (newSel.length < 2) { setSelected(newSel); return; }

    // Check pair
    const [i1, i2] = newSel;
    const t1 = round.tiles[i1];
    const t2 = round.tiles[i2];

    let correct = false;
    if (!round.isFraction) {
      correct = t1 * t2 === round.target;
    } else {
      const rawN = t1.n * t2.n;
      const rawD = t1.d * t2.d;
      const res = simplify(rawN, rawD);
      correct = res.n === round.target.n && res.d === round.target.d;
    }

    if (correct) {
      vibe([30, 50, 30]);
      setFlash('correct');
      setScore(s => s + 1);
      setCorrectPairs(p => p + 1);
      timersRef.current.push(setTimeout(() => {
        setFlash(null);
        setSelected([]);
        startRound();
      }, 600));
    } else {
      vibe([50, 50, 50]);
      setFlash('wrong');
      timersRef.current.push(setTimeout(() => {
        setFlash(null);
        setSelected([]);
      }, 600));
    }
  };

  const cfg = LEVELS[gameState.lvl] || LEVELS[1];
  const timerPct = round ? (timeLeft / cfg.timeLimit) * 100 : 100;
  const timerColor = timerPct > 50 ? '#ca8a04' : timerPct > 25 ? '#f59e0b' : '#dc2626';

  if (!round) return null;

  return (
    <div className={`screen-enter flex flex-col items-center p-4 flex-1 min-h-[calc(100dvh-80px)] ${flash === 'wrong' ? 'error-flash' : ''}`}>
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-4 md:p-6 w-full max-w-md shadow-xl flex flex-col gap-4 border-2 border-yellow-300 dark:border-yellow-700/60 border-b-4 border-b-yellow-400 dark:border-b-yellow-600 transition-colors">

        {/* Header: score + timer */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col items-start">
            <span className="text-xs text-slate-400 font-bold">ניקוד</span>
            <span className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{score}</span>
          </div>

          {/* Timer bar */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-slate-500">{timeLeft}s</span>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${timerPct}%`, background: timerColor }}
              />
            </div>
          </div>

          <button
            onClick={() => setShowHint(!showHint)}
            className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 font-black text-lg flex items-center justify-center hover:bg-yellow-200 transition-colors"
          >
            💡
          </button>
        </div>

        {/* Hint (fraction levels) */}
        {showHint && cfg.isFraction && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-2xl p-3 text-center text-sm text-yellow-800 dark:text-yellow-300 font-bold" dir="rtl">
            כפל שברים: מונה × מונה, מכנה × מכנה
          </div>
        )}

        {/* Target */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">מצא שני מספרים שמכפלתם:</span>
          <div
            className={`flex items-center justify-center w-24 h-16 rounded-3xl border-4 border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 shadow-lg transition-all ${flash === 'correct' ? 'scale-110 border-green-500' : ''}`}
          >
            {round.isFraction ? (
              <div className="text-yellow-700 dark:text-yellow-300">
                <FracDisplay n={round.target.n} d={round.target.d} />
              </div>
            ) : (
              <span className="text-4xl font-black text-yellow-600 dark:text-yellow-400">{round.target}</span>
            )}
          </div>
        </div>

        {/* Tile grid 4×4 */}
        <div className="grid grid-cols-4 gap-2">
          {round.tiles.map((tile, idx) => {
            const isSel = selected.includes(idx);
            const isCorrectFlash = flash === 'correct' && isSel;
            const isWrongFlash = flash === 'wrong' && isSel;

            return (
              <button
                key={idx}
                onClick={() => handleTileClick(idx)}
                disabled={gameOver}
                className={`
                  aspect-square rounded-2xl font-black flex items-center justify-center transition-all active:scale-90 shadow-sm
                  ${isCorrectFlash ? 'bg-green-400 dark:bg-green-500 text-white scale-105 border-2 border-green-600' :
                    isWrongFlash ? 'bg-red-400 dark:bg-red-500 text-white border-2 border-red-600' :
                    isSel ? 'bg-yellow-400 dark:bg-yellow-500 text-white border-2 border-yellow-600 scale-105' :
                    'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-2 border-yellow-200 dark:border-yellow-700/50 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'}
                `}
              >
                {round.isFraction ? (
                  <FracDisplay n={tile.n} d={tile.d} size="sm" />
                ) : (
                  <span className="text-xl">{tile}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Progress indicator */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-500 font-bold">
          זוגות נכונים: {correctPairs} / {cfg.isFraction ? 3 : 5}
        </div>

      </div>

      <FeedbackOverlay
        visible={feedback.visible}
        isLevelUp={feedback.isLevelUp}
        unlocked={feedback.unlocked}
        pts={feedback.pts}
        onDone={() => {
          setFeedback({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
          startGame();
        }}
      />
    </div>
  );
}
