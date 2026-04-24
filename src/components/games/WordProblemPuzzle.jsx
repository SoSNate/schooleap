import { useState, useEffect, useRef, useCallback } from 'react';
import useGameStore from '../../store/useGameStore';
import Hearts from '../shared/Hearts';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import HintButton from '../shared/HintButton';
import HintBubble from '../shared/HintBubble';
import useHint from '../../hooks/useHint';
import { reportHintUsed } from '../../lib/telemetry';
import { vibe, rnd } from '../../utils/math';
import Swal from 'sweetalert2';
import GameTutorial from '../shared/GameTutorial';
import { getHint } from './wordEngine';

/* ── Telemetry stub ──────────────────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
function telemetry(_event, _data) { /* no-op until LMS integration */ }

/* ── Config ──────────────────────────────────────────────────────────────── */
export const DEFAULT_CONFIG = { maxLvl: 5, livesPerRound: 3 };

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
const NAMES_M = ['יוסי', 'איתמר', 'רועי', 'דני', 'עומר', 'אריאל'];
const NAMES_F = ['דנה', 'נועה', 'שירה', 'יעל', 'מיה', 'תמר'];
const NAMES = [...NAMES_M, ...NAMES_F];
function pickGendered() {
  const isMale = Math.random() < 0.5;
  const pool = isMale ? NAMES_M : NAMES_F;
  return { name: pool[Math.floor(Math.random() * pool.length)], isMale };
}
// כל פריט: { p=רבים, s=יחיד, v=פועל עולה/עולים }
const ITEM_DEFS = [
  { p: 'סוכריות', s: 'סוכרייה', cost: 'עולות' },
  { p: 'בלונים',  s: 'בלון',    cost: 'עולים' },
  { p: 'מדבקות', s: 'מדבקה',   cost: 'עולות' },
  { p: 'עפרונות', s: 'עיפרון',  cost: 'עולים' },
  { p: 'כדורים',  s: 'כדור',    cost: 'עולים' },
  { p: 'ספרים',   s: 'ספר',     cost: 'עולים' },
];
const ITEMS = ITEM_DEFS.map(i => i.p); // תאימות לאחור לשימושים קיימים
function pickItem() { return ITEM_DEFS[Math.floor(Math.random() * ITEM_DEFS.length)]; }

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
      const kids = rnd(2, 5 + lvl), each = rnd(3, 7 + lvl), total = kids * each;
      return {
        text: `יש ${total} ממתקים. מחלקים אותם בשווה בין ${kids} ילדים. כמה ממתקים כל ילד מקבל?`,
        tokens: [{ display: String(total), value: total }, { display: String(kids), value: kids }],
        opHint: 'מחלקים שווה → חילוק (÷)',
        eqParts: [0, ' ÷ ', 1],
        answer: each,
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
      // Bound the retries — if somehow nothing valid emerges, force a safe baseline
      // so the generator never returns a negative/zero answer that breaks the UX.
      let tries = 0;
      do {
        start = rnd(30, 70 + lvl * 10);
        items = rnd(2, 4);
        price = rnd(4, 9 + lvl);
        answer = start - items * price;
        tries++;
      } while (answer <= 0 && tries < 20);
      if (answer <= 0) {
        // Deterministic solvable fallback (prevents silent L1 reroute upstream).
        start  = 60 + lvl * 5;
        items  = 3;
        price  = 5;
        answer = start - items * price;
      }
      const { name, isMale } = pickGendered();
      return {
        text: `ל${name} היו ${start} שקלים. ${isMale ? 'הוא קנה' : 'היא קנתה'} ${items} ספרים ב-${price} שקלים כל אחד. כמה נשאר?`,
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
        text: (() => { const { name, isMale } = pickGendered(); return `${name} ${isMale ? 'קנה' : 'קנתה'} ${count} ספרים ב-${price} שקלים כל אחד, ועוד תיק ב-${extra} שקלים. כמה ${isMale ? 'שילם' : 'שילמה'} בסך הכל?`; })(),
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
        text: (() => { const { name, isMale } = pickGendered(); return `${name} ${isMale ? 'חסך' : 'חסכה'} ${n1} שקלים. ${isMale ? 'הוא מוציא' : 'היא מוציאה'} ${n3} שקלים בכל שבוע, במשך ${n2} שבועות. כמה נשאר?`; })(),
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
    // eslint-disable-next-line no-unused-vars
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
  // ── New schemas (levels 1-5, 2 extra each) ───────────────────────────────
  {
    id: 11, diff: 1,
    gen(lvl) {
      const n1 = rnd(3, 10 + lvl * 2), n2 = rnd(2, 8 + lvl), item = pick(ITEMS);
      const name1 = pick(NAMES), name2 = pick(NAMES.filter(n => n !== name1));
      return {
        text: `ל${name1} יש ${n1} ${item}. ל${name2} יש ${n2} ${item} יותר. כמה ${item} יש ל${name2}?`,
        tokens: [{ display: String(n1), value: n1 }, { display: String(n2), value: n2 }],
        opHint: 'יותר → חיבור (+)',
        eqParts: [0, ' + ', 1],
        answer: n1 + n2,
      };
    },
  },
  {
    id: 12, diff: 1,
    gen(lvl) {
      const cost = rnd(5, 12 + lvl * 2), paid = cost + rnd(1, 10 + lvl), item = pick(ITEMS);
      return {
        text: (() => { const { name, isMale } = pickGendered(); return `${name} ${isMale ? 'שילם' : 'שילמה'} ${paid} שקלים עבור ${item} שעולה ${cost} שקלים. כמה עודף ${isMale ? 'יקבל' : 'תקבל'}?`; })(),
        tokens: [{ display: String(paid), value: paid }, { display: String(cost), value: cost }],
        opHint: 'עודף → חיסור (−)',
        eqParts: [0, ' − ', 1],
        answer: paid - cost,
      };
    },
  },
  {
    id: 13, diff: 2,
    gen(lvl) {
      const perBag = rnd(3, 6 + lvl), bags = rnd(2, 5 + lvl), total = perBag * bags;
      return {
        text: `יש ${total} ${pick(ITEMS)}. מחלקים ${perBag} לכל שקית. כמה שקיות צריך?`,
        tokens: [{ display: String(total), value: total }, { display: String(perBag), value: perBag }],
        opHint: 'מחלקים שווה → חילוק (÷)',
        eqParts: [0, ' ÷ ', 1],
        answer: bags,
      };
    },
  },
  {
    id: 14, diff: 2,
    gen(lvl) {
      const goal = rnd(15, 35 + lvl * 5), has = rnd(3, goal - 5);
      return {
        text: (() => {
          const { name, isMale } = pickGendered();
          const item = pickItem();
          return `${name} רוצה לקנות ${item.p} ש${item.cost} ${goal} שקלים. יש ${isMale ? 'לו' : 'לה'} ${has} שקלים. כמה חסר ${isMale ? 'לו' : 'לה'}?`;
        })(),
        tokens: [{ display: String(goal), value: goal }, { display: String(has), value: has }],
        opHint: 'חסר → חיסור (−)',
        eqParts: [0, ' − ', 1],
        answer: goal - has,
      };
    },
  },
  {
    id: 15, diff: 3,
    gen(lvl) {
      const n1 = rnd(5, 12 + lvl), n2 = rnd(4, 10 + lvl), n3 = rnd(3, 8 + lvl);
      return {
        text: `בבוקר הגיעו ${n1} תלמידים לכיתה. בצהריים הגיעו עוד ${n2}. אחר כך הגיעו עוד ${n3}. כמה תלמידים יש בכיתה?`,
        tokens: [{ display: String(n1), value: n1 }, { display: String(n2), value: n2 }, { display: String(n3), value: n3 }],
        opHint: 'הגיעו → חיבור (+)',
        eqParts: [0, ' + ', 1, ' + ', 2],
        answer: n1 + n2 + n3,
      };
    },
  },
  {
    id: 16, diff: 3,
    gen(lvl) {
      const groups = rnd(2, 5 + lvl), k = rnd(3, 8 + lvl), total = groups * k;
      return {
        text: `${total} תלמידים מתחלקים ל-${groups} קבוצות שוות. כמה תלמידים בכל קבוצה?`,
        tokens: [{ display: String(total), value: total }, { display: String(groups), value: groups }],
        opHint: 'קבוצות שוות → חילוק (÷)',
        eqParts: [0, ' ÷ ', 1],
        answer: k,
      };
    },
  },
  {
    id: 17, diff: 4,
    // eslint-disable-next-line no-unused-vars
    gen(lvl) {
      const pct = pick([10, 20, 25, 50]);
      const unit = pick([4, 5, 8, 10, 20]);
      const total = unit * (100 / pct); // ensures integer result
      const result = total * pct / 100;
      return {
        text: `בכיתה יש ${total} תלמידים. ${pct}% מהם בנות. כמה בנות יש?`,
        tokens: [{ display: String(total), value: total }, { display: String(pct), value: pct }],
        opHint: `${pct}% = × ${pct} ÷ 100`,
        eqParts: [0, ` × ${pct} ÷ 100`],
        answer: result,
      };
    },
  },
  {
    id: 18, diff: 4,
    gen(lvl) {
      let save1, save2, cost, answer;
      do { save1 = rnd(20, 50 + lvl * 10); save2 = rnd(15, 40 + lvl * 8); cost = rnd(10, save1 + save2 - 5); answer = save1 + save2 - cost; } while (answer <= 0);
      return {
        text: (() => { const { name, isMale } = pickGendered(); return `${name} ${isMale ? 'חסך' : 'חסכה'} ${save1} שקלים בחודש הראשון ו-${save2} שקלים בחודש השני. ${isMale ? 'קנה' : 'קנתה'} ${pick(ITEMS)} ב-${cost} שקלים. כמה נשאר?`; })(),
        tokens: [
          { display: String(save1), value: save1 },
          { display: String(save2), value: save2 },
          { display: String(cost), value: cost },
        ],
        opHint: 'חסך + חסך → קנה → נשאר',
        eqParts: ['(', 0, ' + ', 1, ') − ', 2],
        answer,
      };
    },
  },
  {
    id: 19, diff: 5,
    // eslint-disable-next-line no-unused-vars
    gen(lvl) {
      const ratios = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]];
      const [r1, r2] = pick(ratios);
      const boys = rnd(1, 6) * r1; // divisible by r1
      const girls = boys * r2 / r1;
      return {
        text: `יחס בנים לבנות הוא ${r1}:${r2}. יש ${boys} בנים בכיתה. כמה בנות יש?`,
        tokens: [{ display: String(boys), value: boys }, { display: String(r2), value: r2 }, { display: String(r1), value: r1 }],
        opHint: `יחס ${r1}:${r2} → × ${r2} ÷ ${r1}`,
        eqParts: [0, ` × ${r2} ÷ ${r1}`],
        answer: girls,
      };
    },
  },
  {
    id: 20, diff: 5,
    gen(lvl) {
      const speed = pick([40, 50, 60, 80, 90, 100]);
      const hours = rnd(2, 5 + lvl);
      return {
        text: `אוטובוס נוסע ${speed} קמ"ש. הוא נסע במשך ${hours} שעות. כמה קילומטרים נסע?`,
        tokens: [{ display: String(speed), value: speed }, { display: String(hours), value: hours }],
        opHint: 'מהירות × זמן → מרחק (×)',
        eqParts: [0, ' × ', 1],
        answer: speed * hours,
      };
    },
  },
];

const LEVEL_SCHEMAS = { 1: [1, 2, 11, 12], 2: [3, 4, 13, 14], 3: [5, 6, 15, 16], 4: [7, 8, 17, 18], 5: [9, 10, 19, 20] };

/* ── generateQuestion ────────────────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
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
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, '⌫'];
  return (
    <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px]">
      {keys.map((k, idx) => (
        <button
          key={idx}
          onClick={() => k === '⌫' ? onDelete() : k !== null && onInput(String(k))}
          disabled={k === null}
          className={`h-14 rounded-xl font-black text-xl shadow-md active:scale-90 transition-all
            ${k === null ? 'opacity-0 pointer-events-none' :
              k === '⌫' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
              'bg-white dark:bg-slate-700 text-red-900 dark:text-red-100 border-b-4 border-red-100 dark:border-slate-600'}`}
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
  const practiceLvl    = useGameStore(s => s.practiceLevels.word || 0);
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
  const [feedback,   setFeedback]   = useState({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });

  const recentRef = useRef([]);

  // Hint infra
  const onApplyHint = useCallback(() => {
    // Word doesn't snap controls on hint (unlike percentages)
    // Just display the bubble
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
    puzzle: question,
    cooldownSec: 5,
    bubbleMs: 2600,
    onApplyHint,
  });

  /* ── new question ──────────────────────────────────────────────────────── */
  const newQuestion = useCallback(() => {
    const q = generateQuestion(practiceLvl || gameState.lvl, recentRef.current, config);
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
    resetHintRound();
  }, [gameState.lvl, practiceLvl, config, resetHintRound]);

  useEffect(() => { newQuestion(); }, [newQuestion]);


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
      if (usedHint) reportHintUsed({ game: 'word', level: gameState.lvl });
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, unlocked: result.unlocked, pts: result.pts });
    } else {
      vibe([50, 50, 50]);
      setConsErrors(c => c + 1);
      setJustLost(true);
      setTimeout(() => setJustLost(false), 600);
      setErrorMsg('לא מדויק, נסה שוב 💡');
      setTimeout(() => setErrorMsg(''), 2500);
      telemetry('error', { schemaId: question.schemaId, answer: ans });
      const nextLives = Math.max(0, lives - 1);
      setLives(nextLives);
      if (nextLives <= 0) {
        setDisabled(true);
        setTimeout(() => {
          handleGameFail('word');
          Swal.fire({
            title: 'הרמה ננעלה 🔒',
            text: 'השג 5 ניצחונות ברצף כדי להתקדם לרמה הבאה!',
            icon: 'warning',
            confirmButtonText: 'הבנתי',
            confirmButtonColor: '#991b1b',
            customClass: { popup: 'rounded-3xl' },
          }).then(() => setScreen('menu'));
        }, 600);
      }
    }
  }, [disabled, question, userAnswer, gameState.lvl, lives, usedHint, handleWin, handleGameFail, setScreen]);

  if (!question) return null;

  const spans = step === 'collect' ? parseTextSpans(question.text, question.tokens) : [];
  const usedTokenIdxs = new Set(Object.values(slotMap));
  const trayTokens = question.tokens.map((t, i) => ({ ...t, idx: i })).filter(t => !usedTokenIdxs.has(t.idx));
  const stepLabel = step === 'collect' ? '📖 שלב 1: אסוף את הנתונים' : step === 'arrange' ? '🧩 שלב 2: בנה את המשוואה' : '🔢 שלב 3: פתור';

  return (
    <div className="screen-enter flex flex-col flex-1 min-h-[calc(100dvh-80px)]" dir="rtl">
      <GameTutorial gameName="word" />
      <div className="flex-1 flex flex-col items-center p-4 gap-4 overflow-y-auto">

        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md px-5 py-4 shadow-sm border-2 border-red-200 dark:border-red-800/40 border-b-4 border-b-red-800 dark:border-b-red-900 flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-red-800 dark:text-red-300 mb-0.5">{stepLabel}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">{question.opHint}</p>
          </div>
          <div className="flex items-center gap-2">
            <HintButton cooldown={hintCooldown} onClick={requestHint} colorToken="red" />
            <Hearts lives={lives} maxLives={config.livesPerRound} justLost={justLost} />
          </div>
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
                        ? 'bg-red-200 dark:bg-red-800/60 text-red-400 line-through opacity-50'
                        : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-b-2 border-red-300 dark:border-red-700 shadow-sm'
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
                <div key={i} className={`h-2 w-2 rounded-full transition-all ${collected.has(i) ? 'bg-red-800 scale-125' : 'bg-slate-200 dark:bg-slate-700'}`} />
              ))}
            </div>
          </div>
        )}

        {/* ── ARRANGE + SOLVE ─────────────────────────────────────────── */}
        {step !== 'collect' && (
          <div className="w-full max-w-md flex flex-col gap-4">

            {/* Story recap */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl px-4 py-3 border border-red-100 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">{question.text}</p>
            </div>

            {/* Token tray (arrange only) */}
            {step === 'arrange' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 border-dashed border-red-200 dark:border-red-700 flex flex-wrap gap-2 justify-center min-h-[60px]">
                {trayTokens.map(t => (
                  <button
                    key={t.idx}
                    onClick={() => handleTrayTap(t.idx)}
                    className={`px-4 py-2 rounded-xl font-black text-xl transition-all active:scale-90
                      ${selToken === t.idx
                        ? 'bg-red-800 text-white shadow-lg scale-105 ring-2 ring-red-600'
                        : 'bg-white dark:bg-slate-700 text-red-900 dark:text-red-100 border-b-4 border-red-200 dark:border-slate-600 shadow-md'
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
                          ? 'bg-red-800 dark:bg-red-900 text-white shadow-md'
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
                  {errorMsg && <p className="text-red-500 dark:text-red-400 font-bold text-sm">{errorMsg}</p>}
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
                    className="w-full max-w-[260px] py-4 bg-red-800 hover:bg-red-900 dark:bg-red-800 dark:hover:bg-red-900 text-white font-black rounded-2xl shadow-[0_5px_0_#7f1d1d] active:translate-y-[5px] active:shadow-none transition-all disabled:opacity-40 text-lg"
                  >
                    בדיקה ✓
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hint bubble */}
      <HintBubble text={hintBubbleText} colorToken="red" />

      <FeedbackOverlay
        visible={feedback.visible}
        isLevelUp={feedback.isLevelUp}
        unlocked={feedback.unlocked}
        pts={feedback.pts}
        onDone={() => {
          setFeedback({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
          newQuestion();
        }}
      />
    </div>
  );
}
