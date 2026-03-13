import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import Hearts from '../shared/Hearts';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';

const ONBOARD_KEY = 'onboard_balance';

export default function Balance() {
  const gameState = useGameStore((s) => s.balance);
  const handleWin = useGameStore((s) => s.handleWin);
  const handleGameFail = useGameStore((s) => s.handleGameFail);
  const setScreen = useGameStore((s) => s.setScreen);

  const [sliderVal, setSliderVal] = useState(1);
  const [beamAngle, setBeamAngle] = useState(0);
  const [lives, setLives] = useState(3);
  const [justLost, setJustLost] = useState(false);
  const [leftText, setLeftText] = useState('?');
  const [rightText, setRightText] = useState('?');
  const [rulesHtml, setRulesHtml] = useState('');
  const [feedback, setFeedback] = useState({ visible: false, isLevelUp: false, pts: 0 });
  const [errorFlash, setErrorFlash] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const ansRef = useRef(0);
  const lFnRef = useRef((v) => v);
  const rFnRef = useRef(() => 0);

  const initGame = useCallback(() => {
    const lvl = gameState.lvl;
    setLives(3);
    setJustLost(false);
    setSliderVal(1);
    setBeamAngle(0);
    setRulesHtml('');
    setConsecutiveErrors(0);

    const x = Math.floor(Math.random() * 10) + 2;
    ansRef.current = x;

    if (lvl === 1) {
      const b = Math.floor(Math.random() * 10) + 1;
      setLeftText(`🟦 + ${b}`);
      setRightText(`${x + b}`);
      lFnRef.current = (v) => v + b;
      rFnRef.current = () => x + b;
    } else if (lvl === 2) {
      const b = Math.floor(Math.random() * 10) + 1;
      setLeftText(`🟦 - ${b}`);
      setRightText(`${x}`);
      ansRef.current = x + b;
      lFnRef.current = (v) => v - b;
      rFnRef.current = () => x;
    } else if (lvl === 3) {
      // Only even values so (20 - a) / 2 is always an integer answer
      const evenPool = [2, 4, 6, 8, 10, 12];
      const a = evenPool[Math.floor(Math.random() * evenPool.length)];
      setLeftText(`🟦 + ${a}`);
      setRightText(`20 - 🟦`);
      ansRef.current = (20 - a) / 2;
      lFnRef.current = (v) => v + a;
      rFnRef.current = (v) => 20 - v;
    } else if (lvl === 4) {
      setLeftText(`(🟦 - 2) × (🟦 + 4)`);
      const t = (x - 2) * (x + 4);
      setRightText(`${t}`);
      lFnRef.current = (v) => (v - 2) * (v + 4);
      rFnRef.current = () => t;
    } else {
      setRulesHtml('🔴 = 🟦 + 2');
      setLeftText(`🔴 × 🟦`);
      const t = (x + 2) * x;
      setRightText(`${t}`);
      lFnRef.current = (v) => (v + 2) * v;
      rFnRef.current = () => t;
    }
  }, [gameState.lvl]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // First-time onboarding
  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARD_KEY)) {
        Swal.fire({
          title: 'שומרים על איזון ⚖️',
          html: '<div class="text-right text-sm leading-relaxed">על המאזניים מוצגת משוואה עם נעלם 🟦.<br><br>הזז את הסליידר כדי למצוא את הערך שגורם לשני הצדדים להיות שווים.<br><br>⚖️ כשהמאזניים מאוזנים לגמרי — ניצחת!</div>',
          confirmButtonText: 'יאללה נאזן!',
          confirmButtonColor: '#10b981',
          customClass: { popup: 'rounded-3xl' },
        });
        localStorage.setItem(ONBOARD_KEY, '1');
      }
    } catch {}
  }, []);

  const showHint = () => {
    vibe(20);
    const lvl = gameState.lvl;
    const hints = [
      'נסה ערכים שונים. כשהמאזניים שווים — זאת התשובה!',
      'חשב קודם: מה ערך הצד הימני (ללא הנעלם)?',
      'שניהם שווים — כתוב משוואה וחלק ב-2.',
      'נסה לפתח: (x-2)(x+4) = x²+2x-8. מה הפתרון?',
      'זכור: 🔴 = 🟦+2. החלף בביטוי ופשט.',
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
    const v = parseInt(sliderVal);
    const l = lFnRef.current(v);
    const r = rFnRef.current(v);

    // Dramatic beam tilt: capped at ±22 degrees
    const diff = r - l;
    const angle = Math.max(-22, Math.min(22, diff * 3.5));
    setBeamAngle(angle);

    if (Math.abs(l - r) < 0.1) {
      vibe([30, 50, 30]);
      const result = handleWin('balance');
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, pts: result.pts });
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
        const result = handleGameFail('balance');
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
    }
  };

  const isUnlimited = gameState.lvl === 5;

  return (
    <div className={`screen-enter flex flex-col items-center p-4 flex-1 min-h-[calc(100dvh-80px)] ${errorFlash ? 'error-flash' : ''}`}>
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 w-full max-w-md shadow-xl flex flex-col items-center gap-6 border-b-4 border-slate-200 dark:border-slate-700 transition-colors">

        {/* Lives */}
        <div className="flex gap-2 justify-center w-full h-8 mb-2">
          {isUnlimited ? (
            <Hearts unlimitedText="ללא הגבלת ניסיונות" />
          ) : (
            <Hearts lives={lives} maxLives={3} justLost={justLost} />
          )}
        </div>

        {/* Rules (level 5) */}
        {rulesHtml && (
          <div className="w-full flex flex-wrap justify-center gap-2 -mb-4 z-10">
            <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-bold p-2 rounded-lg text-sm border border-rose-200 math-font" dir="ltr">
              {rulesHtml}
            </div>
          </div>
        )}

        {/* Scale */}
        <div className="scale-container">
          <div className="scale-beam" style={{ transform: `rotate(${beamAngle}deg)` }}>
            <div className="pan-wrap" style={{ transform: `rotate(${-beamAngle}deg)` }}>
              <div className="pan bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 math-font">
                {leftText}
              </div>
            </div>
            <div className="pan-wrap" style={{ transform: `rotate(${-beamAngle}deg)` }}>
              <div className="pan bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 math-font">
                {rightText}
              </div>
            </div>
          </div>
          <div className="scale-base" />
        </div>

        {/* Slider area */}
        <div className="text-center w-full pb-4">
          <div className="flex justify-center items-center gap-4 mb-6" dir="ltr">
            <span className="text-4xl md:text-5xl drop-shadow-sm">🟦</span>
            <span className="text-2xl font-bold text-slate-300 dark:text-slate-600">=</span>
            <span className="text-5xl md:text-6xl font-black text-emerald-500 min-w-[80px]">
              {sliderVal}
            </span>
          </div>

          <input
            type="range"
            id="bal-slider"
            min="1"
            max="50"
            step="1"
            value={sliderVal}
            onChange={(e) => { setSliderVal(e.target.value); vibe(10); }}
            className="mb-6 val-track"
          />

          {consecutiveErrors >= 2 && (
            <div className="mb-3 text-xs text-amber-600 dark:text-amber-400 font-bold animate-pulse">
              💡 נראה שקשה — לחץ על הרמז!
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={showHint}
              className={`w-16 py-4 md:py-5 rounded-3xl font-black text-xl shadow-sm transition-all active:scale-95 ${consecutiveErrors >= 2 ? 'bg-amber-400 text-white animate-pulse' : 'bg-emerald-200 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 hover:bg-emerald-300'}`}
            >
              💡
            </button>
            <button
              onClick={checkAnswer}
              className="flex-1 py-4 md:py-5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-3xl font-black text-xl md:text-2xl shadow-xl hover:bg-emerald-700 transition-all active:scale-95"
            >
              שקול ובדוק! ⚖️
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
