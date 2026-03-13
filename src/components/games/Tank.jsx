import { useState, useEffect, useCallback } from 'react';
import useGameStore from '../../store/useGameStore';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import Fraction from '../shared/Fraction';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';

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
  const [feedback, setFeedback] = useState({ visible: false, isLevelUp: false, pts: 0 });
  const [errorFlash, setErrorFlash] = useState(false);

  const initGame = useCallback(() => {
    const lvl = gameState.lvl;
    let d, n, u, display;

    if (lvl <= 3) {
      d = [4, 5, 8, 10][Math.floor(Math.random() * 4)];
      n = Math.floor(Math.random() * (d - 1)) + 1;
      u = 50;
      display = <Fraction numerator={n} denominator={d} />;
    } else if (lvl === 4) {
      const combos = [
        { n1: 1, d1: 4, n2: 1, d2: 4, d: 2, n: 1 },
        { n1: 1, d1: 2, n2: 1, d2: 4, d: 4, n: 3 },
      ];
      const c = combos[Math.floor(Math.random() * combos.length)];
      d = c.d; n = c.n; u = 100;
      display = (
        <div className="flex items-center gap-2 math-font" dir="ltr">
          <Fraction numerator={c.n1} denominator={c.d1} />
          <span className="text-xl">+</span>
          <Fraction numerator={c.n2} denominator={c.d2} />
        </div>
      );
    } else {
      const combos = [
        { n1: 3, d1: 4, n2: 1, d2: 2, d: 4, n: 1 },
        { n1: 1, d1: 2, n2: 1, d2: 4, d: 4, n: 1 },
      ];
      const c = combos[Math.floor(Math.random() * combos.length)];
      d = c.d; n = c.n; u = 100;
      display = (
        <div className="flex items-center gap-2 math-font" dir="ltr">
          <Fraction numerator={c.n1} denominator={c.d1} />
          <span className="text-xl">-</span>
          <Fraction numerator={c.n2} denominator={c.d2} />
        </div>
      );
    }

    const ans = u * d;
    setTotalCapacity(ans);
    setPVal(u * n);
    setFracDisplay(display);
    setKnownLineBottom((n / d) * 100);
    setSliderMax(Math.round(ans * 1.5));
    setSliderVal(50);
  }, [gameState.lvl]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const liquidHeight = Math.min((sliderVal / totalCapacity) * 100, 100);

  const showHint = () => {
    vibe(20);
    Swal.fire({
      title: '💡 רמז',
      text: 'נסה לצמצם או להרחיב את השבר כדי להבין כמה מים צריכים להיות בדיוק.',
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
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, pts: result.pts });
    } else {
      setErrorFlash(true);
      setTimeout(() => setErrorFlash(false), 400);
      vibe([50, 50, 50]);

      const result = handleGameFail('tank');
      if (result === 'locked') {
        Swal.fire({
          title: 'הרמה ננעלה 🔒',
          html: '<div class="text-right">נראה שזה קצת מאתגר כרגע.<br>נעלנו את הרמה הזו כדי שתוכל להתאמן עליה בנחת! 🧠</div>',
          icon: 'warning',
          confirmButtonText: 'הבנתי',
          confirmButtonColor: '#4f46e5',
          customClass: { popup: 'rounded-3xl' },
        }).then(() => setScreen('menu'));
      } else {
        Swal.fire({
          title: 'אופס! 💥',
          text: 'נגמרו הניסיונות בשאלה הזו, בוא ננסה שאלה חדשה.',
          icon: 'error',
          confirmButtonColor: '#ef4444',
          customClass: { popup: 'rounded-3xl' },
        }).then(() => initGame());
      }
    }
  };

  return (
    <div className={`screen-enter flex flex-col items-center p-4 flex-1 min-h-[calc(100dvh-80px)] ${errorFlash ? 'error-flash' : ''}`}>
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 md:p-8 w-full max-w-md shadow-xl flex flex-col gap-6 md:gap-8 border-b-4 border-slate-200 dark:border-slate-700 transition-colors">
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
            onChange={(e) => setSliderVal(parseInt(e.target.value))}
            className="val-track mb-6"
          />

          <div className="flex gap-2 mt-6">
            <button
              onClick={showHint}
              className="w-16 py-4 md:py-5 bg-blue-200 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-3xl font-black text-xl shadow-sm hover:bg-blue-300 transition-all active:scale-95"
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
        pts={feedback.pts}
        onDone={() => {
          setFeedback({ visible: false, isLevelUp: false, pts: 0 });
          initGame();
        }}
      />
    </div>
  );
}
