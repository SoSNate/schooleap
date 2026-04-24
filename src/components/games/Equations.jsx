import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import HintButton from '../shared/HintButton';
import HintBubble from '../shared/HintBubble';
import useHint from '../../hooks/useHint';
import { vibe, opsDict, opEmojis, rnd, shuffle } from '../../utils/math';
import GameTutorial from '../shared/GameTutorial';

// Safe math evaluator (Shunting-yard, no eval).
// Returns NaN on any error (divide-by-zero, malformed input, empty stack).
// Callers must check Number.isFinite before using.
const safeEvaluate = (expr) => {
  const tokens = expr.replace(/\s+/g, '').match(/(\d+\.\d+|\d+|[+\-*/()])/g);
  if (!tokens) return NaN;
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const applyOp = (op, b, a) => {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') return b === 0 ? NaN : a / b;
    return NaN;
  };
  const vals = [], ops = [];
  for (const token of tokens) {
    if (!isNaN(token)) { vals.push(parseFloat(token)); continue; }
    if (token === '(') { ops.push(token); continue; }
    if (token === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') {
        if (vals.length < 2) return NaN;
        vals.push(applyOp(ops.pop(), vals.pop(), vals.pop()));
      }
      ops.pop(); continue;
    }
    while (ops.length && ops[ops.length - 1] !== '(' && prec[ops[ops.length - 1]] >= prec[token]) {
      if (vals.length < 2) return NaN;
      vals.push(applyOp(ops.pop(), vals.pop(), vals.pop()));
    }
    ops.push(token);
  }
  while (ops.length) {
    if (vals.length < 2) return NaN;
    vals.push(applyOp(ops.pop(), vals.pop(), vals.pop()));
  }
  return vals.length === 1 ? vals[0] : NaN;
};

function safeEval(expr) {
  try {
    const s = expr.replace(/×/g, '*').replace(/÷/g, '/');
    if (!/^[\d+\-*/. ()]+$/.test(s)) return NaN;
    return safeEvaluate(s);
  } catch { return NaN; }
}

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

// Rows per level.
// L3: 2 משוואות (חופש קוגניטיבי — pool גדול עם distractors).
// L4: 2 משוואות (דיוק — pool מצומצם ללא distractors).
const NUM_ROWS = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 1 };

// ─── Component ────────────────────────────────────────────────────────────────
export default function Equations() {
  const gameState      = useGameStore((s) => s.equations);
  const handleWinStore = useGameStore((s) => s.handleWin);

  const [rows,       setRows]       = useState([]);
  const [pool,       setPool]       = useState([]);
  const [feedback,   setFeedback]   = useState({ visible: false, isLevelUp: false, unlocked: false, pts: 0 });
  const [errorFlash, setErrorFlash] = useState(false);
  const [, setSlotsPerRow] = useState(3);
  const [justLost,   setJustLost]   = useState(false);

  const dragRef      = useRef(null);
  const dragElRef    = useRef(null);
  const offsetRef    = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const countRef     = useRef(gameState.count);
  const timersRef    = useRef([]);
  // cleanup: document-level drag listeners attached while mid-drag
  const dragCleanupRef = useRef(null);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      // Remove any dangling drag listeners if component unmounts mid-drag
      dragCleanupRef.current?.();
    };
  }, []);

  // ─── Hint (HintBubble, halfHintEnabled=true — אין lives, ניסוי-וטעייה) ─────
  const EQ_HINTS = [
    'נסה לבדוק: האם חיבור שני המספרים נותן את התוצאה? אם לא — נסה חיסור. בחיסור המספר הגדול בא ראשון!',
    'בוא ננסה לזהות — איך מגיעים לתוצאה? עם כפל או עם חילוק? נסה לכפול מספרים קטנים ולראות מי מגיע לתוצאה.',
    'יש כאן שתי שורות. נסה קודם לפתור שורה אחת — בדוק כל פעולה עד שמשהו עובד. אחר כך עבור לשנייה.',
    'כל שורה מחכה לפעולה ושני מספרים נכונים. נסה לבדוק כל שילוב — חיבור, חיסור, כפל, חילוק.',
    '⚡ זכור: כפל וחילוק קודמים לחיבור וחיסור! לדוגמה: 2 + 3 × 4 = 2 + 12 = 14 ולא 20.',
  ];
  const getEqHint = useCallback((_, level) => ({
    kind: 'text',
    text: EQ_HINTS[Math.min((level ?? gameState.lvl) - 1, EQ_HINTS.length - 1)],
  }), [gameState.lvl]);

  const { cooldown: hintCooldown, bubble: hintBubble, requestHint, resetRound: resetHintRound } = useHint({
    level: gameState.lvl,
    getHint: getEqHint,
    puzzle: true,
    halfHintEnabled: true,   // אין lives — חצי-רמז בלחיצה שנייה
    cooldownSec: 6,
    bubbleMs: 5000,
  });

  // Use crypto.randomUUID for guaranteed-unique, non-resettable block IDs
  const nextId = () => crypto.randomUUID();
  const isLvl5 = gameState.lvl === 5;

  useEffect(() => { countRef.current = gameState.count; }, [gameState.count]);

  // ─── Game init ──────────────────────────────────────────────────────────────
  const initGame = useCallback(() => {
    const lvl  = gameState.lvl;
    const tier = Math.min(countRef.current, 2);
    setJustLost(false);
    resetHintRound();

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

      // Assign exactly one distinct operator per row.
      // L3 ו-L4: 2 משוואות, 2 פעולות שונות (מתוך 4 האפשרויות).
      let rowOps;
      if (lvl === 1) {
        rowOps = shuffle(['+', '-']);
      } else if (lvl === 2) {
        rowOps = shuffle(['*', '/']);
      } else {
        // L3 / L4: בחר 2 פעולות שונות באקראי מתוך 4
        const allOps = shuffle(['+', '-', '*', '/']);
        rowOps = allOps.slice(0, 2);
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

      // Exactly one operator per row in pool.
      // L3: מוסיפים גם 2 פעולות distractor כדי להרחיב את החופש הקוגניטיבי.
      rowOps.slice(0, numRows).forEach((op) =>
        poolItems.push({ id: nextId(), val: op, type: 'op' })
      );
      if (lvl === 3) {
        // הוסף 2 פעולות נוספות (distractors) מתוך 4 האפשרויות.
        const extraOps = shuffle(['+', '-', '*', '/']).slice(0, 2);
        extraOps.forEach((op) => poolItems.push({ id: nextId(), val: op, type: 'op' }));
      }

      // Number distractors לפי רמה:
      // L1-2: 1-2 distractors (tier-based).
      // L3: 5 distractors (pool עשיר — הילד צריך לברור).
      // L4: 0 distractors (דיוק — אין "גיבוי").
      let numDist;
      if (lvl === 4) numDist = 0;
      else if (lvl === 3) numDist = 5;
      else numDist = tier === 0 ? 1 : 2;
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
      // Guard: touchend + mouseup both fire on touch devices — only handle once
      if (!dragRef.current) return;
      dragRef.current = null; // ← claim ownership immediately

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

          // No-op: dropped back onto its own origin slot — treat as a successful
          // drop with nothing to move, so nothing leaks to the pool.
          if (fromSlot && fromSlot.row === rowIdx && fromSlot.idx === slotIdx) {
            dropped = true;
            return;
          }

          dropped = true;
          setRows((prev) => {
            let displaced = null;
            // Step 1: place item in target (capture existing occupant).
            let updated = prev.map((r, ri) => {
              if (ri !== rowIdx) return r;
              const newSlots = [...r.slots];
              displaced = newSlots[slotIdx];
              newSlots[slotIdx] = item;
              return { ...r, slots: newSlots };
            });
            // Step 2: if dragged from another slot, clear origin.
            if (fromSlot) {
              updated = updated.map((r, ri) => {
                if (ri !== fromSlot.row) return r;
                const ns = [...r.slots];
                ns[fromSlot.idx] = null;
                return { ...r, slots: ns };
              });
            }
            displacedItem = displaced;
            return updated;
          });
        }
      });

      // Pool mutations happen OUTSIDE setRows — single atomic update, dedup-safe.
      if (dropped) {
        setPool((p) => {
          let next = p;
          // If dragged from pool, remove the original entry exactly once.
          if (!fromSlot) next = next.filter((pi) => pi.id !== item.id);
          // Return displaced occupant to pool, unless it is the same identity
          // as the moved item (should be impossible, but guard anyway).
          if (displacedItem && displacedItem.id !== item.id &&
              !next.some((pi) => pi.id === displacedItem.id)) {
            next = [...next, displacedItem];
          }
          return next;
        });
      } else if (fromSlot) {
        // Failed drop — clear source slot and return item to pool (dedup-safe).
        setRows((prev) => prev.map((r, ri) => {
          if (ri !== fromSlot.row) return r;
          const ns = [...r.slots];
          if (ns[fromSlot.idx]?.id === item.id) ns[fromSlot.idx] = null;
          return { ...r, slots: ns };
        }));
        setPool((p) => (p.some((pi) => pi.id === item.id) ? p : [...p, item]));
      }

      document.removeEventListener('mousemove', move);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('mouseup',   end);
      document.removeEventListener('touchend',  end);
      dragCleanupRef.current = null;
    };

    document.addEventListener('mousemove', move, { passive: false });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('mouseup',   end);
    document.addEventListener('touchend',  end);

    // Register cleanup so unmount can remove listeners even if drag never ends
    dragCleanupRef.current = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('mouseup',   end);
      document.removeEventListener('touchend',  end);
      if (dragElRef.current) { dragElRef.current.remove(); dragElRef.current = null; }
    };
  };

  // ─── Check answer ───────────────────────────────────────────────────────────
  const checkEquations = () => {
    let ok = true;
    rows.forEach((row) => {
      let expr = '';
      row.slots.forEach((s) => { if (!s) { ok = false; return; } expr += s.val; });
      if (!ok) return;
      const result = safeEval(expr);
      if (!Number.isFinite(result) || Math.abs(result - row.target) > 0.001) ok = false;
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

      // אין lives — ניסוי וטעייה הוא חלק מהלמידה ב-Equations.
      // נרשום light-fail ל-recentResults (ללא lock) כדי להשפיע על level-up window.
      try { useGameStore.getState().handleLightFail('equations'); } catch { /* noop */ }
    }
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
      <GameTutorial gameName="equations" />


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
      <div className="flex flex-wrap justify-center content-start gap-2 min-h-[120px] max-h-36 overflow-y-auto bg-slate-100 dark:bg-slate-800 p-4 rounded-[2rem] shadow-inner w-full max-w-lg border-2 border-purple-300 dark:border-purple-800/50 relative z-20">
        {pool.map((item) => renderItem(item))}
      </div>

      {/* HintBubble + Action buttons */}
      <HintBubble text={hintBubble} colorToken="violet" className="w-full max-w-lg" />
      <div className="w-full max-w-lg flex gap-2 pb-6 mt-auto">
        <HintButton
          cooldown={hintCooldown}
          onClick={requestHint}
          colorToken="violet"
          title="רמז (לחץ שוב לרמז מלא)"
          className="self-stretch"
        />
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
