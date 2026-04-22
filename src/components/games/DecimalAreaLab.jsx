import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import GameTutorial from '../shared/GameTutorial';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';

// Grid constants
const UNITS       = 2;   // 2×2 unit space
const SUBDIVS     = 10;  // 10 cells per unit
const TOTAL_CELLS = UNITS * SUBDIVS; // 20×20
const AXIS_MARKS  = [0, 0.5, 1.0, 1.5, 2.0];

const RECT_STYLES = [
  { border: 'border-blue-500',    bg: 'bg-blue-400/40',    text: 'text-blue-700 dark:text-blue-300' },
  { border: 'border-emerald-500', bg: 'bg-emerald-400/40', text: 'text-emerald-700 dark:text-emerald-300' },
  { border: 'border-amber-500',   bg: 'bg-amber-400/40',   text: 'text-amber-700 dark:text-amber-300' },
  { border: 'border-purple-500',  bg: 'bg-purple-400/40',  text: 'text-purple-700 dark:text-purple-300' },
];

// ── Level generator ────────────────────────────────────────────────────────────
function generateLevel(lvl, recentTargets = []) {
  const cfgs = {
    1: { pieces: 2, unique: false, showAxis: true,
         targets: [0.5, 1.0, 1.5, 2.0, 2.5, 3.0] },
    2: { pieces: 3, unique: false, showAxis: true,
         targets: [1.5, 2.0, 2.5, 3.0, 3.5, 4.0] },
    3: { pieces: 3, unique: true,  showAxis: true,
         targets: [1.0, 1.5, 2.0, 2.25, 2.5, 3.0] },
    4: { pieces: 3, unique: true,  showAxis: false,
         targets: [1.5, 1.75, 2.0, 2.25, 2.5, 3.0] },
    5: { pieces: 4, unique: true,  showAxis: false,
         targets: [2.0, 2.5, 2.75, 3.0, 3.5, 4.0] },
  };
  const cfg = cfgs[Math.min(5, Math.max(1, lvl))] || cfgs[1];
  const available = cfg.targets.filter((t) => !recentTargets.includes(t));
  const pool = available.length > 0 ? available : cfg.targets;
  const target = pool[Math.floor(Math.random() * pool.length)];
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
  const handleLightFail = useGameStore((s) => s.handleLightFail);

  const [levelData,    setLevelData]    = useState(null);
  const [placed,       setPlaced]       = useState([]);
  const [drawing,      setDrawing]      = useState(null);
  const [isDrawing,    setIsDrawing]    = useState(false);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [justLost,     setJustLost]     = useState(false);
  const [disabled,     setDisabled]     = useState(false);
  const [feedback,     setFeedback]     = useState({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
  const [cell,         setCell]         = useState(18);
  const [nearEdge,     setNearEdge]     = useState(false);
  const [hoverVertex,  setHoverVertex]  = useState(null); // {cx, cy} for crosshair snap indicator

  const gridRef      = useRef(null);
  const containerRef = useRef(null);
  const recentTargetsRef = useRef([]);

  // ── Responsive cell size via ResizeObserver on the card container ──────────
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      // card width − p-5 padding (40px) − Y-axis space (24px)
      const usable = entry.contentRect.width - 64;
      setCell(Math.max(18, Math.floor(usable / TOTAL_CELLS)));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Init level ──────────────────────────────────────────────────────────────
  const newLevel = useCallback(() => {
    const ld = generateLevel(gameState.lvl, recentTargetsRef.current);
    recentTargetsRef.current = [ld.target, ...recentTargetsRef.current].slice(0, 2);
    setLevelData(ld);
    setPlaced([]);
    setDrawing(null);
    setIsDrawing(false);
    setErrorMsg('');
    setJustLost(false);
    setDisabled(false);
    setNearEdge(false);
  }, [gameState.lvl]);

  useEffect(() => { newLevel(); }, [newLevel]);

  // ── Coordinate helper ────────────────────────────────────────────────────────
  const getCoords = useCallback((e) => {
    const gpix = cell * TOTAL_CELLS;
    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, gpix));
    const y = Math.max(0, Math.min(e.clientY - rect.top,  gpix));
    return { cx: Math.round(x / cell), cy: Math.round(y / cell) };
  }, [cell]);

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
    // Glow: detect proximity to grid edge (within 20px)
    const rect = gridRef.current?.getBoundingClientRect();
    if (rect) {
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const gpx = cell * TOTAL_CELLS;
      const inside = px >= 0 && py >= 0 && px <= gpx && py <= gpx;
      const near   = inside && (px < 20 || py < 20 || px > gpx - 20 || py > gpx - 20);
      setNearEdge(near);
      // Live vertex preview — helps the child see which grid point will be snapped.
      setHoverVertex(inside ? { cx: Math.round(px / cell), cy: Math.round(py / cell) } : null);
    }

    if (!isDrawing) return;
    const { cx, cy } = getCoords(e);
    setDrawing((prev) => prev ? { ...prev, x2: cx, y2: cy } : prev);
  }, [isDrawing, getCoords, cell]);

  const onPointerLeave = useCallback(() => {
    setNearEdge(false);
    setHoverVertex(null);
    // Cancel drawing if pointer leaves the grid mid-drag → prevents stuck drawing state
    if (isDrawing) {
      setIsDrawing(false);
      setDrawing(null);
    }
  }, [isDrawing]);

  const onPointerUp = useCallback(() => {
    if (!isDrawing || !drawing) return;
    setIsDrawing(false);
    vibe(10);

    const norm = normalizeRect(drawing);
    if (norm.w === 0 || norm.h === 0) { setDrawing(null); return; }

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

    // אין lives — ציור ניסיוני הוא חלק מהלמידה. רושמים light-fail ל-level-up window.
    try { handleLightFail('grid'); } catch { /* noop */ }
  }, [handleLightFail]);

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

    vibe([30, 50, 30]);
    setDisabled(true);
    const result = handleWin('grid');
    setFeedback({ visible: true, isLevelUp: result.isLevelUp, unlocked: result.unlocked, pts: result.pts });
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

  const gpix = cell * TOTAL_CELLS;
  const gridBg = {
    width: gpix, height: gpix, direction: 'ltr', touchAction: 'none',
    backgroundImage: [
      'linear-gradient(to right, #94a3b8 1.5px, transparent 1.5px)',
      'linear-gradient(to bottom, #94a3b8 1.5px, transparent 1.5px)',
      'linear-gradient(to right, #cbd5e1 1px, transparent 1px)',
      'linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)',
    ].join(', '),
    backgroundSize: [
      `${cell * SUBDIVS}px ${cell * SUBDIVS}px`,
      `${cell * SUBDIVS}px ${cell * SUBDIVS}px`,
      `${cell}px ${cell}px`,
      `${cell}px ${cell}px`,
    ].join(', '),
    // Neon Glow when pointer is near the edge
    boxShadow: nearEdge
      ? '0 0 0 3px #2dd4bf, 0 0 16px 6px rgba(45,212,191,0.45)'
      : undefined,
    transition: 'box-shadow 0.12s ease',
  };

  return (
    <div className="screen-enter flex flex-col flex-1 min-h-[calc(100dvh-80px)]">
      <GameTutorial gameName="grid" level={gameState.lvl} />
      <div className="flex-1 flex flex-col items-center p-4 gap-4 overflow-y-auto">

        {/* Target card */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md px-5 py-4 shadow-sm border-2 border-teal-200 dark:border-teal-800/40 border-b-4 border-b-teal-400 dark:border-b-teal-700 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-400 mb-0.5 whitespace-nowrap">יעד — שטח כולל</p>
            <div className="math-font font-black text-4xl text-teal-600 dark:text-teal-400 tracking-tight" dir="ltr">
              {levelData.target.toFixed(2)}
            </div>
            {/* הוראה בולטת — מספר מלבנים */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-black text-sm px-2.5 py-0.5 rounded-full whitespace-nowrap">
                צייר {levelData.pieces} מלבנים{levelData.unique ? ' שונים' : ''}
              </span>
            </div>
          </div>
          <div className="shrink-0">
          </div>
        </div>

        {/* Grid card — ref here for ResizeObserver */}
        <div
          ref={containerRef}
          className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md p-5 shadow-sm border-2 border-teal-200 dark:border-teal-800/40 flex flex-col items-center gap-3 overflow-hidden"
        >

          {/* ── Grid layout: X-label row / [Y-labels | Grid] ── */}
          <div className="mt-4" style={{ direction: 'ltr' }}>

            {/* X-axis label row */}
            {levelData.showAxis ? (
              <div style={{ display: 'flex' }}>
                {/* spacer matching Y-axis column width */}
                <div style={{ width: 28, flexShrink: 0 }} />
                {/* label strip exactly as wide as the grid */}
                <div className="relative" style={{ width: gpix, height: 20 }}>
                  {AXIS_MARKS.map((m) => (
                    <span
                      key={m}
                      className="absolute text-[11px] font-black text-teal-400 select-none"
                      style={{
                        left: `${(m / UNITS) * 100}%`,
                        transform: 'translateX(-50%)',
                        bottom: 2,
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ height: 8 }} />
            )}

            {/* Y-axis + Grid row */}
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>

              {/* Y-axis labels column */}
              {levelData.showAxis ? (
                <div className="relative shrink-0" style={{ width: 28, height: gpix }}>
                  {AXIS_MARKS.map((m) => (
                    <span
                      key={m}
                      className="absolute text-[11px] font-black text-teal-400 select-none"
                      style={{
                        top:  `${(m / UNITS) * 100}%`,
                        right: 4,
                        transform: 'translateY(-50%)',
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ width: 8 }} />
              )}

              {/* Grid canvas */}
              <div
                ref={gridRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onPointerLeave={onPointerLeave}
                className="relative border-2 border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-900 rounded-sm cursor-crosshair overflow-hidden shrink-0"
                style={gridBg}
              >
                {/* ── Vertex dots at every 0.5-unit intersection ── */}
                {AXIS_MARKS.flatMap((mx) =>
                  AXIS_MARKS.map((my) => {
                    const px = (mx / UNITS) * gpix;
                    const py = (my / UNITS) * gpix;
                    const isOuterCorner = (mx === 0 || mx === UNITS) && (my === 0 || my === UNITS);
                    const size = isOuterCorner ? 7 : 5;
                    return (
                      <div
                        key={`dot-${mx}-${my}`}
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          width:  size,
                          height: size,
                          background: isOuterCorner ? '#2dd4bf' : '#64748b',
                          left: px - size / 2,
                          top:  py - size / 2,
                          zIndex: 4,
                          boxShadow: isOuterCorner ? '0 0 5px 2px rgba(45,212,191,0.55)' : undefined,
                        }}
                      />
                    );
                  })
                )}
                {/* Placed rectangles */}
                {normPlaced.map((r, idx) => {
                  const s = RECT_STYLES[idx % RECT_STYLES.length];
                  return (
                    <div key={idx}
                      className={`absolute border-2 ${s.border} ${s.bg}`}
                      style={{ left: r.minX * cell, top: r.minY * cell, width: r.w * cell, height: r.h * cell, pointerEvents: 'none' }}>
                      <span className={`absolute inset-0 flex items-center justify-center font-black text-xs drop-shadow ${s.text}`}>
                        {r.area.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
                {/* Snap indicator — glowing ring on nearest vertex while hovering */}
                {hoverVertex && (
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 14, height: 14,
                      left: hoverVertex.cx * cell - 7,
                      top:  hoverVertex.cy * cell - 7,
                      border: '2px solid #2dd4bf',
                      background: 'rgba(45,212,191,0.25)',
                      boxShadow: '0 0 8px 2px rgba(45,212,191,0.6)',
                      zIndex: 5,
                      transition: 'left 0.05s linear, top 0.05s linear',
                    }}
                  />
                )}
                {/* Live drawing rect */}
                {isDrawing && normDrawing && normDrawing.w > 0 && normDrawing.h > 0 && (
                  <div className="absolute border-2 border-dashed border-slate-600 bg-slate-400/30"
                    style={{ left: normDrawing.minX * cell, top: normDrawing.minY * cell, width: normDrawing.w * cell, height: normDrawing.h * cell, pointerEvents: 'none' }}>
                    <span className="absolute inset-0 flex items-center justify-center font-black text-xs text-slate-600 dark:text-slate-300">
                      {normDrawing.area.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>{/* end grid canvas */}
            </div>{/* end Y+Grid row */}
          </div>{/* end outer ltr wrapper */}

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
        unlocked={feedback.unlocked}
        pts={feedback.pts}
        onDone={() => {
          setFeedback({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
          newLevel();
        }}
      />
    </div>
  );
}
