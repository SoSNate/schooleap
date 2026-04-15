import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import Hearts from '../shared/Hearts';
import Fraction from '../shared/Fraction';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

const ONBOARD_KEY = 'onboard_tank';

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
  const [lives, setLives] = useState(5);
  const [justLost, setJustLost] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const recentRef = useRef([]);
  const timersRef = useRef([]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const initGame = useCallback(() => {
    const lvl = gameState.lvl;
    let d, n, u, display;
    let attempts = 0;
    const recent = recentRef.current;

    // Whitelist of valid fractions: only clean, easy-to-understand fractions
    // Denominators: 2, 4, 5, 10 (divide nicely into 100)
    // Units: 100 for d=2, 100 for d=4, 100 for d=5, 100 for d=10
    const VALID_FRACTIONS = [
      { n: 1, d: 2, u: 100 }, { n: 1, d: 4, u: 100 }, { n: 3, d: 4, u: 100 },
      { n: 1, d: 5, u: 100 }, { n: 2, d: 5, u: 100 }, { n: 3, d: 5, u: 100 }, { n: 4, d: 5, u: 100 },
      { n: 1, d: 10, u: 100 }, { n: 3, d: 10, u: 100 }, { n: 7, d: 10, u: 100 }, { n: 9, d: 10, u: 100 },
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
        // Two fractions that add to < 1
        const pairs = [
          { n1: 1, d1: 4, n2: 1, d2: 4 },
          { n1: 1, d1: 5, n2: 2, d2: 5 },
          { n1: 1, d1: 4, n2: 1, d2: 5 },
          { n1: 2, d1: 5, n2: 1, d2: 10 },
          { n1: 1, d1: 5, n2: 1, d2: 10 },
        ];
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        n = pair.n1 + pair.n2; d = 5; u = 100; // Result simplified
        display = (
          <div className="flex items-center gap-2 math-font" dir="ltr">
            <Fraction numerator={pair.n1} denominator={pair.d1} />
            <span className="text-xl">+</span>
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
    setSliderMax(Math.round(ans * 1.5));
    setSliderVal(10);
    setLives(5);
    setJustLost(false);
    setConsecutiveErrors(0);
  }, [gameState.lvl]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // First-time onboarding
  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARD_KEY)) {
        Swal.fire({
          title: 'חצי הכוס המלאה 🧪',
          html: '<div class="text-right text-sm leading-relaxed">יש לך כוס ובה כמות נוזל ידועה. עליך לגלות מה הנפח <b>הכולל</b> של הכוס.<br><br>🔴 הקו האדום = הכמות הידועה בכוס<br>📐 השבר מראה איזה חלק מהכוס מלא<br>🎯 הזז את הסליידר עד שתמצא את הנפח הכולל הנכון!</div>',
          confirmButtonText: 'יאללה נתחיל!',
          confirmButtonColor: '#3b82f6',
          customClass: { popup: 'rounded-3xl' },
        });
        localStorage.setItem(ONBOARD_KEY, '1');
      }
    } catch {}
  }, []);

  const liquidHeight = Math.min((sliderVal / totalCapacity) * 100, 100);

  const showHint = () => {
    vibe(20);
    const lvl = gameState.lvl;
    const hints = [
      'זכור: אם יש לך 50 מ"ל שהם חצי מהכוס, אז הכוס המלאה = 100 מ"ל.',
      'הכפל את הנתון בהופכי השבר. לדוגמה: 50 מ"ל = 2/4 → כוס מלאה = 50 × (4/2) = 100 מ"ל.',
      'פתור שלב אחרי שלב: חשב כל שבר בנפרד ואח"כ חבר אותם.',
      'חשב את הסכום/ההפרש של השברים תחילה, ואז חשב כמה מ"ל זה מייצג.',
      'בחיסור שברים: מצא מכנה משותף, ואז חשב את הכמות הכוללת.',
    ];
    Swal.fire({
      title: '💡 רמז',
      text: hints[Math.min(lvl - 1, hints.length - 1)],
      icon: 'info',
      confirmButtonText: 'הבנתי, תודה!',
      confirmButtonColor: '#f59e0b',
      customClass: { popup: 'rounded-3xl' },
    });
  };

  const checkAnswer = () => {
    if (Math.abs(parseInt(sliderVal) - totalCapacity) < 5) {
      vibe([30, 50, 30]);
      const result = handleWin('tank');
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, unlocked: result.unlocked, pts: result.pts });
    } else {
      const newLives = lives - 1;
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
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 md:p-8 w-full max-w-md shadow-xl flex flex-col gap-6 md:gap-8 border-2 border-blue-200 dark:border-blue-800/40 border-b-4 border-b-blue-400 dark:border-b-blue-700 transition-colors">

        {/* Lives */}
        <div className="flex justify-center">
          <Hearts lives={lives} maxLives={5} justLost={justLost} />
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
                    className={`absolute left-0 ${isTarget ? 'w-4 border-blue-500 dark:border-blue-400 border-[1.5px]' : 'w-2.5 border-slate-400 dark:border-slate-500 border-[1px] opacity-50'}`}
                    style={{ bottom: `${pct}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* Info */}
          <div className="text-right">
            <div className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-1">נתון בכוס:</div>
            <div className="text-4xl font-black text-blue-700 dark:text-blue-400 ltr flex items-baseline gap-1" dir="ltr">
              <span>{pVal}</span> <span className="text-sm ml-1 text-slate-400">מ"ל</span>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-4 mb-1">שהם בדיוק:</div>
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
          <div className="text-5xl md:text-6xl font-black text-blue-600 dark:text-blue-400 math-font mb-4" dir="ltr">
            <span>{sliderVal}</span>
            <span className="text-lg md:text-xl ml-1 text-slate-400">מ"ל</span>
          </div>

          <input
            type="range"
            id="tank-slider"
            min="10"
            max={sliderMax}
            step="10"
            value={sliderVal}
            onChange={(e) => { setSliderVal(parseInt(e.target.value)); vibe(10); }}
            className="val-track mb-6"
          />

          <div className="flex gap-2 mt-6">
            <button
              onClick={showHint}
              className={`w-16 py-4 md:py-5 rounded-3xl font-black text-xl shadow-sm transition-all active:scale-95 ${consecutiveErrors >= 2 ? 'bg-amber-400 text-white animate-pulse' : 'bg-blue-200 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 hover:bg-blue-300'}`}
            >
              💡
            </button>
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
