// ─────────────────────────────────────────────────────────────────────────────
// Word Problem Puzzle — Hint Engine
// Pure function. Returns graded hints based on level.
// ─────────────────────────────────────────────────────────────────────────────

// Helper: extract keyword from opHint for spotlighting
function getKeywordFromOpHint(opHint) {
  const keywords = ['יחד', 'עפו', 'חסר', 'בכל', 'מחלקים שווה', 'פי', 'קנה', 'קנה', 'כל אחד', 'קנה', 'הגיעו', 'קבוצות שוות', 'בנות', 'קנה'];
  for (const kw of keywords) {
    if (opHint.includes(kw)) return kw;
  }
  return opHint.split(' ')[0]; // fallback: first word
}

function getOperationFromOpHint(opHint) {
  if (opHint.includes('חיבור') || opHint.includes('+') || opHint.includes('יחד') || opHint.includes('הגיעו') || opHint.includes('ועוד')) {
    return '+';
  }
  if (opHint.includes('חיסור') || opHint.includes('−') || opHint.includes('-') || opHint.includes('עפו') || opHint.includes('חסר') || opHint.includes('נשאר')) {
    return '−';
  }
  if (opHint.includes('כפל') || opHint.includes('×') || opHint.includes('בכל') || opHint.includes('פי')) {
    return '×';
  }
  if (opHint.includes('חילוק') || opHint.includes('÷') || opHint.includes('מחלקים שווה') || opHint.includes('קבוצות שוות')) {
    return '÷';
  }
  return null;
}

// ─── getHint ────────────────────────────────────────────────────────────────
// Returns {kind, text, ...} or null
export function getHint(question, level) {
  if (!question || !question.opHint) return null;

  const operation = getOperationFromOpHint(question.opHint);
  const keyword = getKeywordFromOpHint(question.opHint);

  if (level <= 2) {
    // L1-2: תקציר חד־משמעותי של הפעולה הנכונה + הצעה אם בא מקלמד
    return {
      kind: 'operator',
      text: operation === '+' ? 'חיבור (+) — כשמחברים יחד' :
            operation === '−' ? 'חיסור (−) — כשמוציאים / נשאר' :
            operation === '×' ? 'כפל (×) — כשיש קבוצות של כמויות' :
            operation === '÷' ? 'חילוק (÷) — כשמחלקים שווה' :
            'חפש את המילה המפתח: ' + keyword,
    };
  }

  if (level === 3) {
    // L3: רק סימן הפעולה, ללא הסבר
    return {
      kind: 'operator',
      text: operation ? `סימן הפעולה: ${operation}` : 'חפש מילת מפתח בשאלה',
    };
  }

  if (level === 4) {
    // L4: דוגמה נומרית עם מספרים שונים
    const examples = {
      '+': ['5 + 3 = 8 (חיבור)', '10 + 7 = 17 (חיבור)'],
      '−': ['15 − 4 = 11 (חיסור)', '20 − 6 = 14 (חיסור)'],
      '×': ['3 × 4 = 12 (כפל)', '5 × 6 = 30 (כפל)'],
      '÷': ['12 ÷ 3 = 4 (חילוק)', '20 ÷ 5 = 4 (חילוק)'],
    };
    const exampleText = (examples[operation] || ['דוגמה אחרת'])[Math.floor(Math.random() * (examples[operation]?.length || 1))];
    return {
      kind: 'example',
      text: exampleText,
    };
  }

  // L5: טקסט מילולי בלבד
  return {
    kind: 'text',
    text: 'קרא שוב: מה השאלה שואלת? איזו מילה מראה את הפעולה הנדרשת?',
  };
}
