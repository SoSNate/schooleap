// ─────────────────────────────────────────────────────────────────────────────
// Magic Patterns — Hint Engine
// Pure function. Returns graded hints based on level and pattern type.
// ─────────────────────────────────────────────────────────────────────────────

// Extract pattern type name from question
function getPatternTypeName(question) {
  if (!question) return 'תבנית';
  return question.name || 'תבנית';
}

// ─── getHint ────────────────────────────────────────────────────────────────
// Returns {kind, text, ...} or null
export function getHint(question, level) {
  if (!question) return null;

  const patternName = getPatternTypeName(question);

  if (level <= 2) {
    // L1-2: תקציר כללי על התבנית + הצעה להתחיל
    const hintByType = {
      'סדר פעולות': 'בסדר פעולות, תחילה כפל, אחר כך חיבור!',
      'חוק הפילוח': 'חוק הפילוח: הכפל מתוך הסוגריים לשני המחוברים',
      'שבר מעורב': 'שבר מעורב = חלק שלם + שבר ביחד',
      'סדרה חשבונית': 'בסדרה חשבונית, ההפרש בין מספרים עוקבים קבוע',
      'סדרה הנדסית': 'בסדרה הנדסית, היחס בין מספרים עוקבים קבוע',
    };
    return {
      kind: 'operator',
      text: hintByType[patternName] || `בדוק את הכלל של ${patternName}`,
    };
  }

  if (level === 3) {
    // L3: סוג הפעולה בלבד
    const opHintByType = {
      'סדר פעולות': 'הכלל: כפל לפני חיבור',
      'חוק הפילוח': 'הכלל: הכפל מופץ לשני המחוברים',
      'שבר מעורב': 'המר את השלם לשברים',
      'סדרה חשבונית': 'מצא את ההפרש (ההוספה) בין אברים עוקבים',
      'סדרה הנדסית': 'מצא את היחס (הכפל) בין אברים עוקבים',
    };
    return {
      kind: 'operator',
      text: opHintByType[patternName] || 'בדוק את הכלל',
    };
  }

  if (level === 4) {
    // L4: דוגמה נומרית עם מספרים שונים
    const examples = {
      'סדר פעולות': ['2 + 3 × 4 = 2 + 12 = 14', '5 × 2 + 3 = 10 + 3 = 13'],
      'חוק הפילוח': ['2 × (3 + 4) = 2×3 + 2×4 = 6 + 8 = 14', '3 × (1 + 2) = 3 + 6 = 9'],
      'שבר מעורב': ['1 1/2 = 3/2', '2 1/3 = 7/3'],
      'סדרה חשבונית': ['2, 5, 8, 11... (הוספה של 3)', '10, 7, 4, 1... (הוצאה של 3)'],
      'סדרה הנדסית': ['2, 4, 8, 16... (כפל ב-2)', '27, 9, 3, 1... (חילוק ב-3)'],
    };
    const exampleList = examples[patternName] || ['דוגמה אחרת'];
    const exampleText = exampleList[Math.floor(Math.random() * exampleList.length)];
    return {
      kind: 'example',
      text: exampleText,
    };
  }

  // L5: טקסט מילולי בלבד
  return {
    kind: 'text',
    text: 'בדוק: אילו מספרים נחזרים? מה הקשר בין אברים עוקבים?',
  };
}
