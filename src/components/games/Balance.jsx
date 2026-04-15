import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import Hearts from '../shared/Hearts';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import GameTutorial from '../shared/GameTutorial';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';

const ONBOARD_KEY = 'onboard_balance';

/* Render pan expression with styled blocks for numbers and variables */
function PanContent({ text }) {
  // Split on 🟦 and operators to render styled blocks
  // Tokenize: split into [numbers, operators, variables]
  const tokens = [];
  let remaining = text;
  const re = /(🟦|🔴|\d+(?:\.\d+)?|[+\-×÷*/()=\s]+)/g;
  let match;
  let last = 0;
  re.lastIndex = 0;
  const raw = Array.from(remaining.matchAll(/(🟦|🔴|\d+(?:\.\d+)?|[^🟦🔴\d]+)/g));
  raw.forEach((m, i) => {
    const tok = m[0];
    if (tok === '🟦' || tok === '🔴') {
      tokens.push({ type: 'var', val: tok === '🔴' ? '🔴' : '?', key: i });
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
        if (t.type === 'var') return (
          <span key={t.key} className="weight-var">{t.val}</span>
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

  // First-time onboarding
  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARD_KEY)) {
        Swal.fire({
          title: 'שומרים על איזון ⚖️',
          html: '<div class="text-right text-sm leading-relaxed">על המאזניים מוצגת משוואה עם נעלם ?.<br><br>השתמש בכפתורי + ו- כדי לבחור ערך לנעלם, ואז לחץ "בדוק!".<br><br>⚖️ כשהמאזניים מאוזנים לגמרי — ניצחת!</div>',
          confirmButtonText: 'יאללה נאזן!',
          confirmButtonColor: '#10b981',
          customClass: { popup: 'rounded-3xl' },
        });
        localStorage.setItem(ONBOARD_KEY, '1');
      }
    } catch {}
  }, []);

  const showHint = () => {
    vibe(20);
    const lvl = gameState.lvl;
    const hints = [
      'חשוב בשלבים: אם ? + b = c אז ? = c − b. כתוב את המשוואה ופתור אותה!',
      'כפל: חלק את שני הצדדים במספר שכופלים בו.\nחילוק: כפל את שני הצדדים במחלק!',
      '?  מופיע משני הצדדים! כתוב: ? + a = 20 − ?, אסוף: 2×? = 20 − a, חלק ב-2.',
      'פתח את הסוגריים קודם. מצא ערך שהופך את שני הצדדים לשווים.',
      'החלף את 🔴 בביטוי שמופיע למעלה, פשט — ואז פתור: לאיזה ? המשוואה מתקיימת?',
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
    <div className={`screen-enter flex flex-col items-center p-4 flex-1 min-h-[calc(100dvh-80px)] ${errorFlash ? 'error-flash' : ''}`}>
      <GameTutorial gameName="balance" level={gameState.lvl} />
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] px-4 pt-5 pb-6 w-full max-w-md shadow-xl flex flex-col items-center gap-4 border-2 border-green-200 dark:border-green-800/40 border-b-4 border-b-green-400 dark:border-b-green-700 transition-colors" style={{ overflow: 'visible' }}>

        {/* Lives */}
        <div className="flex gap-2 justify-center w-full">
          <Hearts lives={lives} maxLives={3} justLost={justLost} />
        </div>

        {/* Rules (level 5) */}
        {rulesHtml && (
          <div className="w-full flex justify-center -mb-2">
            <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-bold px-4 py-2 rounded-xl text-sm border border-rose-200 math-font" dir="ltr">
              {rulesHtml}
            </div>
          </div>
        )}

        {/* ─── Physical Scale ─── */}
        <div className="scale-scene">

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

          {/* Fixed elements (don't rotate) */}
          <div className="scale-pivot" />
          <div className="scale-pole" />
          <div className="scale-base" />
        </div>

        {/* ─── Input Area ─── */}
        <div className="flex flex-col items-center gap-4 w-full pb-2">

          {/* Variable display */}
          <div className="flex justify-center items-center gap-3" dir="ltr">
            <span className="weight-var text-lg w-8 h-8">?</span>
            <span className="text-2xl font-bold text-slate-400 dark:text-slate-500">=</span>
            <span className="text-5xl font-black text-green-500 min-w-[60px] text-center">{sliderVal}</span>
          </div>

          {/* +/- control */}
          <div className="val-control select-none">
            <button className="val-btn" onClick={() => adjust(-1)} aria-label="פחות">−</button>
            <div className="val-display">{sliderVal}</div>
            <button className="val-btn" onClick={() => adjust(1)} aria-label="יותר">+</button>
          </div>

          {consecutiveErrors >= 2 && (
            <div className="text-xs text-amber-600 dark:text-amber-400 font-bold animate-pulse">
              💡 קשה? לחץ על הרמז ותחשוב בשלבים!
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 w-full">
            <button
              onClick={showHint}
              className={`w-16 py-4 rounded-3xl font-black text-xl shadow-sm transition-all active:scale-95 ${consecutiveErrors >= 2 ? 'bg-amber-400 text-white animate-pulse' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-200'}`}
            >
              💡
            </button>
            <button
              onClick={checkAnswer}
              className="flex-1 py-4 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-3xl font-black text-xl md:text-2xl shadow-xl transition-all active:scale-95"
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
