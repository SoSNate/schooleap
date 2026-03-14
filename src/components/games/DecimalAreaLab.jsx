import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import Hearts from '../shared/Hearts';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';

const ONBOARD_KEY = 'onboard_grid';

// Grid constants
const UNITS       = 2;   // 2×2 unit space
const SUBDIVS     = 10;  // 10 cells per unit
const TOTAL_CELLS = UNITS * SUBDIVS; // 20×20
const CELL        = 16;  // px per cell
const GPIX        = TOTAL_CELLS * CELL; // 320px
const AXIS_MARKS  = [0, 0.5, 1.0, 1.5, 2.0];

const RECT_STYLES = [
  { border: 'border-blue-500',    bg: 'bg-blue-400/40',    text: 'text-blue-700 dark:text-blue-300' },
  { border: 'border-emerald-500', bg: 'bg-emerald-400/40', text: 'text-emerald-700 dark:text-emerald-300' },
  { border: 'border-amber-500',   bg: 'bg-amber-400/40',   text: 'text-amber-700 dark:text-amber-300' },
  { border: 'border-purple-500',  bg: 'bg-purple-400/40',  text: 'text-purple-700 dark:text-purple-300' },
];

// ── Level generator ────────────────────────────────────────────────────────────
function generateLevel(lvl) {
  const cfgs = {
    1: { pieces: 2, unique: false, showAxis: true,
         targets: [1.0, 1.5, 2.0] },
    2: { pieces: 3, unique: false, showAxis: true,
         targets: [2.0, 2.5, 3.0] },
    3: { pieces: 3, unique: true,  showAxis: true,
         targets: [1.5, 2.25, 3.0] },
    4: { pieces: 3, unique: true,  showAxis: false,
         targets: [1.5, 2.25, 3.0] },
    5: { pieces: 4, unique: true,  showAxis: false,
         targets: [2.5, 3.0, 3.5] },
  };
  const cfg = cfgs[Math.min(5, Math.max(1, lvl))] || cfgs[1];
  const target = cfg.targets[Math.floor(Math.random() * cfg.targets.length)];
  return { target, pieces: cfg.pieces, unique: cfg.unique, showAxis: cfg.showAxis };
}

// ── Rect utils ─────────────────────────────────────────────────────────────────
function normalizeRect(r) {
  const minX = Math.min(r.x1, r.x2), maxX = Math.max(r.x1, r.x2);
  const minY = Math.min(r.y1, r.y2), maxY = Math.max(r.y1, r.y2);
  const w = maxX - minX, h = maxY - minY;
  const area = Math.round((w / SUBDIVS) * (h / SUBDIVS) * 100) / 100;
  return { minX, maxX, minY, maxY, w, h, area };
}

function hasCollision(r1, r2) {
  return r1.minX < r2.maxX && r1.maxX > r2.minX &&
         r1.minY < r2.maxY && r1.maxY > r2.minY;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function DecimalAreaLab() {
  const gameState      = useGameStore((s) => s.grid);
  const handleWin      = useGameStore((s) => s.handleWin);
  const handleGameFail = useGameStore((s) => s.handleGameFail);
  const setScreen      = useGameStore((s) => s.setScreen);

  const [levelData,    setLevelData]    = useState(null);
  const [placed,       setPlaced]       = useState([]);   // array of {x1,y1,x2,y2}
  const [drawing,      setDrawing]      = useState(null); // rect being drawn
  const [isDrawing,    setIsDrawing]    = useState(false);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [lives,        setLives]        = useState(3);
  const [justLost,     setJustLost]     = useState(false);
  const [disabled,     setDisabled]     = useState(false);
  const [feedback,     setFeedback]     = useState({ visible: false, isLevelUp: false, pts: 0 });

  const gridRef = useRef(null);

  // ── Init level ──────────────────────────────────────────────────────────────
  const newLevel = useCallback(() => {
    setLevelData(generateLevel(gameState.lvl));
    setPlaced([]);
    setDrawing(null);
    setIsDrawing(false);
    setErrorMsg('');
    setLives(3);
    setJustLost(false);
    setDisabled(false);
  }, [gameState.lvl]);

  useEffect(() => { newLevel(); }, [newLevel]);

  // ── Onboarding ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARD_KEY)) {
        Swal.fire({
          title: 'מעבדת השטחים 📐',
          html: `<div class="text-right text-sm leading-relaxed">
            <b>גרור</b> על הרשת כדי לצייר מלבנים צבעוניים.<br><br>
            כל מלבן מציג את שטחו (בעשרוניים). הצטרף לשטח היעד!<br><br>
            📏 לחץ <b>בדוק תוצאה</b> כשסיימת.
          </div>`,
          confirmButtonText: 'יאללה!',
          confirmButtonColor: '#0d9488',
          customClass: { popup: 'rounded-3xl' },
        });
        localStorage.setItem(ONBOARD_KEY, '1');
      }
    } catch {}
  }, []);

  // ── Coordinate helper ────────────────────────────────────────────────────────
  const getCoords = useCallback((e) => {
    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, GPIX));
    const y = Math.max(0, Math.min(e.clientY - rect.top,  GPIX));
    return { cx: Math.round(x / CELL), cy: Math.round(y / CELL) };
  }, []);

  // ── Pointer handlers ─────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    if (disabled || !levelData) return;
    if (placed.length >= levelData.pieces) return;
    e.preventDefault();
    const { cx, cy } = getCoords(e);
    setIsDrawing(true);
    setErrorMsg('');
    setDrawing({ x1: cx, y1: cy, x2: cx, y2: cy });
    vibe(10);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [disabled, levelData, placed.length, getCoords]);

  const onPointerMove = useCallback((e) => {
    if (!isDrawing) return;
    const { cx, cy } = getCoords(e);
    setDrawing((prev) => prev ? { ...prev, x2: cx, y2: cy } : prev);
  }, [isDrawing, getCoords]);

  const onPointerUp = useCallback(() => {
    if (!isDrawing || !drawing) return;
    setIsDrawing(false);
    vibe(10);

    const norm = normalizeRect(drawing);
    if (norm.w === 0 || norm.h === 0) { setDrawing(null); return; } // zero-size → ignore

    // Collision check
    const normPlaced = placed.map(normalizeRect);
    if (normPlaced.some((p) => hasCollision(norm, p))) {
      setErrorMsg('חפיפה! המלבנים לא יכולים לחפוף זה עם זה.');
      vibe([50, 50, 50]);
      setDrawing(null);
      setTimeout(() => setErrorMsg(''), 2000);
      return;
    }

    setPlaced((prev) => [...prev, drawing]);
    setDrawing(null);
  }, [isDrawing, drawing, placed]);

  // ── Error helper ─────────────────────────────────────────────────────────────
  const showError = useCallback((msg) => {
    setErrorMsg(msg);
    vibe([50, 50, 50]);
    setJustLost(true);
    setTimeout(() => setJustLost(false), 600);

    setLives((prev) => {
      const next = prev - 1;
      if (next <= 0) {
        setDisabled(true);
        setTimeout(() => {
          const result = handleGameFail('grid');
          if (result === 'locked') {
            Swal.fire({
              title: 'הרמה ננעלה 🔒',
              html: '<div class="text-right">קצת קשה כרגע — נעלנו את הרמה הזו לתרגול נוח! 🧠</div>',
              icon: 'warning',
              confirmButtonText: 'הבנתי',
              confirmButtonColor: '#4f46e5',
              customClass: { popup: 'rounded-3xl' },
            }).then(() => setScreen('menu'));
          } else {
            Swal.fire({
              title: 'אופס! 💥',
              text: 'נגמרו הניסיונות — שאלה חדשה!',
              icon: 'error',
              confirmButtonColor: '#ef4444',
              customClass: { popup: 'rounded-3xl' },
            }).then(() => newLevel());
          }
        }, 700);
      }
      return next;
    });
  }, [handleGameFail, setScreen, newLevel]);

  // ── Check answer ─────────────────────────────────────────────────────────────
  const handleCheck = useCallback(() => {
    if (disabled || !levelData || placed.length === 0) return;
    const normRects = placed.map(normalizeRect);
    const total = Math.round(normRects.reduce((s, r) => s + r.area, 0) * 100) / 100;

    if (placed.length !== levelData.pieces) {
      showError(`צריך בדיוק ${levelData.pieces} מלבנים — יש כרגע ${placed.length}.`);
      return;
    }
    if (Math.abs(total - levelData.target) > 0.001) {
      showError(`השטח הכולל הוא ${total.toFixed(2)}, צריך ${levelData.target.toFixed(2)}.`);
      return;
    }
    if (levelData.unique) {
      const areas = normRects.map((r) => r.area.toFixed(2));
      if (new Set(areas).size !== areas.length) {
        showError('כל מלבן חייב להיות שטח שונה מהאחרים!');
        return;
      }
    }

    // WIN
    vibe([30, 50, 30]);
    setDisabled(true);
    const result = handleWin('grid');
    setFeedback({ visible: true, isLevelUp: result.isLevelUp, pts: result.pts });
  }, [disabled, levelData, placed, showError, handleWin]);

  // ── Undo ──────────────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    setPlaced((prev) => prev.slice(0, -1));
    setErrorMsg('');
    vibe(10);
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────────────
  if (!levelData) return null;

  const normPlaced  = placed.map(normalizeRect);
  const normDrawing = drawing ? normalizeRect(drawing) : null;
  const totalArea   = Math.round(normPlaced.reduce((s, r) => s + r.area, 0) * 100) / 100;

  const gridBg = {
    width: GPIX, height: GPIX, direction: 'ltr', touchAction: 'none',
    backgroundImage: [
      'linear-gradient(to right, #94a3b8 1.5px, transparent 1.5px)',
      'linear-gradient(to bottom, #94a3b8 1.5px, transparent 1.5px)',
      'linear-gradient(to right, #cbd5e1 1px, transparent 1px)',
      'linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)',
    ].join(', '),
    backgroundSize: [
      `${CELL * SUBDIVS}px ${CELL * SUBDIVS}px`,
      `${CELL * SUBDIVS}px ${CELL * SUBDIVS}px`,
      `${CELL}px ${CELL}px`,
      `${CELL}px ${CELL}px`,
    ].join(', '),
  };

  return (
    <div className="screen-enter flex flex-col flex-1 min-h-[calc(100dvh-80px)]">
      <div className="flex-1 flex flex-col items-center p-4 gap-4 overflow-y-auto">

        {/* Target card */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md px-5 py-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 mb-0.5">יעד — שטח כולל</p>
            <div className="math-font font-black text-4xl text-teal-600 dark:text-teal-400 tracking-tight" dir="ltr">
              {levelData.target.toFixed(2)}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {levelData.pieces} מלבנים{levelData.unique ? ' שונים' : ''}
            </p>
          </div>
          <Hearts lives={lives} maxLives={3} justLost={justLost} />
        </div>

        {/* Grid card */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center gap-3">

          {/* Grid + axes */}
          <div className="relative mt-4 ml-5">
            {/* X-axis */}
            {levelData.showAxis && (
              <div className="absolute -top-5 left-0" style={{ width: GPIX }} dir="ltr">
                {AXIS_MARKS.map((m) => (
                  <span key={m} className="absolute text-[10px] font-mono font-bold text-slate-400 -translate-x-1/2"
                    style={{ left: `${(m / UNITS) * 100}%` }}>
                    {m}
                  </span>
                ))}
              </div>
            )}
            {/* Y-axis */}
            {levelData.showAxis && (
              <div className="absolute top-0 -left-5" style={{ height: GPIX }} dir="ltr">
                {AXIS_MARKS.map((m) => (
                  <span key={m} className="absolute text-[10px] font-mono font-bold text-slate-400 -translate-y-1/2"
                    style={{ top: `${(m / UNITS) * 100}%` }}>
                    {m}
                  </span>
                ))}
              </div>
            )}

            {/* Grid canvas */}
            <div
              ref={gridRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="relative border-2 border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-900 rounded cursor-crosshair overflow-hidden"
              style={gridBg}
            >
              {/* Placed rectangles */}
              {normPlaced.map((r, idx) => {
                const s = RECT_STYLES[idx % RECT_STYLES.length];
                return (
                  <div key={idx}
                    className={`absolute border-2 ${s.border} ${s.bg}`}
                    style={{ left: r.minX * CELL, top: r.minY * CELL, width: r.w * CELL, height: r.h * CELL, pointerEvents: 'none' }}>
                    <span className={`absolute inset-0 flex items-center justify-center font-black text-xs drop-shadow ${s.text}`}>
                      {r.area.toFixed(2)}
                    </span>
                  </div>
                );
              })}
              {/* Live drawing rect */}
              {isDrawing && normDrawing && normDrawing.w > 0 && normDrawing.h > 0 && (
                <div className="absolute border-2 border-dashed border-slate-600 bg-slate-400/30"
                  style={{ left: normDrawing.minX * CELL, top: normDrawing.minY * CELL, width: normDrawing.w * CELL, height: normDrawing.h * CELL, pointerEvents: 'none' }}>
                  <span className="absolute inset-0 flex items-center justify-center font-black text-xs text-slate-600 dark:text-slate-300">
                    {normDrawing.area.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Running sum display */}
          <div className="min-h-[36px] w-full flex items-center justify-center">
            {errorMsg ? (
              <p className="text-sm font-bold text-rose-500 dark:text-rose-400 text-center animate-pulse">{errorMsg}</p>
            ) : normPlaced.length > 0 ? (
              <div className="flex items-center gap-1 flex-wrap justify-center math-font font-black text-lg" dir="ltr">
                {normPlaced.map((r, i) => {
                  const s = RECT_STYLES[i % RECT_STYLES.length];
                  return (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="text-slate-400 font-light text-base">+</span>}
                      <span className={s.text}>{r.area.toFixed(2)}</span>
                    </span>
                  );
                })}
                <span className="text-slate-400 font-light text-base ml-1">=</span>
                <span className={`${Math.abs(totalArea - levelData.target) < 0.001 ? 'text-teal-600 dark:text-teal-400' : 'text-slate-700 dark:text-slate-200'}`}>
                  {totalArea.toFixed(2)}
                </span>
                <span className="text-slate-300 dark:text-slate-600 text-base">/ {levelData.target.toFixed(2)}</span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-bold">גרור על הרשת כדי לצייר מלבן...</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 w-full">
            <button
              onClick={undo}
              disabled={placed.length === 0 || disabled}
              className="w-14 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl disabled:opacity-40 active:scale-95 transition-all text-lg"
              aria-label="בטל"
            >
              ↩️
            </button>
            <button
              onClick={handleCheck}
              disabled={placed.length === 0 || disabled}
              className="flex-1 font-bold py-3 rounded-2xl text-lg bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 text-white shadow-[0_5px_0_#0f766e] active:translate-y-[5px] active:shadow-none transition-all disabled:opacity-40"
            >
              בדוק תוצאה ✓
            </button>
            <button
              onClick={() => { setPlaced([]); setErrorMsg(''); vibe(10); }}
              disabled={placed.length === 0 || disabled}
              className="w-14 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl disabled:opacity-40 active:scale-95 transition-all text-lg"
              aria-label="נקה"
            >
              🗑️
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
          newLevel();
        }}
      />
    </div>
  );
}
