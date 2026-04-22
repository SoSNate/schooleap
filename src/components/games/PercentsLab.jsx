import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRightLeft, Play } from 'lucide-react';
import Swal from 'sweetalert2';
import useGameStore from '../../store/useGameStore';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import GameTutorial from '../shared/GameTutorial';
import HintButton from '../shared/HintButton';
import HintBubble from '../shared/HintBubble';
import useHint from '../../hooks/useHint';
import { reportHintUsed } from '../../lib/telemetry';
import { vibe } from '../../utils/math';
import {
  generatePuzzle,
  computeLiveValue,
  isCorrect,
  getScaffolding,
  getHint,
} from './percentagesEngine';

// ─── Swipe Roller ─────────────────────────────────────────────────────────────
function SwipeRoller({ value, onChange, min = 2, max = 50, highlight = false }) {
  const dragging = useRef(false);
  const startY   = useRef(0);
  const startVal = useRef(value);

  function onPointerDown(e) {
    dragging.current = true;
    startY.current   = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    startVal.current = value;
    e.target.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragging.current) return;
    const cy    = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const delta = startY.current - cy;
    let next    = startVal.current + Math.floor(delta / 15);
    if (next > max) next = max;
    if (next < min) next = min;
    if (next !== value) onChange(next);
  }
  function onPointerUp(e) {
    dragging.current = false;
    e.target.releasePointerCapture?.(e.pointerId);
  }

  return (
    <div
      className={`relative w-14 h-16 bg-white dark:bg-slate-700 rounded-xl border shadow-inner flex items-center justify-center cursor-ns-resize touch-none overflow-hidden select-none ${
        highlight
          ? 'border-sky-400 ring-4 ring-sky-200 dark:ring-sky-900/50 animate-pulse'
          : 'border-slate-200 dark:border-slate-600 hover:border-sky-300'
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Grip ridges — top */}
      {[0, 1, 2].map((i) => (
        <div key={`t${i}`}
          className="absolute w-6 h-px bg-slate-300/80 dark:bg-slate-500/60 rounded-full pointer-events-none"
          style={{ top: 8 + i * 5, left: '50%', transform: 'translateX(-50%)' }}
        />
      ))}
      {/* Grip ridges — bottom */}
      {[0, 1, 2].map((i) => (
        <div key={`b${i}`}
          className="absolute w-6 h-px bg-slate-300/80 dark:bg-slate-500/60 rounded-full pointer-events-none"
          style={{ bottom: 8 + i * 5, left: '50%', transform: 'translateX(-50%)' }}
        />
      ))}
      {/* Fade gradients (mask ridges near edge) */}
      <div className="absolute top-0 w-full h-5 bg-gradient-to-b from-white dark:from-slate-700 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 w-full h-5 bg-gradient-to-t from-white dark:from-slate-700 to-transparent pointer-events-none" />
      <span className="text-2xl font-black text-sky-700 dark:text-sky-300 relative z-10">{value}</span>
    </div>
  );
}

// ─── Dynamic Arc ─────────────────────────────────────────────────────────────
function DynamicArc({
  position, operation, factor, isInteractive,
  onUpdate, isShekelBigger,
  showOperator, showFactor, hide, hintGlow,
}) {
  if (hide) return null;

  // direction of arrow head
  let pointsStandard = operation === 'multiply';
  if (position === 'top' || position === 'bottom') {
    pointsStandard = isShekelBigger ? operation !== 'multiply' : operation === 'multiply';
  }

  let d = '';
  if (position === 'top')    d = pointsStandard ? 'M 80,0 Q 224,-80 368,0'     : 'M 368,0 Q 224,-80 80,0';
  if (position === 'bottom') d = pointsStandard ? 'M 80,384 Q 224,464 368,384' : 'M 368,384 Q 224,464 80,384';
  if (position === 'left')   d = pointsStandard ? 'M 0,80 Q -80,192 0,304'     : 'M 0,304 Q -80,192 0,80';
  if (position === 'right')  d = pointsStandard ? 'M 448,80 Q 528,192 448,304' : 'M 448,304 Q 528,192 448,80';

  const color    = isInteractive ? '#0284c7' : '#94a3b8';
  const markerId = `ah-${position}-${isInteractive ? 'on' : 'off'}`;

  let box = {};
  if (position === 'top')    box = { top: -40, left: 224, transform: 'translate(-50%,-50%)' };
  if (position === 'bottom') box = { top: 424, left: 224, transform: 'translate(-50%,-50%)' };
  if (position === 'left')   box = { top: 192, left: -40, transform: 'translate(-50%,-50%)' };
  if (position === 'right')  box = { top: 192, left: 488, transform: 'translate(-50%,-50%)' };

  return (
    <>
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill={color} />
          </marker>
        </defs>
        <path
          d={d} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={isInteractive ? '' : '8,8'}
          markerEnd={`url(#${markerId})`}
        />
      </svg>

      <div className="absolute z-20" style={box}>
        {isInteractive ? (
          <div className={`flex items-center gap-2 p-2 rounded-2xl bg-white dark:bg-slate-800 border-[3px] shadow-xl transition-all ${
            hintGlow ? 'border-amber-400 ring-4 ring-amber-200' : 'border-sky-400'
          }`}>
            <button
              onClick={() => onUpdate(prev => ({ ...prev, operation: prev.operation === 'multiply' ? 'divide' : 'multiply' }))}
              className="w-11 h-11 flex items-center justify-center bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/40 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 rounded-xl font-black text-2xl transition-colors active:scale-95 border border-sky-100 dark:border-sky-800"
            >
              {operation === 'multiply' ? '×' : '÷'}
            </button>
            <SwipeRoller
              value={factor}
              onChange={(val) => onUpdate(prev => ({ ...prev, factor: val }))}
              highlight={hintGlow}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-sm opacity-80">
            <span className="text-2xl font-black text-slate-400">
              {showOperator ? (operation === 'multiply' ? '×' : '÷') : '?'}
            </span>
            <span className="text-2xl font-black text-slate-400">
              {showFactor ? factor : '?'}
            </span>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const INSTRUCTIONS = {
  1: 'החליקו את הגלגל ובחרו ÷ או × — כך שהחץ יתאים לחידה',
  2: 'בחרו פעולה (÷/×) והחליקו את המספר בגלגל',
  3: 'מצאו את הפעולה והגורם הנכון',
  4: 'חשבו — איזו פעולה ואיזה גורם מאזנים את המשוואה?',
  5: '',  // L5: מומחים לא צריכים הוראה
};

// ─── Main component ──────────────────────────────────────────────────────────
export default function PercentsLab() {
  const gameState      = useGameStore(s => s.percentages);
  const handleWinStore = useGameStore(s => s.handleWin);
  const isAnimating    = useGameStore(s => s.isAnimating);

  const [puzzle,    setPuzzle]    = useState(() => generatePuzzle(gameState.lvl));
  const [userLogic, setUserLogic] = useState({ operation: 'multiply', factor: 2 });
  const [justLost,  setJustLost]  = useState(false);
  const [feedback,  setFeedback]  = useState({ visible: false });
  const [hintGlow,  setHintGlow]  = useState(false);

  // Track pending timeouts so unmount doesn't fire setters on dead component.
  const timersRef = useRef([]);
  const schedule = (fn, ms) => {
    const id = setTimeout(() => {
      timersRef.current = timersRef.current.filter(t => t !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
    return id;
  };
  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  // Responsive board scale — recompute on resize / orientation change.
  const computeScale = () =>
    typeof window === 'undefined' ? 1 : Math.min(1, (window.innerWidth - 32) / 500);
  const [boardScale, setBoardScale] = useState(computeScale);
  useEffect(() => {
    const onResize = () => setBoardScale(computeScale());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const scaffold = getScaffolding(gameState.lvl);

  // Hint infra (shared across analytical games)
  const onApplyHint = useCallback((hint) => {
    if (hint.kind === 'both' || hint.kind === 'operator') {
      // Snap the user controls to the hinted operation/factor; glow highlights the arc
      if (hint.operation) {
        setUserLogic((prev) => ({
          ...prev,
          operation: hint.operation,
          ...(hint.factor ? { factor: hint.factor } : {}),
        }));
      }
      setHintGlow(true);
      schedule(() => setHintGlow(false), 1600);
    }
  }, []);

  const {
    cooldown: hintCooldown,
    bubble:   hintBubbleText,
    usedThisRound: usedHint,
    requestHint,
    resetRound: resetHintRound,
  } = useHint({
    level: gameState.lvl,
    getHint,
    puzzle,
    cooldownSec: 5,
    bubbleMs: 2600,
    onApplyHint,
  });

  // Re-generate puzzle when level changes in store (after level-up)
  useEffect(() => {
    nextPuzzle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.lvl]);

  const nextPuzzle = useCallback(() => {
    setPuzzle(generatePuzzle(useGameStore.getState().percentages.lvl));
    setUserLogic({ operation: 'multiply', factor: 2 });
    setJustLost(false);
    setHintGlow(false);
    resetHintRound();
  }, [resetHintRound]);

  function handleValidate() {
    if (!puzzle || isAnimating) return;
    if (isCorrect(puzzle, userLogic)) {
      vibe?.(40);
      const r = handleWinStore('percentages');
      setFeedback({ visible: true, isLevelUp: r.isLevelUp, unlocked: r.unlocked, pts: r.pts });
      // Telemetry: mark if hint was used (fire-and-forget)
      if (usedHint) reportHintUsed({ game: 'percentages', level: gameState.lvl });
      schedule(nextPuzzle, 2100);
    } else {
      vibe?.(80);
      setJustLost(true);
      schedule(() => setJustLost(false), 600);
      // אין lives — ניסוי-וטעייה מותר. מסמן light-fail ב-store כדי שיושפע level-up window.
      try { useGameStore.getState().handleLightFail('percentages'); } catch { /* noop */ }
    }
  }

  if (!puzzle) return null;

  const liveValue = computeLiveValue(puzzle, userLogic);
  const display   = {
    ...puzzle.display,
    partValue:   puzzle.display.partValue   === '?' ? (scaffold.showLiveValue ? liveValue : '?') : puzzle.display.partValue,
    partPercent: puzzle.display.partPercent === '?' ? (scaffold.showLiveValue ? liveValue : '?') : puzzle.display.partPercent,
    totalValue:  puzzle.display.totalValue  === '?' ? (scaffold.showLiveValue ? liveValue : '?') : puzzle.display.totalValue,
  };

  const cells = [
    { id: 'partValue',    label: '₪', val: display.partValue,   isTarget: puzzle.targetVar === 'partValue'   },
    { id: 'partPercent',  label: '%', val: display.partPercent, isTarget: puzzle.targetVar === 'partPercent' },
    { id: 'totalValue',   label: '₪', val: display.totalValue,  isTarget: puzzle.targetVar === 'totalValue'  },
    { id: 'totalPercent', label: '%', val: 100, isTarget: false, isAccent: true },
  ];

  return (
    <div dir="rtl" className="min-h-full bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 md:p-6 select-none">
      <GameTutorial gameName="percentages" />

      {/* Top bar: back/lives/score (minimal — Header already exists outside) */}
      <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2 mb-4 bg-white dark:bg-slate-800 rounded-[1.5rem] px-4 py-3 border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-sky-600 text-white w-11 h-11 flex items-center justify-center rounded-2xl font-black text-lg shadow-md">
            {gameState.lvl}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Hint button */}
          <HintButton cooldown={hintCooldown} onClick={requestHint} />

          {/* Star score */}
          <div className="flex items-center gap-2 bg-sky-50 dark:bg-sky-900/30 border border-sky-100 dark:border-sky-800 rounded-2xl px-4 py-2">
            <span className="text-lg">⭐</span>
            <span className="text-lg font-black text-sky-700 dark:text-sky-300">{gameState.stars}</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-4">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
          מעבדת אחוזים <ArrowRightLeft className="text-sky-500" size={22} />
        </h1>
        {INSTRUCTIONS[gameState.lvl] && (
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {INSTRUCTIONS[gameState.lvl]}
          </p>
        )}
      </div>

      {/* Board */}
      <div className="flex justify-center w-full overflow-hidden">
        <div className="relative" style={{ width: 448 * boardScale + (puzzle.puzzleType === 'vertical' ? 44 : 0), maxWidth: '100%' }}>
          {/* Column labels — vertical layout only */}
          {puzzle.puzzleType === 'vertical' && (
            <div className="flex mb-1" dir="ltr" style={{ width: 448 * boardScale, marginRight: 44, paddingLeft: 80 * boardScale, paddingRight: 80 * boardScale }}>
              <span className="flex-1 text-[10px] sm:text-xs font-bold text-slate-400 text-center">₪ שקלים</span>
              <span className="flex-1 text-[10px] sm:text-xs font-bold text-slate-400 text-center">% אחוזים</span>
            </div>
          )}

          {/* Board + row labels */}
          <div className="flex items-start">
            {/* Row labels — vertical layout only */}
            {puzzle.puzzleType === 'vertical' && (
              <div className="flex flex-col justify-around pr-1" style={{ width: 44, height: 384 * boardScale }}>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 text-center leading-tight">חלק</span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 text-center leading-tight">סכום<br/>כולל</span>
              </div>
            )}

        <div className="relative" dir="ltr" style={{
          width: 448 * boardScale,
          height: 384 * boardScale,
        }}>
        <div className="absolute top-0 left-0 w-[448px] h-[384px]" style={{
          transform: `scale(${boardScale})`,
          transformOrigin: 'top left',
        }}>
          {puzzle.puzzleType === 'horizontal' ? (
            <>
              <DynamicArc
                position="top"
                operation={puzzle.activeArc === 'top' ? userLogic.operation : puzzle.correctOperation}
                factor={puzzle.activeArc === 'top' ? userLogic.factor : puzzle.correctFactor}
                isInteractive={puzzle.activeArc === 'top'}
                onUpdate={setUserLogic}
                isShekelBigger={puzzle.isShekelBigger}
                showOperator={scaffold.showHintOperator}
                showFactor={scaffold.showHintFactor}
                hide={puzzle.activeArc !== 'top' && scaffold.hidePlaceholderArc}
                hintGlow={hintGlow && puzzle.activeArc === 'top'}
              />
              <DynamicArc
                position="bottom"
                operation={puzzle.activeArc === 'bottom' ? userLogic.operation : puzzle.correctOperation}
                factor={puzzle.activeArc === 'bottom' ? userLogic.factor : puzzle.correctFactor}
                isInteractive={puzzle.activeArc === 'bottom'}
                onUpdate={setUserLogic}
                isShekelBigger={puzzle.isShekelBigger}
                showOperator={scaffold.showHintOperator}
                showFactor={scaffold.showHintFactor}
                hide={puzzle.activeArc !== 'bottom' && scaffold.hidePlaceholderArc}
                hintGlow={hintGlow && puzzle.activeArc === 'bottom'}
              />
            </>
          ) : (
            <>
              <DynamicArc
                position="left"
                operation={puzzle.activeArc === 'left' ? userLogic.operation : puzzle.correctOperation}
                factor={puzzle.activeArc === 'left' ? userLogic.factor : puzzle.correctFactor}
                isInteractive={puzzle.activeArc === 'left'}
                onUpdate={setUserLogic}
                showOperator={scaffold.showHintOperator}
                showFactor={scaffold.showHintFactor}
                hide={puzzle.activeArc !== 'left' && scaffold.hidePlaceholderArc}
                hintGlow={hintGlow && puzzle.activeArc === 'left'}
              />
              <DynamicArc
                position="right"
                operation={puzzle.activeArc === 'right' ? userLogic.operation : puzzle.correctOperation}
                factor={puzzle.activeArc === 'right' ? userLogic.factor : puzzle.correctFactor}
                isInteractive={puzzle.activeArc === 'right'}
                onUpdate={setUserLogic}
                showOperator={scaffold.showHintOperator}
                showFactor={scaffold.showHintFactor}
                hide={puzzle.activeArc !== 'right' && scaffold.hidePlaceholderArc}
                hintGlow={hintGlow && puzzle.activeArc === 'right'}
              />
            </>
          )}

          {/* 2x2 table */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[128px] z-10 pointer-events-none">
            {cells.map((cell, i) => (
              <div key={i} className={`
                relative w-[160px] h-[160px] flex flex-col items-center justify-center rounded-[2rem] border-4 transition-all duration-300 pointer-events-auto
                ${cell.isTarget
                  ? 'bg-sky-50 dark:bg-sky-900/40 border-sky-400 dark:border-sky-600 shadow-[0_0_0_6px_rgba(14,165,233,0.12)]'
                  : cell.isAccent
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg'}
              `}>
                {cell.isTarget && (
                  <div className="absolute -top-3 bg-sky-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md animate-bounce">
                    נעלם
                  </div>
                )}
                <div className="flex items-baseline gap-1">
                  <span className={`text-5xl font-black ${
                    cell.isTarget
                      ? 'text-sky-600 dark:text-sky-300'
                      : cell.isAccent
                        ? 'text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-100'
                  }`}>
                    {cell.val}
                  </span>
                  {cell.val !== '?' && (
                    <span className={`text-xl font-bold ${cell.isAccent ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'}`}>
                      {cell.label}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>{/* end scaled inner board */}
          </div>{/* end flex items-start */}
        </div>{/* end relative wrapper */}
      </div>

      {/* Hint bubble */}
      <HintBubble text={hintBubbleText} />

      {/* CTA */}
      <div className="flex justify-center mt-8 pb-10">
        <button
          onClick={handleValidate}
          disabled={isAnimating}
          className="flex items-center gap-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-14 py-4 rounded-full font-black text-xl shadow-xl active:scale-95 transition-all"
        >
          בדיקת תשובה
          <Play className="w-5 h-5 fill-white" />
        </button>
      </div>

      <FeedbackOverlay
        visible={feedback.visible}
        isLevelUp={feedback.isLevelUp}
        unlocked={feedback.unlocked}
        pts={feedback.pts}
        onDone={() => setFeedback({ visible: false })}
      />
    </div>
  );
}
