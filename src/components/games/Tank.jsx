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
  const [feedback, setFeedback] = useState({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
  const [errorFlash, setErrorFlash] = useState(false);
  const [lives, setLives] = useState(5);
  const [justLost, setJustLost] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const recentRef = useRef([]);

  const initGame = useCallback(() => {
    const lvl = gameState.lvl;
    let d, n, u, display;
    let attempts = 0;
    const recent = recentRef.current;

    // Base units per denominator: must be divisible by step=10 so totalCapacity (u×d) is always reachable
    const DENOM_BASES = { 2: 100, 3: 90, 4: 100, 5: 100, 6: 90, 8: 100, 10: 100 };

    do {
      if (lvl <= 3) {
        d = [2, 3, 4, 5, 6, 8, 10][Math.floor(Math.random() * 7)];
        n = Math.floor(Math.random() * (d - 1)) + 1;
        u = DENOM_BASES[d];
        display = <Fraction numerator={n} denominator={d} />;
      } else if (lvl === 4) {
        // Procedural: two fractions with same base denominator that add to < 1
        const baseD = [4, 6, 8][Math.floor(Math.random() * 3)];
        let n1, n2;
        let inner = 0;
        do {
          n1 = Math.floor(Math.random() * (baseD - 1)) + 1;
          n2 = Math.floor(Math.random() * (baseD - 1)) + 1;
          inner++;
        } while ((n1 + n2 >= baseD || n1 === n2) && inner < 20);
        // Reduce fractions for display
        const g1 = gcd(n1, baseD), g2 = gcd(n2, baseD);
        const sumN = n1 + n2;
        const gSum = gcd(sumN, baseD);
        d = baseD / gSum; n = sumN / gSum; u = 100;
        display = (
          <div className="flex items-center gap-2 math-font" dir="ltr">
            <Fraction numerator={n1 / g1} denominator={baseD / g1} />
            <span className="text-xl">+</span>
            <Fraction numerator={n2 / g2} denominator={baseD / g2} />
          </div>
        );
      } else {
        // Procedural: two fractions with same base denominator, n1 > n2
        const baseD = [4, 6, 8][Math.floor(Math.random() * 3)];
        let n1, n2;
        let inner = 0;
        do {
          n1 = Math.floor(Math.random() * (baseD - 1)) + 2;
          n2 = Math.floor(Math.random() * (n1 - 1)) + 1;
          inner++;
        } while (n1 === n2 && inner < 20);
        const g1 = gcd(n1, baseD), g2 = gcd(n2, baseD);
        const diffN = n1 - n2;
        const gDiff = gcd(diffN, baseD);
        d = baseD / gDiff; n = diffN / gDiff; u = 100;
        display = (
          <div className="flex items-center gap-2 math-font" dir="ltr">
            <Fraction numerator={n1 / g1} denominator={baseD / g1} />
            <span className="text-xl">-</span>
            <Fraction numerator={n2 / g2} denominator={baseD / g2} />
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
      setTimeout(() => { setErrorFlash(false); setJustLost(false); }, 600);
      vibe([50, 50, 50]);

      if (newLives <= 0) {
        handleGameFail('tank');
        setScreen('menu');
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
            </div>
          </div>

          {/* Info */}
          <div className="text-right">
            <div className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-1">נתון בכוס:</div>
            <div className="text-3xl font-black text-blue-700 dark:text-blue-400 ltr flex items-baseline gap-1" dir="ltr">
              <span>{pVal}</span> <span className="text-sm ml-1 text-slate-400">מ"ל</span>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-4 mb-1">שהם בדיוק:</div>
            <div className="text-2xl font-black text-blue-900 dark:text-blue-300 mt-1">
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
