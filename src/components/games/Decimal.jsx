import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import useGameStore from '../../store/useGameStore';
import Hearts from '../shared/Hearts';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import HintButton from '../shared/HintButton';
import HintBubble from '../shared/HintBubble';
import useHint from '../../hooks/useHint';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2'; // נשאר רק ל-fail dialog (Decimal שומר lives)
import GameTutorial from '../shared/GameTutorial';

// צעדים: index → גודל צעד → זום
const stepOptions  = [1, 0.1, 0.01, 0.001];

// Fraction — שבר אקדמי (מונה מעל מכנה)
const Fraction = ({ n, d }) => (
  <div className="inline-flex flex-col items-center justify-center leading-none text-center" dir="ltr">
    <span className="border-b-[1.5px] border-current px-0.5 pb-[1px] block">{n}</span>
    <span className="pt-[1px] block">{d}</span>
  </div>
);

// RotaryKnob — בוחר גודל הצעד (stepIndex 0‑3)
const RotaryKnob = ({ stepIndex, onChange }) => {
  const knobRef = useRef(null);
  const drag = useRef({ active: false, startAngle: 0, startIndex: 0 });

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
    drag.current = { active: true, startAngle: getAngle(e), startIndex: stepIndex };
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!drag.current.active) return;
      e.preventDefault();
      let delta = getAngle(e) - drag.current.startAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const steps = Math.trunc(delta / 45); // 45° per step
      if (Math.abs(steps) >= 1) {
        const next = Math.max(0, Math.min(3, drag.current.startIndex + steps));
        if (next !== stepIndex) {
          onChange(next);
          vibe(10);
        }
        drag.current.startAngle = getAngle(e);
        drag.current.startIndex = next;
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
  }, [onChange, stepIndex]);

  const rotation = stepIndex * 90; // 0°, 90°, 180°, 270°

  const labelDefs = [
    { idx: 0, content: <span className="text-sm font-black">×1</span>,                                                                          style: { top: '-2rem',   left: '50%', transform: 'translateX(-50%)' } },
    { idx: 1, content: <div className="flex items-center gap-0.5 text-sm font-black" dir="ltr"><span>×</span><Fraction n={1} d={10}   /></div>, style: { top: '50%',    right: '-4.5rem', transform: 'translateY(-50%)' } },
    { idx: 2, content: <div className="flex flex-col items-center gap-0 text-sm font-black" dir="ltr"><span>×</span><Fraction n={1} d={100}  /></div>, style: { bottom: '-2.8rem', left: '50%', transform: 'translateX(-50%)' } },
    { idx: 3, content: <div className="flex items-center gap-0.5 text-sm font-black" dir="ltr"><span>×</span><Fraction n={1} d={1000} /></div>, style: { top: '50%',    left:  '-5rem',   transform: 'translateY(-50%)' } },
  ];

  return (
    <div className="flex flex-col items-center gap-1">
      {/* מעגל חיצוני עם תוויות טקסט */}
      <div className="relative flex items-center justify-center w-full h-44 mt-1" style={{ paddingBottom: '1.5rem' }}>

        {/* תוויות ניתנות ללחיצה — ללא עיגול */}
        {labelDefs.map(({ idx, content, style }) => (
          <button
            key={idx}
            onClick={() => { onChange(idx); vibe(10); }}
            className={`absolute font-black text-sm leading-none transition-all active:scale-90 ${
              stepIndex === idx
                ? 'text-yellow-500'
                : 'text-slate-400 dark:text-slate-500'
            }`}
            style={{ position: 'absolute', ...style }}
            dir="ltr"
          >
            {content}
          </button>
        ))}

        {/* שנתות קישוט */}
        {Array.from({ length: 36 }).map((_, i) => (
          <div key={i} className="absolute pointer-events-none" style={{ width: '100%', height: '100%', transform: `rotate(${i * 10}deg)` }}>
            <div className={`mx-auto w-0.5 rounded-full ${i % 9 === 0 ? 'h-2.5 bg-slate-300 dark:bg-slate-600' : 'h-1.5 bg-slate-200 dark:bg-slate-700'}`} />
          </div>
        ))}

        {/* הרולר עצמו */}
        <div
          ref={knobRef}
          className="rounded-full bg-slate-100 dark:bg-slate-700 shadow-[inset_0_4px_8px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.2)] border-4 border-slate-200 dark:border-slate-600 flex items-center justify-center cursor-pointer relative touch-none z-10"
          onMouseDown={handleStart}
          onTouchStart={handleStart}
          style={{ width: '7rem', height: '7rem', transform: `rotate(${rotation}deg)`, transition: 'transform 0.2s ease-out' }}
        >
          <div className="absolute top-2 w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-500 opacity-50" />
        </div>
      </div>

    </div>
  );
};

// PositionSlider — מזיז את הסמן באופן רציף, מסונכרן עם ה-step עם ידית גרירה מותאמת
const PositionSlider = ({ value, onChange, step, range }) => {
  const [rMin, rMax] = range;
  const pct = ((value - rMin) / (rMax - rMin)) * 100;
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return (
    <div className="w-full flex flex-col gap-1 mt-2">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
        ← הזזת סמן →
      </div>
      <input
        type="range"
        min={rMin}
        max={rMax}
        step={0.0001}
        value={value}
        onChange={(e) => {
          const raw = parseFloat(e.target.value);
          const snapped = Math.round(raw / step) * step;
          onChange(parseFloat(snapped.toFixed(4)));
        }}
        className="w-full h-3 rounded-full appearance-none cursor-pointer outline-none shadow-inner
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-[4px] [&::-webkit-slider-thumb]:border-yellow-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md
          [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-[4px] [&::-moz-range-thumb]:border-yellow-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-md"
        style={{
          background: `linear-gradient(to right, #eab308 0%, #eab308 ${pct}%, ${isDark ? '#334155' : '#cbd5e1'} ${pct}%, ${isDark ? '#334155' : '#cbd5e1'} 100%)`
        }}
        dir="ltr"
      />
    </div>
  );
};

// Horizontal number line — smooth sliding with useMemo + CSS transition
function NumberLine({ position, fullRange, zoomLevel, cursorColor, stepIndex }) {
  const [fullMin, fullMax] = fullRange;
  const visibleSpan = 2 / Math.pow(10, zoomLevel);
  const tickInterval = visibleSpan / 10;
  const minDecimals = Math.max(0, Math.ceil(-Math.log10(tickInterval + 1e-12)));
  const displayDecimals = Math.max(stepIndex || 0, minDecimals);

  // שנתות קבועות — מחושבות מחדש רק כשzoom/range משתנה, לא בכל גרירה
  const ticks = useMemo(() => {
    const result = [];
    const start = Math.floor((fullMin - visibleSpan) / tickInterval) * tickInterval;
    const end = Math.ceil((fullMax + visibleSpan) / tickInterval) * tickInterval;
    const total = Math.round((end - start) / tickInterval) + 1;
    for (let i = 0; i < total; i++) {
      result.push(Number((start + i * tickInterval).toFixed(minDecimals)));
    }
    return result;
  }, [fullMin, fullMax, tickInterval, minDecimals, visibleSpan]);

  // טווח מורחב שמכסה את ה-container
  const extMin = fullMin - visibleSpan;
  const extMax = fullMax + visibleSpan;
  const extSpan = extMax - extMin;
  const containerWidthPct = extSpan / visibleSpan * 100;

  // נוסחה: position תמיד תחת הסמן (50% מהאב)
  const slidePercent = (0.5 - (position - extMin) / extSpan) * 100;

  const color = cursorColor || '#eab308';

  return (
    <div className="relative w-full h-24 select-none" style={{ overflow: 'visible' }}>

      {/* קו רקע — נמתח לרוחב כל המסך */}
      <div className="absolute top-1/2 h-1 bg-slate-300 dark:bg-slate-600 z-0"
        style={{ width: '100vw', left: '50%', transform: 'translateX(-50%) translateY(-50%)' }} />

      {/* container גולל — CSS transition מספק את תחושת הגלילה */}
      <div className="absolute top-0 bottom-0 z-10"
        style={{
          left: '50%',
          transform: `translateX(calc(-50% + ${slidePercent}%))`,
          width: `${containerWidthPct}%`,
          transition: 'transform 80ms ease-out',
          willChange: 'transform',
        }}
      >
        {ticks.map((n) => {
          const isInteger = Math.abs(n - Math.round(n)) < 1e-9;
          const inBounds = n >= fullMin && n <= fullMax;
          const leftPct = (n - extMin) / extSpan * 100;
          return (
            <div
              key={n.toFixed(minDecimals)}
              className="absolute flex flex-col items-center"
              style={{ left: `${leftPct}%`, top: '50%', transform: 'translate(-50%, -50%)', opacity: inBounds ? 1 : 0.25 }}
            >
              <div className={`rounded-full ${isInteger ? 'w-1 h-6 bg-slate-600 dark:bg-slate-400' : 'w-0.5 h-3 bg-slate-400 dark:bg-slate-500'}`} />
              <span dir="ltr" className={`absolute top-full mt-1.5 font-bold whitespace-nowrap ${isInteger ? 'text-xs text-slate-800 dark:text-slate-200' : 'text-[10px] text-slate-500'}`}>
                {n.toFixed(displayDecimals)}
              </span>
            </div>
          );
        })}
      </div>

      {/* חיצים סטטיים — מגדירי מסגרת */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-[6px] border-r-slate-400 z-20" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-l-[6px] border-l-slate-400 z-20" />

      {/* סמן קבוע במרכז */}
      <div className="absolute pointer-events-none z-30" style={{ left: '50%', top: '4px', transform: 'translateX(-50%)' }}>
        <div className="w-0 h-0" style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `8px solid ${color}`, transition: 'border-top-color 0.3s' }} />
      </div>
    </div>
  );
}

// Level sets: { v=target value, n/d=fraction to display, w=whole part, neg=negative, range=[min,max], z=maxZoom }
const levelSets = [
  // רמה 1: חצאים וחמישיות — z=1 (דיוק 0.1)
  [
    { v: 0.5,  n: 1, d: 2, w: 0, range: [-0.5, 2.5], z: 1 },
    { v: 1.5,  n: 1, d: 2, w: 1, range: [0,   3],    z: 1 },
    { v: 0.2,  n: 1, d: 5, w: 0, range: [-0.5, 2],   z: 1 },
    { v: 0.6,  n: 3, d: 5, w: 0, range: [-0.5, 2],   z: 1 },
    { v: 1.2,  n: 1, d: 5, w: 1, range: [0,   2.5],  z: 1 },
  ],
  // רמה 2: רבעים + חמישיות + עשיריות נקיות (נדחס ממה שהיה L2+L3 קלים) — z=2
  [
    { v: 0.25, n: 1, d: 4, w: 0, range: [-0.5, 2.5], z: 2 },
    { v: 0.75, n: 3, d: 4, w: 0, range: [-0.5, 2.5], z: 2 },
    { v: 1.25, n: 1, d: 4, w: 1, range: [0,   3],    z: 2 },
    { v: 1.75, n: 3, d: 4, w: 1, range: [0,   3],    z: 2 },
    { v: 0.4,  n: 2, d: 5, w: 0, range: [-0.5, 2],   z: 1 },
    { v: 0.8,  n: 4, d: 5, w: 0, range: [-0.5, 2],   z: 1 },
    { v: 0.1,  n: 1, d: 10, w: 0, range: [-0.5, 2],  z: 1 },
    { v: 0.3,  n: 3, d: 10, w: 0, range: [-0.5, 2],  z: 1 },
    { v: 0.7,  n: 7, d: 10, w: 0, range: [-0.5, 2],  z: 1 },
  ],
  // רמה 3 — קשה יותר: שברים לא-unit + עשרוני לא מתחלק יפה + שליליים — z=2
  [
    { v: 0.6,   n: 3, d: 5, w: 0, range: [-0.5, 2], z: 2 },
    { v: 1.6,   n: 3, d: 5, w: 1, range: [0,   3], z: 2 },
    { v: 0.9,   n: 9, d: 10, w: 0, range: [-0.5, 2], z: 2 },
    { v: -0.5,  n: 1, d: 2,  w: 0, neg: true, range: [-2,   1.5], z: 2 },
    { v: -0.2,  n: 1, d: 5,  w: 0, neg: true, range: [-1.5, 1.5], z: 2 },
    { v: -0.7,  n: 7, d: 10, w: 0, neg: true, range: [-1.5, 1.5], z: 2 },
    { v: -1.25, n: 1, d: 4,  w: 1, neg: true, range: [-2,   1], z: 2 },
    { v: 2.3,   n: 3, d: 10, w: 2, range: [0,   3], z: 2 },
  ],
  // רמה 4: חמישיות/עשיריות שליליות + מאיות — z=2 (ללא שלישים)
  [
    { v: 0.05,  n: 1, d: 20, w: 0, range: [-0.5, 1.5], z: 2 },
    { v: 0.15,  n: 3, d: 20, w: 0, range: [-0.5, 1.5], z: 2 },
    { v: -0.8,  n: 4, d: 5,  w: 0, neg: true, range: [-2,   0.5], z: 2 },
    { v: -0.6,  n: 3, d: 5,  w: 0, neg: true, range: [-1.5, 1.5], z: 2 },
    { v: -0.15, n: 3, d: 20, w: 0, neg: true, range: [-1.5, 1.5], z: 2 },
    { v: -0.75, n: 3, d: 4,  w: 0, neg: true, range: [-1.5, 1.5], z: 2 },
  ],
  // רמה 5: שמיניות + מאיות + שליליים מורכבים — z=3 (דיוק 0.001)
  [
    { v: 0.125,  n: 1, d: 8, w: 0, range: [-0.5, 1.5], z: 3 },
    { v: 0.375,  n: 3, d: 8, w: 0, range: [-0.5, 1.5], z: 3 },
    { v: 0.625,  n: 5, d: 8, w: 0, range: [-0.5, 1.5], z: 3 },
    { v: 0.875,  n: 7, d: 8, w: 0, range: [-0.5, 1.5], z: 3 },
    { v: 1.875,  n: 7, d: 8, w: 1, range: [0,   3],    z: 3 },
    { v: -0.375, n: 3, d: 8, w: 0, neg: true, range: [-1.5, 1.5], z: 3 },
    { v: -0.625, n: 5, d: 8, w: 0, neg: true, range: [-1.5, 1.5], z: 3 },
    // גיוון — מאיות/עשיריות מורכבות
    { v: 0.025,  n: 1, d: 40, w: 0, range: [-0.5, 1.5], z: 3 },
    { v: 1.125,  n: 1, d: 8, w: 1, range: [0,   3],    z: 3 },
  ],
];

export default function Decimal() {
  const gameState = useGameStore((s) => s.decimal);
  const handleWinStore = useGameStore((s) => s.handleWin);
  const handleGameFail = useGameStore((s) => s.handleGameFail);
  const setScreen = useGameStore((s) => s.setScreen);

  const [lives, setLives] = useState(5);
  const [justLost, setJustLost] = useState(false);
  const [stepIndex, setStepIndex] = useState(0); // 0=×1 … 3=×1/1000
  const [maxZoom, setMaxZoom] = useState(1);
  const [position, setPosition] = useState(0);
  const [targetFrac, setTargetFrac] = useState(null);
  const [feedback, setFeedback] = useState({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
  const [errorFlash, setErrorFlash] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const targetRef = useRef(0);
  const rangeRef = useRef([-0.5, 2.5]);
  const recentRef = useRef([]);
  const timersRef = useRef([]);

  // ─── Hint (HintBubble) — level-specific fraction→decimal examples ───────
  const knobTip = 'החוגה: טבעת חיצונית = קפיצה ×1. הבא = ×0.1. הפנימי = ×0.01.';
  const DECIMAL_HINTS = [
    // L1 — halves, fifths, tenths
    '💡 1 שלם = 1.0 | חצי (1/2) = 5 עשיריות = 0.5 | חמישית (1/5) = 2 עשיריות = 0.2 | שתי חמישיות = 0.4. ' + knobTip,
    // L2 — quarters, mixed numbers
    '💡 רבע (1/4) = 0.25 | שלושה רבעים (3/4) = 0.75 | מספר מעורב: 1¼ = 1 + 0.25 = 1.25. ' + knobTip,
    // L3 — thirds, tenths, negatives
    '💡 שליש (1/3) ≈ 0.333 | עשירית (1/10) = 0.1 | שלוש עשיריות = 0.3. 🔴 מינוס? הסתובב *שמאלה* מ-0: −1/2 = −0.5. ' + knobTip,
    // L4 — twentieths, complex negatives
    '💡 1/20 = 0.05 | 3/20 = 0.15. שלילי מורכב? פרק אותו: −3/4 = −0.5 − 0.25 = −0.75. ' + knobTip,
    // L5 — eighths (hardest)
    '💡 שמיניות: 1/8 = 0.125 | 3/8 = 0.375 | 5/8 = 0.625 | 7/8 = 0.875. טיפ: 1/8 = 1/4 ÷ 2 = 0.25 ÷ 2 = 0.125. ' + knobTip,
  ];
  const getDecimalHint = useCallback((_, level) => ({
    kind: 'text',
    text: DECIMAL_HINTS[Math.min((level ?? gameState.lvl) - 1, DECIMAL_HINTS.length - 1)],
  }), [gameState.lvl]);

  const { cooldown: hintCooldown, bubble: hintBubble, requestHint, resetRound: resetHintRound } = useHint({
    level: gameState.lvl,
    getHint: getDecimalHint,
    puzzle: true,
    cooldownSec: 8,
    bubbleMs: 6000,
  });

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const zoom = Math.min(maxZoom, stepIndex);
  const step = stepOptions[stepIndex];
  const lvl = gameState.lvl;

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
    setLives(3);
    setJustLost(false);
    setStepIndex(0);
    const [rMin, rMax] = f.range;
    // startPos ≠ answer: מונעים תרחיש שבו המחוג כבר על התשובה בפתיחה.
    const midPos = Math.round(((rMin + rMax) / 2) * 10) / 10;
    const startPos = Math.abs(midPos - f.v) < 0.05
      ? Math.round((midPos + (rMax - midPos) * 0.5) * 10) / 10
      : midPos;
    setPosition(startPos);
    setConsecutiveErrors(0);
  }, [gameState.lvl]);

  useEffect(() => { initGame(); }, [initGame]);


  const handlePositionChange = useCallback((newPos) => {
    const [min, max] = rangeRef.current;
    const clamped = Math.max(min - 0.5, Math.min(max + 0.5, newPos));
    if (Math.floor(newPos) !== Math.floor(clamped)) vibe([20, 10, 20]);
    setPosition(clamped);
  }, []);


  const checkAnswer = () => {
    const snappedPos = parseFloat((Math.round(position / step) * step).toFixed(4));
    const target     = targetRef.current;

    if (Math.abs(snappedPos - target) < step * 0.6) {
      vibe([30, 50, 30]);
      const result = handleWinStore('decimal');
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, unlocked: result.unlocked, pts: result.pts });
    } else {
      vibe([50, 50, 50]);
      setErrorFlash(true);
      timersRef.current.push(setTimeout(() => setErrorFlash(false), 400));
      const newLives = Math.max(0, lives - 1);
      const newErrors = consecutiveErrors + 1;
      setLives(newLives);
      setJustLost(true);
      setConsecutiveErrors(newErrors);
      timersRef.current.push(setTimeout(() => setJustLost(false), 600));
      if (newLives <= 0) {
        handleGameFail('decimal');
        Swal.fire({
          title: 'הרמה ננעלה 🔒',
          text: 'השג 5 ניצחונות ברצף כדי להתקדם לרמה הבאה!',
          icon: 'warning',
          confirmButtonText: 'הבנתי',
          confirmButtonColor: '#eab308',
          customClass: { popup: 'rounded-3xl' },
        }).then(() => setScreen('menu'));
      }
    }
  };

  // Hot/cold cursor color — רק ברמות 1–2. קוראים מה-state (targetFrac)
  // ולא מ-ref, כדי ש-react יריץ render מחדש כשהמטרה משתנה.
  const proximity = Math.abs(position - (targetFrac?.v ?? 0));
  const cursorColor = lvl > 2
    ? '#eab308'
    : proximity < step * 3
      ? '#22c55e'
      : proximity < step * 10
        ? '#f97316'
        : '#ef4444';

  return (
    <div className={`screen-enter flex flex-col items-center p-3 md:p-4 flex-1 overflow-x-hidden w-full ${errorFlash ? 'error-flash' : ''}`}>
      <GameTutorial gameName="decimal" />
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-4 md:p-5 w-full max-w-md shadow-xl flex flex-col items-center gap-4 border border-yellow-200 dark:border-yellow-800/40 border-b-4 border-b-yellow-400 dark:border-b-yellow-700 transition-colors">

        {/* Top bar */}
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-yellow-600 dark:text-yellow-400">תפוס את הנקודה 🎯</span>
          </div>
          <Hearts lives={lives} maxLives={3} justLost={justLost} />
        </div>

        {/* Target fraction */}
        <div className="w-full bg-slate-50 dark:bg-slate-900 rounded-2xl py-2 px-4 flex flex-col items-center gap-0.5 border border-slate-200 dark:border-slate-700">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">לפניך שבר במבנה מונה/מכנה. מצא את ערכו העשרוני על ציר המספרים</span>
          <div className="mt-1 flex items-center gap-3" dir="ltr">
            {targetFrac?.neg && (
              <span className="font-black text-rose-500" style={{ fontSize: '2.8rem', lineHeight: 1 }}>−</span>
            )}
            {targetFrac && (
              <div className="flex items-center gap-2">
                {targetFrac.w > 0 && (
                  <span className="font-black text-slate-900 dark:text-white" style={{ fontSize: '2.8rem', lineHeight: 1 }}>
                    {targetFrac.w}
                  </span>
                )}
                <div
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontWeight: 900, lineHeight: 1.1 }}
                  className="text-slate-900 dark:text-white"
                  dir="ltr"
                >
                  <span style={{ fontSize: '2rem', borderBottom: '3px solid currentColor', padding: '0 0.4rem', display: 'block' }}>
                    {targetFrac.n}
                  </span>
                  <span style={{ fontSize: '2rem', padding: '0 0.4rem', display: 'block' }}>
                    {targetFrac.d}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* מסגרת הכיוון הסטטית — overflow:visible מאפשר לציר לפרוץ */}
        <div className="w-full bg-slate-50 dark:bg-slate-900 rounded-3xl p-3 flex flex-col items-center gap-3 shadow-inner my-1 relative z-10" style={{ overflow: 'visible' }}>

          {/* גבול יחיד — מעל הציר */}
          <div className="absolute inset-0 rounded-3xl border-2 border-slate-200 dark:border-slate-700 pointer-events-none z-20" />

          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-full">אזור הכיוון</div>

          {/* משיכת הציר החוצה לפריצת הפדינג */}
          <div className="relative h-[110px] w-[120vw] -mx-[10vw] select-none z-0" style={{ overflow: 'visible' }}>
            <NumberLine position={position} fullRange={targetFrac?.range ?? [-0.5, 2.5]} zoomLevel={zoom} cursorColor={cursorColor} stepIndex={stepIndex} />
          </div>

          <div className="w-full px-2">
            <PositionSlider value={position} onChange={handlePositionChange} step={step} range={targetFrac?.range ?? [-0.5, 2.5]} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onPointerDown={(e) => {
                const move = (dir) => setPosition((prev) => {
                  const [min, max] = rangeRef.current;
                  const next = parseFloat((Math.round(prev / step) * step + dir * step).toFixed(4));
                  return Math.max(min - 0.5, Math.min(max + 0.5, next));
                });
                move(+1); vibe(8);
                e.currentTarget._iv = setInterval(() => move(+1), 120);
              }}
              onPointerUp={(e) => clearInterval(e.currentTarget._iv)}
              onPointerLeave={(e) => clearInterval(e.currentTarget._iv)}
              className="w-11 h-11 rounded-xl text-2xl font-black flex items-center justify-center active:scale-90 transition-transform select-none touch-none"
              style={{ color: cursorColor, background: cursorColor + '22', border: `1.5px solid ${cursorColor}66` }}
            >+</button>
            <div
              className="font-black text-4xl px-6 py-2 rounded-xl border-[1.5px] transition-colors duration-300 bg-white dark:bg-slate-800 min-w-[7rem] text-center"
              style={{ color: cursorColor, borderColor: cursorColor + '66' }}
              dir="ltr"
            >
              {(Math.round(position / step) * step).toFixed(stepIndex)}
            </div>
            <button
              onPointerDown={(e) => {
                const move = (dir) => setPosition((prev) => {
                  const [min, max] = rangeRef.current;
                  const next = parseFloat((Math.round(prev / step) * step + dir * step).toFixed(4));
                  return Math.max(min - 0.5, Math.min(max + 0.5, next));
                });
                move(-1); vibe(8);
                e.currentTarget._iv = setInterval(() => move(-1), 120);
              }}
              onPointerUp={(e) => clearInterval(e.currentTarget._iv)}
              onPointerLeave={(e) => clearInterval(e.currentTarget._iv)}
              className="w-11 h-11 rounded-xl text-2xl font-black flex items-center justify-center active:scale-90 transition-transform select-none touch-none"
              style={{ color: cursorColor, background: cursorColor + '22', border: `1.5px solid ${cursorColor}66` }}
            >−</button>
          </div>
        </div>

        {/* RotaryKnob — בוחר גודל צעד */}
        <div className="w-full flex flex-col items-center gap-2 pb-2 mt-0">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">🔍 דיוק הצעד</div>
          <RotaryKnob stepIndex={stepIndex} onChange={(idx) => setStepIndex(Math.min(idx, maxZoom))} maxZoom={maxZoom} />
        </div>

        {/* HintBubble + Action buttons */}
        <HintBubble text={hintBubble} className="mb-1" />
        <div className="w-full flex gap-2 pb-1">
          <HintButton
            cooldown={hintCooldown}
            onClick={requestHint}
            colorToken="amber"
            title="רמז"
          />
          <button
            onClick={checkAnswer}
            className="flex-1 py-4 bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white rounded-3xl font-black text-xl shadow-xl transition-all active:scale-95"
          >תפוס! 🎯</button>
        </div>
      </div>

      <FeedbackOverlay
        visible={feedback.visible}
        isLevelUp={feedback.isLevelUp}
        unlocked={feedback.unlocked}
        pts={feedback.pts}
        onDone={() => { setFeedback({ visible: false, isLevelUp: false, unlocked: false, pts: 0 }); initGame(); }}
      />
    </div>
  );
}
