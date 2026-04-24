import { useState } from 'react';

// ─── Tutorial data -כל 9 משחקים ────────────────────────────────────────────

const TUTORIALS = {
  equations: {
    emoji: '🧩',
    title: 'כאן בונים בכיף',
    steps: [
      'גרור מספרים ופעולות חשבון מהמאגר לתוך המשבצות',
      'בנה משוואה שנותנת את התוצאה המבוקשת',
      'ברמות גבוהות -שים לב לסדר פעולות (× ÷ לפני + −)',
      'לחץ "בדיקה" כשסיימת לבנות',
    ],
    tip: 'כפל וחילוק קודמים לחיבור וחיסור!',
  },
  balance: {
    emoji: '⚖️',
    title: 'שומרים על איזון',
    steps: [
      'בצד שמאל יש ביטוי מתמטי -זה הנתון שלך',
      'בנה ביטוי שקול בצד ימין',
      'ניתן להוסיף או להחסיר משני הצדדים יחד',
      'הכף חייבת להישאר מאוזנת עד הסוף!',
    ],
    tip: 'מה שעושים לצד אחד -עושים לשני!',
  },
  tank: {
    emoji: '🧪',
    title: 'חצי הכוס המלאה',
    steps: [
      'מולך שבר -למשל ¾',
      'גרור את מחוון הכמות עד לסימון הנכון על הכוס',
      'הקו הכחול מסמן את היעד',
      'לחץ "בדיקה" כשהמים בגובה הנכון',
    ],
    tip: 'מצא את הסימון המקווקו על דופן הכוס!',
  },
  decimal: {
    emoji: '🎯',
    title: 'תפוס את הנקודה',
    steps: [
      'מולך מספר עשרוני - למשל 0.75 - ועליך למקם אותו על הציר',
      'גרור את החץ ימינה ושמאלה עד שתגיע למספר הנכון',
      'החוגה בתחתית עוזרת לבחור גודל קפיצה - מאחדות עד אלפיות',
      'התחל עם קפיצה גדולה להתקרב, ואז עבור לקטנה לדיוק!',
    ],
    tip: 'החוגה = גודל הקפיצה: אחדות ← עשיריות ← מאיות ← אלפיות',
  },
  fractionLab: {
    emoji: '🍕',
    title: 'מעבדת השברים',
    steps: [
      'מולך ציור של שבר - למשל חצי פיצה שמייצג ½',
      'בנה את אותו שבר: שנה מונה ומכנה עם כפתורי + ו−',
      'מכנה = כמה חתיכות בסך הכל, מונה = כמה צבועות',
      'לפעמים תצטרך לצמצם או להרחיב - חשוב שהערך יהיה שווה!',
    ],
    tip: '½ = 2/4 = 3/6 - כולם שווים! מצא את הצורה המבוקשת.',
  },
  magicPatterns: {
    emoji: '🪄',
    title: 'תבניות הקסם',
    steps: [
      'מולך תבנית של סדר פעולות על מספרים',
      'נסה להבין מה הפעולה: ×2? +10? ÷3?',
      'הזן את הערך שמתקבל מיישום התבנית',
      'לחץ "בדיקה" כדי לאשר את התשובה',
    ],
    tip: 'עקוב אחרי הפעולות בסדר -מימין לשמאל!',
  },
  grid: {
    emoji: '📐',
    title: 'מעבדת השטחים',
    steps: [
      'מולך שטח מבוקש -למשל 12 יחידות רבועות',
      'גרור מלבן על הגריד בגודל הנכון',
      'כל משבצת = יחידה אחת',
      'לחץ "בדיקה" כשהשטח תואם',
    ],
    tip: 'שטח מלבן = אורך × רוחב',
  },
  word: {
    emoji: '🧠',
    title: 'שאלות מילוליות',
    steps: [
      'קרא את הסיפור בעיון',
      'מצא את המספרים הרלוונטיים',
      'החלט על פעולה: +, −, ×, ÷',
      'חשב וכתוב את התשובה',
    ],
    tip: 'קרא פעמיים -הפרטים חשובים!',
  },
  multChamp: {
    emoji: '✖️',
    title: 'אלוף הכפל',
    steps: [
      'מולך גריד של כפל -30 שניות!',
      'לחץ על כל משבצת ומלא את התוצאה',
      'ניסה להשלים כמה שיותר בזמן',
      'כל תשובה נכונה מקנה כוכב',
    ],
    tip: 'התחל מהשורות שאתה הכי שולט בהן!',
  },
  percentages: {
    emoji: '📊',
    title: 'מעבדת אחוזים',
    steps: [
      'אחוז = חלק מתוך 100. 50% = חצי, 25% = רבע, 10% = עשירית',
      'בטבלה: למעלה החלק, למטה הסכום המלא. אחד הערכים חסר ("נעלם") -תצטרכו למצוא אותו',
      'החליפו בין × ל-÷ על הקשת הפעילה (בצבע תכלת) -הכיוון חשוב!',
      'החליקו את המספר ברולר כדי לכוון את הגורם, ולחצו "בדיקת תשובה"',
    ],
    tip: 'תקועים? לחצו על 💡 לקבל רמז -הוא נעשה עדין יותר ככל שעולים ברמה!',
  },
};

// ─── SESSION helpers ──────────────────────────────────────────────────────────

const SESSION_KEY  = (g) => `seen_tutorial_${g}`;
const ONBOARD_KEY  = 'seen_onboarding_v1';

export function clearAllTutorials() {
  Object.keys(TUTORIALS).forEach((g) => {
    try { sessionStorage.removeItem(SESSION_KEY(g)); } catch { /* storage blocked */ }
  });
}

// ─── GameTutorial Component ───────────────────────────────────────────────────

export default function GameTutorial({ gameName, onDismiss = () => {} }) {
  const [visible, setVisible] = useState(() => {
    try { return !sessionStorage.getItem(SESSION_KEY(gameName)); } catch { return false; }
  });

  const tutorial = TUTORIALS[gameName];
  if (!visible || !tutorial) return null;

  function dismiss() {
    try { sessionStorage.setItem(SESSION_KEY(gameName), '1'); } catch { /* storage blocked */ }
    setVisible(false);
    onDismiss();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div
        dir="rtl"
        className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden
                   animate-[slide-up_0.3s_ease-out]"
        style={{ animation: 'slideUp .25s ease-out' }}
      >
        <style>{`@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* Header */}
        <div className="bg-gradient-to-l from-indigo-600 to-indigo-800 px-6 py-5 text-white text-right">
          <div className="text-4xl mb-1">{tutorial.emoji}</div>
          <h2 className="text-xl font-black">{tutorial.title}</h2>
          <p className="text-indigo-200 text-xs mt-0.5">איך משחקים?</p>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 space-y-3">
          {tutorial.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="min-w-[28px] h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-black text-sm flex items-center justify-center">
                {i + 1}
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed pt-0.5">
                {step}
              </p>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="mx-6 mb-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl px-4 py-3">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
            💡 טיפ: {tutorial.tip}
          </p>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <button
            onClick={dismiss}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black py-3.5 text-base transition-all active:scale-95"
          >
            בואו נתחיל! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
