import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import confetti from 'canvas-confetti';
import useGameStore from '../../store/useGameStore';
import GameTutorial from '../shared/GameTutorial';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import HintButton from '../shared/HintButton';
import HintBubble from '../shared/HintBubble';
import useHint from '../../hooks/useHint';
import {
  generatePuzzle,
  computeLiveValue,
  isCorrect,
  getScaffolding,
  getHint,
} from './percentagesEngine';
import { vibe } from '../../utils/math';

// ─── SwipeRoller ────────────────────────────────────────────────────────────
function SwipeRoller({ value, onChange, min = 2, max = 25 }) {
  const dragging = useRef(false);
  const startY   = useRef(0);
  const startVal = useRef(value);

  const onDown = (e) => {
    dragging.current = true;
    startY.current   = e.clientY;
    startVal.current = value;
    e.target.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!dragging.current) return;
    const delta = startY.current - e.clientY;
    let next = startVal.current + Math.floor(delta / 14);
    if (next > max) next = max;
    if (next < min) next = min;
    if (next !== value) { onChange(next); vibe(8); }
  };
  const stop = () => { dragging.current = false; };

  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      className="relative w-12 h-12 bg-white dark:bg-slate-800 rounded-xl border-2 border-sky-200 dark:border-slate-600 shadow-inner flex items-center justify-center cursor-ns-resize touch-none select-none"
    >
      <span aria-hidden="true" className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[9px] leading-none text-sky-400 dark:text-sky-500 animate-pulse">▲</span>
      <span className="text-2xl font-black text-sky-600 dark:text-sky-400">{value}</span>
      <span aria-hidden="true" className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] leading-none text-sky-400 dark:text-sky-500 animate-pulse">▼</span>
    </div>
  );
}

// ─── DynamicArc ─────────────────────────────────────────────────────────────
// Drawn in fixed virtual coordinates (420×460). Outer wrapper scales to fit.
function DynamicArc({ position, operation, factor, isInteractive, onUpdate, scaffoldHint, rollerMax }) {
  let d = '';
  // Horizontal arcs (top/bottom): center→center, curve INWARD through the empty middle gap.
  // Vertical arcs (left/right): inner-corner anchors, curve outward at the side.
  if (position === 'top')    d = operation === 'multiply' ? 'M 65,50 Q 150,120 235,50'      : 'M 235,50 Q 150,120 65,50';
  if (position === 'bottom') d = operation === 'multiply' ? 'M 65,330 Q 150,260 235,330'    : 'M 235,330 Q 150,260 65,330';
  if (position === 'left')   d = operation === 'divide'   ? 'M 0,100 Q -55,190 0,280'      : 'M 0,280 Q -55,190 0,100';
  if (position === 'right')  d = operation === 'divide'   ? 'M 300,100 Q 355,190 300,280'  : 'M 300,280 Q 355,190 300,100';

  const color = scaffoldHint ? '#f59e0b' : (isInteractive ? '#0ea5e9' : '#cbd5e1');
  const markerId = `arrow-${position}-${isInteractive ? 'a' : 'p'}-${scaffoldHint ? 'h' : 'n'}`;

  const boxStyle = {
    top:  position === 'top'    ? 115 : position === 'bottom' ? 265 : 190,
    left: position === 'left'   ? -5  : position === 'right'  ? 305 : 150,
    transform: 'translate(-50%, -50%)',
  };

  return (
    <>
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill={color} />
          </marker>
        </defs>
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={scaffoldHint ? 9 : 6}
          strokeLinecap="round"
          strokeDasharray={isInteractive ? '' : '8,8'}
          markerEnd={`url(#${markerId})`}
          className={`transition-all duration-500 ${scaffoldHint ? 'animate-pulse' : ''}`}
          style={{ filter: scaffoldHint ? `drop-shadow(0 0 8px ${color})` : 'none' }}
        />
      </svg>

      <div className="absolute z-20" style={boxStyle}>
        {isInteractive ? (
          <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-800 border-[3px] shadow-2xl
            ${scaffoldHint ? 'border-amber-400 ring-4 ring-amber-300/30' : 'border-sky-400'}`}>
            <button
              onClick={() => { onUpdate((p) => ({ ...p, operation: p.operation === 'multiply' ? 'divide' : 'multiply' })); vibe(15); }}
              className="w-9 h-9 flex items-center justify-center bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-lg font-black text-xl"
            >
              {operation === 'multiply' ? '×' : '÷'}
            </button>
            <SwipeRoller value={factor} onChange={(v) => onUpdate((p) => ({ ...p, factor: v }))} min={2} max={rollerMax} />
          </div>
        ) : (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border-2 transition-all
            ${scaffoldHint
              ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30 ring-4 ring-amber-300/30 scale-110'
              : 'border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 opacity-80'}`}>
            <span className={`text-lg font-black ${scaffoldHint ? 'text-amber-600' : 'text-slate-400'}`}>
              {operation === 'multiply' ? '×' : '÷'}
            </span>
            <span className={`text-lg font-black ${scaffoldHint ? 'text-amber-700' : 'text-slate-500'}`}>
              {factor}
            </span>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function PercentsLab() {
  const gameState      = useGameStore((s) => s.percentages);
  const practiceLvl    = useGameStore((s) => s.practiceLevels.percentages || 0);
  const handleWin       = useGameStore((s) => s.handleWin);
  const handleLightFail = useGameStore((s) => s.handleLightFail);

  const effectiveLvl = practiceLvl || gameState.lvl;
  const scaffold     = getScaffolding(effectiveLvl);

  const [puzzle, setPuzzle]       = useState(null);
  const [userLogic, setUserLogic] = useState({ operation: 'multiply', factor: 2 });
  const [feedback, setFeedback]   = useState({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
  const [errorMsg, setErrorMsg]   = useState('');
  const [scaffoldGlow, setScaffoldGlow] = useState(false);
  const timersRef = useRef([]);

  // Scale the fixed 600×660 board to fit the card's inner width
  const slotRef = useRef(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      // Reserve ~50px slack on each side for arrow boxes that bleed outside the 420px frame
      const usable = w - 40;
      setScale(Math.min(1, usable / 300));
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const newPuzzle = useCallback(() => {
    const p = generatePuzzle(effectiveLvl);
    setPuzzle(p);
    setUserLogic({ operation: 'multiply', factor: 2 });
    setErrorMsg('');
    setScaffoldGlow(false);
  }, [effectiveLvl]);

  useEffect(() => { newPuzzle(); }, [newPuzzle]);

  const { cooldown: hintCooldown, bubble: hintBubble, requestHint } = useHint({
    level: effectiveLvl,
    getHint,
    puzzle,
    cooldownSec: 8,
    bubbleMs: 3200,
    onApplyHint: (hint) => {
      if (hint?.kind === 'both' && typeof hint.factor === 'number') {
        setUserLogic({ operation: hint.operation, factor: hint.factor });
      } else if (hint?.kind === 'operator' && hint.operation) {
        setUserLogic((p) => ({ ...p, operation: hint.operation }));
      }
      setScaffoldGlow(true);
      timersRef.current.push(setTimeout(() => setScaffoldGlow(false), 4000));
    },
  });

  const liveVal = puzzle ? computeLiveValue(puzzle, userLogic) : '?';

  const checkAnswer = () => {
    if (!puzzle) return;
    if (isCorrect(puzzle, userLogic)) {
      vibe([20, 40, 20]);
      const result = handleWin('percentages');
      if (result.isLevelUp) confetti({ particleCount: 110, spread: 80, origin: { y: 0.7 } });
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, unlocked: result.unlocked, pts: result.pts });
    } else {
      vibe([60, 60, 60]);
      setErrorMsg('❌ לא בדיוק. נסו לשנות את הפעולה או את המספר 💪');
      // אין lives — ניסוי-וטעייה הוא חלק מהלמידה ב-PercentsLab.
      try { handleLightFail('percentages'); } catch { /* noop */ }
    }
  };

  if (!puzzle) return null;

  const showLive = scaffold.showLiveValue;
  const cells = [
    { id: 'partValue',    label: '₪', role: 'חלק (₪)',   val: puzzle.display.partValue    === '?' ? (showLive ? liveVal : '?') : puzzle.display.partValue,    isTarget: puzzle.targetVar === 'partValue' },
    { id: 'partPercent',  label: '%', role: 'חלק (%)',   val: puzzle.display.partPercent  === '?' ? (showLive ? liveVal : '?') : puzzle.display.partPercent,  isTarget: puzzle.targetVar === 'partPercent' },
    { id: 'totalValue',   label: '₪', role: 'שלם (₪)',   val: puzzle.display.totalValue   === '?' ? (showLive ? liveVal : '?') : puzzle.display.totalValue,   isTarget: puzzle.targetVar === 'totalValue' },
    { id: 'totalPercent', label: '%', role: 'שלם (100%)', val: 100, isTarget: false, isAccent: true },
  ];

  const isHorizontal = puzzle.puzzleType === 'horizontal';
  const passiveArcOp = puzzle.correctOperation;
  const passiveArcF  = Number.isInteger(puzzle.correctFactor) ? puzzle.correctFactor : Math.round(puzzle.correctFactor);

  return (
    <div className="screen-enter flex flex-col items-center p-3 md:p-4 flex-1 overflow-x-hidden w-full">
      <GameTutorial gameName="percentages" />

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-4 md:p-5 w-full max-w-md shadow-xl flex flex-col items-center gap-3 border border-sky-200 dark:border-sky-800/40 border-b-4 border-b-sky-400 dark:border-b-sky-700 transition-colors">

        {/* Top bar */}
        <div className="w-full flex justify-between items-center">
          <span className="text-sm font-black text-sky-600 dark:text-sky-400">מעבדת אחוזים 📊</span>
          <span className="text-xs font-bold text-sky-600 dark:text-sky-400">🧪 ניסוי-וטעייה</span>
        </div>

        {/* Instruction */}
        <div className="w-full bg-slate-50 dark:bg-slate-900 rounded-2xl py-2 px-3 border border-slate-200 dark:border-slate-700">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center block">
            מצאו את הקשר והשלימו את התא החסר
          </span>
        </div>

        {/* Board slot — scales the fixed 300×380 design.
            Extra vertical padding (BLEED) reserves room for the operator chip when the
            roller sits on the TOP arc (y=-8 in canvas coords) or BOTTOM arc (y=388),
            so it doesn't overlap the instruction bar above or the action buttons below. */}
        <div ref={slotRef} className="w-full flex justify-center items-start" style={{ height: 380 * scale }}>
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              width: 300,
              height: 380,
              flexShrink: 0,
            }}
            className="relative"
            dir="ltr"
          >
            {/* Arcs */}
            {isHorizontal ? (
              <>
                <DynamicArc
                  position="top"
                  operation={puzzle.activeArc === 'top' ? userLogic.operation : passiveArcOp}
                  factor={puzzle.activeArc === 'top' ? userLogic.factor : passiveArcF}
                  isInteractive={puzzle.activeArc === 'top'}
                  onUpdate={setUserLogic}
                  scaffoldHint={scaffoldGlow}
                  rollerMax={scaffold.rollerMax}
                />
                <DynamicArc
                  position="bottom"
                  operation={puzzle.activeArc === 'bottom' ? userLogic.operation : passiveArcOp}
                  factor={puzzle.activeArc === 'bottom' ? userLogic.factor : passiveArcF}
                  isInteractive={puzzle.activeArc === 'bottom'}
                  onUpdate={setUserLogic}
                  scaffoldHint={scaffoldGlow}
                  rollerMax={scaffold.rollerMax}
                />
              </>
            ) : (
              <>
                {!scaffold.hidePlaceholderArc && (
                  <DynamicArc
                    position={puzzle.activeArc === 'left' ? 'right' : 'left'}
                    operation={passiveArcOp}
                    factor={passiveArcF}
                    isInteractive={false}
                    scaffoldHint={scaffoldGlow}
                    rollerMax={scaffold.rollerMax}
                  />
                )}
                <DynamicArc
                  position={puzzle.activeArc}
                  operation={userLogic.operation}
                  factor={userLogic.factor}
                  isInteractive
                  onUpdate={setUserLogic}
                  scaffoldHint={scaffoldGlow}
                  rollerMax={scaffold.rollerMax}
                />
              </>
            )}

            {/* 2×2 grid */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-x-[40px] gap-y-[180px] z-10 pointer-events-none">
              {cells.map((cell) => (
                <div
                  key={cell.id}
                  className={`w-[130px] h-[100px] flex items-center justify-center rounded-[1.25rem] border-[4px] transition-all duration-500 pointer-events-auto relative
                    ${cell.isTarget
                      ? 'bg-sky-50 dark:bg-sky-900/40 border-sky-400 shadow-[0_0_0_8px_rgba(14,165,233,0.1)]'
                      : cell.isAccent
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl'}
                  `}
                >
                  {cell.isTarget && (
                    <div className="absolute -top-4 bg-sky-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-md animate-bounce z-30">
                      הנעלם
                    </div>
                  )}
                  {scaffoldGlow && !cell.isTarget && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow z-30 whitespace-nowrap" dir="rtl">
                      {cell.role}
                    </div>
                  )}
                  <div className="flex items-end justify-center px-2 text-center overflow-hidden">
                    <span className={`text-[30px] font-black tracking-tight leading-none
                      ${cell.isTarget ? 'text-sky-600 dark:text-sky-400'
                        : cell.isAccent ? 'text-slate-400'
                        : 'text-slate-800 dark:text-slate-100'}`}>
                      {cell.val}
                    </span>
                    {cell.val !== '?' && (
                      <span className={`text-xl font-bold ml-1.5 mb-1.5
                        ${cell.isAccent ? 'text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                        {cell.label}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="w-full text-center text-sm font-bold bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-xl border border-red-200 dark:border-red-800">
            {errorMsg}
          </div>
        )}

        {/* HintBubble + bottom action bar */}
        <HintBubble text={hintBubble} colorToken="sky" className="mb-1" />
        <div className="w-full flex gap-2 pb-1" dir="rtl">
          <HintButton
            cooldown={hintCooldown}
            onClick={requestHint}
            colorToken="sky"
            title="רמז"
            className="self-stretch"
          />
          <button
            onClick={checkAnswer}
            className="flex-1 py-4 bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700 text-white rounded-3xl font-black text-xl shadow-xl transition-all active:scale-95"
          >
            בדיקה ✓
          </button>
        </div>
      </div>

      <FeedbackOverlay
        visible={feedback.visible}
        isLevelUp={feedback.isLevelUp}
        unlocked={feedback.unlocked}
        pts={feedback.pts}
        onDone={() => {
          setFeedback({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
          newPuzzle();
        }}
      />
    </div>
  );
}
