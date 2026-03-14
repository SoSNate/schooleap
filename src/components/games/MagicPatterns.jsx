import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import Hearts from '../shared/Hearts';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import Fraction from '../shared/Fraction';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';

const ONBOARD_KEY = 'onboard_magicPatterns';

// ── helpers ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeOptions(answer, candidates) {
  const unique = [...new Set(candidates.filter((v) => v !== answer && v > 0))];
  const distractors = shuffle(unique).slice(0, 3);
  let fill = 1;
  while (distractors.length < 3) {
    const v = answer + fill++;
    if (!distractors.includes(v)) distractors.push(v);
  }
  return shuffle([answer, ...distractors]);
}

// ── question generators ────────────────────────────────────────────────────────
function genCommutative() {
  const op = Math.random() < 0.5 ? '+' : '×';
  let a, b;
  do { a = rnd(2, 9); b = rnd(2, 9); } while (a === b);
  return {
    type: 'commutative',
    lhsParts: [a, ` ${op} `, b],
    rhsParts: [b, ` ${op} `, { slot: true }],
    answer: a,
    options: makeOptions(a, [b, a + 1, a - 1, b + 1, b - 1]),
    key: `com_${op}_${a}_${b}`,
    scaffoldType: 'commutative',
  };
}

function genAssociative() {
  let a, b, c;
  do { a = rnd(2, 8); b = rnd(2, 8); c = rnd(2, 8); } while (a === b || b === c || a === c);
  return {
    type: 'associative',
    lhsParts: ['(', a, ' + ', b, ') + ', c],
    rhsParts: [a, ' + (', { slot: true }, ' + ', c, ')'],
    answer: b,
    options: makeOptions(b, [a, c, b + 1, b - 1, a + 1]),
    key: `assoc_${a}_${b}_${c}`,
    scaffoldType: 'associative',
  };
}

function genDistributive() {
  const a = rnd(2, 6);
  let b, c;
  do { b = rnd(2, 8); c = rnd(2, 8); } while (b === c);
  const sign = Math.random() < 0.5 ? '+' : '\u2212';
  return {
    type: 'distributive',
    lhsParts: [a, ' \u00d7 (', b, ` ${sign} `, c, ')'],
    rhsParts: [a, ' \u00d7 ', b, ` ${sign} `, a, ' \u00d7 ', { slot: true }],
    answer: c,
    options: makeOptions(c, [b, a, c + 1, c - 1, b + 1]),
    key: `dist_${a}_${b}_${sign}_${c}`,
    scaffoldType: 'distributive',
  };
}

function genFraction() {
  const b = rnd(2, 6);
  const a = rnd(1, b - 1);
  const k = rnd(2, 4);
  const answer = a * k;
  const newDenom = b * k;
  return {
    type: 'fraction',
    lhsFrac: { n: a, d: b },
    rhsFrac: { d: newDenom },
    answer,
    options: makeOptions(answer, [a, b, newDenom, answer + 1, answer - 1, k]),
    key: `frac_${a}_${b}_${k}`,
    scaffoldType: 'fraction',
  };
}

const GENERATORS = {
  1: [genCommutative],
  2: [genAssociative],
  3: [genDistributive],
  4: [genFraction],
  5: [genCommutative, genAssociative, genDistributive, genFraction],
};

const SCAFFOLD_INFO = {
  commutative: { name: 'חוק החילוף', icon: '🔄', desc: 'a \u00d7 b = b \u00d7 a \u2014 סדר לא משנה' },
  associative:  { name: 'חוק הקיבוץ', icon: '📦', desc: '(a+b)+c = a+(b+c) \u2014 אפשר לקבץ אחרת' },
  distributive: { name: 'חוק הפילוח', icon: '✂️', desc: 'a\u00d7(b+c) = a\u00d7b + a\u00d7c \u2014 הכפל מתפלח' },
  fraction:     { name: 'שברים שקולים', icon: '⚖️', desc: 'כופלים מונה ומכנה באותו k' },
};

function generateQuestion(lvl, recentKeys) {
  const pool = GENERATORS[lvl] || GENERATORS[1];
  for (let attempt = 0; attempt < 20; attempt++) {
    const gen = pool[Math.floor(Math.random() * pool.length)];
    const q = gen();
    if (!recentKeys.includes(q.key)) return q;
  }
  return pool[Math.floor(Math.random() * pool.length)]();
}

// ── sub-components ────────────────────────────────────────────────────────────
function Slot({ filled, isWrong }) {
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[2.8rem] h-11 px-2 rounded-xl border-2 font-black text-xl transition-all math-font ${
        isWrong
          ? 'bg-red-100 dark:bg-red-900/40 border-red-400 text-red-600 dark:text-red-400 scale-110'
          : filled != null
            ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400 text-indigo-700 dark:text-indigo-300'
            : 'bg-slate-100 dark:bg-slate-700 border-dashed border-slate-400 dark:border-slate-500 text-slate-400'
      }`}
    >
      {filled != null ? filled : '\u25a1'}
    </span>
  );
}

function renderParts(parts, slotFill, isWrong) {
  return parts.map((p, i) => {
    if (p !== null && typeof p === 'object' && p.slot) {
      return <Slot key={i} filled={slotFill} isWrong={isWrong} />;
    }
    return (
      <span key={i} className="math-font font-black text-slate-700 dark:text-slate-200">
        {p}
      </span>
    );
  });
}

// ── main component ────────────────────────────────────────────────────────────
export default function MagicPatterns() {
  const gameState = useGameStore((s) => s.magicPatterns);
  const handleWin = useGameStore((s) => s.handleWin);
  const handleGameFail = useGameStore((s) => s.handleGameFail);
  const setScreen = useGameStore((s) => s.setScreen);

  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [wrongIdx, setWrongIdx] = useState(null);
  const [lives, setLives] = useState(3);
  const [justLost, setJustLost] = useState(false);
  const [errorFlash, setErrorFlash] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [consecutiveSuccesses, setConsecutiveSuccesses] = useState(0);
  const [feedback, setFeedback] = useState({ visible: false, isLevelUp: false, pts: 0 });

  const recentRef = useRef([]);
  const scaffoldStage = Math.min(2, Math.floor(consecutiveSuccesses / 2));

  const newQuestion = useCallback(() => {
    const q = generateQuestion(gameState.lvl, recentRef.current);
    recentRef.current = [q.key, ...recentRef.current].slice(0, 3);
    setQuestion(q);
    setSelected(null);
    setWrongIdx(null);
    setLives(3);
    setJustLost(false);
    setConsecutiveErrors(0);
  }, [gameState.lvl]);

  useEffect(() => { newQuestion(); }, [newQuestion]);

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARD_KEY)) {
        Swal.fire({
          title: 'תבניות הקסם 🪄',
          html: '<div class="text-right text-sm leading-relaxed">בכל שאלה תראה משוואה עם תיבה ריקה ☐.<br><br>בחר את המספר הנכון מהכפתורים למטה כדי להשלים את הנוסחה!<br><br>🧠 כל שאלה מבוססת על חוק מתמטיקה חשוב.</div>',
          confirmButtonText: 'בוא נגלה!',
          confirmButtonColor: '#7c3aed',
          customClass: { popup: 'rounded-3xl' },
        });
        localStorage.setItem(ONBOARD_KEY, '1');
      }
    } catch {}
  }, []);

  const showHint = () => {
    if (!question) return;
    vibe(20);
    const info = SCAFFOLD_INFO[question.scaffoldType];
    Swal.fire({
      title: `💡 ${info.name}`,
      html: `<div class="text-right text-sm math-font leading-relaxed" dir="ltr">${info.desc}</div>`,
      icon: 'info',
      confirmButtonText: 'הבנתי!',
      confirmButtonColor: '#7c3aed',
      customClass: { popup: 'rounded-3xl' },
    });
  };

  const handleOptionTap = (option, idx) => {
    if (!question || selected != null) return;
    vibe(10);
    setSelected(option);

    if (option === question.answer) {
      vibe([30, 50, 30]);
      setConsecutiveSuccesses((cs) => cs + 1);
      const result = handleWin('magicPatterns');
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, pts: result.pts });
    } else {
      vibe([50, 50, 50]);
      setWrongIdx(idx);
      const newLives = lives - 1;
      setLives(newLives);
      setJustLost(true);
      setErrorFlash(true);
      setConsecutiveErrors((ce) => ce + 1);
      setConsecutiveSuccesses(0);
      setTimeout(() => {
        setWrongIdx(null);
        setSelected(null);
        setErrorFlash(false);
        setJustLost(false);
      }, 600);

      if (newLives <= 0) {
        const result = handleGameFail('magicPatterns');
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
            text: 'נגמרו הניסיונות, בוא ננסה שאלה חדשה.',
            icon: 'error',
            confirmButtonColor: '#ef4444',
            customClass: { popup: 'rounded-3xl' },
          }).then(() => newQuestion());
        }
      }
    }
  };

  const isUnlimited = gameState.lvl === 5;
  if (!question) return null;
  const scaffoldInfo = SCAFFOLD_INFO[question.scaffoldType];

  return (
    <div className={`screen-enter flex flex-col items-center p-4 flex-1 min-h-[calc(100dvh-80px)] ${errorFlash ? 'error-flash' : ''}`}>
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 w-full max-w-md shadow-xl flex flex-col items-center gap-5 border-b-4 border-slate-200 dark:border-slate-700 transition-colors">

        {/* Lives */}
        <div className="flex gap-2 justify-center w-full h-8 mb-2">
          {isUnlimited ? (
            <Hearts unlimitedText="ללא הגבלת ניסיונות" />
          ) : (
            <Hearts lives={lives} maxLives={3} justLost={justLost} />
          )}
        </div>

        {/* Scaffold hint — fades out as player improves */}
        {scaffoldStage < 2 && (
          <div className={`w-full rounded-2xl px-4 py-2 text-center transition-all ${
            scaffoldStage === 0
              ? 'bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700'
              : 'bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600'
          }`}>
            <span className="text-sm font-bold text-violet-700 dark:text-violet-300">
              {scaffoldInfo.icon} {scaffoldInfo.name}
            </span>
            {scaffoldStage === 0 && (
              <p className="text-xs text-violet-600/80 dark:text-violet-400/80 mt-0.5 math-font" dir="ltr">
                {scaffoldInfo.desc}
              </p>
            )}
          </div>
        )}

        {/* Equation display */}
        <div
          className="w-full rounded-2xl bg-slate-50 dark:bg-slate-700/50 p-5 flex items-center justify-center flex-wrap gap-2 min-h-[90px]"
          dir="ltr"
        >
          {question.type === 'fraction' ? (
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <Fraction numerator={question.lhsFrac.n} denominator={question.lhsFrac.d} />
              <span className="math-font font-black text-2xl text-slate-400">=</span>
              <span className="fraction">
                <span className="numerator">
                  <Slot filled={selected} isWrong={wrongIdx != null} />
                </span>
                <span className="denominator font-black text-slate-700 dark:text-slate-200">
                  {question.rhsFrac.d}
                </span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 flex-wrap justify-center text-2xl font-black">
              {renderParts(question.lhsParts, null, false)}
              <span className="math-font font-black text-slate-400 mx-1">=</span>
              {renderParts(question.rhsParts, selected, wrongIdx != null)}
            </div>
          )}
        </div>

        {/* Consecutive errors nudge */}
        {consecutiveErrors >= 2 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-bold animate-pulse">
            💡 נראה שקשה — לחץ על הרמז!
          </p>
        )}

        {/* Option bank — 2×2 grid */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {question.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleOptionTap(opt, idx)}
              className={`py-5 rounded-3xl font-black text-2xl shadow-sm transition-all active:scale-95 math-font ${
                wrongIdx === idx
                  ? 'bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400 border-2 border-red-300 dark:border-red-700 scale-105'
                  : selected === opt && opt === question.answer
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-400'
                    : 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-2 border-violet-200 dark:border-violet-700 hover:bg-violet-100 dark:hover:bg-violet-800/40'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Hint button */}
        <button
          onClick={showHint}
          className={`w-full py-3 rounded-3xl font-black text-lg transition-all active:scale-95 ${
            consecutiveErrors >= 2
              ? 'bg-amber-400 text-white animate-pulse'
              : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-800/40'
          }`}
        >
          💡 הסבר על הנוסחה
        </button>
      </div>

      <FeedbackOverlay
        visible={feedback.visible}
        isLevelUp={feedback.isLevelUp}
        pts={feedback.pts}
        onDone={() => {
          if (feedback.isLevelUp) setConsecutiveSuccesses(0);
          setFeedback({ visible: false, isLevelUp: false, pts: 0 });
          newQuestion();
        }}
      />
    </div>
  );
}
