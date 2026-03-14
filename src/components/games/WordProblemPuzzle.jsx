import { useState, useEffect, useRef, useCallback } from 'react';
import useGameStore from '../../store/useGameStore';
import Hearts from '../shared/Hearts';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';

/* ── Telemetry stub ──────────────────────────────────────────────────────── */
function telemetry(event, data) { /* no-op until LMS integration */ }

/* ── Config ──────────────────────────────────────────────────────────────── */
export const DEFAULT_CONFIG = { maxLvl: 5, livesPerRound: 3 };
const ONBOARD_KEY = 'onboard_word';

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
const NAMES = ['יוסי', 'דנה', 'נועה', 'איתמר', 'שירה', 'רועי', 'יעל', 'דני'];
const ITEMS = ['סוכריות', 'בלונים', 'מדבקות', 'עפרונות', 'כדורים', 'ספרים'];

/* ── Schemas ─────────────────────────────────────────────────────────────── */
// eqParts: number = slot index into tokens[], string = static symbol/text
const SCHEMAS = [
  {
    id: 1, diff: 1,
    gen(lvl) {
      const name1 = pick(NAMES), name2 = pick(NAMES.filter(n => n !== name1)), item = pick(ITEMS);
      let n, m; do { n = rnd(3, 8 + lvl * 3); m = rnd(2, 6 + lvl * 2); } while (n === m);
      return {
        text: `ל${name1} יש ${n} ${item} ול${name2} יש ${m} ${item}. כמה יש להם יחד?`,
        tokens: [{ display: String(n), value: n }, { display: String(m), value: m }],
        opHint: 'יחד → חיבור (+)',
        eqParts: [0, ' + ', 1],
        answer: n + m,
      };
    },
  },
  {
    id: 2, diff: 1,
    gen(lvl) {
      const m = rnd(2, 6 + lvl), n = m + rnd(3, 9 + lvl);
      return {
        text: `על הענף ישבו ${n} ציפורים. ${m} ציפורים עפו. כמה נשארו?`,
        tokens: [{ display: String(n), value: n }, { display: String(m), value: m }],
        opHint: 'עפו → חיסור (−)',
        eqParts: [0, ' − ', 1],
        answer: n - m,
      };
    },
  },
  {
    id: 3, diff: 2,
    gen(lvl) {
      const total = rnd(12, 28 + lvl * 3), boys = rnd(3, total - 3);
      return {
        text: `בכיתה יש ${total} ילדים. ${boys} מהם בנים. כמה בנות?`,
        tokens: [{ display: String(total), value: total }, { display: String(boys), value: boys }],
        opHint: 'כמה חסר → חיסור (−)',
        eqParts: [0, ' − ', 1],
        answer: total - boys,
      };
    },
  },
  {
    id: 4, diff: 2,
    gen(lvl) {
      let boxes, perBox; do { boxes = rnd(2, 4 + lvl); perBox = rnd(3, 7 + lvl); } while (boxes === perBox);
      return {
        text: `ב-${boxes} קופסאות יש ${perBox} כדורים בכל קופסה. כמה כדורים בסך הכל?`,
        tokens: [{ display: String(boxes), value: boxes }, { display: String(perBox), value: perBox }],
        opHint: 'בכל → כפל (×)',
        eqParts: [0, ' × ', 1],
        answer: boxes * perBox,
      };
    },
  },
  {
    id: 5, diff: 3,
    gen(lvl) {
      const groups = rnd(2, 5 + lvl), each = rnd(3, 7 + lvl), total = groups * each;
      return {
        text: `יש ${total} ממתקים. מחלקים שווה ל-${each} ילדים. כמה כל ילד מקבל?`,
        tokens: [{ display: String(total), value: total }, { display: String(each), value: each }],
        opHint: 'מחלקים שווה → חילוק (÷)',
        eqParts: [0, ' ÷ ', 1],
        answer: groups,
      };
    },
  },
  {
    id: 6, diff: 3,
    gen(lvl) {
      let base, factor; do { base = rnd(4, 8 + lvl); factor = rnd(2, 4); } while (base === factor);
      return {
        text: `מחיר ספר הוא ${base} שקלים. מחיר המשחק גדול פי ${factor} ממנו. כמה עולה המשחק?`,
        tokens: [{ display: String(base), value: base }, { display: String(factor), value: factor }],
        opHint: 'פי → כפל (×)',
        eqParts: [0, ' × ', 1],
        answer: base * factor,
      };
    },
  },
  {
    id: 7, diff: 4,
    gen(lvl) {
      let start, items, price, answer;
      do { start = rnd(30, 70 + lvl * 10); items = rnd(2, 4); price = rnd(4, 9 + lvl); answer = start - items * price; } while (answer <= 0);
      return {
        text: `ל${pick(NAMES)} היו ${start} שקלים. הוא קנה ${items} ספרים ב-${price} שקלים כל אחד. כמה נשאר?`,
        tokens: [
          { display: String(start), value: start },
          { display: String(items), value: items },
          { display: String(price), value: price },
        ],
        opHint: 'כל אחד → × , נשאר → −',
        eqParts: [0, ' − (', 1, ' × ', 2, ')'],
        answer,
      };
    },
  },
  {
    id: 8, diff: 4,
    gen(lvl) {
      const count = rnd(2, 5), price = rnd(5, 12 + lvl), extra = rnd(5, 20 + lvl);
      return {
        text: `${pick(NAMES)} קנה ${count} ספרים ב-${price} שקלים כל אחד, ועוד תיק ב-${extra} שקלים. כמה שילם בסך הכל?`,
        tokens: [
          { display: String(count), value: count },
          { display: String(price), value: price },
          { display: String(extra), value: extra },
        ],
        opHint: 'כל אחד → × , ועוד → +',
        eqParts: ['(', 0, ' × ', 1, ') + ', 2],
        answer: count * price + extra,
      };
    },
  },
  {
    id: 9, diff: 5,
    gen(lvl) {
      let n1, n2, n3, answer;
      do { n1 = rnd(40, 100); n2 = rnd(2, 5); n3 = rnd(6, 13 + lvl); answer = n1 - n2 * n3; } while (answer <= 0);
      return {
        text: `${pick(NAMES)} חסך ${n1} שקלים. הוא מוציא ${n3} שקלים בכל שבוע, במשך ${n2} שבועות. כמה נשאר?`,
        tokens: [
          { display: String(n1), value: n1 },
          { display: String(n2), value: n2 },
          { display: String(n3), value: n3 },
        ],
        opHint: 'בכל שבוע × שבועות → −',
        eqParts: [0, ' − (', 1, ' × ', 2, ')'],
        answer,
      };
    },
  },
  {
    id: 10, diff: 5,
    gen(lvl) {
      const mapDist = rnd(3, 9), scale = pick([100, 200, 500]);
      return {
        text: `במפה, המרחק בין שתי ערים הוא ${mapDist} ס"מ. קנה המידה הוא 1:${scale}. מה המרחק האמיתי בס"מ?`,
        tokens: [{ display: String(mapDist), value: mapDist }, { display: String(scale), value: scale }],
        opHint: 'קנה מידה → כפל (×)',
        eqParts: [0, ' × ', 1],
        answer: mapDist * scale,
      };
    },
  },
];

const LEVEL_SCHEMAS = { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8], 5: [9, 10] };

/* ── generateQuestion ────────────────────────────────────────────────────── */
export function generateQuestion(lvl, recent = [], config = DEFAULT_CONFIG) {
  const ids = LEVEL_SCHEMAS[Math.min(5, Math.max(1, lvl))] || LEVEL_SCHEMAS[1];
  const pool = SCHEMAS.filter(s => ids.includes(s.id));
  for (let i = 0; i < 30; i++) {
    const schema = pool[Math.floor(Math.random() * pool.length)];
    if (recent.includes(schema.id) && pool.length > 1) continue;
    const data = schema.gen(lvl);
    if (!data || data.answer <= 0) continue;
    return { ...data, schemaId: schema.id };
  }
  const s = pool[0];
  return { ...s.gen(1), schemaId: s.id };
}

/* ── parseTextSpans ──────────────────────────────────────────────────────── */
// Returns [{type:'text'|'token', content, tokenIdx?}]
// Each token index used at most once (handles duplicate display values)
function parseTextSpans(text, tokens) {
  const spans = [];
  const usedIdx = new Set();
  let i = 0;
  while (i < text.length) {
    let found = false;
    for (let ti = 0; ti < tokens.length; ti++) {
      if (usedIdx.has(ti)) continue;
      const val = tokens[ti].display;
      if (text.startsWith(val, i)) {
        spans.push({ type: 'token', content: val, tokenIdx: ti });
        usedIdx.add(ti);
        i += val.length;
        found = true;
        break;
      }
    }
    if (!found) {
      if (spans.length && spans[spans.length - 1].type === 'text') {
        spans[spans.length - 1].content += text[i];
      } else {
        spans.push({ type: 'text', content: text[i] });
      }
      i++;
    }
  }
  return spans;
}

/* ── Numpad ──────────────────────────────────────────────────────────────── */
function Numpad({ onInput, onDelete }) {
  const keys = [7, 8, 9, 4, 5, 6, 1, 2, 3, null, 0, '⌫'];
  return (
    <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px]">
      {keys.map((k, idx) => (
        <button
          key={idx}
          onClick={() => k === '⌫' ? onDelete() : k !== null && onInput(String(k))}
          disabled={k === null}
          className={`h-14 rounded-xl font-black text-xl shadow-md active:scale-90 transition-all
            ${k === null ? 'opacity-0 pointer-events-none' :
              k === '⌫' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400' :
              'bg-white dark:bg-slate-700 text-indigo-900 dark:text-indigo-100 border-b-4 border-indigo-100 dark:border-slate-600'}`}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function WordProblemPuzzle({ config = DEFAULT_CONFIG }) {
  const gameState      = useGameStore(s => s.word);
  const handleWin      = useGameStore(s => s.handleWin);
  const handleGameFail = useGameStore(s => s.handleGameFail);
  const setScreen      = useGameStore(s => s.setScreen);

  const [question,   setQuestion]   = useState(null);
  const [step,       setStep]       = useState('collect'); // collect | arrange | solve
  const [collected,  setCollected]  = useState(new Set()); // set of tokenIdx tapped
  const [slotMap,    setSlotMap]    = useState({});        // slotIdx → tokenIdx
  const [selToken,   setSelToken]   = useState(null);      // tokenIdx selected in tray
  const [userAnswer, setUserAnswer] = useState('');
  const [lives,      setLives]      = useState(config.livesPerRound);
  const [justLost,   setJustLost]   = useState(false);
  const [disabled,   setDisabled]   = useState(false);
  const [errorMsg,   setErrorMsg]   = useState('');
  const [consErrors, setConsErrors] = useState(0);
  const [feedback,   setFeedback]   = useState({ visible: false, isLevelUp: false, pts: 0 });

  const recentRef = useRef([]);

  /* ── new question ──────────────────────────────────────────────────────── */
  const newQuestion = useCallback(() => {
    const q = generateQuestion(gameState.lvl, recentRef.current, config);
    recentRef.current = [q.schemaId, ...recentRef.current].slice(0, 3);
    setQuestion(q);
    setStep('collect');
    setCollected(new Set());
    setSlotMap({});
    setSelToken(null);
    setUserAnswer('');
    setLives(config.livesPerRound);
    setJustLost(false);
    setDisabled(false);
    setErrorMsg('');
    setConsErrors(0);
  }, [gameState.lvl, config]);

  useEffect(() => { newQuestion(); }, [newQuestion]);

  /* ── onboarding ────────────────────────────────────────────────────────── */
  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARD_KEY)) {
        Swal.fire({
          title: 'המעבדה המילולית 🧠',
          html: `<div class="text-right text-sm leading-relaxed">
            <b>שלב 1 — אסוף:</b> לחץ על המספרים בסיפור.<br><br>
            <b>שלב 2 — סדר:</b> הנח אותם בסלוטים של המשוואה.<br><br>
            <b>שלב 3 — פתור:</b> הזן את התוצאה!
          </div>`,
          confirmButtonText: 'יאללה! 🚀',
          confirmButtonColor: '#4f46e5',
          customClass: { popup: 'rounded-3xl' },
        });
        localStorage.setItem(ONBOARD_KEY, '1');
      }
    } catch {}
  }, []);

  /* ── collect: tap number in text ──────────────────────────────────────── */
  const handleTokenTap = useCallback((tokenIdx) => {
    if (step !== 'collect' || collected.has(tokenIdx)) return;
    vibe(10);
    const next = new Set(collected);
    next.add(tokenIdx);
    setCollected(next);
    if (next.size === question.tokens.length) {
      setTimeout(() => setStep('arrange'), 500);
    }
  }, [step, collected, question]);

  /* ── arrange: tap tray token (select/deselect) ─────────────────────────── */
  const handleTrayTap = useCallback((tokenIdx) => {
    if (step !== 'arrange') return;
    vibe(10);
    setSelToken(prev => prev === tokenIdx ? null : tokenIdx);
  }, [step]);

  /* ── arrange: tap equation slot ────────────────────────────────────────── */
  const handleSlotTap = useCallback((slotIdx) => {
    if (step !== 'arrange') return;
    // Filled slot → return token to tray
    if (slotMap[slotIdx] !== undefined) {
      const next = { ...slotMap };
      delete next[slotIdx];
      setSlotMap(next);
      vibe(10);
      return;
    }
    if (selToken === null) return;
    vibe(10);
    const next = { ...slotMap, [slotIdx]: selToken };
    setSlotMap(next);
    setSelToken(null);
    const uniqueSlots = [...new Set(question.eqParts.filter(p => typeof p === 'number'))];
    if (uniqueSlots.every(si => next[si] !== undefined)) {
      setTimeout(() => setStep('solve'), 400);
    }
  }, [step, slotMap, selToken, question]);

  /* ── solve: check answer ────────────────────────────────────────────────── */
  const handleCheck = useCallback(() => {
    if (disabled || !question || !userAnswer) return;
    const ans = parseFloat(userAnswer);
    if (Math.abs(ans - question.answer) < 0.01) {
      vibe([30, 50, 30]);
      setDisabled(true);
      setConsErrors(0);
      telemetry('win', { schemaId: question.schemaId, lvl: gameState.lvl });
      const result = handleWin('word');
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, pts: result.pts });
    } else {
      vibe([50, 50, 50]);
      setConsErrors(c => c + 1);
      setJustLost(true);
      setTimeout(() => setJustLost(false), 600);
      setErrorMsg('לא מדויק, נסה שוב 💡');
      setTimeout(() => setErrorMsg(''), 2500);
      telemetry('error', { schemaId: question.schemaId, answer: ans });
      setLives(prev => {
        const next = prev - 1;
        if (next <= 0) {
          setDisabled(true);
          setTimeout(() => {
            const r = handleGameFail('word');
            if (r === 'locked') {
              Swal.fire({
                title: 'הרמה ננעלה 🔒',
                html: '<div class="text-right">קצת קשה כרגע — נעלנו את הרמה לתרגול! 🧠</div>',
                icon: 'warning', confirmButtonText: 'הבנתי', confirmButtonColor: '#4f46e5',
                customClass: { popup: 'rounded-3xl' },
              }).then(() => setScreen('menu'));
            } else {
              Swal.fire({
                title: 'אופס! 💥', text: 'נגמרו הניסיונות — שאלה חדשה!',
                icon: 'error', confirmButtonColor: '#ef4444',
                customClass: { popup: 'rounded-3xl' },
              }).then(() => newQuestion());
            }
          }, 600);
        }
        return next;
      });
    }
  }, [disabled, question, userAnswer, gameState.lvl, handleWin, handleGameFail, setScreen, newQuestion]);

  if (!question) return null;

  const spans = step === 'collect' ? parseTextSpans(question.text, question.tokens) : [];
  const usedTokenIdxs = new Set(Object.values(slotMap));
  const trayTokens = question.tokens.map((t, i) => ({ ...t, idx: i })).filter(t => !usedTokenIdxs.has(t.idx));
  const stepLabel = step === 'collect' ? '📖 שלב 1: אסוף את הנתונים' : step === 'arrange' ? '🧩 שלב 2: בנה את המשוואה' : '🔢 שלב 3: פתור';

  return (
    <div className="screen-enter flex flex-col flex-1 min-h-[calc(100dvh-80px)]" dir="rtl">
      <div className="flex-1 flex flex-col items-center p-4 gap-4 overflow-y-auto">

        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md px-5 py-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mb-0.5">{stepLabel}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">{question.opHint}</p>
          </div>
          <Hearts lives={lives} maxLives={config.livesPerRound} justLost={justLost} />
        </div>

        {/* ── COLLECT ─────────────────────────────────────────────────── */}
        {step === 'collect' && (
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-400 mb-4">לחץ על כל המספרים בסיפור:</p>
            <p className="text-xl leading-loose text-slate-800 dark:text-slate-100" dir="rtl">
              {spans.map((span, i) => {
                if (span.type === 'text') return <span key={i}>{span.content}</span>;
                const done = collected.has(span.tokenIdx);
                return (
                  <button
                    key={i}
                    onClick={() => handleTokenTap(span.tokenIdx)}
                    className={`mx-0.5 px-2 py-0.5 rounded-lg font-black text-lg transition-all active:scale-90
                      ${done
                        ? 'bg-indigo-200 dark:bg-indigo-800/60 text-indigo-400 line-through opacity-50'
                        : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 border-b-2 border-indigo-300 dark:border-indigo-700 shadow-sm'
                      }`}
                  >
                    {span.content}
                  </button>
                );
              })}
            </p>
            {/* Progress dots */}
            <div className="mt-5 flex gap-1.5 justify-center">
              {question.tokens.map((_, i) => (
                <div key={i} className={`h-2 w-2 rounded-full transition-all ${collected.has(i) ? 'bg-indigo-500 scale-125' : 'bg-slate-200 dark:bg-slate-700'}`} />
              ))}
            </div>
          </div>
        )}

        {/* ── ARRANGE + SOLVE ─────────────────────────────────────────── */}
        {step !== 'collect' && (
          <div className="w-full max-w-md flex flex-col gap-4">

            {/* Story recap */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl px-4 py-3 border border-indigo-100 dark:border-indigo-800">
              <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">{question.text}</p>
            </div>

            {/* Token tray (arrange only) */}
            {step === 'arrange' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 border-dashed border-indigo-200 dark:border-indigo-700 flex flex-wrap gap-2 justify-center min-h-[60px]">
                {trayTokens.map(t => (
                  <button
                    key={t.idx}
                    onClick={() => handleTrayTap(t.idx)}
                    className={`px-4 py-2 rounded-xl font-black text-xl transition-all active:scale-90
                      ${selToken === t.idx
                        ? 'bg-indigo-600 text-white shadow-lg scale-105 ring-2 ring-indigo-400'
                        : 'bg-white dark:bg-slate-700 text-indigo-900 dark:text-indigo-100 border-b-4 border-indigo-200 dark:border-slate-600 shadow-md'
                      }`}
                  >
                    {t.display}
                  </button>
                ))}
                {trayTokens.length === 0 && (
                  <p className="text-xs text-slate-400 self-center">כל המספרים הוצבו ✓</p>
                )}
              </div>
            )}

            {/* Equation builder */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center gap-5">
              <div className="flex flex-wrap items-center justify-center gap-1 font-black" dir="ltr">
                {question.eqParts.map((part, i) => {
                  if (typeof part === 'string') {
                    return <span key={i} className="text-2xl text-slate-400 dark:text-slate-500 font-light">{part}</span>;
                  }
                  const slotIdx = part;
                  const tokenIdx = slotMap[slotIdx];
                  const filled = tokenIdx !== undefined;
                  const highlighted = step === 'arrange' && selToken !== null && !filled;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSlotTap(slotIdx)}
                      disabled={step === 'solve'}
                      className={`min-w-[52px] h-14 rounded-xl flex items-center justify-center text-xl transition-all active:scale-90
                        ${filled
                          ? 'bg-indigo-600 dark:bg-indigo-700 text-white shadow-md'
                          : highlighted
                            ? 'bg-amber-100 dark:bg-amber-900/30 border-2 border-dashed border-amber-400 text-amber-500 animate-pulse'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-600'
                        }`}
                    >
                      {filled ? question.tokens[tokenIdx].display : '?'}
                    </button>
                  );
                })}
                <span className="text-2xl text-slate-400 dark:text-slate-500 font-light mx-1">=</span>
                <div className={`min-w-[64px] h-14 rounded-xl flex items-center justify-center text-xl font-black transition-all
                  ${step === 'solve' && userAnswer
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-2 border-amber-400'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {step === 'solve' && userAnswer ? userAnswer : '?'}
                </div>
              </div>

              {/* Solve controls */}
              {step === 'solve' && (
                <div className="w-full flex flex-col items-center gap-3">
                  {errorMsg && <p className="text-rose-500 dark:text-rose-400 font-bold text-sm">{errorMsg}</p>}
                  {consErrors >= 2 && !errorMsg && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">
                      💡 רמז: התשובה היא {question.answer}
                    </p>
                  )}
                  <Numpad
                    onInput={d => setUserAnswer(p => p.length < 6 ? p + d : p)}
                    onDelete={() => setUserAnswer(p => p.slice(0, -1))}
                  />
                  <button
                    onClick={handleCheck}
                    disabled={!userAnswer || disabled}
                    className="w-full max-w-[260px] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-[0_5px_0_#3730a3] active:translate-y-[5px] active:shadow-none transition-all disabled:opacity-40 text-lg"
                  >
                    בדיקה ✓
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <FeedbackOverlay
        visible={feedback.visible}
        isLevelUp={feedback.isLevelUp}
        pts={feedback.pts}
        onDone={() => {
          setFeedback({ visible: false, isLevelUp: false, pts: 0 });
          newQuestion();
        }}
      />
    </div>
  );
}
