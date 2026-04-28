// balanceEngine.js — Pure logic for Balance game (9 steps)
// API: generatePuzzle(step) → Puzzle, validate(puzzle, val) → {correct}, getHint(puzzle, tier) → {kind, text, payload?}

function rnd(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Start close to the answer (±3..8 away) so child doesn't need 40 presses
function safeStart(answer, min = 1, max = 50) {
  const offset = rnd(3, 8) * (Math.random() < 0.5 ? 1 : -1);
  let v = Math.max(min, Math.min(max, answer + offset));
  if (v === answer) v = Math.min(max, v + 4);
  return v;
}

// ── Step generators ────────────────────────────────────────────────────────

function genStep1() {
  // חיבור/חיסור — 🟦 במיקומים שונים (ראשון, שני, תוצאה)
  const answer = rnd(3, 13);
  const shape = pickFrom(['add_left', 'sub_left', 'add_right', 'sub_result']);

  if (shape === 'add_left') {
    const b = rnd(2, 10);
    return {
      leftDisplay: `🟦 + ${b}`,
      rightDisplay: `${answer + b}`,
      leftFn: (x) => x + b,
      rightFn: () => answer + b,
      answer,
      hint: {
        observation: 'הסתכל על כף ימין — זהו הסכום. כמה צריך להחסיר ממנו כדי לבטל את הספרה שמוסיפים?',
        strategy: `מה צריך לחבר ל-${b} כדי לקבל ${answer + b}? הפעולה ההפוכה: ${answer + b} פחות ${b}.`,
        heavy: { kind: 'table', rows: [{ x: answer - 1, label: '✗' }, { x: answer, label: '✓' }] },
      },
    };
  }

  if (shape === 'sub_left') {
    const b = rnd(2, 10);
    const bigAnswer = answer + b; // 🟦 − b = answer → 🟦 = answer + b
    return {
      leftDisplay: `🟦 − ${b}`,
      rightDisplay: `${answer}`,
      leftFn: (x) => x - b,
      rightFn: () => answer,
      answer: bigAnswer,
      hint: {
        observation: 'חיסור הפוך! כף ימין מראה את התוצאה אחרי שהחסרנו.',
        strategy: `אם 🟦 פחות ${b} שווה ${answer} — אז 🟦 הוא ${answer} **פלוס** ${b}.`,
        heavy: { kind: 'table', rows: [{ x: bigAnswer - 1, label: '✗' }, { x: bigAnswer, label: '✓' }] },
      },
    };
  }

  if (shape === 'add_right') {
    // a + 🟦 = result
    const a = rnd(2, 10);
    return {
      leftDisplay: `${a} + 🟦`,
      rightDisplay: `${a + answer}`,
      leftFn: (x) => a + x,
      rightFn: () => a + answer,
      answer,
      hint: {
        observation: `המספר ${a} כבר קיים בכף שמאל. כמה חסר עד ל-${a + answer}?`,
        strategy: `${a + answer} פחות ${a} — זה המספר שנכנס לריבוע.`,
        heavy: { kind: 'table', rows: [{ x: answer - 1, label: '✗' }, { x: answer, label: '✓' }] },
      },
    };
  }

  // sub_result: result = 🟦 − b
  const b = rnd(1, 8);
  const bigA = answer + b;
  return {
    leftDisplay: `${answer}`,
    rightDisplay: `🟦 − ${b}`,
    leftFn: () => answer,
    rightFn: (x) => x - b,
    answer: bigA,
    hint: {
      observation: 'הריבוע הפעם בכף ימין! חשב מה צריך להיות כדי שאחרי החיסור תקבל את כף שמאל.',
      strategy: `כף שמאל היא ${answer}. אז 🟦 פחות ${b} צריך להיות ${answer}. לכן 🟦 = ${answer} + ${b}.`,
      heavy: { kind: 'table', rows: [{ x: bigA - 1, label: '✗' }, { x: bigA, label: '✓' }] },
    },
  };
}

function genStep2() {
  // כפל/חילוק — לוח הכפל עד 10×10
  const shape = pickFrom(['mul_left', 'div_left', 'mul_right', 'div_result']);
  const answer = rnd(2, 10);
  const a = pickFrom([2, 3, 4, 5, 6, 7, 8, 9]);

  if (shape === 'mul_left') {
    return {
      leftDisplay: `🟦 × ${a}`,
      rightDisplay: `${answer * a}`,
      leftFn: (x) => x * a,
      rightFn: () => answer * a,
      answer,
      hint: {
        observation: `כף ימין מראה תוצאת הכפל. כמה כפול ${a} נותן ${answer * a}?`,
        strategy: `${answer * a} חלק ל-${a} — זו הפעולה ההפוכה לכפל!`,
        heavy: { kind: 'table', rows: [{ x: answer - 1, label: `${(answer - 1) * a} ✗` }, { x: answer, label: `${answer * a} ✓` }] },
      },
    };
  }

  if (shape === 'div_left') {
    // 🟦 ÷ a = answer → 🟦 = answer × a
    return {
      leftDisplay: `🟦 ÷ ${a}`,
      rightDisplay: `${answer}`,
      leftFn: (x) => x / a,
      rightFn: () => answer,
      answer: answer * a,
      hint: {
        observation: 'חילוק — הפוך לכפל! כמה צריך לחלק ב-' + a + ' כדי לקבל ' + answer + '?',
        strategy: `${answer} כפול ${a} — זה הריבוע!`,
        heavy: { kind: 'table', rows: [{ x: answer * a - a, label: '✗' }, { x: answer * a, label: '✓' }] },
      },
    };
  }

  if (shape === 'mul_right') {
    // a × 🟦 = result
    return {
      leftDisplay: `${a} × 🟦`,
      rightDisplay: `${a * answer}`,
      leftFn: (x) => a * x,
      rightFn: () => a * answer,
      answer,
      hint: {
        observation: `${a} כפול מה נותן ${a * answer}?`,
        strategy: `${a * answer} חלק ל-${a} = הריבוע.`,
        heavy: { kind: 'table', rows: [{ x: answer - 1, label: '✗' }, { x: answer, label: '✓' }] },
      },
    };
  }

  // div_result: result = 🟦 ÷ a
  const bigA = answer * a;
  return {
    leftDisplay: `${answer}`,
    rightDisplay: `🟦 ÷ ${a}`,
    leftFn: () => answer,
    rightFn: (x) => x / a,
    answer: bigA,
    hint: {
      observation: 'הריבוע בכף ימין! אחרי חלוקה ב-' + a + ' נקבל ' + answer + '.',
      strategy: `${answer} כפול ${a} = הריבוע.`,
      heavy: { kind: 'table', rows: [{ x: bigA - a, label: '✗' }, { x: bigA, label: '✓' }] },
    },
  };
}

function genStep3() {
  // דו-שלבי: 🟦 × a + b = result אוֹ (🟦 ÷ a) − b = result
  const shape = pickFrom(['mul_add', 'div_sub']);
  const answer = rnd(2, 8);

  if (shape === 'mul_add') {
    const a = pickFrom([2, 3, 4]);
    const b = rnd(1, 6);
    const result = answer * a + b;
    return {
      leftDisplay: `🟦 × ${a} + ${b}`,
      rightDisplay: `${result}`,
      leftFn: (x) => x * a + b,
      rightFn: () => result,
      answer,
      hint: {
        observation: `כף שמאל: קודם כפל ב-${a}, אחר כך הוסף ${b}.`,
        strategy: `קודם הסר את ה-${b} מ-${result} (${result - b}), ואז חלק ב-${a}.`,
        heavy: { kind: 'table', rows: [{ x: answer - 1, label: `${(answer - 1) * a + b} ✗` }, { x: answer, label: `${result} ✓` }] },
      },
    };
  }

  // div_sub: (🟦 ÷ a) − b = result → 🟦 = (result + b) × a
  const a = pickFrom([2, 3, 4]);
  const b = rnd(1, 5);
  const bigAnswer = (answer + b) * a;
  const result = answer;
  return {
    leftDisplay: `(🟦 ÷ ${a}) − ${b}`,
    rightDisplay: `${result}`,
    leftFn: (x) => x / a - b,
    rightFn: () => result,
    answer: bigAnswer,
    hint: {
      observation: 'שתי פעולות: קודם חילוק, אחר כך חיסור.',
      strategy: `קודם הוסף ${b} ל-${result} (נקבל ${result + b}), ואז כפול ב-${a}.`,
      heavy: { kind: 'table', rows: [{ x: bigAnswer - a, label: '✗' }, { x: bigAnswer, label: '✓' }] },
    },
  };
}

function genStep4() {
  // ביטויים בשני האגפים — שלוש צורות מאתגרות: כפל/חיסור בשני אגפים
  const shape = pickFrom(['mul_both', 'mul_sub', 'add_mul_right']);
  const answer = rnd(3, 10);

  if (shape === 'mul_both') {
    // 🟦 × a = 🟦 × b + c  →  קודם חשב ימין, אחר כך חלק
    // answer × a = answer × b + c → c = answer×(a-b)
    const b = rnd(2, 4);
    const a = b + rnd(1, 3); // a > b always
    const c = answer * (a - b);
    if (c <= 0 || c > 30) return genStep4();
    return {
      leftDisplay: `🟦 × ${a}`,
      rightDisplay: `🟦 × ${b} + ${c}`,
      leftFn: (x) => x * a,
      rightFn: (x) => x * b + c,
      answer,
      hint: {
        observation: `🟦 מופיע בשני הצדדים עם כפל שונה. נסה "להוריד" את הכפל הקטן משני הצדדים.`,
        strategy: `הפחת 🟦×${b} משני הצדדים: 🟦×${a - b} = ${c}, לכן 🟦 = ${c} ÷ ${a - b} = ${answer}.`,
        heavy: { kind: 'table', rows: [{ x: answer - 1, label: `${(answer-1)*a} vs ${(answer-1)*b+c} ✗` }, { x: answer, label: `${answer*a} vs ${answer*b+c} ✓` }] },
      },
    };
  }

  if (shape === 'mul_sub') {
    // a × 🟦 − b = c  (פשוט יותר אבל הסדר שונה: ימין ריק)
    const a = rnd(2, 5);
    const b = rnd(2, 8);
    const c = answer * a - b;
    if (c <= 0) return genStep4();
    return {
      leftDisplay: `${a} × 🟦 − ${b}`,
      rightDisplay: `${c}`,
      leftFn: (x) => a * x - b,
      rightFn: () => c,
      answer,
      hint: {
        observation: `כף שמאל: קודם כפל ב-${a}, ואז הפחת ${b}.`,
        strategy: `הוסף ${b} ל-${c} כדי לקבל ${c + b}, ואז חלק ב-${a}.`,
        heavy: { kind: 'table', rows: [{ x: answer - 1, label: `${a*(answer-1)-b} ✗` }, { x: answer, label: `${c} ✓` }] },
      },
    };
  }

  // add_mul_right: 🟦 + a = b × 🟦 − c  (העברת אגפים אמיתית)
  const b = rnd(2, 4);
  const a = rnd(1, 6);
  const c = answer * b - answer - a; // b×ans − c = ans + a → c = b×ans − ans − a = ans(b-1)−a
  if (c <= 0 || c > 20 || b <= 1) return genStep4();
  return {
    leftDisplay: `🟦 + ${a}`,
    rightDisplay: `${b} × 🟦 − ${c}`,
    leftFn: (x) => x + a,
    rightFn: (x) => b * x - c,
    answer,
    hint: {
      observation: `🟦 בשני הצדדים — פעם אחת ב"+" ופעם ב"×". צריך להעביר אגפים.`,
      strategy: `הפחת 🟦 משני הצדדים: ${a} = ${b - 1}×🟦 − ${c}. אז ${b - 1}×🟦 = ${a + c}, לכן 🟦 = ${answer}.`,
      heavy: { kind: 'table', rows: [{ x: answer - 1, label: `${answer-1+a} vs ${b*(answer-1)-c} ✗` }, { x: answer, label: `${answer+a} vs ${b*answer-c} ✓` }] },
    },
  };
}

function genStep5() {
  // כינוס — 🟦 בשני הצדדים: 🟦 + 🟦 = 🟦 + N
  const answer = rnd(3, 12);
  const N = answer; // 🟦 + 🟦 = 🟦 + N → 🟦 = N
  return {
    leftDisplay: `🟦 + 🟦`,
    rightDisplay: `🟦 + ${N}`,
    leftFn: (x) => x + x,
    rightFn: (x) => x + N,
    answer,
    hint: {
      observation: '🟦 מופיע בשני הצדדים. נסה "להוריד" ריבוע אחד משני הצדדים.',
      strategy: `אם מורידים 🟦 אחד משני הצדדים: 🟦 = ${N}.`,
      heavy: { kind: 'table', rows: [{ x: answer - 1, label: `${(answer - 1) * 2} vs ${answer - 1 + N} ✗` }, { x: answer, label: `${answer * 2} vs ${answer + N} ✓` }] },
    },
  };
}

function genStep6() {
  // חציית האפס — תשובה שלילית
  const answer = -rnd(1, 6);
  const b = rnd(2, 8);
  // 🟦 + b = result (result < b)
  const result = answer + b;
  return {
    leftDisplay: `🟦 + ${b}`,
    rightDisplay: `${result}`,
    leftFn: (x) => x + b,
    rightFn: () => result,
    answer,
    range: [-10, 10],
    hint: {
      observation: `כף ימין (${result}) קטנה מ-${b}. הריבוע יהיה שלילי!`,
      strategy: `${result} פחות ${b} = ${result - b}. זאת התשובה — מספר שלילי.`,
      heavy: { kind: 'table', rows: [{ x: answer + 1, label: '✗' }, { x: answer, label: '✓' }] },
    },
  };
}

function genStep7() {
  // הצבה פשוטה — כרטיס כלל עליון: 🔴 = קבוע
  const redVal = pickFrom([2, 3, 4, 5]);
  const answer = rnd(2, 8);
  // 🟦 × 🔴 = answer × redVal
  const result = answer * redVal;
  return {
    rule: { shape: '🔴', expr: `🔴 = ${redVal}` },
    leftDisplay: `🟦 × 🔴`,
    rightDisplay: `${result}`,
    leftFn: (x) => x * redVal,
    rightFn: () => result,
    answer,
    hint: {
      observation: `הכלל אומר ש-🔴 = ${redVal}. החלף את הצורה האדומה במספר.`,
      strategy: `🟦 × ${redVal} = ${result}. לכן 🟦 = ${result} ÷ ${redVal} = ${answer}.`,
      heavy: { kind: 'table', rows: [{ x: answer - 1, label: '✗' }, { x: answer, label: '✓' }] },
    },
  };
}

function genStep8() {
  // מערכת משוואות — שני כללים
  const answer = rnd(2, 7); // answer = 🟡
  const b = rnd(1, 3);
  const redVal = answer + b; // 🔴 = 🟡 + b
  const N = redVal + answer; // 🔴 + 🟡 = N

  return {
    rule:  { shape: '🔴', expr: `🔴 = 🟡 + ${b}` },
    rule2: { shape: '🟡', expr: `🔴 + 🟡 = ${N}` },
    leftDisplay: `🔴 + 🟡`,
    rightDisplay: `${N}`,
    leftFn: (x) => (x + b) + x,    // 🔴 + 🟡 = (x+b) + x
    rightFn: () => N,
    answer,
    hint: {
      observation: 'שני כללים פועלים ביחד! קרא אותם בעיון.',
      strategy: `החלף 🔴 בכלל הראשון: (🟡 + ${b}) + 🟡 = ${N}. כלומר 2🟡 + ${b} = ${N}. פתור משם.`,
      heavy: { kind: 'table', rows: [{ x: answer - 1, label: `${(answer - 1 + b) + (answer - 1)} vs ${N} ✗` }, { x: answer, label: `${(answer + b) + answer} vs ${N} ✓` }] },
    },
  };
}

function genStep9() {
  // ריבועי: (🟦 + a)(🟦 + b) = result
  const answer = rnd(3, 9);
  const shape = pickFrom(['type_a', 'type_b']);
  let a, b, result;

  if (shape === 'type_a') {
    // (🟦 − 2)(🟦 + 4)
    a = 2; b = 4;
    result = (answer - a) * (answer + b);
    if (result <= 0) return genStep9();
    return {
      leftDisplay: `(🟦 − ${a}) × (🟦 + ${b})`,
      rightDisplay: `${result}`,
      leftFn: (x) => (x - a) * (x + b),
      rightFn: () => result,
      answer,
      hint: {
        observation: 'שני ביטויים מוכפלים. כל אחד תלוי בריבוע.',
        strategy: 'נסה להציב ריבוע = 1, 2, 3... וראה מי נותן את התוצאה הנכונה.',
        heavy: {
          kind: 'table',
          rows: [2, 3, 4, 5, 6, 7, 8, 9].slice(0, 4).map(x => ({
            x, label: `(${x - a})×(${x + b}) = ${(x - a) * (x + b)} ${(x - a) * (x + b) === result ? '✓' : '✗'}`
          })),
        },
      },
    };
  }

  // type_b: (🟦 + 1)(🟦 − 1)
  a = 1; b = 1;
  result = (answer + a) * (answer - b);
  if (result <= 0) return genStep9();
  return {
    leftDisplay: `(🟦 + ${a}) × (🟦 − ${b})`,
    rightDisplay: `${result}`,
    leftFn: (x) => (x + a) * (x - b),
    rightFn: () => result,
    answer,
    hint: {
      observation: 'שני ביטויים קרובים לריבוע — האחד גדול ב-1 והאחד קטן ב-1.',
      strategy: 'נסה מספרים 3, 4, 5... עד שמצאת.',
      heavy: {
        kind: 'table',
        rows: [3, 4, 5, 6, 7, 8, 9, 10].slice(0, 5).map(x => ({
          x, label: `(${x + a})×(${x - b}) = ${(x + a) * (x - b)} ${(x + a) * (x - b) === result ? '✓' : '✗'}`
        })),
      },
    },
  };
}

const GENERATORS = [null, genStep1, genStep2, genStep3, genStep4, genStep5, genStep6, genStep7, genStep8, genStep9];

// ── Public API ────────────────────────────────────────────────────────────

export function generatePuzzle(step) {
  const gen = GENERATORS[Math.min(9, Math.max(1, step))];
  const base = gen();
  return {
    step,
    rule:  base.rule  ?? null,
    rule2: base.rule2 ?? null,
    leftDisplay:  base.leftDisplay,
    rightDisplay: base.rightDisplay,
    leftFn:  base.leftFn,
    rightFn: base.rightFn,
    answer:  base.answer,
    range:   base.range ?? [1, 50],
    startVal: safeStart(base.answer, (base.range ?? [1, 50])[0], (base.range ?? [1, 50])[1]),
    hint: base.hint,
  };
}

export function validate(puzzle, userVal) {
  const l = puzzle.leftFn(userVal);
  const r = puzzle.rightFn(userVal);
  return { correct: Math.abs(l - r) < 0.1, diff: r - l };
}

export function getHint(puzzle, tier) {
  const h = puzzle.hint;
  if (!h) return { kind: 'text', text: 'נסה להציב מספרים שונים ולראות איך המאזן מגיב.' };
  if (tier === 'observation') return { kind: 'text', text: h.observation };
  if (tier === 'strategy')    return { kind: 'text', text: h.strategy };
  // heavy
  if (h.heavy?.kind === 'table') {
    const lines = h.heavy.rows.map(r => `🟦=${r.x}: ${r.label}`).join('\n');
    return { kind: 'table', text: lines, payload: h.heavy.rows };
  }
  return { kind: 'text', text: h.strategy };
}
