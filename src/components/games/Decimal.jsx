import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import Hearts from '../shared/Hearts';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import Fraction from '../shared/Fraction';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';

// RotaryKnob — drag or +/- to set numerator
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
      <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center shrink-0">
        {Array.from({ length: 36 }).map((_, i) => (
          <div key={i} className="absolute w-full h-full pointer-events-none" style={{ transform: `rotate(${i * 10}deg)` }}>
            <div className={`mx-auto w-0.5 rounded-full ${i % 9 === 0 ? 'h-3 bg-slate-400 dark:bg-slate-400' : 'h-1.5 bg-slate-300 dark:bg-slate-600'}`} />
          </div>
        ))}
        <div
          ref={knobRef}
          className="w-[4.5rem] h-[4.5rem] md:w-20 md:h-20 rounded-full bg-slate-100 dark:bg-slate-700 shadow-[inset_0_4px_8px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.2)] border-4 border-slate-200 dark:border-slate-600 flex items-center justify-center cursor-pointer relative touch-none z-10"
          onMouseDown={handleStart}
          onTouchStart={handleStart}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="absolute top-2 w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-slate-200 dark:border-slate-500 opacity-50" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => onChange(Math.min(9999, value + 1))}
          className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-xl font-black text-slate-600 dark:text-slate-300 shadow-sm active:scale-90 transition-transform"
        >+</button>
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-xl font-black text-slate-600 dark:text-slate-300 shadow-sm active:scale-90 transition-transform"
        >-</button>
      </div>
    </div>
  );
};

const levelSets = [
  [{ n: 1, d: 2, v: 0.5, z: 1 }, { n: 1, d: 5, v: 0.2, z: 1 }, { n: 2, d: 5, v: 0.4, z: 1 }, { n: 1, d: 10, v: 0.1, z: 1 }],
  [{ n: 1, d: 4, v: 0.25, z: 2 }, { n: 3, d: 4, v: 0.75, z: 2 }, { n: 1, d: 20, v: 0.05, z: 2 }, { n: 3, d: 20, v: 0.15, z: 2 }, { n: 4, d: 5, v: 0.8, z: 1 }],
  [{ w: 1, n: 1, d: 2, v: 1.5, z: 1 }, { w: 2, n: 1, d: 4, v: 2.25, z: 2 }, { w: 1, n: 3, d: 4, v: 1.75, z: 2 }, { w: 3, n: 1, d: 5, v: 3.2, z: 1 }],
  [{ n: 1, d: 8, v: 0.125, z: 3 }, { n: 3, d: 8, v: 0.375, z: 3 }, { n: 5, d: 8, v: 0.625, z: 3 }, { n: 7, d: 8, v: 0.875, z: 3 }],
  [{ w: 1, n: 7, d: 8, v: 1.875, z: 3 }, { w: 2, n: 3, d: 8, v: 2.375, z: 3 }, { w: 1, n: 5, d: 8, v: 1.625, z: 3 }, { w: 3, n: 1, d: 8, v: 3.125, z: 3 }],
];

const zoomLabels = ['x1', '1/10', '1/100', '1/1000'];

export default function Decimal() {
  const gameState = useGameStore((s) => s.decimal);
  const handleWinStore = useGameStore((s) => s.handleWin);
  const handleGameFail = useGameStore((s) => s.handleGameFail);
  const setScreen = useGameStore((s) => s.setScreen);

  const [lives, setLives] = useState(5);
  const [justLost, setJustLost] = useState(false);
  const [maxZoom, setMaxZoom] = useState(1);
  const [zoom, setZoom] = useState(0);
  const [numerator, setNumerator] = useState(0);
  const [targetFrac, setTargetFrac] = useState(null);
  const [beamAngle, setBeamAngle] = useState(0);
  const [feedback, setFeedback] = useState({ visible: false, isLevelUp: false, pts: 0 });
  const [errorFlash, setErrorFlash] = useState(false);

  const targetRef = useRef(0);

  const initGame = useCallback(() => {
    const pool = levelSets[(gameState.lvl - 1)] || levelSets[0];
    const f = pool[Math.floor(Math.random() * pool.length)];
    targetRef.current = f.v;
    setTargetFrac(f);
    setMaxZoom(f.z);
    setLives(5);
    setJustLost(false);
    setZoom(0);
    setNumerator(0);
    setBeamAngle(0);
  }, [gameState.lvl]);

  useEffect(() => { initGame(); }, [initGame]);

  const denominator = Math.pow(10, zoom);
  const currentValue = numerator / denominator;
  const formatted = currentValue.toFixed(zoom === 0 ? 1 : zoom);

  useEffect(() => {
    const diff = targetRef.current - currentValue;
    setBeamAngle(Math.max(-22, Math.min(22, diff * 35)));
  }, [numerator, zoom]);

  const handleZoomChange = (val) => {
    const v = parseInt(val);
    if (v > maxZoom) return;
    setZoom(v);
    setNumerator(0);
  };

  const showHint = () => {
    vibe(20);
    Swal.fire({
      title: '💡 רמז',
      text: 'שים לב לאיזה מכנה תצטרך. לדוגמה: עבור 0.125 המכנה הוא 1000 ואז המונה הוא 125.',
      icon: 'info',
      confirmButtonText: 'הבנתי, תודה!',
      confirmButtonColor: '#f59e0b',
      customClass: { popup: 'rounded-3xl' },
    });
  };

  const showFractionDict = () => {
    const lvl = gameState.lvl;
    const allItems = [
      { l: 1, w: 0, n: 1, d: 2, v: 0.5 }, { l: 1, w: 0, n: 1, d: 5, v: 0.2 },
      { l: 1, w: 0, n: 2, d: 5, v: 0.4 }, { l: 1, w: 0, n: 1, d: 10, v: 0.1 },
      { l: 2, w: 0, n: 1, d: 4, v: 0.25 }, { l: 2, w: 0, n: 3, d: 4, v: 0.75 },
      { l: 3, w: 1, n: 1, d: 2, v: 1.5 }, { l: 3, w: 2, n: 1, d: 4, v: 2.25 },
      { l: 4, w: 0, n: 1, d: 8, v: 0.125 }, { l: 4, w: 0, n: 3, d: 8, v: 0.375 },
      { l: 5, w: 0, n: 5, d: 8, v: 0.625 }, { l: 5, w: 0, n: 7, d: 8, v: 0.875 },
    ].filter((i) => i.l <= lvl);

    const rows = allItems.map((i) => {
      const fracInner = i.w > 0
        ? `<span style="display:flex;align-items:center;gap:4px"><span>${i.w}</span><span style="display:inline-flex;flex-direction:column;align-items:center;line-height:1.1"><span style="border-bottom:2px solid currentColor;padding:0 3px">${i.n}</span><span style="padding:0 3px">${i.d}</span></span></span>`
        : `<span style="display:inline-flex;flex-direction:column;align-items:center;line-height:1.1"><span style="border-bottom:2px solid currentColor;padding:0 3px">${i.n}</span><span style="padding:0 3px">${i.d}</span></span>`;
      return `<div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:8px 12px;border-radius:12px;border:1px solid #e2e8f0;font-weight:900" dir="ltr"><div style="font-size:1.1rem">${fracInner}</div><span style="color:#06b6d4;font-size:1rem">${i.v}</span></div>`;
    }).join('');

    Swal.fire({
      title: '📖 מילון שברים',
      html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">${rows}</div>`,
      confirmButtonText: 'הבנתי',
      confirmButtonColor: '#06b6d4',
      customClass: { popup: 'rounded-[2rem]' },
    });
  };

  const checkAnswer = () => {
    if (Math.abs(currentValue - targetRef.current) < 0.002) {
      vibe([30, 50, 30]);
      const result = handleWinStore('decimal');
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, pts: result.pts });
    } else {
      vibe([50, 50, 50]);
      setErrorFlash(true);
      setTimeout(() => setErrorFlash(false), 400);
      const newLives = lives - 1;
      setLives(newLives);
      setJustLost(true);
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
          <button
            onClick={showFractionDict}
            className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-1 shadow-sm"
          >
            <span>📖</span> מילון שברים
          </button>
          <Hearts lives={lives} maxLives={5} justLost={justLost} />
        </div>

        {/* Scale */}
        <div className="scale-container w-full">
          <div className="scale-beam bg-cyan-600 dark:bg-cyan-700" style={{ transform: `rotate(${beamAngle}deg)` }}>
            <div className="pan-wrap" style={{ transform: `rotate(${-beamAngle}deg)` }}>
              <div className="pan bg-slate-800 dark:bg-slate-900 border-cyan-500 text-cyan-400 math-font font-black min-w-[70px]" dir="ltr">
                {formatted}
              </div>
            </div>
            <div className="pan-wrap" style={{ transform: `rotate(${-beamAngle}deg)` }}>
              <div className="pan bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 font-black min-w-[70px]" dir="ltr">
                {targetFrac && <Fraction numerator={targetFrac.n} denominator={targetFrac.d} whole={targetFrac.w || 0} />}
              </div>
            </div>
          </div>
          <div className="scale-base bg-slate-800 dark:bg-slate-600" />
        </div>

        {/* Current value display */}
        <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-2xl py-3 flex justify-center items-center shadow-inner border border-slate-200 dark:border-slate-700">
          <span className="text-4xl md:text-5xl font-black text-cyan-500 tracking-widest" dir="ltr">{formatted}</span>
        </div>

        {/* Controls */}
        <div className="w-full flex flex-col gap-5">

          {/* Throttle — zoom / denominator */}
          <div className="flex flex-col gap-2">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">מכנה (רזולוציה)</div>
            <div className="flex justify-between px-5 text-xs font-black text-slate-400" dir="ltr">
              {zoomLabels.map((lbl, i) => (
                <span
                  key={i}
                  className={`transition-all ${zoom === i ? 'text-cyan-500 scale-110' : ''} ${i > maxZoom ? 'opacity-20 pointer-events-none' : ''}`}
                >
                  {lbl}
                </span>
              ))}
            </div>
            <div className="relative w-full h-12 flex items-center bg-slate-100 dark:bg-slate-800 rounded-full shadow-inner border-2 border-slate-200 dark:border-slate-700 px-4 mx-auto">
              <div className="absolute inset-0 flex justify-between items-center px-4 pointer-events-none">
                {[0, 1, 2, 3].map((i) => <div key={i} className="w-1 h-4 bg-slate-300 dark:bg-slate-600 rounded-full" />)}
              </div>
              <input
                type="range" min="0" max="3" step="1" value={zoom}
                onChange={(e) => handleZoomChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 touch-none"
              />
              {/* Throttle handle */}
              <div
                className="absolute h-16 w-7 bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 rounded-t-xl rounded-b-md shadow-md border border-slate-400 dark:border-slate-500 pointer-events-none z-10 flex flex-col items-center justify-start pt-1 gap-0.5"
                style={{ left: `calc(${zoom / 3} * (100% - 2.5rem) + 0.75rem)`, top: '-10px', transition: 'left 0.15s ease-out' }}
              >
                <div className="w-4 h-0.5 bg-slate-500/60 rounded-full" />
                <div className="w-4 h-0.5 bg-slate-500/60 rounded-full" />
                <div className="w-4 h-0.5 bg-slate-500/60 rounded-full" />
                <div className="mt-auto mb-1.5 w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_5px_#06b6d4]" />
              </div>
            </div>
          </div>

          {/* RotaryKnob — numerator */}
          <div className="flex flex-col items-center gap-3">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">מונה (מספר)</div>
            <RotaryKnob value={numerator} onChange={setNumerator} />
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-black" dir="ltr">
              <span className="text-2xl text-slate-700 dark:text-slate-200">{numerator}</span>
              <span className="text-lg">/</span>
              <span className="text-2xl text-slate-700 dark:text-slate-200">{denominator}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="w-full flex gap-2 pb-1">
          <button
            onClick={showHint}
            className="w-16 py-4 bg-cyan-200 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 rounded-3xl font-black text-xl shadow-sm hover:bg-cyan-300 transition-all active:scale-95"
          >💡</button>
          <button
            onClick={checkAnswer}
            className="flex-1 py-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-3xl font-black text-xl shadow-xl transition-all active:scale-95"
          >בדיקת שקילה ⚖️</button>
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
