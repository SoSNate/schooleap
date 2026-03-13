import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import Hearts from '../shared/Hearts';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import Fraction from '../shared/Fraction';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';

const levelSets = [
  [{ n: 1, d: 2, v: 0.5, z: 1 }, { n: 1, d: 4, v: 0.25, z: 2 }, { n: 1, d: 5, v: 0.2, z: 1 }],
  [{ n: 3, d: 4, v: 0.75, z: 2 }, { n: 2, d: 5, v: 0.4, z: 1 }, { n: 4, d: 5, v: 0.8, z: 1 }, { w: 1, n: 1, d: 2, v: 1.5, z: 1 }],
  [{ w: 1, n: 1, d: 3, v: 1.333, z: 3 }, { n: 2, d: 3, v: 0.667, z: 3 }, { w: 2, n: 1, d: 4, v: 2.25, z: 2 }],
  [{ n: 1, d: 6, v: 0.167, z: 3 }, { n: 5, d: 6, v: 0.833, z: 3 }, { n: 1, d: 8, v: 0.125, z: 3 }, { n: 3, d: 8, v: 0.375, z: 3 }],
  [{ w: 2, n: 1, d: 6, v: 2.167, z: 3 }, { w: 1, n: 7, d: 8, v: 1.875, z: 3 }, { w: 3, n: 3, d: 8, v: 3.375, z: 3 }, { n: 1, d: 20, v: 0.05, z: 2 }],
];

function computeRange(base, zoom) {
  let min = 0, max = 10, step = 1;
  if (zoom === 1) { min = Math.floor(base); if (min >= 10) min = 9; max = min + 1; step = 0.1; }
  else if (zoom === 2) { min = Math.floor(base * 10) / 10; if (min >= 10) min = 9.9; max = min + 0.1; step = 0.01; }
  else if (zoom === 3) { min = Math.floor(base * 100) / 100; if (min >= 10) min = 9.99; max = min + 0.01; step = 0.001; }
  return { min, max, step };
}

export default function Decimal() {
  const gameState = useGameStore((s) => s.decimal);
  const handleWinStore = useGameStore((s) => s.handleWin);
  const handleGameFail = useGameStore((s) => s.handleGameFail);
  const setScreen = useGameStore((s) => s.setScreen);

  const [lives, setLives] = useState(5);
  const [justLost, setJustLost] = useState(false);
  const [target, setTarget] = useState(0);
  const [maxZoom, setMaxZoom] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [valSliderValue, setValSliderValue] = useState(0);
  const [range, setRange] = useState({ min: 0, max: 10, step: 1 });
  const [targetDisplay, setTargetDisplay] = useState(null);
  const [beamAngle, setBeamAngle] = useState(0);
  const [feedback, setFeedback] = useState({ visible: false, isLevelUp: false, pts: 0 });
  const [errorFlash, setErrorFlash] = useState(false);

  const targetRef = useRef(0);

  const initGame = useCallback(() => {
    const lvl = gameState.lvl;
    setLives(5);
    setJustLost(false);

    const pool = levelSets[lvl - 1] || levelSets[0];
    const f = pool[Math.floor(Math.random() * pool.length)];

    targetRef.current = f.v;
    setTarget(f.v);
    setMaxZoom(f.z);

    // Target display
    if ((f.w || 0) > 0) {
      setTargetDisplay(
        <div className="flex items-center gap-1.5">
          <span className="text-2xl">{f.w}</span>
          <Fraction numerator={f.n} denominator={f.d} className="text-sm" />
        </div>
      );
    } else {
      setTargetDisplay(<Fraction numerator={f.n} denominator={f.d} />);
    }

    // Reset sliders
    setZoomLevel(0);
    setValSliderValue(0);
    setRange({ min: 0, max: 10, step: 1 });
    setBeamAngle(0);
  }, [gameState.lvl]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleZoomChange = (newZoomSliderValue) => {
    const z = 3 - parseInt(newZoomSliderValue);
    if (z > maxZoom) {
      const corrected = 3 - maxZoom;
      setZoomLevel(maxZoom);
      const newRange = computeRange(valSliderValue || 0, maxZoom);
      setRange(newRange);
      return;
    }
    setZoomLevel(z);
    const newRange = computeRange(valSliderValue || 0, z);
    setRange(newRange);
  };

  const handleValChange = (rawVal) => {
    const v = parseFloat(rawVal) || 0;
    setValSliderValue(v);
    const diff = targetRef.current - v;
    const angle = Math.max(-22, Math.min(22, diff * 35));
    setBeamAngle(angle);
  };

  const formatted = valSliderValue.toFixed(zoomLevel === 0 ? 1 : zoomLevel);

  const showHint = () => {
    vibe(20);
    Swal.fire({
      title: '💡 רמז',
      text: 'שים לב באיזה זום אתה נמצא (עשיריות, מאיות או אלפיות) כדי לדייק בחוגה.',
      icon: 'info',
      confirmButtonText: 'הבנתי, תודה!',
      confirmButtonColor: '#f59e0b',
      customClass: { popup: 'rounded-3xl' },
    });
  };

  const showFractionDict = () => {
    Swal.fire({
      title: '📖 מילון שברים',
      html: '<div dir="ltr" class="math-font text-lg leading-loose mx-auto w-fit text-left">1/2 = 0.500<br>1/4 = 0.250<br>3/4 = 0.750<br>1/5 = 0.200<br>1/8 = 0.125<br>1/10 = 0.100</div>',
      confirmButtonColor: '#06b6d4',
      customClass: { popup: 'rounded-3xl' },
    });
  };

  const checkAnswer = () => {
    if (Math.abs(valSliderValue - targetRef.current) < 0.002) {
      vibe([30, 50, 30]);
      const result = handleWinStore('decimal');
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, pts: result.pts });
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      setJustLost(true);
      setErrorFlash(true);
      setTimeout(() => setErrorFlash(false), 400);

      if (newLives <= 0) {
        vibe([50, 50, 50]);
        const result = handleGameFail('decimal');
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

  const zoomLabels = [
    { idx: 3, n: 1, d: 1000, size: 'text-[10px]' },
    { idx: 2, n: 1, d: 100, size: 'text-[11px]' },
    { idx: 1, n: 1, d: 10, size: 'text-[13px]' },
  ];

  const prec = zoomLevel > 0 ? zoomLevel : 0;

  return (
    <div className={`screen-enter flex flex-col items-center p-4 flex-1 min-h-[calc(100dvh-80px)] ${errorFlash ? 'error-flash' : ''}`}>
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-5 md:p-6 w-full max-w-md shadow-xl flex flex-col items-center gap-4 border-b-4 border-slate-200 dark:border-slate-700 transition-colors relative overflow-hidden">

        {/* Top bar */}
        <div className="w-full flex justify-between items-center mb-1">
          <button
            onClick={showFractionDict}
            className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-1 shadow-sm"
          >
            <span>📖</span> מילון שברים
          </button>
          <div className="flex gap-1.5 justify-end h-6">
            <Hearts lives={lives} maxLives={5} justLost={justLost} />
          </div>
        </div>

        {/* Scale */}
        <div className="scale-container w-full mb-4">
          <div
            className="scale-beam bg-cyan-600 dark:bg-cyan-700 transition-transform duration-300"
            style={{ transform: `rotate(${beamAngle}deg)` }}
          >
            <div className="pan-wrap transition-transform duration-300" style={{ transform: `rotate(${-beamAngle}deg)` }}>
              <div className="pan bg-slate-800 dark:bg-slate-900 border-cyan-500 text-cyan-400 math-font font-black min-w-[70px] shadow-[0_-4px_10px_rgba(6,182,212,0.3)]" dir="ltr">
                {formatted}
              </div>
            </div>
            <div className="pan-wrap transition-transform duration-300" style={{ transform: `rotate(${-beamAngle}deg)` }}>
              <div className="pan bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 math-font font-black min-w-[70px]" dir="ltr">
                {targetDisplay}
              </div>
            </div>
          </div>
          <div className="scale-base bg-slate-800 dark:bg-slate-600" />
        </div>

        {/* Zoom + Value sliders */}
        <div className="w-full flex gap-3 md:gap-4 mt-2">
          {/* Zoom Slider */}
          <div className="flex flex-col items-center justify-center w-16 md:w-20 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 py-6">
            <span className="text-[10px] font-bold text-slate-400 mb-3">זום</span>
            <div className="h-[clamp(200px,50vh,280px)] w-full relative flex justify-center items-center">
              <div className="absolute right-full h-full flex flex-col justify-between items-end py-4 pr-1 pointer-events-none z-10 w-12" dir="ltr">
                {zoomLabels.map((lbl) => (
                  <div
                    key={lbl.idx}
                    className={`dec-zoom-lbl flex items-center justify-end h-6 ${zoomLevel === lbl.idx ? 'active' : ''}`}
                    style={{ opacity: lbl.idx > maxZoom ? 0.2 : 1 }}
                  >
                    <div className={`fraction ${lbl.size} font-bold text-slate-400`}>
                      <span className="numerator border-slate-300">{lbl.n}</span>
                      <span className="denominator">{lbl.d}</span>
                    </div>
                  </div>
                ))}
                <div
                  className={`dec-zoom-lbl text-[15px] font-black text-slate-400 flex items-center justify-end h-6 ${zoomLevel === 0 ? 'active' : ''}`}
                >
                  x1
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="1"
                value={3 - zoomLevel}
                onChange={(e) => handleZoomChange(e.target.value)}
                className="zoom-track absolute"
              />
            </div>
          </div>

          {/* Value Slider */}
          <div className="flex-1 flex flex-col justify-center bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 p-4 relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none opacity-10"
              style={{
                backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            <div className="text-center mb-12 relative z-10">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">המיקום שלך</div>
              <div className="text-5xl md:text-6xl font-black text-cyan-600 dark:text-cyan-400 math tracking-tighter drop-shadow-sm" dir="ltr">
                {formatted}
              </div>
            </div>
            <div className="relative w-full mt-auto z-10">
              <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-4 math select-none px-1" dir="ltr">
                <span>{range.min.toFixed(prec)}</span>
                <span>{range.max.toFixed(prec)}</span>
              </div>
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={valSliderValue}
                onChange={(e) => handleValChange(e.target.value)}
                className="val-track w-full block"
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="w-full pb-4">
          <div className="flex gap-2 mt-4">
            <button
              onClick={showHint}
              className="w-16 py-4 md:py-5 bg-cyan-200 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 rounded-3xl font-black text-xl shadow-sm hover:bg-cyan-300 transition-all active:scale-95"
            >
              💡
            </button>
            <button
              onClick={checkAnswer}
              className="flex-1 py-5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-3xl font-black text-xl shadow-xl transition-all active:scale-95"
            >
              בדיקת שקילה ⚖️
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
