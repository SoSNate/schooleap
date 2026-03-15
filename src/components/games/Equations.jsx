import { useState, useEffect, useCallback, useRef } from 'react';
import useGameStore from '../../store/useGameStore';
import FeedbackOverlay from '../shared/FeedbackOverlay';
import { vibe, opsDict, opEmojis } from '../../utils/math';
import Swal from 'sweetalert2';

const ONBOARD_KEY = 'onboard_equations';

// Safe math eval (no eval())
function safeEval(expr) {
  try {
    // Parse simple expressions: num op num (or chained for lvl5)
    // Replace × with * for safety
    const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
    // Only allow digits, operators, dots, spaces
    if (!/^[\d+\-*/. ()]+$/.test(sanitized)) return NaN;
    return Function('"use strict"; return (' + sanitized + ')')();
  } catch { return NaN; }
}

export default function Equations() {
  const gameState = useGameStore((s) => s.equations);
  const handleWinStore = useGameStore((s) => s.handleWin);

  const [rows, setRows] = useState([]); // { target, slots: [{val,type}|null, ...] }
  const [pool, setPool] = useState([]); // { id, val, type }
  const [feedback, setFeedback] = useState({ visible: false, isLevelUp: false, pts: 0 });
  const [errorFlash, setErrorFlash] = useState(false);
  const [isLvl5, setIsLvl5] = useState(false);

  const dragRef = useRef(null); // { itemId, fromSlot: {row,idx}|null }
  const dragElRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  let idCounter = useRef(0);
  const nextId = () => ++idCounter.current;

  const initGame = useCallback(() => {
    const lvl = gameState.lvl;
    idCounter.current = 0;
    setIsLvl5(lvl === 5);

    let newRows = [];
    let poolItems = [];

    if (lvl < 5) {
      const numRows = lvl >= 4 ? 4 : lvl;
      const ops = lvl >= 2 ? ['+', '-', '*', '/'] : ['+', '-'];

      for (let i = 0; i < numRows; i++) {
        const op = ops[Math.floor(Math.random() * ops.length)];
        let n1, n2;
        if (op === '/') { n2 = Math.floor(Math.random() * 4) + 2; n1 = n2 * (Math.floor(Math.random() * 4) + 1); }
        else if (op === '*') { n1 = Math.floor(Math.random() * 5) + 2; n2 = Math.floor(Math.random() * 5) + 2; }
        else { n1 = Math.floor(Math.random() * 20) + 2; n2 = Math.floor(Math.random() * 20) + 2; if (op === '-' && n1 < n2) [n1, n2] = [n2, n1]; }
        const target = safeEval(`${n1}${op}${n2}`);
        newRows.push({ target, slots: [null, null, null] }); // num, op, num
        poolItems.push({ id: nextId(), val: String(n1), type: 'num' });
        poolItems.push({ id: nextId(), val: String(n2), type: 'num' });
        poolItems.push({ id: nextId(), val: op, type: 'op' });
      }
      // Distractors
      poolItems.push({ id: nextId(), val: String(Math.floor(Math.random() * 15) + 1), type: 'num' });
      poolItems.push({ id: nextId(), val: String(Math.floor(Math.random() * 15) + 1), type: 'num' });
      if (lvl > 1) poolItems.push({ id: nextId(), val: ops[Math.floor(Math.random() * ops.length)], type: 'op' });
    } else {
      // Level 5: 4 rows × 5 slots (num op num op num = target), tests order of operations
      // Each row uses 2 DIFFERENT operators from the set {+,-,×,÷}; patterns test × before +/-
      const rnd5 = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
      const opCombos = [['+', '*'], ['*', '+'], ['-', '*'], ['*', '-']].sort(() => 0.5 - Math.random());

      for (let i = 0; i < 4; i++) {
        const [op1, op2] = opCombos[i];
        let a, b, c, target;
        let att = 0;
        do {
          if (op1 === '-' && op2 === '*') {
            // a - b×c: ensure a > b×c for positive result
            b = rnd5(2, 4); c = rnd5(2, 4);
            a = b * c + rnd5(1, 8);
          } else if (op1 === '*' && op2 === '-') {
            // a×b - c: ensure a×b > c
            a = rnd5(2, 6); b = rnd5(2, 5);
            c = rnd5(2, a * b - 1);
          } else {
            a = rnd5(2, 9); b = rnd5(2, 6); c = rnd5(2, 9);
          }
          target = safeEval(`${a}${op1}${b}${op2}${c}`);
          att++;
        } while ((target <= 0 || !Number.isFinite(target)) && att < 20);

        newRows.push({ target, slots: Array(5).fill(null) });
        poolItems.push(
          { id: nextId(), val: String(a), type: 'num' },
          { id: nextId(), val: op1, type: 'op' },
          { id: nextId(), val: String(b), type: 'num' },
          { id: nextId(), val: op2, type: 'op' },
          { id: nextId(), val: String(c), type: 'num' },
        );
      }
      // 2 number distractors
      poolItems.push(
        { id: nextId(), val: String(rnd5(2, 12)), type: 'num' },
        { id: nextId(), val: String(rnd5(2, 12)), type: 'num' },
      );
    }

    // Shuffle pool
    poolItems.sort(() => 0.5 - Math.random());
    setRows(newRows);
    setPool(poolItems);
  }, [gameState.lvl]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // First-time onboarding
  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARD_KEY)) {
        Swal.fire({
          title: 'כאן בונים בכיף 🧩',
          html: '<div class="text-right text-sm leading-relaxed">גרור את החלקים מהמאגר לתוך הריבועים הריקים.<br><br>🔢 <b>מספרים</b> נכנסים לתאים כחולים<br>➕ <b>פעולות</b> נכנסות לתאים צהובים<br><br>המטרה: כל שורה חייבת לתת את התוצאה המסומנת!</div>',
          confirmButtonText: 'יאללה נבנה!',
          confirmButtonColor: '#7c3aed',
          customClass: { popup: 'rounded-3xl' },
        });
        localStorage.setItem(ONBOARD_KEY, '1');
      }
    } catch {}
  }, []);

  // Get expected slot type
  const getSlotType = (slotIdx) => {
    if (isLvl5) return slotIdx % 2 === 0 ? 'num' : 'op';
    return [0, 2].includes(slotIdx) ? 'num' : 'op';
  };

  // === Drag & Drop Engine ===
  const handleDragStart = (e, item, fromSlot = null) => {
    e.preventDefault();
    vibe(10);

    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;

    offsetRef.current = { x: cx - r.left, y: cy - r.top };
    dragRef.current = { item, fromSlot };

    // Create drag ghost
    const ghost = el.cloneNode(true);
    ghost.style.position = 'fixed';
    ghost.style.width = r.width + 'px';
    ghost.style.height = r.height + 'px';
    ghost.style.left = (cx - offsetRef.current.x) + 'px';
    ghost.style.top = (cy - offsetRef.current.y) + 'px';
    ghost.style.zIndex = '9999';
    ghost.style.pointerEvents = 'none';
    ghost.style.transform = 'scale(1.15) rotate(-3deg)';
    ghost.style.boxShadow = '0 15px 25px rgba(0,0,0,0.25)';
    ghost.classList.add('dragging');
    ghost.id = 'drag-ghost';
    document.body.appendChild(ghost);
    dragElRef.current = ghost;

    const move = (ev) => {
      ev.preventDefault();
      const mx = ev.clientX ?? ev.touches?.[0]?.clientX;
      const my = ev.clientY ?? ev.touches?.[0]?.clientY;
      if (dragElRef.current) {
        dragElRef.current.style.left = (mx - offsetRef.current.x) + 'px';
        dragElRef.current.style.top = (my - offsetRef.current.y) + 'px';
      }
      // Highlight targets
      document.querySelectorAll('.slot-zone').forEach((z) => {
        const zr = z.getBoundingClientRect();
        z.classList.toggle('active-target', mx > zr.left && mx < zr.right && my > zr.top && my < zr.bottom);
      });
    };

    const end = (ev) => {
      vibe(15);
      const endX = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
      const endY = ev.changedTouches ? ev.changedTouches[0].clientY : ev.clientY;

      // Clean up ghost
      if (dragElRef.current) { dragElRef.current.remove(); dragElRef.current = null; }
      document.querySelectorAll('.slot-zone').forEach((z) => z.classList.remove('active-target'));

      // Find target slot
      let dropped = false;
      document.querySelectorAll('.slot-zone').forEach((z) => {
        if (dropped) return;
        const zr = z.getBoundingClientRect();
        if (endX > zr.left && endX < zr.right && endY > zr.top && endY < zr.bottom) {
          const rowIdx = parseInt(z.dataset.row);
          const slotIdx = parseInt(z.dataset.slot);
          const slotType = getSlotType(slotIdx);

          if (slotType === item.type) {
            dropped = true;
            setRows((prev) => {
              const updated = prev.map((r, ri) => {
                if (ri !== rowIdx) return r;
                const newSlots = [...r.slots];
                // If slot occupied, return occupant to pool
                const occupant = newSlots[slotIdx];
                if (occupant) {
                  setPool((p) => [...p, occupant]);
                }
                newSlots[slotIdx] = item;
                return { ...r, slots: newSlots };
              });

              // If dragged from another slot, clear it
              if (fromSlot) {
                return updated.map((r, ri) => {
                  if (ri !== fromSlot.row) return r;
                  const newSlots = [...r.slots];
                  if (newSlots[fromSlot.idx]?.id === item.id) {
                    newSlots[fromSlot.idx] = null;
                  }
                  return { ...r, slots: newSlots };
                });
              }
              return updated;
            });

            // Remove from pool if from pool
            if (!fromSlot) {
              setPool((p) => p.filter((pi) => pi.id !== item.id));
            }
          }
        }
      });

      // If not dropped and was from slot, return to pool
      if (!dropped && fromSlot) {
        setRows((prev) => prev.map((r, ri) => {
          if (ri !== fromSlot.row) return r;
          const newSlots = [...r.slots];
          if (newSlots[fromSlot.idx]?.id === item.id) {
            newSlots[fromSlot.idx] = null;
          }
          return { ...r, slots: newSlots };
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

  const checkEquations = () => {
    let ok = true;
    rows.forEach((row) => {
      let expr = '';
      row.slots.forEach((s) => {
        if (!s) { ok = false; return; }
        expr += s.val;
      });
      if (!ok) return;
      const result = safeEval(expr);
      if (Math.abs(result - row.target) > 0.001) ok = false;
    });

    if (ok) {
      vibe([30, 50, 30]);
      const result = handleWinStore('equations');
      setFeedback({ visible: true, isLevelUp: result.isLevelUp, pts: result.pts });
    } else {
      setErrorFlash(true);
      setTimeout(() => setErrorFlash(false), 400);
      vibe([50, 50, 50]);
    }
  };

  const showHint = () => {
    vibe(20);
    Swal.fire({
      title: '💡 רמז',
      text: 'נסה קודם לסדר את סימני הפעולה (חיבור/חיסור) ורק אז את המספרים.',
      icon: 'info',
      confirmButtonText: 'הבנתי, תודה!',
      confirmButtonColor: '#f59e0b',
      customClass: { popup: 'rounded-3xl' },
    });
  };

  const renderItem = (item, inSlot = false, fromSlot = null) => {
    const isOp = item.type === 'op';
    const displayText = inSlot && isOp
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
          {displayText}
        </span>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`screen-enter flex flex-col items-center p-3 gap-3 flex-1 min-h-[calc(100dvh-80px)] ${errorFlash ? 'error-flash' : ''}`}>
      {/* Equation rows */}
      <div className="w-full max-w-lg flex flex-col gap-3">
        {rows.map((row, ri) => (
          <div key={ri} className={`equation-row bg-white dark:bg-slate-700/50 ${isLvl5 ? 'lvl5-row flex-wrap justify-center' : ''}`}>
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
      <div className="flex flex-wrap justify-center content-start gap-2 min-h-[100px] bg-slate-100 dark:bg-slate-800 p-4 rounded-[2rem] shadow-inner w-full max-w-lg border-2 border-slate-200 dark:border-slate-700 relative z-20">
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
        pts={feedback.pts}
        onDone={() => {
          setFeedback({ visible: false, isLevelUp: false, pts: 0 });
          initGame();
        }}
      />
    </div>
  );
}
