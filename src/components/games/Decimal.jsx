import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import Hearts from '../shared/Hearts';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import Fraction from '../shared/Fraction';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';

const ONBOARD_KEY = 'onboard_decimal';

// RotaryKnob — drag or +/- to move cursor
const RotaryKnob = ({ value, onChange }) => {
  const knobRef = useRef(null);
  const drag = useRef({ active: false, startAngle: 0, startValue: 0 });

  const getAngle = (e) => {
    if (!knobRef.current) return 0;
    const rect = knobRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  };

  const handleStart = (e) => {
    drag.current = { active: true, startAngle: getAngle(e), startValue: value };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!drag.current.active) return;
      e.preventDefault();
      let delta = getAngle(e) - drag.current.startAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const steps = Math.trunc(delta / 10);
      if (Math.abs(steps) >= 1) {
        const next = Math.max(0, Math.min(9999, drag.current.startValue + steps));
        onChange(next);
        drag.current.startAngle = getAngle(e);
        drag.current.startValue = next;
      }
    };
    const onEnd = () => { drag.current.active = false; };
    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [onChange]);

  const rotation = (value * 10) % 360;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-28 h-28 md:w-32 md:h-32 flex items-center justify-center shrink-0">
        {Array.from({ length: 36 }).map((_, i) => (
          <div key={i} className="absolute w-full h-full pointer-events-none" style={{ transform: `rotate(${i * 10}deg)` }}>
            <div className={`mx-auto w-0.5 rounded-full ${i % 9 === 0 ? 'h-3 bg-slate-400 dark:bg-slate-400' : 'h-1.5 bg-slate-300 dark:bg-slate-600'}`} />
          </div>
        ))}
        <div
          ref={knobRef}
          className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-100 dark:bg-slate-700 shadow-[inset_0_4px_8px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.2)] border-4 border-slate-200 dark:border-slate-600 flex items-center justify-center cursor-pointer relative touch-none z-10"
          onMouseDown={handleStart}
          onTouchStart={handleStart}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="absolute top-2 w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <div className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-500 opacity-50" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => { onChange(Math.min(9999, value + 1)); vibe(10); }}
          className="w-11 h-11 bg-cyan-500 hover:bg-cyan-400 rounded-full flex items-center justify-center text-xl font-black text-white shadow-md active:scale-90 transition-transform"
        >+</button>
        <button
          onClick={() => { onChange(Math.max(0, value - 1)); vibe(10); }}
          className="w-11 h-11 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-xl font-black text-slate-600 dark:text-slate-300 shadow-sm active:scale-90 transition-transform"
        >−</button>
      </div>
    </div>
  );
};

// Horizontal number line
function NumberLine({ position, range, zoom }) {
  const [rangeMin, rangeMax] = range;
  const rangeSize = rangeMax - rangeMin;
  if (rangeSize <= 0) return null;

  const toPercent = (v) => Math.min(100, Math.max(0, ((v - rangeMin) / rangeSize) * 100));

  const intTicks = [];
  for (let i = Math.ceil(rangeMin); i <= Math.floor(rangeMax); i++) {
    intTicks.push(i);
  }

  const cursorPct = toPercent(position);
  const displayVal = position.toFixed(Math.max(1, zoom));

  return (
    <div className="relative w-full select-none" style={{ height: '88px' }}>
      {/* Track line */}
      <div className="absolute left-4 right-4 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" style={{ top: '42%' }} />

      {/* Left arrow */}
      <div className="absolute left-0 w-0 h-0 pointer-events-none"
        style={{ top: 'calc(42% - 5px)', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '10px solid #94a3b8' }} />
      {/* Right arrow */}
      <div className="absolute right-0 w-0 h-0 pointer-events-none"
        style={{ top: 'calc(42% - 5px)', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '10px solid #94a3b8' }} />

      {/* Integer tick marks */}
      {intTicks.map((n) => {
        const pct = toPercent(n);
        const isZero = n === 0;
        return (
          <div key={n} className="absolute flex flex-col items-center"
            style={{ left: `calc(${pct}% - 1px + 1rem)`, top: '25%', transform: 'translateX(-50%)' }}>
            <div className={`w-0.5 rounded-full ${isZero ? 'h-6 bg-slate-500 dark:bg-slate-400' : 'h-4 bg-slate-300 dark:bg-slate-600'}`} />
            <span className={`text-[10px] font-bold mt-0.5 ${isZero ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
              {n}
            </span>
          </div>
        );
      })}

      {/* Cursor */}
      <div
        className="absolute flex flex-col items-center pointer-events-none"
        style={{
          left: `calc(${cursorPct}% + 1rem)`,
          top: '4px',
          transform: 'translateX(-50%)',
          transition: 'left 0.06s ease-out',
        }}
      >
        {/* Arrow pointing down */}
        <div className="w-0 h-0"
          style={{ borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '10px solid #06b6d4' }} />
        <div className="w-0.5 h-9 bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.7)]" />
      </div>

      {/* Current value label */}
      <div
        className="absolute font-black text-[11px] text-cyan-600 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/40 px-1.5 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800 pointer-events-none whitespace-nowrap"
        style={{
          left: `calc(${cursorPct}% + 1rem)`,
          bottom: '2px',
          transform: 'translateX(-50%)',
          transition: 'left 0.06s ease-out',
        }}
        dir="ltr"
      >
        {displayVal}
      </div>
    </div>
  );
}

// Level sets: { v=target value, n/d=fraction to display, w=whole part, neg=negative, range=[min,max], z=maxZoom }
const levelSets = [
  // Level 1: halves and quarters on positive axis
  [
    { v: 0.5, n: 1, d: 2, w: 0, range: [-0.5, 2.5], z: 1 },
    { v: 0.25, n: 1, d: 4, w: 0, range: [-0.5, 2.5], z: 2 },
    { v: 0.75, n: 3, d: 4, w: 0, range: [-0.5, 2.5], z: 2 },
    { v: 1.5, n: 1, d: 2, w: 1, range: [0, 3], z: 1 },
    { v: 1.75, n: 3, d: 4, w: 1, range: [0, 3], z: 2 },
  ],
  // Level 2: fifths and tenths
  [
    { v: 0.2, n: 1, d: 5, w: 0, range: [-0.5, 2], z: 1 },
    { v: 0.4, n: 2, d: 5, w: 0, range: [-0.5, 2], z: 1 },
    { v: 0.6, n: 3, d: 5, w: 0, range: [-0.5, 2], z: 1 },
    { v: 1.2, n: 1, d: 5, w: 1, range: [0, 2.5], z: 1 },
    { v: 0.1, n: 1, d: 10, w: 0, range: [-0.5, 2], z: 1 },
    { v: 0.3, n: 3, d: 10, w: 0, range: [-0.5, 2], z: 1 },
  ],
  // Level 3: mixed numbers, hundredths
  [
    { v: 1.25, n: 1, d: 4, w: 1, range: [0, 3], z: 2 },
    { v: 2.25, n: 1, d: 4, w: 2, range: [0, 4], z: 2 },
    { v: 0.05, n: 1, d: 20, w: 0, range: [-0.5, 1.5], z: 2 },
    { v: 0.15, n: 3, d: 20, w: 0, range: [-0.5, 1.5], z: 2 },
    { v: 0.8, n: 4, d: 5, w: 0, range: [-0.5, 2], z: 1 },
  ],
  // Level 4: eighths + intro negatives
  [
    { v: 0.125, n: 1, d: 8, w: 0, range: [-0.5, 1.5], z: 3 },
    { v: 0.375, n: 3, d: 8, w: 0, range: [-0.5, 1.5], z: 3 },
    { v: 0.625, n: 5, d: 8, w: 0, range: [-0.5, 1.5], z: 3 },
    { v: 0.875, n: 7, d: 8, w: 0, range: [-0.5, 1.5], z: 3 },
    { v: -0.5, n: 1, d: 2, w: 0, neg: true, range: [-1.5, 1.5], z: 1 },
    { v: -0.25, n: 1, d: 4, w: 0, neg: true, range: [-1.5, 1.5], z: 2 },
  ],
  // Level 5: complex + more negatives
  [
    { v: 1.875, n: 7, d: 8, w: 1, range: [0, 3], z: 3 },
    { v: -0.375, n: 3, d: 8, w: 0, neg: true, range: [-1.5, 1.5], z: 3 },
    { v: -0.75, n: 3, d: 4, w: 0, neg: true, range: [-1.5, 1.5], z: 2 },
    { v: 2.375, n: 3, d: 8, w: 2, range: [0, 4], z: 3 },
    { v: -0.125, n: 1, d: 8, w: 0, neg: true, range: [-1.5, 1.5], z: 3 },
  ],
];

// Throttle labels: LEFT=fine(1/1000), RIGHT=coarse(x1)
const throttleLabels = ['1/1000', '1/100', '1/10', 'x1'];

export default function Decimal() {
  const gameState = useGameStore((s) => s.decimal);
  const handleWinStore = useGameStore((s) => s.handleWin);
  const handleGameFail = useGameStore((s) => s.handleGameFail);
  const setScreen = useGameStore((s) => s.setScreen);

  const [lives, setLives] = useState(5);
  const [justLost, setJustLost] = useState(false);
  // throttlePos: 3=RIGHT=coarse(x1, zoom=0), 0=LEFT=fine(1/1000, zoom=3)
  const [throttlePos, setThrottlePos] = useState(3);
  const [maxZoom, setMaxZoom] = useState(1);
  const [position, setPosition] = useState(0);
  const [knobVal, setKnobVal] = useState(5000);
  const [targetFrac, setTargetFrac] = useState(null);
  const [feedback, setFeedback] = useState({ visible: false, isLevelUp: false, pts: 0 });
  const [errorFlash, setErrorFlash] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const targetRef = useRef(0);
  const rangeRef = useRef([-0.5, 2.5]);
  const knobBaseRef = useRef(5000);
  const recentRef = useRef([]);

  // throttlePos 3 → zoom 0 (coarse, x1); throttlePos 0 → zoom=maxZoom (fine)
  const zoom = Math.min(maxZoom, 3 - throttlePos);
  const step = 1 / Math.pow(10, zoom);

  const initGame = useCallback(() => {
    const pool = levelSets[(gameState.lvl - 1)] || levelSets[0];
    const recent = recentRef.current;
    const available = pool.filter((f) => !recent.includes(f.v));
    const candidates = available.length > 0 ? available : pool;
    const f = candidates[Math.floor(Math.random() * candidates.length)];

    recentRef.current = [f.v, ...recent].slice(0, 3);
    targetRef.current = f.v;
    rangeRef.current = f.range;
    setTargetFrac(f);
    setMaxZoom(f.z);
    setLives(5);
    setJustLost(false);
    setThrottlePos(3);
    setPosition(0);
    setKnobVal(5000);
    knobBaseRef.current = 5000;
    setConsecutiveErrors(0);
  }, [gameState.lvl]);

  useEffect(() => { initGame(); }, [initGame]);

  // First-time onboarding
  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARD_KEY)) {
        Swal.fire({
          title: 'תפוס את הנקודה 🎯',
          html: '<div class="text-right text-sm leading-relaxed">יש לך ציר מספרים. עליך למקם את הסמן (החץ) בדיוק על הערך של השבר המוצג.<br><br>🎛️ <b>חוגה</b> — הזז את הסמן שמאלה/ימינה<br>📊 <b>מצערת</b> — שנה את גודל הצעד<br>&nbsp;&nbsp;&nbsp;ימין = צעד גדול (x1) | שמאל = צעד קטן (1/1000)</div>',
          confirmButtonText: 'יאללה נתפוס!',
          confirmButtonColor: '#06b6d4',
          customClass: { popup: 'rounded-3xl' },
        });
        localStorage.setItem(ONBOARD_KEY, '1');
      }
    } catch {}
  }, []);

  const handleKnobChange = useCallback((newVal) => {
    const delta = newVal - knobBaseRef.current;
    knobBaseRef.current = newVal;
    setKnobVal(newVal);
    const s = 1 / Math.pow(10, zoom);
    setPosition((prev) => {
      const [min, max] = rangeRef.current;
      const next = Math.round((prev + delta * s) * 10000) / 10000;
      return Math.max(min - 0.5, Math.min(max + 0.5, next));
    });
    vibe(10);
  }, [zoom]);

  const handleThrottleChange = (val) => {
    const v = parseInt(val);
    setThrottlePos(v);
    vibe(10);
  };

  const showHint = () => {
    vibe(20);
    const lvl = gameState.lvl;
    const hints = [
      'נסה קודם עם צעד גדול (x1) להגיע לאזור הנכון, ואז עבור לצעד קטן יותר.',
      'שברים שימושיים: 1/2=0.5, 1/4=0.25, 3/4=0.75, 1/5=0.2.',
      'מספר מעורב כמו 1¼ = 1.25. התחל מ-1 ואז הוסף 0.25.',
      'שמינית = 0.125. כפול ב-3 תקבל 3/8 = 0.375.',
      'מספרים שליליים נמצאים משמאל לאפס. −1/2 = −0.5.',
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
    if (Math.abs(position - targetRef.current) < (step * 0.6)) {
      vibe([30, 50, 30]);
      const result = handleWinStore('decimal');
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, pts: result.pts });
    } else {
      vibe([50, 50, 50]);
      setErrorFlash(true);
      setTimeout(() => setErrorFlash(false), 400);
      const newLives = lives - 1;
      const newErrors = consecutiveErrors + 1;
      setLives(newLives);
      setJustLost(true);
      setConsecutiveErrors(newErrors);
      setTimeout(() => setJustLost(false), 600);
      if (newLives <= 0) {
        const result = handleGameFail('decimal');
        if (result === 'locked') {
          Swal.fire({ title: 'הרמה ננעלה 🔒', html: '<div class="text-right">נעלנו את הרמה כדי שתוכל להתאמן! 🧠</div>', icon: 'warning', confirmButtonText: 'הבנתי', confirmButtonColor: '#4f46e5', customClass: { popup: 'rounded-3xl' } })
            .then(() => setScreen('menu'));
        } else {
          Swal.fire({ title: 'אופס! 💥', text: 'נגמרו הניסיונות, בואו ננסה שאלה חדשה.', icon: 'error', confirmButtonColor: '#ef4444', customClass: { popup: 'rounded-3xl' } })
            .then(() => initGame());
        }
      }
    }
  };

  return (
    <div className={`screen-enter flex flex-col items-center p-3 md:p-4 flex-1 ${errorFlash ? 'error-flash' : ''}`}>
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-4 md:p-6 w-full max-w-md shadow-xl flex flex-col items-center gap-4 border-b-4 border-slate-200 dark:border-slate-700 transition-colors">

        {/* Top bar */}
        <div className="w-full flex justify-between items-center">
          <span className="text-sm font-black text-cyan-600 dark:text-cyan-400">תפוס את הנקודה 🎯</span>
          <Hearts lives={lives} maxLives={5} justLost={justLost} />
        </div>

        {/* Target fraction */}
        <div className="w-full bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 flex flex-col items-center gap-1 border border-slate-200 dark:border-slate-700">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">מקם על ציר המספרים</span>
          <div className="mt-1 flex items-center gap-1" dir="ltr">
            {targetFrac?.neg && (
              <span className="text-4xl font-black text-rose-500">−</span>
            )}
            {targetFrac && (
              <Fraction
                numerator={targetFrac.n}
                denominator={targetFrac.d}
                whole={targetFrac.w || 0}
                className="text-4xl text-slate-800 dark:text-slate-100"
              />
            )}
          </div>
        </div>

        {/* Number line */}
        <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-2xl py-3 px-1 shadow-inner border border-slate-200 dark:border-slate-700">
          <NumberLine position={position} range={rangeRef.current} zoom={zoom} />
        </div>

        {/* Controls */}
        <div className="w-full flex flex-col gap-4">

          {/* Throttle — step size: RIGHT=coarse(x1), LEFT=fine(1/1000) */}
          <div className="flex flex-col gap-2">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">גודל צעד</div>
            <div className="flex justify-between px-4 text-[10px] font-black text-slate-400" dir="ltr">
              {throttleLabels.map((lbl, i) => (
                <span
                  key={i}
                  className={`transition-all ${throttlePos === i ? 'text-cyan-500 scale-110' : ''} ${(3 - i) > maxZoom ? 'opacity-30' : ''}`}
                >
                  {lbl}
                </span>
              ))}
            </div>
            <div className="relative w-full h-12 flex items-center bg-slate-100 dark:bg-slate-800 rounded-full shadow-inner border-2 border-slate-200 dark:border-slate-700 px-4">
              <div className="absolute inset-0 flex justify-between items-center px-4 pointer-events-none">
                {[0, 1, 2, 3].map((i) => <div key={i} className="w-1 h-4 bg-slate-300 dark:bg-slate-600 rounded-full" />)}
              </div>
              <input
                type="range" min="0" max="3" step="1" value={throttlePos}
                onChange={(e) => handleThrottleChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 touch-none"
              />
              {/* Throttle handle */}
              <div
                className="absolute h-16 w-7 bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 rounded-t-xl rounded-b-md shadow-md border border-slate-400 dark:border-slate-500 pointer-events-none z-10 flex flex-col items-center justify-start pt-1 gap-0.5"
                style={{ left: `calc(${throttlePos / 3} * (100% - 2.5rem) + 0.75rem)`, top: '-10px', transition: 'left 0.15s ease-out' }}
              >
                <div className="w-4 h-0.5 bg-slate-500/60 rounded-full" />
                <div className="w-4 h-0.5 bg-slate-500/60 rounded-full" />
                <div className="w-4 h-0.5 bg-slate-500/60 rounded-full" />
                <div className="mt-auto mb-1.5 w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_5px_#06b6d4]" />
              </div>
            </div>
          </div>

          {/* RotaryKnob — move cursor */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
              הזזת סמן (צעד: {step >= 1 ? step : step.toFixed(zoom)})
            </div>
            <RotaryKnob value={knobVal} onChange={handleKnobChange} />
          </div>
        </div>

        {consecutiveErrors >= 2 && (
          <button
            onClick={showHint}
            className="w-full text-sm font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 px-4 py-2 rounded-xl border border-amber-200 dark:border-amber-800 animate-pulse active:scale-95 transition-transform"
          >
            💡 לחץ לרמז — זה עוזר!
          </button>
        )}

        {/* Action buttons */}
        <div className="w-full flex gap-2 pb-1">
          <button
            onClick={showHint}
            className="w-16 py-4 bg-cyan-200 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 rounded-3xl font-black text-xl shadow-sm hover:bg-cyan-300 transition-all active:scale-95"
          >💡</button>
          <button
            onClick={checkAnswer}
            className="flex-1 py-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-3xl font-black text-xl shadow-xl transition-all active:scale-95"
          >תפוס! 🎯</button>
        </div>
      </div>

      <FeedbackOverlay
        visible={feedback.visible}
        isLevelUp={feedback.isLevelUp}
        pts={feedback.pts}
        onDone={() => { setFeedback({ visible: false, isLevelUp: false, pts: 0 }); initGame(); }}
      />
    </div>
  );
}
