import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import Hearts from '../shared/Hearts';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import GameTutorial from '../shared/GameTutorial';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';

/* Render pan expression with styled blocks for numbers and variables */
function PanContent({ text }) {
  // Split on 🟦 and operators to render styled blocks
  // Tokenize: split into [numbers, operators, variables]
  const tokens = [];
  const raw = Array.from(text.matchAll(/(🟦|🔴|\d+(?:\.\d+)?|[^🟦🔴\d]+)/gu));
  raw.forEach((m, i) => {
    const tok = m[0];
    if (tok === '🟦') {
      tokens.push({ type: 'var-blue', val: '?', key: i });
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
        if (t.type === 'var-blue') return (
          <span key={t.key} className="weight-var">{t.val}</span>
        );
        if (t.type === 'var-red') return (
          <span key={t.key} className="weight-var-red">{t.val}</span>
        );
        if (t.type === 'num') return (
          <span key={t.key} className="weight-num">{t.val}</span>
        );
        return (
          <span key={t.key} className="weight-op">{t.val}</span>
        );
      })}
    </span>
  );
}

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
  const [feedback, setFeedback] = useState({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
  const [errorFlash, setErrorFlash] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const ansRef = useRef(0);
  const lFnRef = useRef((v) => v);
  const rFnRef = useRef(() => 0);
  const timersRef = useRef([]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const initGame = useCallback(() => {
    const lvl = gameState.lvl;
    setLives(3);
    setJustLost(false);
    setSliderVal(1);
    setBeamAngle(0);
    setRulesHtml('');
    setConsecutiveErrors(0);

    const x = Math.floor(Math.random() * 11) + 3; // 3–13
    ansRef.current = x;

    if (lvl === 1) {
      const shape1 = Math.random() < 0.5 ? 'add' : 'sub';
      if (shape1 === 'add') {
        const b = Math.floor(Math.random() * 15) + 2;
        setLeftText(`🟦 + ${b}`);
        setRightText(`${x + b}`);
        lFnRef.current = (v) => v + b;
        rFnRef.current = () => x + b;
      } else {
        const b = Math.floor(Math.random() * 10) + 1;
        ansRef.current = x + b;
        setLeftText(`🟦 - ${b}`);
        setRightText(`${x}`);
        lFnRef.current = (v) => v - b;
        rFnRef.current = () => x;
      }
    } else if (lvl === 2) {
      const aPool = [2, 3, 4, 5];
      const a = aPool[Math.floor(Math.random() * aPool.length)];
      const shape2 = Math.random() < 0.5 ? 'mul' : 'div';
      if (shape2 === 'mul') {
        setLeftText(`🟦 × ${a}`);
        setRightText(`${x * a}`);
        lFnRef.current = (v) => v * a;
        rFnRef.current = () => x * a;
      } else {
        const q = Math.floor(Math.random() * 8) + 2;
        const divAns = q * a;
        ansRef.current = divAns;
        setLeftText(`🟦 ÷ ${a}`);
        setRightText(`${q}`);
        lFnRef.current = (v) => v / a;
        rFnRef.current = () => q;
      }
    } else if (lvl === 3) {
      const evenPool = [2, 4, 6, 8, 10, 12];
      const a = evenPool[Math.floor(Math.random() * evenPool.length)];
      setLeftText(`🟦 + ${a}`);
      setRightText(`20 - 🟦`);
      ansRef.current = (20 - a) / 2;
      lFnRef.current = (v) => v + a;
      rFnRef.current = (v) => 20 - v;
    } else if (lvl === 4) {
      const shape4 = Math.random() < 0.5 ? 'a' : 'b';
      if (shape4 === 'a') {
        setLeftText(`(🟦 - 2) × (🟦 + 4)`);
        const t = (x - 2) * (x + 4);
        setRightText(`${t}`);
        lFnRef.current = (v) => (v - 2) * (v + 4);
        rFnRef.current = () => t;
      } else {
        setLeftText(`(🟦 + 1) × (🟦 - 1)`);
        const t = (x + 1) * (x - 1);
        setRightText(`${t}`);
        lFnRef.current = (v) => (v + 1) * (v - 1);
        rFnRef.current = () => t;
      }
    } else {
      const shape5 = Math.random() < 0.5 ? 'a' : 'b';
      if (shape5 === 'a') {
        setRulesHtml('🔴 = 🟦 + 2');
        setLeftText(`🔴 × 🟦`);
        const t = (x + 2) * x;
        setRightText(`${t}`);
        lFnRef.current = (v) => (v + 2) * v;
        rFnRef.current = () => t;
      } else {
        setRulesHtml('🔴 = 🟦 + 3');
        setLeftText(`🔴 × (🟦 - 1)`);
        const t = (x + 3) * (x - 1);
        setRightText(`${t}`);
        lFnRef.current = (v) => (v + 3) * (v - 1);
        rFnRef.current = () => t;
      }
    }
  }, [gameState.lvl]);

  useEffect(() => {
    initGame();
  }, [initGame]);


  const showHint = () => {
    vibe(20);
    const lvl = gameState.lvl;
    const hints = [
      'נסה מספרים! אם ? + 3 = 10, אז ? = 10 − 3 = 7 ✓\nכלל: מה שמוסיפים — מחסירים מהצד השני.',
      'נסה מספרים! אם ? × 4 = 20, אז ? = 20 ÷ 4 = 5 ✓\nכלל: מה שכופלים — מחלקים בו מהצד השני.',
      '? מופיע בשני הצדדים!\nדוגמה: ? + 2 = 20 − ?\nחבר ? לשני הצדדים: 2×? = 18, אז ? = 9 ✓',
      'נסה להכניס מספרים: ? = 1, 2, 3...\nמצא את זה שהופך את שני הצדדים לשווים!',
      'ראה את הכלל למעלה 🔴 = ?, החלף אותו ונסה: ? = 1, 2, 3...',
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
    const v = sliderVal;
    const l = lFnRef.current(v);
    const r = rFnRef.current(v);

    const diff = r - l;
    const angle = Math.max(-22, Math.min(22, diff * 3.5));
    setBeamAngle(angle);

    if (Math.abs(l - r) < 0.1) {
      vibe([30, 50, 30]);
      const result = handleWin('balance');
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, unlocked: result.unlocked, pts: result.pts });
    } else {
      const newLives = lives - 1;
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
          title: 'הרמה ננעלה 🔒',
          text: 'השג 5 ניצחונות ברצף כדי להתקדם לרמה הבאה!',
          icon: 'warning',
          confirmButtonText: 'הבנתי 💪',
          confirmButtonColor: '#10b981',
          customClass: { popup: 'rounded-3xl' },
        }).then(() => setScreen('menu'));
      }
    }
  };

  const adjust = (delta) => {
    setSliderVal((v) => Math.max(1, Math.min(50, v + delta)));
    vibe(8);
  };

  return (
    <div className={`screen-enter flex flex-col items-center p-2 sm:p-4 flex-1 min-h-[calc(100dvh-80px)] ${errorFlash ? 'error-flash' : ''}`}>
      <GameTutorial gameName="balance" level={gameState.lvl} />
      <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-[2.5rem] px-3 sm:px-4 pt-4 sm:pt-5 pb-5 sm:pb-6 w-full max-w-xs sm:max-w-md shadow-xl flex flex-col items-center gap-3 sm:gap-4 border-2 border-green-200 dark:border-green-800/40 border-b-4 border-b-green-400 dark:border-b-green-700 transition-colors" style={{ overflow: 'visible' }}>

        {/* Lives */}
        <div className="flex gap-2 justify-center w-full mb-2">
          <Hearts lives={lives} maxLives={3} justLost={justLost} />
        </div>

        {/* Rules (level 5) */}
        {rulesHtml && (
          <div className="w-full flex justify-center -mb-1 sm:-mb-2">
            <div className="bg-rose-100 dark:bg-rose-900/30 font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm border border-rose-200">
              <PanContent text={rulesHtml} />
            </div>
          </div>
        )}

        {/* ─── Physical Scale ─── */}
        <div className="scale-scene w-full sm:w-auto">

          {/* Beam — rotates, holds everything */}
          <div
            className="scale-beam"
            style={{ transform: `rotate(${beamAngle}deg)` }}
          >
            {/* Left pan arm */}
            <div style={{ position: 'absolute', left: 6, top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* String */}
              <div className="pan-string" />
              {/* Pan — counter-rotates to stay level */}
              <div
                className="pan-tray bg-emerald-50 dark:bg-slate-700 border-emerald-300 dark:border-slate-500"
                style={{ transform: `translateX(-50%) rotate(${-beamAngle}deg)` }}
              >
                <PanContent text={leftText} />
              </div>
            </div>

            {/* Right pan arm */}
            <div style={{ position: 'absolute', right: 6, top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* String */}
              <div className="pan-string" />
              {/* Pan — counter-rotates */}
              <div
                className="pan-tray bg-emerald-50 dark:bg-slate-700 border-emerald-300 dark:border-slate-500"
                style={{ transform: `translateX(-50%) rotate(${-beamAngle}deg)` }}
              >
                <PanContent text={rightText} />
              </div>
            </div>
          </div>

          {/* Fixed elements: pivot on top, pole + base below */}
          <div className="scale-pivot" />
          <div className="scale-pole" />
          <div className="scale-base" />
          {/* Spacer so pans have room below base */}
          <div style={{ height: 90 }} />
        </div>

        {/* ─── Input Area ─── */}
        <div className="flex flex-col items-center gap-2 sm:gap-4 w-full pb-1 sm:pb-2">

          {/* Variable display */}
          <div className="flex justify-center items-center gap-2" dir="ltr">
            <span className="weight-var" style={{ width: 36, height: 36, fontSize: '1rem' }}>?</span>
            <span className="text-2xl font-bold text-slate-400 dark:text-slate-500 leading-none">=</span>
            <span className="text-4xl font-black text-green-500 leading-none min-w-[48px] text-center">{sliderVal}</span>
          </div>

          {/* +/- control */}
          <div className="val-control select-none scale-90 sm:scale-100 origin-center">
            <button className="val-btn" onClick={() => adjust(-1)} aria-label="פחות">−</button>
            <div className="val-display">{sliderVal}</div>
            <button className="val-btn" onClick={() => adjust(1)} aria-label="יותר">+</button>
          </div>

          {consecutiveErrors >= 2 && (
            <div className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-bold animate-pulse text-center px-2">
              💡 קשה? לחץ על הרמז ותחשוב בשלבים!
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-1.5 sm:gap-2 w-full">
            <button
              onClick={showHint}
              className={`w-12 sm:w-16 py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-black text-lg sm:text-xl shadow-sm transition-all active:scale-95 ${consecutiveErrors >= 2 ? 'bg-amber-400 text-white animate-pulse' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-200'}`}
            >
              💡
            </button>
            <button
              onClick={checkAnswer}
              className="flex-1 py-3 sm:py-4 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-2xl sm:rounded-3xl font-black text-base sm:text-xl md:text-2xl shadow-xl transition-all active:scale-95"
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
