import { useEffect, useState } from 'react';
import { Heart, Shield, Zap } from 'lucide-react';

/**
 * Onboarding modal shown to parent on first visit
 * Explains 14-day free trial, no auto-renewal, parent has full control
 */
export default function OnboardingModal({ onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if user already saw this modal
    const seen = localStorage.getItem('hasbaonautica_onboarding_seen');
    if (seen) {
      setIsVisible(false);
      onClose?.();
    }
  }, [onClose]);

  function handleClose() {
    localStorage.setItem('hasbaonautica_onboarding_seen', 'true');
    setIsVisible(false);
    onClose?.();
  }

  if (!isVisible) return null;

  return (
    <div dir="rtl" className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-blue-500 p-8 text-white">
          <div className="text-6xl mb-4 text-center">🎉</div>
          <h1 className="text-3xl font-black text-center">
            ברוכה הבאה!
          </h1>
          <p className="text-center text-indigo-100 mt-2 text-sm">
            חשבונאוטיקה - למידה חכמה לילדים
          </p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Free Trial Section */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Zap className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div className="flex-1">
                <h2 className="font-black text-slate-900 dark:text-white mb-1">14 ימים חינם!</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  התחל עכשיו ללא צורך בכרטיס אשראי. גישה מלאה לכל התכונות.
                </p>
              </div>
            </div>
          </div>

          {/* No Auto-Renewal Section */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Shield className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div className="flex-1">
                <h2 className="font-black text-slate-900 dark:text-white mb-1">אתה בשליטה מלאה</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  🚫 <span className="font-bold">אין חידוש אוטומטי</span><br />
                  🚫 <span className="font-bold">אין הוראות קבע</span><br />
                  אתה תחליט אם ומתי לשלם.
                </p>
              </div>
            </div>
          </div>

          {/* Transparency Section */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Heart className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <div className="flex-1">
                <h2 className="font-black text-slate-900 dark:text-white mb-1">שקיפות מלאה</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  אנחנו לא מעלימים הוצאות. אתה תראה בדיוק כמה עולה וכמה ימים נותרו.
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
              ⏳ מה קורה אחרי?
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-slate-700 dark:text-slate-300"><span className="font-bold">יום 14:</span> תעדכון אזהרה</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-slate-700 dark:text-slate-300"><span className="font-bold">יום 15:</span> אפשרות לשלם</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-slate-700 dark:text-slate-300"><span className="font-bold">אם לא שילמת:</span> החללית עוצרת</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black py-3 px-6 rounded-xl transition-all active:scale-95 text-lg"
          >
            בואו נתחיל! 🚀
          </button>

          {/* Bottom message */}
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            אנחנו כאן כדי לעזור. שאלות? צרו קשר עם התמיכה שלנו 💙
          </p>
        </div>
      </div>
    </div>
  );
}
