import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import Hearts from '../shared/Hearts';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';

const ONBOARD_KEY = 'onboard_magicPatterns';

// ── SVG Shape Icons ───────────────────────────────────────────────────────────
function ShapeIcon({ shape, className = 'w-full h-full' }) {
  if (shape === 'sq')
    return (
      <svg viewBox="0 0 24 24" className={className}>
        <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" />
      </svg>
    );
  if (shape === 'ci')
    return (
      <svg viewBox="0 0 24 24" className={className}>
        <circle cx="12" cy="12" r="10" fill="currentColor" />
      </svg>
    );
  if (shape === 'tr')
    return (
      <svg viewBox="0 0 24 24" className={className}>
        <path d="M12 2L22 22H2Z" fill="currentColor" />
      </svg>
    );
  return null;
}

// shape → Tailwind color tokens
const SC = {
  sq: { text: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/25',    border: 'border-blue-300 dark:border-blue-600'    },
  ci: { text: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/25',      border: 'border-red-300 dark:border-red-600'      },
  tr: { text: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/25', border: 'border-emerald-300 dark:border-emerald-600' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Question Generators (ported from HTML TEMPLATES) ──────────────────────────

// Template 1: חוק הפילוח  a × (b + c) = a×b + a×c
function genDistributive() {
  const a = rnd(2, 5), b = rnd(2, 6), c = rnd(2, 6);
  const d1 = rnd(1, 9), d2 = rnd(1, 9);
  return {
    key: `dist_${a}_${b}_${c}`,
    type: 'distributive',
    name: 'חוק הפילוח',
    // Legend: abstract formula with shapes
    visual: [
      { t: 'sh', s: 'sq' }, { t: 'op', v: '×' }, { t: 'par', v: '(' },
      { t: 'sh', s: 'ci' }, { t: 'op', v: '+' }, { t: 'sh', s: 'tr' }, { t: 'par', v: ')' },
      { t: 'op', v: '=' },
      { t: 'sh', s: 'sq' }, { t: 'op', v: '×' }, { t: 'sh', s: 'ci' },
      { t: 'op', v: '+' },
      { t: 'sh', s: 'sq' }, { t: 'op', v: '×' }, { t: 'sh', s: 'tr' },
    ],
    // LHS: a × (b + c)
    lhsParts: [
      { t: 'num', v: a, s: 'sq' }, { t: 'op', v: '×' }, { t: 'par', v: '(' },
      { t: 'num', v: b, s: 'ci' }, { t: 'op', v: '+' }, { t: 'num', v: c, s: 'tr' }, { t: 'par', v: ')' },
    ],
    // RHS slots: [a]×[b] + [a]×[c]
    slotParts: [
      { t: 'slot', id: 's0', exp: a, s: 'sq' }, { t: 'op', v: '×' }, { t: 'slot', id: 's1', exp: b, s: 'ci' },
      { t: 'op', v: '+' },
      { t: 'slot', id: 's2', exp: a, s: 'sq' }, { t: 'op', v: '×' }, { t: 'slot', id: 's3', exp: c, s: 'tr' },
    ],
    // Bank: a appears twice (used in two slots)
    bankCards: shuffle([
      { v: a, s: 'sq' }, { v: a, s: 'sq' },
      { v: b, s: 'ci' }, { v: c, s: 'tr' },
      { v: d1, s: null }, { v: d2, s: null },
    ]).map((c, i) => ({ ...c, id: `c${i}` })),
  };
}

// Template 2: סדר פעולות  a + b × c = a + (b × c)
function genOrderOfOps() {
  const a = rnd(2, 9), b = rnd(2, 5), c = rnd(2, 5);
  const d1 = rnd(1, 9), d2 = rnd(1, 9);
  return {
    key: `ord_${a}_${b}_${c}`,
    type: 'orderOfOps',
    name: 'סדר פעולות',
    visual: [
      { t: 'sh', s: 'sq' }, { t: 'op', v: '+' }, { t: 'sh', s: 'ci' }, { t: 'op', v: '×' }, { t: 'sh', s: 'tr' },
      { t: 'op', v: '=' },
      { t: 'sh', s: 'sq' }, { t: 'op', v: '+' }, { t: 'par', v: '(' },
      { t: 'sh', s: 'ci' }, { t: 'op', v: '×' }, { t: 'sh', s: 'tr' }, { t: 'par', v: ')' },
    ],
    lhsParts: [
      { t: 'num', v: a, s: 'sq' }, { t: 'op', v: '+' },
      { t: 'num', v: b, s: 'ci' }, { t: 'op', v: '×' }, { t: 'num', v: c, s: 'tr' },
    ],
    slotParts: [
      { t: 'slot', id: 's0', exp: a, s: 'sq' }, { t: 'op', v: '+' }, { t: 'par', v: '(' },
      { t: 'slot', id: 's1', exp: b, s: 'ci' }, { t: 'op', v: '×' }, { t: 'slot', id: 's2', exp: c, s: 'tr' },
      { t: 'par', v: ')' },
    ],
    bankCards: shuffle([
      { v: a, s: 'sq' }, { v: b, s: 'ci' }, { v: c, s: 'tr' },
      { v: d1, s: null }, { v: d2, s: null },
    ]).map((c, i) => ({ ...c, id: `c${i}` })),
  };
}

// Template 3: שבר מעורב  W N/D = (W×D+N)/D
// Slots numerator: [N] + ([D] × [W]) — denominator: [D]
function genMixedFraction() {
  const w = rnd(2, 5), n = rnd(1, 3), d = rnd(4, 9);
  const d1 = rnd(1, 9);
  return {
    key: `mfrac_${w}_${n}_${d}`,
    type: 'mixedFraction',
    name: 'שבר מעורב',
    visual: [
      { t: 'mixed_shape', wS: 'sq', nS: 'ci', dS: 'tr' },
      { t: 'op', v: '=' },
      { t: 'frac_complex', wS: 'sq', nS: 'ci', dS: 'tr' },
    ],
    lhsParts: [{ t: 'mixed_num', w, n, d }],
    slotParts: [{ t: 'frac_slots', wExp: w, nExp: n, dExp: d }],
    // D appears twice (numerator + denominator)
    bankCards: shuffle([
      { v: w, s: 'sq' }, { v: n, s: 'ci' },
      { v: d, s: 'tr' }, { v: d, s: 'tr' },
      { v: d1, s: null },
    ]).map((c, i) => ({ ...c, id: `c${i}` })),
  };
}

const LEVEL_GENS = {
  1: [genDistributive],
  2: [genOrderOfOps],
  3: [genMixedFraction],
  4: [genDistributive, genOrderOfOps],
  5: [genDistributive, genOrderOfOps, genMixedFraction],
};

function generateQuestion(lvl, recentKeys) {
  const pool = LEVEL_GENS[lvl] || LEVEL_GENS[1];
  for (let i = 0; i < 20; i++) {
    const q = pool[Math.floor(Math.random() * pool.length)]();
    if (!recentKeys.includes(q.key)) return q;
  }
  return pool[0]();
}

// Returns flat list of all slots: [{id, expected, shape}]
function getSlotList(question) {
  if (!question) return [];
  const slots = [];
  for (const p of question.slotParts) {
    if (p.t === 'slot') {
      slots.push({ id: p.id, expected: p.exp, shape: p.s });
    } else if (p.t === 'frac_slots') {
      // Numerator order: fn(N,ci) + fd(D,tr) × fw(W,sq) → denominator: fd2(D,tr)
      slots.push(
        { id: 'fn',  expected: p.nExp, shape: 'ci' },
        { id: 'fd',  expected: p.dExp, shape: 'tr' },
        { id: 'fw',  expected: p.wExp, shape: 'sq' },
        { id: 'fd2', expected: p.dExp, shape: 'tr' },
      );
    }
  }
  return slots;
}

// ── Small render helpers ───────────────────────────────────────────────────────
function Op({ v }) {
  return <span className="math-font font-black text-slate-400 dark:text-slate-500 text-xl mx-0.5 select-none">{v}</span>;
}
function Par({ v }) {
  return <span className="math-font font-light text-slate-300 dark:text-slate-600 text-2xl select-none">{v}</span>;
}

// A single drop zone
function Slot({ id, expected, shape, filled, isError, scaffoldStage, hasSelection, onTap }) {
  const sc = SC[shape];
  const neutral = scaffoldStage >= 2;
  const isEmpty = filled === undefined;
  return (
    <div
      data-slot-id={id}
      onClick={() => onTap(id)}
      className={[
        'w-14 h-14 flex items-center justify-center relative rounded-xl border-2 cursor-pointer transition-all select-none',
        isError
          ? 'bg-red-100 dark:bg-red-900/40 border-red-400 scale-110'
          : isEmpty
            ? neutral
              ? 'bg-slate-100 dark:bg-slate-700 border-dashed border-slate-300 dark:border-slate-600'
              : `${sc.bg} ${sc.border} border-dashed`
            : `${sc.bg} ${sc.border} border-solid shadow-md`,
        hasSelection && isEmpty && !isError ? 'active-target' : '',
      ].join(' ')}
    >
      {/* Shape icon hint — visible when empty & not neutral */}
      {isEmpty && !neutral && (
        <div className={`absolute inset-3 ${sc.text} opacity-25 pointer-events-none`}>
          <ShapeIcon shape={shape} />
        </div>
      )}
      {filled !== undefined && (
        <span className="math-font font-black text-2xl text-slate-700 dark:text-slate-100 z-10 relative">
          {filled}
        </span>
      )}
    </div>
  );
}

// ── Visual (Legend) part renderer ─────────────────────────────────────────────
function renderVisualPart(part, i) {
  if (part.t === 'sh') {
    const sc = SC[part.s];
    return (
      <div key={i} className={`w-7 h-7 ${sc.text}`}>
        <ShapeIcon shape={part.s} />
      </div>
    );
  }
  if (part.t === 'op')  return <span key={i} className="math-font font-black text-lg text-slate-400 mx-0.5">{part.v}</span>;
  if (part.t === 'par') return <span key={i} className="math-font font-light text-slate-300 text-2xl">{part.v}</span>;

  // mixed_shape: W N/D with shape icons
  if (part.t === 'mixed_shape') {
    return (
      <div key={i} className="flex items-center gap-1">
        <div className={`w-7 h-7 ${SC[part.wS].text}`}><ShapeIcon shape={part.wS} /></div>
        <div className="flex flex-col items-center">
          <div className={`w-5 h-5 ${SC[part.nS].text} border-b-2 border-slate-400 pb-0.5`}><ShapeIcon shape={part.nS} /></div>
          <div className={`w-5 h-5 ${SC[part.dS].text} pt-0.5`}><ShapeIcon shape={part.dS} /></div>
        </div>
      </div>
    );
  }

  // frac_complex: (W×D)+N / D with shape icons
  if (part.t === 'frac_complex') {
    return (
      <div key={i} className="flex flex-col items-center mx-1">
        <div className="flex items-center gap-0.5 border-b-2 border-slate-500 dark:border-slate-400 pb-0.5">
          <span className="text-slate-400 text-xs">(</span>
          <div className={`w-4 h-4 ${SC[part.nS].text}`}><ShapeIcon shape={part.nS} /></div>
          <span className="text-slate-400 text-xs">+</span>
          <div className={`w-4 h-4 ${SC[part.dS].text}`}><ShapeIcon shape={part.dS} /></div>
          <span className="text-slate-400 text-xs">×</span>
          <div className={`w-4 h-4 ${SC[part.wS].text}`}><ShapeIcon shape={part.wS} /></div>
          <span className="text-slate-400 text-xs">)</span>
        </div>
        <div className={`w-5 h-5 ${SC[part.dS].text} mt-0.5`}><ShapeIcon shape={part.dS} /></div>
      </div>
    );
  }
  return null;
}

// ── LHS part renderer ─────────────────────────────────────────────────────────
function renderLhsPart(part, i) {
  if (part.t === 'num') {
    return <span key={i} className={`math-font font-black text-3xl ${SC[part.s].text}`}>{part.v}</span>;
  }
  if (part.t === 'op')  return <Op key={i} v={part.v} />;
  if (part.t === 'par') return <Par key={i} v={part.v} />;

  // mixed_num: W N/D with actual numbers colored by shape
  if (part.t === 'mixed_num') {
    return (
      <div key={i} className="flex items-center gap-1" dir="ltr">
        <span className={`math-font font-black text-4xl ${SC.sq.text}`}>{part.w}</span>
        <div className="flex flex-col items-center math-font font-black text-2xl">
          <span className={`${SC.ci.text} border-b-2 border-slate-600 dark:border-slate-300 px-1 pb-0.5`}>{part.n}</span>
          <span className={`${SC.tr.text} px-1 pt-0.5`}>{part.d}</span>
        </div>
      </div>
    );
  }
  return null;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MagicPatterns() {
  const gameState    = useGameStore((s) => s.magicPatterns);
  const handleWin    = useGameStore((s) => s.handleWin);
  const handleGameFail = useGameStore((s) => s.handleGameFail);
  const setScreen    = useGameStore((s) => s.setScreen);

  const [question,     setQuestion]     = useState(null);
  const [bankCards,    setBankCards]    = useState([]);
  const [usedIds,      setUsedIds]      = useState(new Set());
  const [filledSlots,  setFilledSlots]  = useState({});   // {slotId: value}
  const [selectedCard, setSelectedCard] = useState(null); // card.id for tap-to-place
  const [errorSlot,    setErrorSlot]    = useState(null);
  const [errorFlash,   setErrorFlash]   = useState(false);
  const [lives,        setLives]        = useState(3);
  const [justLost,     setJustLost]     = useState(false);
  const [scaffoldStage, setScaffoldStage] = useState(0);  // 0=full 1=partial 2=none
  const [disabled,     setDisabled]     = useState(false);
  const [feedback,     setFeedback]     = useState({ visible: false, isLevelUp: false, pts: 0 });

  const recentRef    = useRef([]);
  const dragRef      = useRef(null);
  const tryPlaceRef  = useRef(null);

  const isUnlimited = gameState.lvl === 5;

  // ── New question ────────────────────────────────────────────────────────────
  const newQuestion = useCallback(() => {
    const q = generateQuestion(gameState.lvl, recentRef.current);
    recentRef.current = [q.key, ...recentRef.current].slice(0, 3);
    setQuestion(q);
    setBankCards(q.bankCards);
    setUsedIds(new Set());
    setFilledSlots({});
    setSelectedCard(null);
    setErrorSlot(null);
    setErrorFlash(false);
    setLives(3);
    setJustLost(false);
    setDisabled(false);
  }, [gameState.lvl]);

  useEffect(() => { newQuestion(); }, [newQuestion]);

  // ── Onboarding ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARD_KEY)) {
        Swal.fire({
          title: 'תבניות הקסם 🪄',
          html: `<div class="text-right text-sm leading-relaxed">
            ראה את <b>המקרא</b> למעלה — צורות צבעוניות מייצגות מספרים.<br><br>
            <b>גרור</b> קלפים מהבנק למטה אל התיבות הריקות, או <b>לחץ</b> על קלף ואז על תיבה.<br><br>
            🎯 השלם את כל התיבות כדי לנצח!
          </div>`,
          confirmButtonText: 'יאללה!',
          confirmButtonColor: '#0d9488',
          customClass: { popup: 'rounded-3xl' },
        });
        localStorage.setItem(ONBOARD_KEY, '1');
      }
    } catch {}
  }, []);

  // ── tryPlace — attempt placing a bank card into a slot ──────────────────────
  const tryPlace = useCallback((cardId, cardValue, slotId) => {
    if (disabled) return;
    if (!question) return;

    const slotList = getSlotList(question);
    const slot = slotList.find((s) => s.id === slotId);
    if (!slot || filledSlots[slotId] !== undefined) return;

    if (cardValue === slot.expected) {
      // ✅ Correct placement
      vibe([30]);
      const newFilled = { ...filledSlots, [slotId]: cardValue };
      setFilledSlots(newFilled);
      setUsedIds((prev) => new Set([...prev, cardId]));
      setSelectedCard(null);

      // Check if all slots filled → WIN
      if (slotList.every((s) => newFilled[s.id] !== undefined)) {
        setDisabled(true);
        setTimeout(() => {
          vibe([30, 50, 30]);
          setScaffoldStage((s) => Math.min(2, s + 1));
          const result = handleWin('magicPatterns');
          setFeedback({ visible: true, isLevelUp: result.isLevelUp, pts: result.pts });
        }, 300);
      }
    } else {
      // ❌ Wrong placement
      vibe([50, 50, 50]);
      setErrorSlot(slotId);
      setSelectedCard(null);
      setErrorFlash(true);
      setJustLost(true);
      // Scaffold goes back one step — never replace the question
      setScaffoldStage((s) => Math.max(0, s - 1));

      const newLives = lives - 1;
      setLives(newLives);

      setTimeout(() => {
        setErrorSlot(null);
        setErrorFlash(false);
        setJustLost(false);
      }, 600);

      if (newLives <= 0 && !isUnlimited) {
        setDisabled(true);
        setTimeout(() => {
          const result = handleGameFail('magicPatterns');
          if (result === 'locked') {
            Swal.fire({
              title: 'הרמה ננעלה 🔒',
              html: '<div class="text-right">קצת קשה עכשיו — נעלנו את הרמה כדי שתוכל להתאמן בנחת! 🧠</div>',
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
            }).then(() => newQuestion());
          }
        }, 700);
      }
    }
  }, [disabled, question, filledSlots, lives, isUnlimited, handleWin, handleGameFail, setScreen, newQuestion]);

  // Keep ref current so pointer handlers always call the latest tryPlace
  useEffect(() => { tryPlaceRef.current = tryPlace; });

  // ── Tap-to-place: slot click ────────────────────────────────────────────────
  const handleSlotClick = useCallback((slotId) => {
    if (!selectedCard) return;
    const card = bankCards.find((c) => c.id === selectedCard && !usedIds.has(c.id));
    if (!card) return;
    tryPlace(card.id, card.v, slotId);
  }, [selectedCard, bankCards, usedIds, tryPlace]);

  // ── Pointer drag ────────────────────────────────────────────────────────────
  const handleCardPointerDown = useCallback((e, card) => {
    if (usedIds.has(card.id) || disabled) return;
    e.preventDefault();
    vibe(10);

    const px = e.clientX, py = e.clientY;

    // Ghost element
    const ghost = document.createElement('div');
    ghost.style.cssText = `
      position:fixed; z-index:9999; pointer-events:none;
      width:56px; height:56px; display:flex; align-items:center; justify-content:center;
      font-family:'Fredoka',sans-serif; font-weight:900; font-size:1.6rem; color:#334155;
      background:white; border:2.5px solid #818cf8; border-radius:12px;
      box-shadow:0 15px 25px rgba(0,0,0,0.25); transform:scale(1.15) rotate(-3deg);
      left:${px - 28}px; top:${py - 28}px;
    `;
    ghost.textContent = card.v;
    document.body.appendChild(ghost);

    dragRef.current = { card, startX: px, startY: py, moved: false, ghost };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [usedIds, disabled]);

  const handleCardPointerMove = useCallback((e) => {
    const ref = dragRef.current;
    if (!ref) return;
    const dx = e.clientX - ref.startX, dy = e.clientY - ref.startY;
    if (!ref.moved && Math.sqrt(dx * dx + dy * dy) > 5) ref.moved = true;
    if (ref.ghost) {
      ref.ghost.style.left = `${e.clientX - 28}px`;
      ref.ghost.style.top  = `${e.clientY - 28}px`;
    }
    // Highlight slot under pointer
    document.querySelectorAll('[data-slot-id]').forEach((el) => el.classList.remove('active-target'));
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const slotEl = target?.closest?.('[data-slot-id]');
    if (slotEl) slotEl.classList.add('active-target');
  }, []);

  const handleCardPointerUp = useCallback((e) => {
    const ref = dragRef.current;
    if (!ref) return;
    ref.ghost?.remove();
    document.querySelectorAll('[data-slot-id]').forEach((el) => el.classList.remove('active-target'));
    dragRef.current = null;

    if (!ref.moved) {
      // Short tap → toggle card selection
      setSelectedCard((prev) => (prev === ref.card.id ? null : ref.card.id));
    } else {
      // Drag ended → find slot under pointer
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const slotEl = target?.closest?.('[data-slot-id]');
      if (slotEl) {
        tryPlaceRef.current?.(ref.card.id, ref.card.v, slotEl.dataset.slotId);
      }
    }
  }, []);

  if (!question) return null;

  // ── Render ─────────────────────────────────────────────────────────────────
  const slotList = getSlotList(question);

  return (
    <div className={`screen-enter flex flex-col flex-1 min-h-[calc(100dvh-80px)] ${errorFlash ? 'error-flash' : ''}`}>

      {/* ── Scrollable content ── */}
      <div className="flex-1 flex flex-col items-center p-4 gap-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-md shadow-xl flex flex-col items-center gap-5 p-6 border-b-4 border-slate-200 dark:border-slate-700 transition-colors">

          {/* Lives */}
          <div className="flex gap-2 justify-center w-full h-8">
            {isUnlimited
              ? <Hearts unlimitedText="ללא הגבלת ניסיונות" />
              : <Hearts lives={lives} maxLives={3} justLost={justLost} />}
          </div>

          {/* ── Legend (scaffold stage 0 only) ── */}
          {scaffoldStage === 0 && (
            <div className="w-full">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 text-center mb-1">הנוסחה</p>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-3 flex items-center justify-center flex-wrap gap-1 border border-slate-100 dark:border-slate-700" dir="ltr">
                {question.visual.map((part, i) => renderVisualPart(part, i))}
              </div>
            </div>
          )}

          {/* ── Question LHS ── */}
          <div className="w-full text-center">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">התרגיל</p>
            <div className="flex items-center justify-center flex-wrap gap-1" dir="ltr">
              {question.lhsParts.map((part, i) => renderLhsPart(part, i))}
              <span className="math-font font-black text-2xl text-slate-400 ml-1">=</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="text-2xl text-slate-300 dark:text-slate-600 animate-bounce select-none">⬇️</div>

          {/* ── RHS Slots ── */}
          <div className="flex items-center justify-center flex-wrap gap-2" dir="ltr">
            {question.slotParts.map((part, i) => {
              if (part.t === 'slot') {
                return (
                  <Slot
                    key={part.id}
                    id={part.id}
                    expected={part.exp}
                    shape={part.s}
                    filled={filledSlots[part.id]}
                    isError={errorSlot === part.id}
                    scaffoldStage={scaffoldStage}
                    hasSelection={selectedCard !== null}
                    onTap={handleSlotClick}
                  />
                );
              }
              if (part.t === 'op')  return <Op  key={i} v={part.v} />;
              if (part.t === 'par') return <Par key={i} v={part.v} />;

              // Fraction slots layout: N + (D × W) / D
              if (part.t === 'frac_slots') {
                const makeSlot = (id, exp, shape) => (
                  <Slot
                    key={id}
                    id={id}
                    expected={exp}
                    shape={shape}
                    filled={filledSlots[id]}
                    isError={errorSlot === id}
                    scaffoldStage={scaffoldStage}
                    hasSelection={selectedCard !== null}
                    onTap={handleSlotClick}
                  />
                );
                return (
                  <div key={i} className="flex flex-col items-center gap-1" dir="ltr">
                    {/* Numerator: [N] + ([D] × [W]) */}
                    <div className="flex items-center gap-1 border-b-2 border-slate-700 dark:border-slate-200 pb-2">
                      {makeSlot('fn', part.nExp, 'ci')}
                      <Op v="+" />
                      <Par v="(" />
                      {makeSlot('fd', part.dExp, 'tr')}
                      <Op v="×" />
                      {makeSlot('fw', part.wExp, 'sq')}
                      <Par v=")" />
                    </div>
                    {/* Denominator: [D] */}
                    <div className="flex justify-center">
                      {makeSlot('fd2', part.dExp, 'tr')}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>

        </div>
      </div>

      {/* ── Bank ── */}
      <div className="bg-teal-50 dark:bg-teal-900/20 px-6 py-5 rounded-t-[2rem] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        <div className="flex flex-wrap justify-center gap-3 max-w-md mx-auto min-h-[64px] items-center">
          {bankCards.map((card) => {
            const isUsed     = usedIds.has(card.id);
            const isSelected = selectedCard === card.id;
            // Color: stage 0-1 → shape color; stage 2 or distractor → neutral
            const hasColor = card.s && scaffoldStage < 2;
            const sc = hasColor ? SC[card.s] : null;

            return (
              <div
                key={card.id}
                onPointerDown={(e) => handleCardPointerDown(e, card)}
                onPointerMove={handleCardPointerMove}
                onPointerUp={handleCardPointerUp}
                onPointerCancel={handleCardPointerUp}
                className={[
                  // Base: large card style (not using .draggable-item since color varies)
                  'w-14 h-14 flex items-center justify-center rounded-xl border-2 font-black text-2xl math-font',
                  'cursor-grab active:cursor-grabbing touch-none select-none transition-all',
                  'shadow-[0_4px_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-1',
                  isUsed
                    ? 'opacity-20 grayscale pointer-events-none'
                    : isSelected
                      ? `${sc ? sc.bg : 'bg-slate-100 dark:bg-slate-700'} ${sc ? sc.border : 'border-slate-400'} scale-110 shadow-lg`
                      : sc
                        ? `bg-white dark:bg-slate-700 ${sc.border} ${sc.text}`
                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200',
                ].join(' ')}
              >
                {card.v}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Win overlay ── */}
      <FeedbackOverlay
        visible={feedback.visible}
        isLevelUp={feedback.isLevelUp}
        pts={feedback.pts}
        onDone={() => {
          if (feedback.isLevelUp) setScaffoldStage(0);
          setFeedback({ visible: false, isLevelUp: false, pts: 0 });
          newQuestion();
        }}
      />
    </div>
  );
}
