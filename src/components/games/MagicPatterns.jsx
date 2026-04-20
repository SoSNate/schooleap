import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import Hearts from '../shared/Hearts';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import GameTutorial from '../shared/GameTutorial';
import HintButton from '../shared/HintButton';
import HintBubble from '../shared/HintBubble';
import useHint from '../../hooks/useHint';
import { reportHintUsed } from '../../lib/telemetry';
import { vibe } from '../../utils/math';
import Swal from 'sweetalert2';
import { getHint } from './magicPatternsEngine';

// ── SVG Shape Icons ───────────────────────────────────────────────────────────
function ShapeIcon({ shape, className = 'w-full h-full' }) {
  if (shape === 'sq') return <svg viewBox="0 0 24 24" className={className}><rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" /></svg>;
  if (shape === 'ci') return <svg viewBox="0 0 24 24" className={className}><circle cx="12" cy="12" r="10" fill="currentColor" /></svg>;
  if (shape === 'tr') return <svg viewBox="0 0 24 24" className={className}><path d="M12 2L22 22H2Z" fill="currentColor" /></svg>;
  if (shape === 'rh') return <svg viewBox="0 0 24 24" className={className}><path d="M12 2L22 12L12 22L2 12Z" fill="currentColor" /></svg>;
  if (shape === 'st') return <svg viewBox="0 0 24 24" className={className}><path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="currentColor" /></svg>;
  if (shape === 'hx') return <svg viewBox="0 0 24 24" className={className}><path d="M12 2L22 7V17L12 22L2 17V7Z" fill="currentColor" /></svg>;
  return null;
}

// shape → Tailwind color tokens
const SC = {
  sq: { text: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/30',       border: 'border-blue-400 dark:border-blue-500'       },  // כחול
  ci: { text: 'text-rose-600',    bg: 'bg-rose-50 dark:bg-rose-900/30',       border: 'border-rose-400 dark:border-rose-500'       },  // ורוד
  tr: { text: 'text-green-600',   bg: 'bg-green-50 dark:bg-green-900/30',     border: 'border-green-400 dark:border-green-500'     },  // ירוק
  rh: { text: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/30',     border: 'border-amber-400 dark:border-amber-500'     },  // צהוב-כתום
  st: { text: 'text-violet-600',  bg: 'bg-violet-50 dark:bg-violet-900/30',   border: 'border-violet-400 dark:border-violet-500'   },  // סגול
  hx: { text: 'text-cyan-600',    bg: 'bg-cyan-50 dark:bg-cyan-900/30',       border: 'border-cyan-400 dark:border-cyan-500'       },  // תכלת
};
const NEUTRAL = { text: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-700', border: 'border-slate-300 dark:border-slate-600' };

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

// Returns n unique random shapes from the full pool — ensures variety across questions
const SHAPE_POOL_SIMPLE = ['sq', 'ci', 'tr'];                    // L1-2: צורות בסיסיות בלבד
const SHAPE_POOL_ALL    = ['sq', 'ci', 'tr', 'rh', 'st', 'hx']; // L3+: כל הצורות
let _activeShapePool = SHAPE_POOL_ALL; // מוגדר לפני קריאה ל-generateQuestion
function pickShapes(n) { return shuffle(_activeShapePool).slice(0, n); }

// Returns a distractor value not already in the excluded list
function pickDistractor(exclude, min = 2, max = 9) {
  const candidates = [];
  for (let v = min; v <= max; v++) { if (!exclude.includes(v)) candidates.push(v); }
  return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : rnd(min, max);
}

// ── Question Generators ────────────────────────────────────────────────────────
// Each generator calls pickShapes() so shapes rotate randomly between questions.
// Numbers are kept small — the goal is pattern recognition, not arithmetic.

// L1: סדר פעולות  a + b × c = a + (b × c)
function genOrderOfOps() {
  const [sA, sB, sC] = pickShapes(3);
  const a = rnd(2, 7), b = rnd(2, 4), c = rnd(2, 4);
  const d1 = pickDistractor([a, b, c]);
  const d2 = pickDistractor([a, b, c, d1]);
  return {
    key: `ord_${a}_${b}_${c}`,
    type: 'orderOfOps',
    name: 'סדר פעולות',
    visual: [
      { t: 'sh', s: sA }, { t: 'op', v: '+' }, { t: 'sh', s: sB }, { t: 'op', v: '×' }, { t: 'sh', s: sC },
      { t: 'op', v: '=' },
      { t: 'sh', s: sA }, { t: 'op', v: '+' }, { t: 'par', v: '(' },
      { t: 'sh', s: sB }, { t: 'op', v: '×' }, { t: 'sh', s: sC }, { t: 'par', v: ')' },
    ],
    lhsParts: [
      { t: 'num', v: a, s: sA }, { t: 'op', v: '+' },
      { t: 'num', v: b, s: sB }, { t: 'op', v: '×' }, { t: 'num', v: c, s: sC },
    ],
    slotParts: [
      { t: 'slot', id: 's0', exp: a, s: sA }, { t: 'op', v: '+' }, { t: 'par', v: '(' },
      { t: 'slot', id: 's1', exp: b, s: sB }, { t: 'op', v: '×' }, { t: 'slot', id: 's2', exp: c, s: sC },
      { t: 'par', v: ')' },
    ],
    bankCards: shuffle([
      { v: a, s: sA }, { v: b, s: sB }, { v: c, s: sC },
      { v: d1, s: null }, { v: d2, s: null },
    ]).map((c, i) => ({ ...c, id: `c${i}` })),
  };
}

// L2: חוק הפילוח  a × (b + c) = a×b + a×c
function genDistributive() {
  const [sA, sB, sC] = pickShapes(3);
  const a = rnd(2, 4), b = rnd(2, 5), c = rnd(2, 5);
  const d1 = pickDistractor([a, b, c]);
  const d2 = pickDistractor([a, b, c, d1]);
  return {
    key: `dist_${a}_${b}_${c}`,
    type: 'distributive',
    name: 'חוק הפילוח',
    visual: [
      { t: 'sh', s: sA }, { t: 'op', v: '×' }, { t: 'par', v: '(' },
      { t: 'sh', s: sB }, { t: 'op', v: '+' }, { t: 'sh', s: sC }, { t: 'par', v: ')' },
      { t: 'op', v: '=' },
      { t: 'sh', s: sA }, { t: 'op', v: '×' }, { t: 'sh', s: sB },
      { t: 'op', v: '+' },
      { t: 'sh', s: sA }, { t: 'op', v: '×' }, { t: 'sh', s: sC },
    ],
    lhsParts: [
      { t: 'num', v: a, s: sA }, { t: 'op', v: '×' }, { t: 'par', v: '(' },
      { t: 'num', v: b, s: sB }, { t: 'op', v: '+' }, { t: 'num', v: c, s: sC }, { t: 'par', v: ')' },
    ],
    slotParts: [
      { t: 'slot', id: 's0', exp: a, s: sA }, { t: 'op', v: '×' }, { t: 'slot', id: 's1', exp: b, s: sB },
      { t: 'op', v: '+' },
      { t: 'slot', id: 's2', exp: a, s: sA }, { t: 'op', v: '×' }, { t: 'slot', id: 's3', exp: c, s: sC },
    ],
    bankCards: shuffle([
      { v: a, s: sA }, { v: a, s: sA },
      { v: b, s: sB }, { v: c, s: sC },
      { v: d1, s: null }, { v: d2, s: null },
    ]).map((c, i) => ({ ...c, id: `c${i}` })),
  };
}

// L3: שבר מעורב  W N/D = (W×D+N)/D
function genMixedFraction() {
  const [sW, sN, sD] = pickShapes(3);
  const w = rnd(2, 4), n = rnd(1, 3), d = rnd(3, 6);
  const d1 = pickDistractor([w, n, d]);
  return {
    key: `mfrac_${w}_${n}_${d}`,
    type: 'mixedFraction',
    name: 'שבר מעורב',
    visual: [
      { t: 'mixed_shape', wS: sW, nS: sN, dS: sD },
      { t: 'op', v: '=' },
      { t: 'frac_complex', wS: sW, nS: sN, dS: sD },
    ],
    lhsParts: [{ t: 'mixed_num', w, n, d, sW, sN, sD }],
    slotParts: [{ t: 'frac_slots', wExp: w, nExp: n, dExp: d, sW, sN, sD }],
    bankCards: shuffle([
      { v: w, s: sW }, { v: n, s: sN },
      { v: d, s: sD }, { v: d, s: sD },
      { v: d1, s: null },
    ]).map((c, i) => ({ ...c, id: `c${i}` })),
  };
}

// L4a: כפל שברים  a/b × c/d = (a×c)/(b×d)
function genFracMultiply() {
  const [sAN, sAD, sCN, sCD] = pickShapes(4);
  const a = rnd(1, 4), b = rnd(2, 5), c = rnd(1, 4), d = rnd(2, 5);
  const d1 = pickDistractor([a, b, c, d]);
  const d2 = pickDistractor([a, b, c, d, d1]);
  return {
    key: `fmul_${a}_${b}_${c}_${d}`,
    type: 'fracMultiply',
    name: 'כפל שברים',
    visual: [
      { t: 'frac_sh', ns: sAN, ds: sAD },
      { t: 'op', v: '×' },
      { t: 'frac_sh', ns: sCN, ds: sCD },
      { t: 'op', v: '=' },
      { t: 'frac_sh_mult', nsa: sAN, nsb: sCN, dsa: sAD, dsb: sCD },
    ],
    lhsParts: [
      { t: 'frac_disp', n: a, d: b, ns: sAN, ds: sAD },
      { t: 'op', v: '×' },
      { t: 'frac_disp', n: c, d: d, ns: sCN, ds: sCD },
    ],
    slotParts: [{ t: 'frac_mult_slots', aExp: a, bExp: b, cExp: c, dExp: d, sAN, sAD, sCN, sCD }],
    bankCards: shuffle([
      { v: a, s: sAN }, { v: b, s: sAD }, { v: c, s: sCN }, { v: d, s: sCD },
      { v: d1, s: null }, { v: d2, s: null },
    ]).map((c, i) => ({ ...c, id: `c${i}` })),
  };
}

// L4b: חילוק שברים  a/b ÷ c/d = a/b × d/c
function genFracDivide() {
  const [s1n, s1d, s2n, s2d] = pickShapes(4);
  const a = rnd(1, 4), b = rnd(2, 5), c = rnd(1, 4), d = rnd(2, 5);
  const d1 = pickDistractor([a, b, c, d]);
  return {
    key: `fdiv_${a}_${b}_${c}_${d}`,
    type: 'fracDivide',
    name: 'חילוק שברים',
    visual: [
      { t: 'frac_sh', ns: s1n, ds: s1d },
      { t: 'op', v: '÷' },
      { t: 'frac_sh', ns: s2n, ds: s2d },
      { t: 'op', v: '=' },
      { t: 'frac_sh', ns: s1n, ds: s1d },
      { t: 'op', v: '×' },
      { t: 'frac_sh', ns: s2d, ds: s2n },
    ],
    lhsParts: [
      { t: 'frac_disp', n: a, d: b, ns: s1n, ds: s1d },
      { t: 'op', v: '÷' },
      { t: 'frac_disp', n: c, d: d, ns: s2n, ds: s2d },
    ],
    slotParts: [{
      t: 'frac_two_slots',
      a1Exp: a, d1Exp: b, s1n, s1d,
      a2Exp: d, d2Exp: c, s2n: s2d, s2d: s2n,
    }],
    bankCards: shuffle([
      { v: a, s: s1n }, { v: b, s: s1d }, { v: c, s: s2n }, { v: d, s: s2d },
      { v: d1, s: null },
    ]).map((c, i) => ({ ...c, id: `c${i}` })),
  };
}

// L5: כינוס איברים  a×x + b×x = (a+b)×x
function genCollecting() {
  const [sA, sB, sX] = pickShapes(3);
  const a = rnd(2, 5), b = rnd(2, 5), x = rnd(2, 6);
  const d1 = pickDistractor([a, b, x]);
  return {
    key: `coll_${a}_${b}_${x}`,
    type: 'collecting',
    name: 'כינוס איברים',
    visual: [{ t: 'area_model', aS: sA, bS: sB, xS: sX }],
    lhsParts: [
      { t: 'num', v: a, s: sA }, { t: 'op', v: '×' }, { t: 'num', v: x, s: sX },
      { t: 'op', v: '+' },
      { t: 'num', v: b, s: sB }, { t: 'op', v: '×' }, { t: 'num', v: x, s: sX },
    ],
    slotParts: [
      { t: 'par', v: '(' },
      { t: 'slot', id: 's0', exp: a, s: sA },
      { t: 'op', v: '+' },
      { t: 'slot', id: 's1', exp: b, s: sB },
      { t: 'par', v: ')' },
      { t: 'op', v: '×' },
      { t: 'slot', id: 's2', exp: x, s: sX },
    ],
    bankCards: shuffle([
      { v: a, s: sA }, { v: b, s: sB }, { v: x, s: sX },
      { v: d1, s: null },
    ]).map((c, i) => ({ ...c, id: `c${i}` })),
  };
}

const LEVEL_GENS = {
  1: [genOrderOfOps],
  2: [genDistributive],
  3: [genMixedFraction],
  4: [genFracMultiply, genFracDivide],
  5: [genCollecting],
};

function generateQuestion(lvl, recentKeys) {
  // הגדר pool צורות לפי רמה
  _activeShapePool = lvl <= 2 ? SHAPE_POOL_SIMPLE : SHAPE_POOL_ALL;
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
      slots.push(
        { id: 'fn',  expected: p.nExp, shape: p.sN },
        { id: 'fd',  expected: p.dExp, shape: p.sD },
        { id: 'fw',  expected: p.wExp, shape: p.sW },
        { id: 'fd2', expected: p.dExp, shape: p.sD },
      );
    } else if (p.t === 'frac_mult_slots') {
      slots.push(
        { id: 'fm0', expected: p.aExp, shape: p.sAN },
        { id: 'fm1', expected: p.cExp, shape: p.sCN },
        { id: 'fm2', expected: p.bExp, shape: p.sAD },
        { id: 'fm3', expected: p.dExp, shape: p.sCD },
      );
    } else if (p.t === 'frac_two_slots') {
      // a/b × d/c: two fractions side by side
      slots.push(
        { id: 'ft0', expected: p.a1Exp, shape: p.s1n },
        { id: 'ft1', expected: p.d1Exp, shape: p.s1d },
        { id: 'ft2', expected: p.a2Exp, shape: p.s2n },
        { id: 'ft3', expected: p.d2Exp, shape: p.s2d },
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
function Slot({ id, shape, filled, isError, scaffoldStage, hideColors, hasSelection, onTap }) {
  const sc = SC[shape] || NEUTRAL;
  const neutral = hideColors || scaffoldStage >= 2;
  const isEmpty = filled === undefined;
  return (
    <div
      data-slot-id={id}
      onClick={() => onTap(id)}
      className={[
        'w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center relative rounded-xl border-2 cursor-pointer transition-all select-none',
        isError
          ? 'bg-red-100 dark:bg-red-900/40 border-red-400 scale-110'
          : isEmpty
            ? neutral
              ? 'bg-slate-100 dark:bg-slate-700 border-dashed border-slate-300 dark:border-slate-600'
              : `${sc.bg} ${sc.border} border-dashed`
            : neutral
              ? 'bg-slate-100 dark:bg-slate-700 border-solid border-slate-400 shadow-md'
              : `${sc.bg} ${sc.border} border-solid shadow-md`,
        hasSelection && isEmpty && !isError ? 'active-target' : '',
      ].join(' ')}
    >
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
function renderVisualPart(part, i, hideColors) {
  const sc = (s) => hideColors ? NEUTRAL : (SC[s] || NEUTRAL);

  if (part.t === 'sh') {
    return <div key={i} className={`w-7 h-7 ${sc(part.s).text}`}><ShapeIcon shape={part.s} /></div>;
  }
  if (part.t === 'op')  return <span key={i} className="math-font font-black text-lg text-slate-400 mx-0.5">{part.v}</span>;
  if (part.t === 'par') return <span key={i} className="math-font font-light text-slate-300 text-2xl">{part.v}</span>;

  if (part.t === 'mixed_shape') {
    return (
      <div key={i} className="flex items-center gap-1">
        <div className={`w-7 h-7 ${sc(part.wS).text}`}><ShapeIcon shape={part.wS} /></div>
        <div className="flex flex-col items-center">
          <div className={`w-5 h-5 ${sc(part.nS).text} border-b-2 border-slate-400 pb-0.5`}><ShapeIcon shape={part.nS} /></div>
          <div className={`w-5 h-5 ${sc(part.dS).text} pt-0.5`}><ShapeIcon shape={part.dS} /></div>
        </div>
      </div>
    );
  }

  if (part.t === 'frac_complex') {
    return (
      <div key={i} className="flex flex-col items-center mx-1">
        <div className="flex items-center gap-0.5 border-b-2 border-slate-500 dark:border-slate-400 pb-0.5">
          <span className="text-slate-400 text-xs">(</span>
          <div className={`w-4 h-4 ${sc(part.nS).text}`}><ShapeIcon shape={part.nS} /></div>
          <span className="text-slate-400 text-xs">+</span>
          <div className={`w-4 h-4 ${sc(part.dS).text}`}><ShapeIcon shape={part.dS} /></div>
          <span className="text-slate-400 text-xs">×</span>
          <div className={`w-4 h-4 ${sc(part.wS).text}`}><ShapeIcon shape={part.wS} /></div>
          <span className="text-slate-400 text-xs">)</span>
        </div>
        <div className={`w-5 h-5 ${sc(part.dS).text} mt-0.5`}><ShapeIcon shape={part.dS} /></div>
      </div>
    );
  }

  // frac_sh: single fraction with two shape icons (used in L4 legends)
  if (part.t === 'frac_sh') {
    return (
      <div key={i} className="flex flex-col items-center mx-1">
        <div className={`w-5 h-5 ${sc(part.ns).text} border-b-2 border-slate-400 pb-0.5`}><ShapeIcon shape={part.ns} /></div>
        <div className={`w-5 h-5 ${sc(part.ds).text} pt-0.5`}><ShapeIcon shape={part.ds} /></div>
      </div>
    );
  }

  // frac_sh_mult: (nsa×nsb)/(dsa×dsb) for כפל שברים result
  if (part.t === 'frac_sh_mult') {
    return (
      <div key={i} className="flex flex-col items-center mx-1">
        <div className="flex items-center gap-0.5 border-b-2 border-slate-500 dark:border-slate-400 pb-0.5">
          <div className={`w-4 h-4 ${sc(part.nsa).text}`}><ShapeIcon shape={part.nsa} /></div>
          <span className="text-slate-400 text-xs">×</span>
          <div className={`w-4 h-4 ${sc(part.nsb).text}`}><ShapeIcon shape={part.nsb} /></div>
        </div>
        <div className="flex items-center gap-0.5 pt-0.5">
          <div className={`w-4 h-4 ${sc(part.dsa).text}`}><ShapeIcon shape={part.dsa} /></div>
          <span className="text-slate-400 text-xs">×</span>
          <div className={`w-4 h-4 ${sc(part.dsb).text}`}><ShapeIcon shape={part.dsb} /></div>
        </div>
      </div>
    );
  }

  // area_model: rectangle visual for כינוס איברים (L5) — always neutral
  if (part.t === 'area_model') {
    return (
      <div key={i} className="flex flex-col items-center gap-1" dir="ltr">
        <div className="flex items-stretch border-2 border-slate-400 rounded-sm overflow-hidden">
          <div className="w-14 h-10 flex items-center justify-center gap-0.5 bg-slate-50 dark:bg-slate-800 border-r border-slate-400">
            <div className="w-4 h-4 text-slate-400"><ShapeIcon shape={part.aS} /></div>
            <span className="text-slate-400 text-xs">×</span>
            <div className="w-4 h-4 text-slate-400"><ShapeIcon shape={part.xS} /></div>
          </div>
          <div className="w-14 h-10 flex items-center justify-center gap-0.5 bg-slate-100 dark:bg-slate-700">
            <div className="w-4 h-4 text-slate-400"><ShapeIcon shape={part.bS} /></div>
            <span className="text-slate-400 text-xs">×</span>
            <div className="w-4 h-4 text-slate-400"><ShapeIcon shape={part.xS} /></div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 text-xs font-bold text-slate-500">
          <span>(</span>
          <div className="w-3 h-3 text-slate-400"><ShapeIcon shape={part.aS} /></div>
          <span>+</span>
          <div className="w-3 h-3 text-slate-400"><ShapeIcon shape={part.bS} /></div>
          <span>)×</span>
          <div className="w-3 h-3 text-slate-400"><ShapeIcon shape={part.xS} /></div>
        </div>
      </div>
    );
  }

  return null;
}

// ── LHS part renderer ─────────────────────────────────────────────────────────
function renderLhsPart(part, i, hideColors) {
  const sc = (s) => hideColors ? NEUTRAL : (SC[s] || NEUTRAL);

  if (part.t === 'num') {
    return <span key={i} className={`math-font font-black text-3xl ${sc(part.s).text}`}>{part.v}</span>;
  }
  if (part.t === 'op')  return <Op key={i} v={part.v} />;
  if (part.t === 'par') return <Par key={i} v={part.v} />;

  if (part.t === 'mixed_num') {
    return (
      <div key={i} className="flex items-center gap-1" dir="ltr">
        <span className={`math-font font-black text-4xl ${sc(part.sW).text}`}>{part.w}</span>
        <div className="flex flex-col items-center math-font font-black text-2xl">
          <span className={`${sc(part.sN).text} border-b-2 border-slate-600 dark:border-slate-300 px-1 pb-0.5`}>{part.n}</span>
          <span className={`${sc(part.sD).text} px-1 pt-0.5`}>{part.d}</span>
        </div>
      </div>
    );
  }

  // frac_disp: a colored fraction with actual numbers (used in L4 LHS)
  if (part.t === 'frac_disp') {
    return (
      <div key={i} className="flex flex-col items-center mx-1" dir="ltr">
        <span className={`math-font font-black text-3xl ${sc(part.ns).text} border-b-2 border-slate-600 dark:border-slate-300 px-1 pb-0.5`}>
          {part.n}
        </span>
        <span className={`math-font font-black text-3xl ${sc(part.ds).text} px-1 pt-0.5`}>
          {part.d}
        </span>
      </div>
    );
  }

  return null;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MagicPatterns() {
  const gameState    = useGameStore((s) => s.magicPatterns);
  const handleWin    = useGameStore((s) => s.handleWin);

  const [question,     setQuestion]     = useState(null);
  const [bankCards,    setBankCards]    = useState([]);
  const [usedIds,      setUsedIds]      = useState(new Set());
  const [filledSlots,  setFilledSlots]  = useState({});   // {slotId: value}
  const [selectedCard, setSelectedCard] = useState(null); // card.id for tap-to-place
  const [errorSlot,    setErrorSlot]    = useState(null);
  const [errorFlash,   setErrorFlash]   = useState(false);
  const [scaffoldStage, setScaffoldStage] = useState(0);  // 0=full 1=partial 2=none
  const [disabled,     setDisabled]     = useState(false);
  const [feedback,     setFeedback]     = useState({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
  // L4-L5 only: lives (3 per question) + colorsHidden (colors off by default, revealed on error)
  const [lives,        setLives]        = useState(3);
  const [colorsHidden, setColorsHidden] = useState(true);

  const recentRef    = useRef([]);
  const dragRef      = useRef(null);
  const tryPlaceRef  = useRef(null);

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
    setDisabled(false);
    // L4-L5: reset per-question lives and hide colors again
    if (gameState.lvl >= 4) {
      setLives(3);
      setColorsHidden(true);
    }
  }, [gameState.lvl]);

  useEffect(() => { newQuestion(); }, [newQuestion]);

  // Hint infra
  const onApplyHint = useCallback(() => {
    // Magic Patterns doesn't snap controls on hint
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

  // Update newQuestion to reset hint
  useEffect(() => {
    resetHintRound();
  }, [question, resetHintRound]);


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
          if (usedHint) reportHintUsed({ game: 'magicPatterns', level: gameState.lvl });
          setFeedback({ visible: true, isLevelUp: result.isLevelUp, unlocked: result.unlocked, pts: result.pts });
        }, 300);
      }
    } else {
      // ❌ Wrong placement
      vibe([50, 50, 50]);
      setErrorSlot(slotId);
      setSelectedCard(null);
      setErrorFlash(true);

      if (gameState.lvl >= 4) {
        // L4-L5: lose a heart + reveal colors as hint
        setColorsHidden(false);
        setLives((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            // Out of hearts — skip question after short delay
            setTimeout(() => {
              Swal.fire({
                title: 'אוף! נגמרו הלבבות 💔',
                text: 'ננסה שאלה חדשה',
                confirmButtonText: 'המשך',
                confirmButtonColor: '#ec4899',
                timer: 2000,
                timerProgressBar: true,
                customClass: { popup: 'rounded-3xl' },
              }).then(() => newQuestion());
            }, 400);
          }
          return next;
        });
      } else {
        // L1-L3: scaffold goes back one step, no lives
        setScaffoldStage((s) => Math.max(0, s - 1));
      }

      setTimeout(() => {
        setErrorSlot(null);
        setErrorFlash(false);
      }, 600);
    }
  }, [disabled, question, filledSlots, handleWin, newQuestion, gameState.lvl]);

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
  // L4-L5: colors hidden by default; revealed (as hint) when player loses a heart
  const hideColors = gameState.lvl >= 4 && colorsHidden;


  return (
    <div className={`screen-enter flex flex-col flex-1 min-h-[calc(100dvh-80px)] ${errorFlash ? 'error-flash' : ''}`}>
      <GameTutorial gameName="magicPatterns" level={gameState.lvl} />

      {/* ── Scrollable content ── */}
      <div className="flex-1 flex flex-col items-center p-4 gap-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-md shadow-xl flex flex-col items-center gap-5 p-6 border-2 border-pink-200 dark:border-pink-800/40 border-b-4 border-b-pink-400 dark:border-b-pink-700 transition-colors">

          {/* Scaffold stage indicator + hint button + hearts for L4-L5 */}
          <div className="flex justify-between items-center w-full h-8">
            <span className="text-xs font-bold text-slate-400">
              {gameState.lvl >= 4
                ? (colorsHidden ? '⬜ ללא צבעים' : '🎨 צבעים פעילים')
                : (scaffoldStage === 0 ? '🔵 מלא עזרים' : scaffoldStage === 1 ? '🟡 עזרים חלקיים' : '🔴 ללא עזרים')}
            </span>
            <div className="flex gap-1 items-center">
              <HintButton cooldown={hintCooldown} onClick={requestHint} colorToken="violet" />
              {gameState.lvl >= 4 && (
                <Hearts count={lives} />
              )}
            </div>
          </div>

          {/* ── Legend (scaffold stage 0 only) ── */}
          {scaffoldStage === 0 && (
            <div className="w-full">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 text-center mb-1">הנוסחה</p>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-3 flex items-center justify-center flex-wrap gap-1 border border-slate-100 dark:border-slate-700" dir="ltr">
                {question.visual.map((part, i) => renderVisualPart(part, i, hideColors))}
              </div>
            </div>
          )}

          {/* ── Question LHS ── */}
          <div className="w-full text-center">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">התרגיל</p>
            <div className="flex items-center justify-center flex-wrap gap-1" dir="ltr">
              {question.lhsParts.map((part, i) => renderLhsPart(part, i, hideColors))}
              <span className="math-font font-black text-4xl text-yellow-400 dark:text-yellow-300 ml-2 drop-shadow-md">=</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="text-2xl text-slate-300 dark:text-slate-600 animate-bounce select-none">⬇️</div>

          {/* ── RHS Slots ── */}
          <div className="flex items-center justify-center flex-wrap gap-1 sm:gap-2 w-full" dir="ltr">
            {question.slotParts.map((part, i) => {
              if (part.t === 'slot') {
                return (
                  <Slot
                    key={part.id} id={part.id} shape={part.s}
                    filled={filledSlots[part.id]} isError={errorSlot === part.id}
                    scaffoldStage={scaffoldStage} hideColors={hideColors}
                    hasSelection={selectedCard !== null} onTap={handleSlotClick}
                  />
                );
              }
              if (part.t === 'op')  return <Op  key={i} v={part.v} />;
              if (part.t === 'par') return <Par key={i} v={part.v} />;

              // L3: שבר מעורב  N + (D × W) / D
              if (part.t === 'frac_slots') {
                const mkS = (id, shape) => <Slot key={id} id={id} shape={shape} filled={filledSlots[id]} isError={errorSlot === id} scaffoldStage={scaffoldStage} hideColors={hideColors} hasSelection={selectedCard !== null} onTap={handleSlotClick} />;
                return (
                  <div key={i} className="flex flex-col items-center gap-1" dir="ltr">
                    <div className="flex items-center gap-1 border-b-2 border-slate-700 dark:border-slate-200 pb-2">
                      {mkS('fn', part.sN)}<Op v="+" /><Par v="(" />
                      {mkS('fd', part.sD)}<Op v="×" />{mkS('fw', part.sW)}<Par v=")" />
                    </div>
                    <div className="flex justify-center">{mkS('fd2', part.sD)}</div>
                  </div>
                );
              }

              // L4a: כפל שברים  (a×c)/(b×d)
              if (part.t === 'frac_mult_slots') {
                const mkS = (id, shape) => <Slot key={id} id={id} shape={shape} filled={filledSlots[id]} isError={errorSlot === id} scaffoldStage={scaffoldStage} hideColors={hideColors} hasSelection={selectedCard !== null} onTap={handleSlotClick} />;
                return (
                  <div key={i} className="flex flex-col items-center gap-1" dir="ltr">
                    <div className="flex items-center gap-1 border-b-2 border-slate-700 dark:border-slate-200 pb-2">
                      {mkS('fm0', part.sAN)}<Op v="×" />{mkS('fm1', part.sCN)}
                    </div>
                    <div className="flex items-center gap-1 pt-1">
                      {mkS('fm2', part.sAD)}<Op v="×" />{mkS('fm3', part.sCD)}
                    </div>
                  </div>
                );
              }

              // L4b: חילוק שברים  a/b × d/c
              if (part.t === 'frac_two_slots') {
                return (
                  <div key={i} className="flex items-center gap-3" dir="ltr">
                    <div className="flex flex-col items-center gap-1">
                      <div className="border-b-2 border-slate-700 dark:border-slate-200 pb-1 px-1">
                        <Slot id="ft0" shape={part.s1n} filled={filledSlots['ft0']} isError={errorSlot === 'ft0'} scaffoldStage={scaffoldStage} hideColors={hideColors} hasSelection={selectedCard !== null} onTap={handleSlotClick} />
                      </div>
                      <div className="pt-1">
                        <Slot id="ft1" shape={part.s1d} filled={filledSlots['ft1']} isError={errorSlot === 'ft1'} scaffoldStage={scaffoldStage} hideColors={hideColors} hasSelection={selectedCard !== null} onTap={handleSlotClick} />
                      </div>
                    </div>
                    <Op v="×" />
                    <div className="flex flex-col items-center gap-1">
                      <div className="border-b-2 border-slate-700 dark:border-slate-200 pb-1 px-1">
                        <Slot id="ft2" shape={part.s2n} filled={filledSlots['ft2']} isError={errorSlot === 'ft2'} scaffoldStage={scaffoldStage} hideColors={hideColors} hasSelection={selectedCard !== null} onTap={handleSlotClick} />
                      </div>
                      <div className="pt-1">
                        <Slot id="ft3" shape={part.s2d} filled={filledSlots['ft3']} isError={errorSlot === 'ft3'} scaffoldStage={scaffoldStage} hideColors={hideColors} hasSelection={selectedCard !== null} onTap={handleSlotClick} />
                      </div>
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
      <div className="sticky bottom-0 z-10 bg-pink-50 dark:bg-pink-900/20 border-t-2 border-pink-200 dark:border-pink-800 px-6 py-5 rounded-t-[2rem] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        <div className="flex flex-wrap justify-center gap-3 max-w-md mx-auto min-h-[64px] items-center">
          {bankCards.map((card) => {
            const isUsed     = usedIds.has(card.id);
            const isSelected = selectedCard === card.id;
            const hasColor = card.s && !hideColors && scaffoldStage < 2;
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
                  'w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center rounded-xl border-2 font-black text-xl sm:text-2xl math-font',
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

      {/* Hint bubble */}
      <HintBubble text={hintBubbleText} />

      {/* ── Win overlay ── */}
      <FeedbackOverlay
        visible={feedback.visible}
        isLevelUp={feedback.isLevelUp}
        unlocked={feedback.unlocked}
        pts={feedback.pts}
        onDone={() => {
          if (feedback.isLevelUp) {
            setScaffoldStage(0);
            setLives(3);
            setColorsHidden(true);
          }
          setFeedback({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
          newQuestion();
        }}
      />
    </div>
  );
}
