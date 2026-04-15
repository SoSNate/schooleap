import { useState, useEffect } from 'react';

export default function GameTutorial({ gameName, level = 1, onDismiss = () => {} }) {
  const [isVisible, setIsVisible] = useState(level === 1);

  useEffect(() => {
    setIsVisible(level === 1);
  }, [level]);

  if (!isVisible) return null;

  const tutorials = {
    magicPatterns: {
      title: '✨ תבניות הקסם',
      instructions: [
        '👁️ הסתכל על הצורות בצד שמאל',
        '🔄 מצא את התבנית שלהן',
        '📋 תקבל משוואה בצד ימין',
        '✅ בחר את הצורה הנכונה להשלמת הסדרה',
      ],
      tips: 'טיפ: חפש דפוס בצבעים, גודל או סוג הצורה',
    },
    grid: {
      title: '📐 מעבדת השטחים',
      instructions: [
        '📦 גרור את המלבן על הגריד',
        '📐 כל משבצת = 1 יחידה',
        '🎯 בנה מלבן בגודל המבוקש',
        '✅ לחץ "בדיקה" כדי לאשר',
      ],
      tips: 'טיפ: זכור את נוסחת השטח: אורך × רוחב',
    },
    balance: {
      title: '⚖️ שומרים על איזון',
      instructions: [
        '⚖️ הנוסחה בצד שמאל חייבת להיות נכונה',
        '⚖️ בנה משוואה בצד ימין שוות ערך',
        '➕➖ תוכל להוסיף/להחסיר משני הצדדים',
        '✅ שמור על האיזון עד סוף!',
      ],
      tips: 'טיפ: עשה אותו דבר לשני הצדדים כדי לשמור על איזון',
    },
  };

  const tutorial = tutorials[gameName];
  if (!tutorial) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-black mb-4 text-center">{tutorial.title}</h2>

        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 mb-6">
          <ul className="space-y-3">
            {tutorial.instructions.map((instruction, i) => (
              <li key={i} className="flex items-start gap-3 text-sm font-bold">
                <span className="text-lg min-w-fit">({i + 1})</span>
                <span className="text-slate-700 dark:text-slate-300">{instruction}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 px-4 py-3 rounded-lg mb-6">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
            💡 {tutorial.tips}
          </p>
        </div>

        <button
          onClick={() => {
            setIsVisible(false);
            onDismiss();
          }}
          className="w-full bg-blue-600 dark:bg-blue-500 text-white rounded-2xl font-black py-3 text-lg hover:bg-blue-700 transition-colors active:scale-95"
        >
          בואו נתחיל! 🚀
        </button>
      </div>
    </div>
  );
}
