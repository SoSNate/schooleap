import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import Hearts from '../shared/Hearts';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import GameTutorial from '../shared/GameTutorial';
import HintButton from '../shared/HintButton';
import HintBubble from '../shared/HintBubble';
import useHint from '../../hooks/useHint';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';
import { generatePuzzle, validate, getHint as engineGetHint } from './balanceEngine';
import { STEP_CONFIG } from '../../store/useGameStore';

/* Render pan expression with styled blocks for numbers and variables */
function PanContent({ text }) {
  const tokens = [];
  const raw = Array.from(text.matchAll(/(🟦|🟡|🔴|\d+(?:\.\d+)?|[^🟦🟡🔴\d]+)/gu));
  raw.forEach((m, i) => {
    const tok = m[0];
    if (tok === '🟦') {
      tokens.push({ type: 'var-blue', val: '?', key: i });
    } else if (tok === '🟡') {
      tokens.push({ type: 'var-yellow', val: '?', key: i });
    } else if (tok === '🔴') {
      tokens.push({ type: 'var-red', val: '●', key: i });
    } else if (/^\d+(\.\d+)?$/.test(tok.trim())) {
      tokens.push({ type: 'num', val: tok.trim(), key: i });
    } else if (tok.trim()) {
      tokens.push({ type: 'op', val: tok, key: i });
    }
  });

  if (tokens.length === 0) return <span>{text}</span>;

  return (
    <span className="flex items-center justify-center flex-nowrap gap-0.5" dir="ltr">
      {tokens.map((t) => {
        if (t.type === 'var-blue')   return <span key={t.key} className="weight-var">{t.val}</span>;
        if (t.type === 'var-yellow') return <span key={t.key} className="weight-var">{t.val}</span>;
        if (t.type === 'var-red')    return <span key={t.key} className="weight-var-red">{t.val}</span>;
        if (t.type === 'num')        return <span key={t.key} className="weight-num">{t.val}</span>;
        return <span key={t.key} className="weight-op">{t.val}</span>;
      })}
    </span>
  );
}

export default function Balance() {
  const gameState    = useGameStore((s) => s.balance);
  const practiceLvl  = useGameStore((s) => s.practiceLevels.balance || 0);
  const handleWin    = useGameStore((s) => s.handleWin);
  const handleGameFail = useGameStore((s) => s.handleGameFail);
  const setScreen    = useGameStore((s) => s.setScreen);

  const [puzzle,     setPuzzle]     = useState(null);
  const [sliderVal,  setSliderVal]  = useState(1);
  const [beamAngle,  setBeamAngle]  = useState(0);
  const [lives,      setLives]      = useState(3);
  const [justLost,   setJustLost]   = useState(false);
  const [feedback,   setFeedback]   = useState({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
  const [errorFlash, setErrorFlash] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [checking,   setChecking]   = useState(false);
  // Heavy hint: tooltip table
  const [heavyTooltip, setHeavyTooltip] = useState(null);

  const timersRef = useRef([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      clearTimeout(holdRef.current);
      clearInterval(holdRef.current);
    };
  }, []);

  // ── Effective step ───────────────────────────────────────────────────────
  const effectiveStep = practiceLvl || gameState.step || gameState.lvl;

  // ── Hint system ──────────────────────────────────────────────────────────
  const getBalanceHint = useCallback((_, level, opts) => {
    if (!puzzle) return null;
    const tier = opts?.halfMode ? 'strategy' : 'observation';
    return { kind: 'text', ...engineGetHint(puzzle, tier) };
  }, [puzzle]);

  const { cooldown: hintCooldown, bubble: hintBubble, requestHint, resetRound: resetHintRound } = useHint({
    level: effectiveStep,
    getHint: getBalanceHint,
    puzzle: puzzle ?? true,
    cooldownSec: 8,
    bubbleMs: 4500,
    halfHintEnabled: true,
  });

  const initGame = useCallback(() => {
    const step = practiceLvl || gameState.step || gameState.lvl;
    setLives(3);
    setJustLost(false);
    setBeamAngle(0);
    setConsecutiveErrors(0);
    setHeavyTooltip(null);
    resetHintRound();

    const p = generatePuzzle(step);
    setPuzzle(p);
    setSliderVal(p.startVal);
  }, [gameState.step, gameState.lvl, practiceLvl, resetHintRound]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const checkAnswer = () => {
    if (checking || !puzzle) return;
    setChecking(true);
    timersRef.current.push(setTimeout(() => setChecking(false), 700));

    const { correct, diff } = validate(puzzle, sliderVal);
    const angle = Math.max(-22, Math.min(22, diff * 3.5));
    setBeamAngle(angle);

    if (correct) {
      vibe([30, 50, 30]);
      const result = handleWin('balance');
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, unlocked: result.unlocked, pts: result.pts });
    } else {
      const newLives = Math.max(0, lives - 1);
      const newErrors = consecutiveErrors + 1;
      setLives(newLives);
      setJustLost(true);
      setErrorFlash(true);
      setConsecutiveErrors(newErrors);
      timersRef.current.push(setTimeout(() => { setErrorFlash(false); setJustLost(false); }, 600));
      vibe([50, 50, 50]);

      if (newLives <= 0) {
        handleGameFail('balance');
        Swal.fire({
          title: 'הצעד נעצר ⏸️',
          text: 'נסה שוב — תוכל לנצח!',
          icon: 'info',
          confirmButtonText: 'נסה שוב 💪',
          confirmButtonColor: '#10b981',
          customClass: { popup: 'rounded-3xl' },
        }).then(() => {
          setLives(3);
          initGame();
        });
      }
    }
  };

  const adjust = (delta) => {
    if (!puzzle) return;
    const [min, max] = puzzle.range;
    setSliderVal((v) => Math.max(min, Math.min(max, v + delta)));
    vibe(8);
  };

  // Press-and-hold: start interval after 400ms initial delay
  const holdRef = useRef(null);
  const startHold = (delta) => {
    adjust(delta);
    holdRef.current = setTimeout(() => {
      holdRef.current = setInterval(() => adjust(delta), 80);
    }, 380);
  };
  const stopHold = () => {
    clearTimeout(holdRef.current);
    clearInterval(holdRef.current);
    holdRef.current = null;
  };

  // Heavy hint handler
  const handleHeavyHint = () => {
    if (!puzzle?.hint?.heavy) return;
    const h = engineGetHint(puzzle, 'heavy');
    if (h.kind === 'table' && h.payload) {
      setHeavyTooltip(h.payload);
      timersRef.current.push(setTimeout(() => setHeavyTooltip(null), 5000));
    } else {
      setHeavyTooltip(null);
    }
  };

  if (!puzzle) return null;

  const totalSteps = STEP_CONFIG['balance'];
  const progressPct = Math.round((effectiveStep / totalSteps) * 100);

  return (
    <div className={`screen-enter flex flex-col items-center p-2 sm:p-4 flex-1 min-h-[calc(100dvh-80px)] ${errorFlash ? 'error-flash' : ''}`}>
      <GameTutorial gameName="balance" level={effectiveStep} />
      <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-[2.5rem] px-3 sm:px-4 pt-4 sm:pt-5 pb-5 sm:pb-6 w-full max-w-xs sm:max-w-md shadow-xl flex flex-col items-center gap-3 sm:gap-4 border-2 border-green-200 dark:border-green-800/40 border-b-4 border-b-green-400 dark:border-b-green-700 transition-colors" style={{ overflow: 'visible' }}>

        {/* Progress bar + lives row */}
        <div className="w-full flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500">
            <span>שלב {effectiveStep} מתוך {totalSteps}</span>
            <Hearts lives={lives} maxLives={3} justLost={justLost} />
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-green-400 dark:bg-green-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Rules card — single rule (step 7) or double (step 8) */}
        {puzzle.rule && (
          <div className="w-full flex justify-center -mb-1 sm:-mb-2">
            <div className="bg-rose-100 dark:bg-rose-900/30 font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm border border-rose-200 dark:border-rose-700 w-full max-w-xs">
              {puzzle.rule2 ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-xs text-rose-500 dark:text-rose-400 font-black">
                    <span>🧩</span><span>שני הכללים נכונים בו-זמנית</span>
                  </div>
                  <div className="border-t border-rose-200 dark:border-rose-700 pt-1 mt-0.5 flex flex-col gap-0.5">
                    <span dir="ltr" className="text-rose-700 dark:text-rose-300">{puzzle.rule.expr}</span>
                    <span dir="ltr" className="text-rose-700 dark:text-rose-300">{puzzle.rule2.expr}</span>
                  </div>
                </div>
              ) : (
                <span dir="ltr" className="text-rose-700 dark:text-rose-300">{puzzle.rule.expr}</span>
              )}
            </div>
          </div>
        )}

        {/* Physical Scale */}
        <div className="scale-scene w-full sm:w-auto">
          <div className="scale-beam" style={{ transform: `rotate(${beamAngle}deg)` }}>
            {/* Left pan */}
            <div style={{ position: 'absolute', left: 6, top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="pan-string" />
              <div className="pan-tray bg-emerald-50 dark:bg-slate-700 border-emerald-300 dark:border-slate-500"
                style={{ transform: `translateX(-50%) rotate(${-beamAngle}deg)` }}>
                <PanContent text={puzzle.leftDisplay} />
              </div>
            </div>
            {/* Right pan */}
            <div style={{ position: 'absolute', right: 6, top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="pan-string" />
              <div className="pan-tray bg-emerald-50 dark:bg-slate-700 border-emerald-300 dark:border-slate-500"
                style={{ transform: `translateX(-50%) rotate(${-beamAngle}deg)` }}>
                <PanContent text={puzzle.rightDisplay} />
              </div>
            </div>
          </div>
          <div className="scale-pivot" />
          <div className="scale-pole" />
          <div className="scale-base" />
          <div style={{ height: 90 }} />
        </div>

        {/* Input Area */}
        <div className="flex flex-col items-center gap-2 sm:gap-4 w-full pb-1 sm:pb-2">

          {/* Variable display */}
          <div className="flex justify-center items-center gap-3" dir="ltr">
            <span className="weight-var" style={{ fontSize: '1.1rem' }}>?</span>
            <span className="text-3xl font-bold text-slate-400 dark:text-slate-500 leading-none self-center">＝</span>
            <span className="text-4xl font-black text-green-500 leading-none min-w-[48px] text-center self-center">{sliderVal}</span>
          </div>

          {/* +/- control — press-and-hold supported */}
          <div className="val-control select-none scale-90 sm:scale-100 origin-center">
            <button
              className="val-btn"
              onPointerDown={() => startHold(-1)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              aria-label="פחות"
            >−</button>
            <div className="val-display">{sliderVal}</div>
            <button
              className="val-btn"
              onPointerDown={() => startHold(1)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              aria-label="יותר"
            >+</button>
          </div>

          {consecutiveErrors >= 2 && (
            <div className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-bold animate-pulse text-center px-2">
              💡 קשה? לחץ על הרמז ותחשוב בשלבים!
            </div>
          )}

          {/* Heavy hint tooltip (step 9) */}
          {heavyTooltip && (
            <div className="w-full bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-xl p-3 text-xs font-bold text-amber-800 dark:text-amber-200" dir="ltr">
              <div className="font-black mb-1 text-center">📊 ניסוי וטעייה:</div>
              {heavyTooltip.map((row, i) => (
                <div key={i}>{row.label}</div>
              ))}
            </div>
          )}

          {/* HintBubble */}
          <HintBubble text={hintBubble} colorToken="emerald" />

          {/* Action buttons */}
          <div className="flex gap-1.5 sm:gap-2 w-full">
            <HintButton
              cooldown={hintCooldown}
              onClick={requestHint}
              colorToken="emerald"
              title="רמז"
              className="self-stretch"
            />
            {/* Heavy hint button for step 9 */}
            {effectiveStep === 9 && (
              <button
                onClick={handleHeavyHint}
                className="px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-2xl font-bold text-sm border border-amber-200 active:scale-95 transition-all"
              >
                📊
              </button>
            )}
            <button
              onClick={checkAnswer}
              disabled={checking}
              className="flex-1 py-3 sm:py-4 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl sm:rounded-3xl font-black text-base sm:text-xl md:text-2xl shadow-xl transition-all active:scale-95"
            >
              בדוק! ⚖️
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
          initGame();
        }}
      />
    </div>
  );
}
