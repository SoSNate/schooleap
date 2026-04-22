import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import Hearts from '../shared/Hearts';
import Fraction from '../shared/Fraction';
import HintButton from '../shared/HintButton';
import HintBubble from '../shared/HintBubble';
import useHint from '../../hooks/useHint';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2'; // נשאר רק ל-fail dialog (Tank שומר lives)
import GameTutorial from '../shared/GameTutorial';

export default function Tank() {
  const gameState = useGameStore((s) => s.tank);
  const handleWin = useGameStore((s) => s.handleWin);
  const handleGameFail = useGameStore((s) => s.handleGameFail);
  const setScreen = useGameStore((s) => s.setScreen);

  const [sliderVal, setSliderVal] = useState(50);
  const [sliderMax, setSliderMax] = useState(1000);
  const [pVal, setPVal] = useState(0);
  const [fracDisplay, setFracDisplay] = useState(null);
  const [knownLineBottom, setKnownLineBottom] = useState(0);
  const [totalCapacity, setTotalCapacity] = useState(200);
  const [tickD, setTickD] = useState(0); // denominator for tick marks
  const [feedback, setFeedback] = useState({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
  const [errorFlash, setErrorFlash] = useState(false);
  const [lives, setLives] = useState(3);
  const [justLost, setJustLost] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const recentRef = useRef([]);
  const timersRef = useRef([]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  // ─── Hint (HintBubble) ───────────────────────────────────────────────────
  const TANK_HINTS = [
    'הקווים הכחולים מחלקים את הכוס לחלקים שווים. אם השבר הוא 1/4 — מלא רק חלק אחד מתוך 4.',
    'שים לב: 3/6 = 1/2, 5/10 = 1/2, 50/100 = 1/2. צמצם את השבר לפני חישוב הכמות.',
    'הכפל את הנתון בהופכי השבר. דוגמה: 50 מ"ל = 2/4 → הכוס המלאה = 50 × (4/2) = 100 מ"ל.',
    'כפל שברים: מונה × מונה, מכנה × מכנה. חילוק: הפוך את השבר השני וכפול. שים לב לקווים הכחולים.',
    'פתור שלב אחרי שלב: חשב כל שבר בנפרד, צמצם ל-GCD, ואז חשב כמה מ"ל מייצג התוצאה.',
  ];
  const getTankHint = useCallback((_, level) => ({
    kind: 'text',
    text: TANK_HINTS[Math.min((level ?? gameState.lvl) - 1, TANK_HINTS.length - 1)],
  }), [gameState.lvl]);

  const { cooldown: hintCooldown, bubble: hintBubble, requestHint, resetRound: resetHintRound } = useHint({
    level: gameState.lvl,
    getHint: getTankHint,
    puzzle: true,
    cooldownSec: 10,
    bubbleMs: 5000,
  });

  const initGame = useCallback(() => {
    const lvl = gameState.lvl;
    let d, n, u, display;
    let attempts = 0;
    const recent = recentRef.current;

    // Whitelist of valid fractions: only clean, easy-to-understand fractions
    // Denominators: 2, 4, 5, 10 (divide nicely into 100)
    // Units: 100 for d=2, 100 for d=4, 100 for d=5, 100 for d=10
    const VALID_FRACTIONS = [
      // u=100 (answer is n/d × 100)
      { n: 1, d: 2, u: 100 }, { n: 1, d: 4, u: 100 }, { n: 3, d: 4, u: 100 },
      { n: 1, d: 5, u: 100 }, { n: 2, d: 5, u: 100 }, { n: 3, d: 5, u: 100 }, { n: 4, d: 5, u: 100 },
      { n: 1, d: 10, u: 100 }, { n: 3, d: 10, u: 100 }, { n: 7, d: 10, u: 100 }, { n: 9, d: 10, u: 100 },
      // u=50: answers like 25, 10, 40 — different slider range
      { n: 1, d: 2, u: 50 }, { n: 1, d: 5, u: 50 }, { n: 2, d: 5, u: 50 },
      { n: 1, d: 10, u: 50 }, { n: 3, d: 10, u: 50 },
      // u=200: answers like 100, 50, 80, 150
      { n: 1, d: 2, u: 200 }, { n: 1, d: 4, u: 200 }, { n: 3, d: 4, u: 200 },
      { n: 1, d: 5, u: 200 }, { n: 2, d: 5, u: 200 }, { n: 4, d: 5, u: 200 },
    ];

    do {
      if (lvl <= 3) {
        // Single simple fraction
        const frac = VALID_FRACTIONS[Math.floor(Math.random() * VALID_FRACTIONS.length)];
        n = frac.n;
        d = frac.d;
        u = frac.u;
        display = <Fraction numerator={n} denominator={d} />;
      } else if (lvl === 4) {
        // L4 — פעולה טהורה: כל שאלה היא *רק* כפל שברים או *רק* חילוק שברים.
        // פילוג 50/50. מצמצמים תוצאה ל-GCD כדי לקבל u/d נקיים.
        const isMul = Math.random() < 0.5;
        const mulPairs = [
          { n1: 1, d1: 2, n2: 1, d2: 2 },   // 1/2 × 1/2 = 1/4
          { n1: 1, d1: 2, n2: 1, d2: 3 },   // 1/2 × 1/3 = 1/6
          { n1: 2, d1: 3, n2: 1, d2: 2 },   // 2/3 × 1/2 = 1/3
          { n1: 3, d1: 4, n2: 2, d2: 3 },   // 3/4 × 2/3 = 1/2
          { n1: 1, d1: 5, n2: 2, d2: 5 },   // 1/5 × 2/5 = 2/25
          { n1: 1, d1: 3, n2: 3, d2: 5 },   // 1/3 × 3/5 = 1/5
        ];
        const divPairs = [
          { n1: 1, d1: 2, n2: 1, d2: 4 },   // 1/2 ÷ 1/4 = 2
          { n1: 2, d1: 3, n2: 1, d2: 3 },   // 2/3 ÷ 1/3 = 2
          { n1: 3, d1: 4, n2: 1, d2: 2 },   // 3/4 ÷ 1/2 = 3/2
          { n1: 1, d1: 4, n2: 1, d2: 2 },   // 1/4 ÷ 1/2 = 1/2
          { n1: 2, d1: 5, n2: 1, d2: 5 },   // 2/5 ÷ 1/5 = 2
          { n1: 1, d1: 6, n2: 1, d2: 3 },   // 1/6 ÷ 1/3 = 1/2
        ];
        const pool = isMul ? mulPairs : divPairs;
        const pair = pool[Math.floor(Math.random() * pool.length)];
        // תוצאה: כפל = (n1·n2)/(d1·d2), חילוק = (n1·d2)/(d1·n2).
        let rn = isMul ? pair.n1 * pair.n2 : pair.n1 * pair.d2;
        let rd = isMul ? pair.d1 * pair.d2 : pair.d1 * pair.n2;
        // צמצום ל-GCD
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const g = gcd(rn, rd);
        rn /= g; rd /= g;
        n = rn; d = rd;
        // u נבחר כך ש-capacity יישאר מתחת ל-1000 מ"ל ועגול יפה.
        u = rd <= 2 ? 200 : rd <= 4 ? 100 : 50;
        display = (
          <div className="flex items-center gap-2 math-font" dir="ltr">
            <Fraction numerator={pair.n1} denominator={pair.d1} />
            <span className="text-xl">{isMul ? '×' : '÷'}</span>
            <Fraction numerator={pair.n2} denominator={pair.d2} />
          </div>
        );
      } else {
        // Two fractions that subtract to > 0
        const pairs = [
          { n1: 3, d1: 4, n2: 1, d2: 4 },
          { n1: 4, d1: 5, n2: 1, d2: 5 },
          { n1: 3, d1: 5, n2: 1, d2: 5 },
          { n1: 7, d1: 10, n2: 2, d2: 10 },
          { n1: 3, d1: 4, n2: 1, d2: 5 },
        ];
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        n = pair.n1 - pair.n2; d = 4; u = 100; // Result simplified
        display = (
          <div className="flex items-center gap-2 math-font" dir="ltr">
            <Fraction numerator={pair.n1} denominator={pair.d1} />
            <span className="text-xl">-</span>
            <Fraction numerator={pair.n2} denominator={pair.d2} />
          </div>
        );
      }
      attempts++;
    } while (attempts < 10 && recent.some(r => r === `${n}/${d}`));

    recentRef.current = [`${n}/${d}`, ...recent].slice(0, 3);

    const ans = u * d;
    setTotalCapacity(ans);
    setPVal(u * n);
    setFracDisplay(display);
    setKnownLineBottom((n / d) * 100);
    setTickD(d);
    // הוסף offset רנדומלי (25%–75% מעל התשובה) כדי שהתשובה לא תהיה בסוף הסליידר
    const overShoot = ans * (0.25 + Math.random() * 0.5);
    setSliderMax(Math.round(ans + overShoot));
    setSliderVal(10);
    setLives(3);
    setJustLost(false);
    setConsecutiveErrors(0);
    resetHintRound();
  }, [gameState.lvl, resetHintRound]);

  useEffect(() => {
    initGame();
  }, [initGame]);


  const liquidHeight = Math.min((sliderVal / totalCapacity) * 100, 100);


  const checkAnswer = () => {
    if (Math.abs(parseInt(sliderVal) - totalCapacity) < 5) {
      vibe([30, 50, 30]);
      const result = handleWin('tank');
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, unlocked: result.unlocked, pts: result.pts });
    } else {
      const newLives = Math.max(0, lives - 1);
      const newErrors = consecutiveErrors + 1;
      setLives(newLives);
      setJustLost(true);
      setErrorFlash(true);
      setConsecutiveErrors(newErrors);
      timersRef.current.push(setTimeout(() => { setErrorFlash(false); setJustLost(false); }, 600));
      vibe([50, 50, 50]);

      if (newLives <= 0) {
        handleGameFail('tank');
        Swal.fire({
          title: 'הרמה ננעלה 🔒',
          text: 'השג 5 ניצחונות ברצף כדי להתקדם לרמה הבאה!',
          icon: 'warning',
          confirmButtonText: 'הבנתי',
          confirmButtonColor: '#3b82f6',
          customClass: { popup: 'rounded-3xl' },
        }).then(() => setScreen('menu'));
      }
    }
  };

  return (
    <div className={`screen-enter flex flex-col items-center p-4 flex-1 min-h-[calc(100dvh-80px)] ${errorFlash ? 'error-flash' : ''}`}>
      <GameTutorial gameName="tank" />
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 md:p-8 w-full max-w-md shadow-xl flex flex-col gap-6 md:gap-8 border-2 border-blue-200 dark:border-blue-800/40 border-b-4 border-b-blue-400 dark:border-b-blue-700 transition-colors">

        {/* Lives */}
        <div className="flex justify-center">
          <Hearts lives={lives} maxLives={3} justLost={justLost} />
        </div>

        <div className="flex items-center gap-8 justify-center">
          {/* Tank visual */}
          <div className="tank-wrap">
            <div className="tank-body bg-slate-50 dark:bg-slate-700/50">
              <div className="liquid" style={{ height: `${liquidHeight}%` }} />
              <div className="known-line" style={{ bottom: `${knownLineBottom}%` }}>
                <span className="known-label">הידוע</span>
              </div>
              {/* Adaptive tick marks showing denominator divisions */}
              {tickD > 1 && Array.from({ length: tickD - 1 }, (_, i) => {
                const pct = ((i + 1) / tickD) * 100;
                const isTarget = Math.abs(pct - knownLineBottom) < 1;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: 0,
                      bottom: `${pct}%`,
                      width: isTarget ? '18px' : '10px',
                      height: 0,
                      borderTop: isTarget
                        ? '2px solid #3b82f6'
                        : '1.5px solid rgba(148,163,184,0.7)',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Info */}
          <div className="text-right min-w-0 flex-1">
            <div className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-1">נתון בכוס:</div>
            <div className="text-3xl font-black text-blue-700 dark:text-blue-400 flex items-baseline gap-1 flex-wrap" dir="ltr">
              <span>{pVal}</span> <span className="text-lg ml-1 text-slate-400">מ"ל</span>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-3 mb-1">שהם בדיוק:</div>
            <div className="text-4xl font-black text-blue-900 dark:text-blue-300 mt-1">
              {fracDisplay}
            </div>
            {consecutiveErrors >= 2 && (
              <div className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                💡 לחץ על הרמז!
              </div>
            )}
          </div>
        </div>

        {/* Slider area */}
        <div className="text-center pb-4">
          <div className="text-4xl font-black text-blue-600 dark:text-blue-400 math-font mb-4" dir="ltr">
            <span>{sliderVal}</span>
            <span className="text-xl ml-1 text-slate-400">מ"ל</span>
          </div>

          <input
            type="range"
            id="tank-slider"
            min="10"
            max={sliderMax}
            step={gameState.lvl >= 3 ? 10 : 5}
            value={sliderVal}
            onChange={(e) => { setSliderVal(parseInt(e.target.value)); vibe(10); }}
            className="val-track mb-6"
          />

          <HintBubble text={hintBubble} className="mb-3" />

          <div className="flex gap-2 mt-6">
            <HintButton
              cooldown={hintCooldown}
              onClick={requestHint}
              colorToken="sky"
              title="רמז"
            />
            <button
              onClick={checkAnswer}
              className="flex-1 py-4 md:py-5 bg-blue-600 dark:bg-blue-500 text-white rounded-3xl font-black text-xl md:text-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95"
            >
              בדיקה 🧪
            </button>
          </div>
        </div>
      </div>

      <FeedbackOverlay
        visible={feedback.visible}
        isLevelUp={feedback.isLevelUp}
        unlocked={feedback.unlocked}
        pts={feedback.pts}
        onDone={() => {
          setFeedback({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
          initGame();
        }}
      />
    </div>
  );
}
