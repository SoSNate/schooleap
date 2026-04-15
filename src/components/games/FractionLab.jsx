import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import useGameStore from '../../store/useGameStore';
import Fraction from '../shared/Fraction';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import Hearts from '../shared/Hearts';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

const ONBOARD_KEY = 'onboard_fractionLab';

// Circle (pie) visual
function CircleShape({ n, d }) {
  const numShapes = Math.max(1, Math.ceil(n / d));
  return (
    <div className="flex flex-wrap justify-center gap-3" dir="ltr">
      {Array.from({ length: numShapes }).map((_, si) => {
        const filled = Math.min(d, n - si * d);
        return (
          <div key={si} className="relative w-28 h-28 md:w-32 md:h-32 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 drop-shadow-md">
              <circle cx="50" cy="50" r="45" fill="white" className="dark:fill-slate-700" stroke="#94a3b8" strokeWidth="2" />
              {Array.from({ length: d }).map((_, i) => {
                const sliceAngle = 360 / d;
                const start = i * sliceAngle * (Math.PI / 180);
                const end = (i + 1) * sliceAngle * (Math.PI / 180);
                const x1 = 50 + 45 * Math.cos(start), y1 = 50 + 45 * Math.sin(start);
                const x2 = 50 + 45 * Math.cos(end), y2 = 50 + 45 * Math.sin(end);
                return (
                  <path
                    key={i}
                    d={`M50,50 L${x1},${y1} A45,45 0 ${sliceAngle > 180 ? 1 : 0},1 ${x2},${y2} Z`}
                    fill={i < filled ? '#f97316' : 'transparent'}
                    stroke="#94a3b8"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

// Horizontal bar / rectangle visual
function RectShape({ n, d }) {
  const numShapes = Math.max(1, Math.ceil(n / d));
  const cellW = Math.min(44, Math.floor(200 / d));
  return (
    <div className="flex flex-col gap-3 items-center" dir="ltr">
      {Array.from({ length: numShapes }).map((_, si) => {
        const filled = Math.min(d, n - si * d);
        return (
          <div key={si} className="flex gap-0.5 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            {Array.from({ length: d }).map((_, i) => (
              <div
                key={i}
                className={`h-14 rounded-sm border-2 transition-all ${i < filled ? 'bg-orange-500 border-orange-600' : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600'}`}
                style={{ width: `${cellW}px` }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// Square grid visual
function GridShape({ n, d }) {
  const numShapes = Math.max(1, Math.ceil(n / d));
  return (
    <div className="flex flex-wrap justify-center gap-3" dir="ltr">
      {Array.from({ length: numShapes }).map((_, si) => {
        const filled = Math.min(d, n - si * d);
        return (
          <div key={si} className="flex gap-1 flex-wrap justify-center max-w-[180px] p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            {Array.from({ length: d }).map((_, i) => (
              <div key={i} className={`w-7 h-7 rounded-lg border-2 transition-all ${i < filled ? 'bg-orange-500 border-orange-600' : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600'}`} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function VisualShape({ n, d, visualMode }) {
  if (visualMode === 'rect') return <RectShape n={n} d={d} />;
  if (visualMode === 'grid' || d > 8 || (d % 3 === 0 && d > 6)) return <GridShape n={n} d={d} />;
  return <CircleShape n={n} d={d} />;
}

function generateQuestion(lvl, recentKeys) {
  // Level → mode mapping per spec:
  // L1: visual only, d ∈ [2,3,4,5], n < d
  // L2: visual only, d ∈ [6,7,8,9,10], n < d
  // L3: equivalent fractions
  // L4: simplify only
  // L5: improper fractions (n > d)
  let mode;
  if (lvl <= 2) mode = 'visual';
  else if (lvl === 3) mode = 'equivalent';
  else if (lvl === 4) mode = 'simplify';
  else mode = 'improper';

  let n, d;
  let attempts = 0;

  do {
    if (mode === 'visual') {
      const opts = lvl === 1 ? [2, 3, 4, 5] : [6, 7, 8, 9, 10];
      d = opts[Math.floor(Math.random() * opts.length)];
      n = Math.floor(Math.random() * (d - 1)) + 1;
    } else if (mode === 'equivalent') {
      // Show a simple fraction; denominator is locked to a multiple — child only changes numerator
      const bases = [{ n: 1, d: 2 }, { n: 1, d: 3 }, { n: 2, d: 3 }, { n: 1, d: 4 }, { n: 3, d: 4 }, { n: 2, d: 5 }];
      const pick = bases[Math.floor(Math.random() * bases.length)];
      n = pick.n; d = pick.d;
    } else if (mode === 'simplify') {
      const bases = [{ n: 1, d: 2 }, { n: 1, d: 3 }, { n: 2, d: 3 }, { n: 2, d: 5 }, { n: 3, d: 4 }];
      const pick = bases[Math.floor(Math.random() * bases.length)];
      const mult = Math.floor(Math.random() * 4) + 2; // ×2 to ×5
      n = pick.n * mult; d = pick.d * mult;
    } else {
      // improper: n > d
      const denoms = [2, 3, 4, 5];
      d = denoms[Math.floor(Math.random() * denoms.length)];
      n = d + Math.floor(Math.random() * d) + 1; // d+1 to 2d
    }
    attempts++;
  } while (attempts < 10 && recentKeys.includes(`${mode}-${n}/${d}`));

  // Visual mode shape
  let visualMode = 'circle';
  if (mode === 'visual' || mode === 'improper') {
    const shapeOptions = d <= 6 ? ['circle', 'rect', 'grid'] : d <= 8 ? ['circle', 'grid'] : ['grid'];
    visualMode = shapeOptions[Math.floor(Math.random() * shapeOptions.length)];
  }

  // Equivalent mode: lock denominator to a multiple of d (child only controls numerator)
  let lockedD = null;
  if (mode === 'equivalent') {
    const mults = [2, 3, 4, 5].filter(m => m !== 1 && d * m <= 20);
    lockedD = d * mults[Math.floor(Math.random() * mults.length)];
  }

  return {
    mode,
    targetN: n,
    targetD: d,
    lockedD,
    decimalVal: (n / d).toFixed(3),
    visualMode,
    key: `${mode}-${n}/${d}`,
  };
}

const modeLabels = {
  visual: 'ייצגו את השבר',
  equivalent: 'צרו שבר שווה ערך',
  simplify: 'צמצמו את השבר',
  improper: 'ייצגו את השבר (גדול משלם)',
};

export default function FractionLab() {
  const gameState = useGameStore((s) => s.fractionLab);
  const handleWinStore = useGameStore((s) => s.handleWin);
  const handleGameFail = useGameStore((s) => s.handleGameFail);
  const setScreen = useGameStore((s) => s.setScreen);

  const [question, setQuestion] = useState(null);
  const [userN, setUserN] = useState(1);
  const [userD, setUserD] = useState(2);
  const [lives, setLives] = useState(3);
  const [justLost, setJustLost] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const recentRef = useRef([]);
  const timersRef = useRef([]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const newQuestion = useCallback(() => {
    const q = generateQuestion(gameState.lvl, recentRef.current);
    recentRef.current = [q.key, ...recentRef.current].slice(0, 3);
    setQuestion(q);
    setUserN(1);
    setUserD(q.lockedD ?? 2);
    setErrorMsg('');
    setJustLost(false);
    setConsecutiveErrors(0);
    setLives(3);
  }, [gameState.lvl]);

  useEffect(() => { newQuestion(); }, [newQuestion]);

  // First-time onboarding
  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARD_KEY)) {
        Swal.fire({
          title: 'מעבדת השברים 🍕',
          html: '<div class="text-right text-sm leading-relaxed">בכל שאלה תצטרך לייצג שבר נכון.<br><br>🍕 <b>ויזואלי</b> — התאם את השבר לציור<br>🔗 <b>שווה ערך</b> — בנה שבר השווה לנתון<br>✂️ <b>צמצום</b> — פשט את השבר לצורה הפשוטה ביותר<br>📐 <b>שבר מדומה</b> — ייצג שבר הגדול מ-1<br><br>השתמש בכפתורי + ו- כדי לשנות את המונה והמכנה.</div>',
          confirmButtonText: 'יאללה למעבדה!',
          confirmButtonColor: '#f97316',
          customClass: { popup: 'rounded-3xl' },
        });
        localStorage.setItem(ONBOARD_KEY, '1');
      }
    } catch {}
  }, []);

  const showHint = () => {
    vibe(20);
    if (!question) return;
    const { mode, targetN, targetD } = question;
    let text = '';
    if (mode === 'visual' || mode === 'improper') {
      text = 'ספור את מספר החלקים הצבועים ואת סך כל החלקים — זה השבר שלך.';
    } else if (mode === 'equivalent') {
      text = `שבר שווה ערך נוצר כשמכפילים גם את המונה וגם את המכנה באותו מספר. המכנה החדש הוא ${question.lockedD} — חלק אותו ב-${targetD} כדי למצוא בכמה צריך להכפיל. ואז — כפול את המונה באותו מספר!`;
    } else if (mode === 'simplify') {
      const g = gcd(targetN, targetD);
      text = `צמצום = לחלק גם את המונה וגם את המכנה במחלק משותף. המחלק הגדול כאן הוא ${g}. חלק ב-${g} לקבל את השבר הפשוט.`;
    } else {
      text = 'שבר מדומה הוא שבר שהמונה שלו גדול מהמכנה. צייר צורה שלמה נוספת כשחלפת את המכנה.';
    }
    Swal.fire({
      title: '💡 רמז',
      text,
      icon: 'info',
      confirmButtonText: 'הבנתי, תודה!',
      confirmButtonColor: '#f59e0b',
      customClass: { popup: 'rounded-3xl' },
    });
  };

  const checkAnswer = () => {
    if (!question) return;
    const targetVal = question.targetN / question.targetD;
    const userVal = userN / userD;

    if (Math.abs(targetVal - userVal) > 0.0001) {
      vibe([50, 50, 50]);
      const newErrors = consecutiveErrors + 1;
      setConsecutiveErrors(newErrors);
      setErrorMsg('❌ לא מדויק, נסה שוב');
      {
        const next = lives - 1;
        setLives(next);
        setJustLost(true);
        timersRef.current.push(setTimeout(() => setJustLost(false), 600));
        if (next <= 0) {
          handleGameFail('fractionLab');
          Swal.fire({
            title: 'הרמה ננעלה 🔒',
            text: 'השג 5 ניצחונות ברצף כדי להתקדם לרמה הבאה!',
            icon: 'warning',
            confirmButtonText: 'הבנתי',
            confirmButtonColor: '#f97316',
            customClass: { popup: 'rounded-3xl' },
          }).then(() => setScreen('menu'));
        }
      }
      return;
    }

    // Require reduced form only in simplify mode
    if (question.mode === 'simplify' && gcd(userN, userD) > 1) {
      vibe(30);
      setErrorMsg('⚠️ התשובה נכונה, אך יש לצמצם אותה קודם!');
      return;
    }

    vibe([30, 50, 30]);
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
    const result = handleWinStore('fractionLab');
    setFeedback({ visible: true, isLevelUp: result.isLevelUp, unlocked: result.unlocked, pts: result.pts });
  };

  if (!question) return null;

  return (
    <div className="screen-enter flex flex-col items-center p-3 flex-1">
      <div className="w-full max-w-md flex flex-col md:flex-row gap-4 items-stretch">

        {/* Task card */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-[2rem] p-5 shadow-lg border-2 border-orange-200 dark:border-orange-800/40 border-b-4 border-b-orange-400 dark:border-b-orange-700 flex flex-col items-center gap-4">
          <div className="w-full flex justify-between items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
              {modeLabels[question.mode]}
            </span>
            <div className="flex gap-1 items-center">
              <Hearts lives={lives} maxLives={3} justLost={justLost} />
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[150px] w-full">
            {question.mode === 'visual' && <VisualShape n={question.targetN} d={question.targetD} visualMode={question.visualMode} />}
            {question.mode === 'equivalent' && (
              <div className="flex flex-col items-center gap-3" dir="ltr">
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400 text-center" dir="rtl">בנה שבר השווה ל:</div>
                <div className="text-4xl font-black">
                  <Fraction numerator={question.targetN} denominator={question.targetD} />
                </div>
              </div>
            )}
            {question.mode === 'simplify' && (
              <div dir="ltr" className="text-4xl font-black">
                <Fraction numerator={question.targetN} denominator={question.targetD} />
              </div>
            )}
            {question.mode === 'improper' && <VisualShape n={question.targetN} d={question.targetD} visualMode={question.visualMode} />}
          </div>

          {errorMsg && (
            <div className="w-full text-center text-sm font-bold bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-xl border border-red-200 dark:border-red-800">
              {errorMsg}
            </div>
          )}

          {consecutiveErrors >= 2 && (
            <button
              onClick={showHint}
              className="w-full text-sm font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 px-4 py-2 rounded-xl border border-amber-200 dark:border-amber-800 animate-pulse active:scale-95 transition-transform"
            >
              💡 לחץ לרמז — זה עוזר!
            </button>
          )}
        </div>

        {/* Controls card */}
        <div className="w-full md:w-52 bg-slate-800 text-white rounded-[2rem] p-5 shadow-xl flex flex-col items-center gap-4">
          <div className="text-slate-400 font-bold text-xs uppercase tracking-widest">המכונה</div>

          {/* Numerator row */}
          <div className="w-full flex items-center justify-between gap-2">
            <button onClick={() => { setUserN((v) => Math.max(1, v - 1)); setErrorMsg(''); vibe(10); }} className="w-11 h-11 rounded-xl bg-slate-700 hover:bg-slate-600 text-2xl font-black active:scale-90 transition-all flex items-center justify-center">−</button>
            <div className="flex-1 text-center text-4xl font-black" dir="ltr">{userN}</div>
            <button onClick={() => { setUserN((v) => Math.min(v + 1, (question?.targetD ?? 2) * 4)); setErrorMsg(''); vibe(10); }} className="w-11 h-11 rounded-xl bg-orange-500 hover:bg-orange-400 text-2xl font-black active:scale-90 transition-all flex items-center justify-center shadow-lg">+</button>
          </div>

          <div className="w-full h-0.5 bg-slate-600 rounded-full" />

          {/* Denominator row — locked in equivalent mode */}
          <div className="w-full flex items-center justify-between gap-2">
            <button
              onClick={() => { setUserD((v) => Math.max(1, v - 1)); setErrorMsg(''); vibe(10); }}
              disabled={question.mode === 'equivalent'}
              className="w-11 h-11 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-2xl font-black active:scale-90 transition-all flex items-center justify-center"
            >−</button>
            <div className="flex-1 text-center text-4xl font-black" dir="ltr">
              {userD}
              {question.mode === 'equivalent' && <span className="text-xs text-slate-400 block">🔒</span>}
            </div>
            <button
              onClick={() => { setUserD((v) => v + 1); setErrorMsg(''); vibe(10); }}
              disabled={question.mode === 'equivalent'}
              className="w-11 h-11 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-30 disabled:cursor-not-allowed text-2xl font-black active:scale-90 transition-all flex items-center justify-center shadow-lg"
            >+</button>
          </div>

          <button
            onClick={showHint}
            className="w-full py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-xl font-bold text-sm transition-all active:scale-95"
          >
            💡 רמז
          </button>

          <button
            onClick={checkAnswer}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 dark:bg-orange-600 dark:hover:bg-orange-500 text-white rounded-2xl font-black text-xl shadow-xl transition-all active:scale-95 mt-1"
          >
            בדיקה ✓
          </button>
        </div>
      </div>

      <FeedbackOverlay
        visible={feedback.visible}
        isLevelUp={feedback.isLevelUp}
        unlocked={feedback.unlocked}
        pts={feedback.pts}
        onDone={() => { setFeedback({ visible: false, isLevelUp: false, unlocked: false, pts: 0 }); newQuestion(); }}
      />
    </div>
  );
}
