import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import Hearts from '../shared/Hearts';
import { vibe, opsDict, opEmojis } from '../../utils/math';
import Swal from 'sweetalert2';

const ONBOARD_KEY = 'onboard_equations';

// ─── Safe math evaluator (Shunting-yard, no eval) ─────────────────────────────
const safeEvaluate = (expr) => {
  const tokens = expr.replace(/\s+/g, '').match(/(\d+\.\d+|\d+|[+\-*/()])/g);
  if (!tokens) return 0;
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const applyOp = (op, b, a) => {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') return a / b;
    return 0;
  };
  const vals = [], ops = [];
  for (const token of tokens) {
    if (!isNaN(token)) { vals.push(parseFloat(token)); continue; }
    if (token === '(') { ops.push(token); continue; }
    if (token === ')') {
      while (ops.length && ops[ops.length - 1] !== '(')
        vals.push(applyOp(ops.pop(), vals.pop(), vals.pop()));
      ops.pop(); continue;
    }
    while (ops.length && ops[ops.length - 1] !== '(' && prec[ops[ops.length - 1]] >= prec[token])
      vals.push(applyOp(ops.pop(), vals.pop(), vals.pop()));
    ops.push(token);
  }
  while (ops.length) vals.push(applyOp(ops.pop(), vals.pop(), vals.pop()));
  return vals[0] ?? 0;
};

function safeEval(expr) {
  try {
    const s = expr.replace(/×/g, '*').replace(/÷/g, '/');
    if (!/^[\d+\-*/. ()]+$/.test(s)) return NaN;
    return safeEvaluate(s);
  } catch { return NaN; }
}

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─── L5 Hardcoded Bank ─────────────────────────────────────────────────────────
// Each entry: nums[5] op nums[4] → expr = n0 op0 n1 op1 n2 op2 n3 op3 n4
// Ops stored as *, / for safeEval compatibility
// All expressions verified correct with order-of-operations
const L5_BANK = [
  { nums: [12, 8, 3, 6, 2],  ops: ['+','*','-','/'] }, // 12 + 8×3 - 6÷2 = 12+24-3   = 33
  { nums: [20, 4, 2, 15, 3], ops: ['-','*','+','/'] }, // 20 - 4×2 + 15÷3 = 20-8+5   = 17
  { nums: [5,  4, 18, 6, 7], ops: ['*','+','/','-'] }, // 5×4 + 18÷6 - 7  = 20+3-7   = 16
  { nums: [3,  6, 20, 4, 8], ops: ['*','+','/','-'] }, // 3×6 + 20÷4 - 8  = 18+5-8   = 15
  { nums: [15, 3, 4,  5, 6], ops: ['/','+','*','-'] }, // 15÷3 + 4×5 - 6  = 5+20-6   = 19
  { nums: [24, 4, 2,  3, 7], ops: ['/','-','+','*'] }, // 24÷4 - 2 + 3×7  = 6-2+21   = 25
  { nums: [10, 6, 3, 14, 7], ops: ['+','*','-','/'] }, // 10 + 6×3 - 14÷7 = 10+18-2  = 26
  { nums: [7,  3, 6,  2, 4], ops: ['*','-','/','+'] }, // 7×3 - 6÷2 + 4   = 21-3+4   = 22
  { nums: [9,  4, 6, 18, 3], ops: ['+','*','-','/'] }, // 9 + 4×6 - 18÷3  = 9+24-6   = 27
];

// ─── Level configuration ──────────────────────────────────────────────────────
// Number range max by (level, tier). Tier = count within level (0=easy, 1=medium, 2=hard)
const NUM_MAX = {
  1: [10, 18, 28],   // L1 +/-
  2: [4,   6,  9],   // L2 */÷ (max factor)
  3: [12,  20, 30],  // L3
  4: [15,  25, 40],  // L4
};

// Rows per level
const NUM_ROWS = { 1: 2, 2: 2, 3: 3, 4: 4, 5: 1 };

// ─── Component ────────────────────────────────────────────────────────────────
export default function Equations() {
  const gameState      = useGameStore((s) => s.equations);
  const handleWinStore = useGameStore((s) => s.handleWin);
  const handleGameFail = useGameStore((s) => s.handleGameFail);
  const setScreen      = useGameStore((s) => s.setScreen);

  const [rows,       setRows]       = useState([]);
  const [pool,       setPool]       = useState([]);
  const [feedback,   setFeedback]   = useState({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
  const [errorFlash, setErrorFlash] = useState(false);
  const [slotsPerRow, setSlotsPerRow] = useState(3);
  const [lives,      setLives]      = useState(3);
  const [justLost,   setJustLost]   = useState(false);

  const dragRef     = useRef(null);
  const dragElRef   = useRef(null);
  const offsetRef   = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const idCounter   = useRef(0);
  const countRef    = useRef(gameState.count);
  const timersRef   = useRef([]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const nextId = () => ++idCounter.current;
  const isLvl5 = gameState.lvl === 5;

  useEffect(() => { countRef.current = gameState.count; }, [gameState.count]);

  // ─── Game init ──────────────────────────────────────────────────────────────
  const initGame = useCallback(() => {
    const lvl  = gameState.lvl;
    const tier = Math.min(countRef.current, 2);
    idCounter.current = 0;
    setLives(3);
    setJustLost(false);

    const numRows  = NUM_ROWS[lvl] ?? 2;
    const rowSlots = lvl === 5 ? 9 : 3;
    setSlotsPerRow(rowSlots);

    let newRows   = [];
    let poolItems = [];

    if (lvl === 5) {
      // ── L5: hardcoded bank, 9-slot equation (num op num op num op num op num) ─
      const pick = L5_BANK[rnd(0, L5_BANK.length - 1)];
      const exprStr = `${pick.nums[0]}${pick.ops[0]}${pick.nums[1]}${pick.ops[1]}${pick.nums[2]}${pick.ops[2]}${pick.nums[3]}${pick.ops[3]}${pick.nums[4]}`;
      const target = safeEval(exprStr);

      newRows.push({ target, slots: Array(9).fill(null) });

      // Exactly 9 pool items — no distractors (all slots must be filled)
      pick.nums.forEach((n) => poolItems.push({ id: nextId(), val: String(n), type: 'num' }));
      pick.ops.forEach((op)  => poolItems.push({ id: nextId(), val: op,       type: 'op'  }));

    } else {
      // ── L1–L4: each row = num op num ──────────────────────────────────────
      const numMax = NUM_MAX[lvl]?.[tier] ?? 10;

      // Assign exactly one distinct operator per row
      let rowOps;
      if (lvl === 1) {
        rowOps = shuffle(['+', '-']);
      } else if (lvl === 2) {
        rowOps = shuffle(['*', '/']);
      } else if (lvl === 3) {
        const all = ['+', '-', '*', '/'];
        const dropIdx = rnd(0, 3);
        rowOps = shuffle(all.filter((_, i) => i !== dropIdx));
      } else {
        // L4: all 4 ops
        rowOps = shuffle(['+', '-', '*', '/']);
      }

      for (let i = 0; i < numRows; i++) {
        const op = rowOps[i];
        let n1, n2;

        if (op === '/') {
          n2 = rnd(2, Math.min(numMax, 9));
          const maxQ = Math.max(2, Math.floor(numMax / n2));
          n1 = n2 * rnd(2, maxQ);
        } else if (op === '*') {
          n1 = rnd(2, numMax);
          n2 = rnd(2, numMax);
        } else {
          n1 = rnd(2, numMax);
          n2 = rnd(1, numMax);
          if (op === '-') {
            if (n1 <= n2) [n1, n2] = [n2, n1];
            if (n1 === n2) n1 += rnd(1, 4);
          }
        }

        const target = safeEval(`${n1}${op}${n2}`);
        newRows.push({ target, slots: Array(3).fill(null) });
        poolItems.push(
          { id: nextId(), val: String(n1), type: 'num' },
          { id: nextId(), val: String(n2), type: 'num' },
        );
      }

      // Exactly one operator per row in pool — NO op distractors
      rowOps.slice(0, numRows).forEach((op) =>
        poolItems.push({ id: nextId(), val: op, type: 'op' })
      );

      // Number distractors only (1 on tier 0, 2 on tier 1+)
      const numDist = tier === 0 ? 1 : 2;
      for (let i = 0; i < numDist; i++) {
        poolItems.push({ id: nextId(), val: String(rnd(1, numMax + 3)), type: 'num' });
      }
    }

    // Shuffle pool (Fisher-Yates)
    for (let i = poolItems.length - 1; i > 0; i--) {
      const j = rnd(0, i);
      [poolItems[i], poolItems[j]] = [poolItems[j], poolItems[i]];
    }

    setRows(newRows);
    setPool(poolItems);
  }, [gameState.lvl]);

  useEffect(() => { initGame(); }, [initGame]);

  // ─── First-time onboarding ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARD_KEY)) {
        Swal.fire({
          title: 'כאן בונים בכיף 🧩',
          html: '<div class="text-right text-sm leading-relaxed">גרור את החלקים מהמאגר לתוך הריבועים הריקים.<br><br>🔢 <b>מספרים</b> נכנסים לתאים כחולים<br>➕ <b>פעולות</b> נכנסות לתאים צהובים<br><br>המטרה: כל שורה חייבת לתת את התוצאה המסומנת!<br><br>💡 <b>הקושי עולה בהדרגה</b> ככל שתתקדם.</div>',
          confirmButtonText: 'יאללה נבנה!',
          confirmButtonColor: '#7c3aed',
          customClass: { popup: 'rounded-3xl' },
        });
        localStorage.setItem(ONBOARD_KEY, '1');
      }
    } catch {}
  }, []);

  // ─── Slot type helper ───────────────────────────────────────────────────────
  // Works for both 3-slot (num op num) and 9-slot (num op num op num op num op num)
  const getSlotType = (slotIdx) => slotIdx % 2 === 0 ? 'num' : 'op';

  // ─── Drag & Drop Engine ─────────────────────────────────────────────────────
  const handleDragStart = (e, item, fromSlot = null) => {
    e.preventDefault();
    vibe(10);

    const el = e.currentTarget;
    const r  = el.getBoundingClientRect();
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;

    offsetRef.current = { x: cx - r.left, y: cy - r.top };
    dragRef.current   = { item, fromSlot };

    const ghost = el.cloneNode(true);
    ghost.style.cssText = `position:fixed;width:${r.width}px;height:${r.height}px;left:${cx - offsetRef.current.x}px;top:${cy - offsetRef.current.y}px;z-index:9999;pointer-events:none;transform:scale(1.15) rotate(-3deg);box-shadow:0 15px 25px rgba(0,0,0,0.25);`;
    ghost.id = 'drag-ghost';
    document.body.appendChild(ghost);
    dragElRef.current = ghost;

    const move = (ev) => {
      ev.preventDefault();
      const mx = ev.clientX ?? ev.touches?.[0]?.clientX;
      const my = ev.clientY ?? ev.touches?.[0]?.clientY;
      if (dragElRef.current) {
        dragElRef.current.style.left = (mx - offsetRef.current.x) + 'px';
        dragElRef.current.style.top  = (my - offsetRef.current.y) + 'px';
      }
      document.querySelectorAll('.slot-zone').forEach((z) => {
        const zr = z.getBoundingClientRect();
        z.classList.toggle('active-target', mx > zr.left && mx < zr.right && my > zr.top && my < zr.bottom);
      });
    };

    const end = (ev) => {
      vibe(15);
      const endX = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
      const endY = ev.changedTouches ? ev.changedTouches[0].clientY : ev.clientY;

      if (dragElRef.current) { dragElRef.current.remove(); dragElRef.current = null; }
      document.querySelectorAll('.slot-zone').forEach((z) => z.classList.remove('active-target'));

      let dropped = false;
      // Capture displaced occupant OUTSIDE the setRows updater to avoid
      // setPool being called multiple times if React re-invokes the updater
      let displacedItem = null;

      document.querySelectorAll('.slot-zone').forEach((z) => {
        if (dropped) return;
        const zr = z.getBoundingClientRect();
        if (endX > zr.left && endX < zr.right && endY > zr.top && endY < zr.bottom) {
          const rowIdx  = parseInt(z.dataset.row);
          const slotIdx = parseInt(z.dataset.slot);
          if (getSlotType(slotIdx) !== item.type) return;

          dropped = true;
          setRows((prev) => {
            let displaced = null;
            const updated = prev.map((r, ri) => {
              if (ri !== rowIdx) return r;
              const newSlots = [...r.slots];
              displaced = newSlots[slotIdx];   // capture — do NOT call setPool here
              newSlots[slotIdx] = item;
              return { ...r, slots: newSlots };
            });
            displacedItem = displaced;         // expose to outer scope
            if (fromSlot) {
              return updated.map((r, ri) => {
                if (ri !== fromSlot.row) return r;
                const ns = [...r.slots];
                if (ns[fromSlot.idx]?.id === item.id) ns[fromSlot.idx] = null;
                return { ...r, slots: ns };
              });
            }
            return updated;
          });
        }
      });

      // All pool mutations happen OUTSIDE setRows — no nested setState calls
      if (dropped) {
        if (displacedItem) setPool((p) => [...p, displacedItem]);
        if (!fromSlot)     setPool((p) => p.filter((pi) => pi.id !== item.id));
      } else if (fromSlot) {
        // Failed drop — clear source slot and return item to pool
        setRows((prev) => prev.map((r, ri) => {
          if (ri !== fromSlot.row) return r;
          const ns = [...r.slots];
          if (ns[fromSlot.idx]?.id === item.id) ns[fromSlot.idx] = null;
          return { ...r, slots: ns };
        }));
        setPool((p) => [...p, item]);
      }

      document.removeEventListener('mousemove', move);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('mouseup', end);
      document.removeEventListener('touchend', end);
      dragRef.current = null;
    };

    document.addEventListener('mousemove', move, { passive: false });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('mouseup', end);
    document.addEventListener('touchend', end);
  };

  // ─── Check answer ───────────────────────────────────────────────────────────
  const checkEquations = () => {
    let ok = true;
    rows.forEach((row) => {
      let expr = '';
      row.slots.forEach((s) => { if (!s) { ok = false; return; } expr += s.val; });
      if (!ok) return;
      if (Math.abs(safeEval(expr) - row.target) > 0.001) ok = false;
    });

    if (ok) {
      vibe([30, 50, 30]);
      const result = handleWinStore('equations');
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, unlocked: result.unlocked, pts: result.pts });
    } else {
      setErrorFlash(true);
      setJustLost(true);
      timersRef.current.push(setTimeout(() => { setErrorFlash(false); setJustLost(false); }, 600));
      vibe([50, 50, 50]);

      // Hearts only for L1–L4; L5 encourages trial-and-error (no lock)
      if (!isLvl5) {
        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          handleGameFail('equations');
          Swal.fire({
            title: 'הרמה ננעלה 🔒',
            text: 'השג 5 ניצחונות ברצף כדי להתקדם לרמה הבאה!',
            icon: 'warning',
            confirmButtonText: 'הבנתי',
            confirmButtonColor: '#7c3aed',
            customClass: { popup: 'rounded-3xl' },
          }).then(() => setScreen('menu'));
        }
      }
    }
  };

  // ─── Hint ───────────────────────────────────────────────────────────────────
  const showHint = () => {
    vibe(20);
    const lvl = gameState.lvl;
    const hints = {
      1: 'יש לך שני סימני פעולה: חיבור (+) וחיסור (−). נסה לבדוק: אם אני מוסיף שני מספרים, האם אקבל את התוצאה? זכור שחיסור דורש שהמספר הגדול יהיה ראשון!',
      2: 'יש לך כפל (×) וחילוק (÷). שורה עם תוצאה גדולה — כנראה כפל. שורה עם תוצאה קטנה — כנראה חילוק. בחילוק: n1 ÷ n2 = תוצאה, כלומר n1 = n2 × תוצאה.',
      3: 'יש לך שלוש פעולות שונות. נסה לזהות קודם את שורת החילוק (תוצאה שניתנת לחלוקה שווה), ואז הכפל (תוצאה גדולה יחסית), ואז + או −.',
      4: 'השתמש בכל 4 הפעולות. כפל וחילוק נותנים תוצאות גדולות, חיבור וחיסור — קטנות יותר.',
      5: '🔑 סדר פעולות: כפל (×) וחילוק (÷) מתבצעים לפני חיבור (+) וחיסור (−)!\nדוגמה: 2 + 3 × 4 = 2 + 12 = 14 (ולא 20)\nנסה לחשב את הכפל/חילוק קודם, ואז חיבור/חיסור.',
    };
    Swal.fire({
      title: '💡 רמז',
      text: hints[lvl] || hints[4],
      icon: 'info',
      confirmButtonText: 'הבנתי, תודה!',
      confirmButtonColor: '#f59e0b',
      customClass: { popup: 'rounded-3xl' },
    });
  };

  // ─── Render item (pool chip or in-slot chip) ────────────────────────────────
  const renderItem = (item, inSlot = false, fromSlot = null) => {
    const isOp = item.type === 'op';
    const display = inSlot && isOp
      ? opEmojis[item.val]
      : (isOp ? opsDict[item.val] : item.val);

    return (
      <div
        key={item.id}
        className={`draggable-item ${isOp ? 'type-op' : 'border-indigo-400'} ${inSlot ? 'in-slot' : ''}`}
        onMouseDown={(e) => handleDragStart(e, item, fromSlot)}
        onTouchStart={(e) => handleDragStart(e, item, fromSlot)}
      >
        <span dir="rtl" className={`pointer-events-none ${inSlot ? 'drop-shadow-sm font-sans' : 'text-sm'}`}>
          {display}
        </span>
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={`screen-enter flex flex-col items-center p-3 gap-3 flex-1 min-h-[calc(100dvh-80px)] ${errorFlash ? 'error-flash' : ''}`}>

      {/* Hearts — only L1–L4 */}
      {!isLvl5 && (
        <div className="w-full max-w-lg flex justify-end items-center px-1">
          <Hearts lives={lives} maxLives={3} justLost={justLost} />
        </div>
      )}

      {/* Order-of-operations reminder — L5 only */}
      {isLvl5 && (
        <div className="w-full max-w-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-2xl px-4 py-3 text-right">
          <p className="text-sm font-black text-amber-700 dark:text-amber-300">⚡ סדר פעולות חשבון</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
            כפל (×) וחילוק (÷) — לפני חיבור (+) וחיסור (−)
          </p>
          <p className="text-xs text-amber-500 dark:text-amber-500 mt-0.5">
            דוגמה: 2 + 3 × 4 = 2 + <b>12</b> = 14
          </p>
        </div>
      )}

      {/* Equation rows */}
      <div className="w-full max-w-lg flex flex-col gap-3">
        {rows.map((row, ri) => (
          <div
            key={ri}
            className={`equation-row bg-white dark:bg-slate-700/50 border border-purple-200 dark:border-purple-800/30 ${isLvl5 ? 'lvl5-row flex-wrap justify-center' : ''}`}
          >
            {row.slots.map((slot, si) => (
              <div
                key={si}
                className={`slot-zone ${getSlotType(si) === 'op' ? 'type-op' : ''} ${isLvl5 ? 'lvl5-slot bg-slate-50 dark:bg-slate-800' : ''}`}
                data-row={ri}
                data-slot={si}
                data-type={getSlotType(si)}
              >
                {slot && renderItem(slot, true, { row: ri, idx: si })}
              </div>
            ))}
            <span className={`${isLvl5 ? 'lvl5-text' : ''} mx-1 text-slate-400 font-bold`}>=</span>
            <div className={`${isLvl5 ? 'lvl5-target px-2 min-w-[3rem] rounded-lg' : 'w-12 h-12 rounded-xl'} bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-black ${isLvl5 ? '' : 'text-xl'} shadow-md shrink-0`}>
              {row.target}
            </div>
          </div>
        ))}
      </div>

      {/* Pool */}
      <div className="flex flex-wrap justify-center content-start gap-2 min-h-[120px] bg-slate-100 dark:bg-slate-800 p-4 rounded-[2rem] shadow-inner w-full max-w-lg border-2 border-purple-300 dark:border-purple-800/50 relative z-20">
        {pool.map((item) => renderItem(item))}
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-lg flex gap-2 pb-6 mt-auto">
        <button
          onClick={showHint}
          className="w-16 py-4 bg-purple-200 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded-2xl font-black text-xl hover:bg-purple-300 transition-all active:scale-95 shadow-sm"
        >
          💡
        </button>
        <button
          onClick={checkEquations}
          className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-black text-xl shadow-lg hover:bg-purple-700 transition-all active:scale-95"
        >
          בדיקה ✨
        </button>
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
