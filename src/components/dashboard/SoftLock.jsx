import { useState, useEffect } from 'react';

/**
 * Soft lock screen shown to child when parent's subscription expired
 * Child-friendly messaging - no mention of payment or money
 * Cute animation with spacecraft refueling theme
 */
export default function SoftLock() {
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    // Cycle through animation phases every 2 seconds
    const interval = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const rocketEmoji = ['🚀', '⛽', '🚀'][animationPhase];
  const messageText = [
    'החללית שלנו עוצרת לתדלוק!',
    'אנחנו כבר מתדלקים...',
    'כמעט סיימנו!',
  ][animationPhase];

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-cyan-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Animated Rocket */}
        <div className="text-center mb-8">
          <div className={`text-9xl transition-all duration-500 transform ${
            animationPhase === 0 ? 'scale-100' :
            animationPhase === 1 ? 'scale-110 rotate-3' :
            'scale-100 -rotate-3'
          }`}>
            {rocketEmoji}
          </div>

          {/* Sparkles */}
          <div className="mt-4 flex justify-center gap-2">
            <span className={`text-3xl transition-opacity duration-700 ${animationPhase === 0 ? 'opacity-100' : 'opacity-20'}`}>✨</span>
            <span className={`text-3xl transition-opacity duration-700 ${animationPhase === 1 ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
            <span className={`text-3xl transition-opacity duration-700 ${animationPhase === 2 ? 'opacity-100' : 'opacity-20'}`}>💫</span>
          </div>
        </div>

        {/* Message Box */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center space-y-6 border-2 border-purple-200 dark:border-purple-700">
          {/* Main Message */}
          <div>
            <h1 className={`text-4xl font-black text-slate-900 dark:text-white mb-3 transition-all duration-700 ${
              animationPhase === 1 ? 'scale-110' : 'scale-100'
            }`}>
              {messageText}
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              את/ה עושה עבודה נהדרת!
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">התקדמות הטעינה:</p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
              <div className={`h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 transition-all duration-700 ease-out ${
                animationPhase === 0 ? 'w-1/3' :
                animationPhase === 1 ? 'w-2/3' :
                'w-full'
              }`} />
            </div>
          </div>

          {/* Call to Action */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-2xl mb-3">👨‍👩‍👦</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              קרא להורים שלך!
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              ההורים שלך יוכלים להסדיר את זה בקלות. זה יקח רק דקה.
            </p>
          </div>

          {/* Fun Facts */}
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-widest">
              💡 עובדה재미있는
            </p>
            <p className="text-sm text-purple-900 dark:text-purple-100">
              בזמן שאנחנו בתדלוק, אתה יכול להכין משחקים מומלצים לשיחה עם הוריך!
            </p>
          </div>
        </div>

        {/* Footer Message */}
        <div className="text-center mt-8 text-sm text-slate-600 dark:text-slate-400">
          <p>🎮 כשתחזרו באינטרנט, כל המשחקים שלכם יחכו לכם 🎮</p>
        </div>
      </div>
    </div>
  );
}
