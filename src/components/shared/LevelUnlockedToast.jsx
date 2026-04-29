import { useEffect, useState } from 'react';
import useGameStore from '../../store/useGameStore';
import { getGameColorClasses } from '../../utils/games';

export default function LevelUnlockedToast() {
  const recentUnlock = useGameStore((s) => s.recentUnlock);
  const dismissUnlockToast = useGameStore((s) => s.dismissUnlockToast);
  const [isVisible, setIsVisible] = useState(false);

  // Animate in when unlock appears
  useEffect(() => {
    if (recentUnlock.show) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [recentUnlock.show]);

  if (!recentUnlock.game || !recentUnlock.show) {
    return null;
  }

  // Get game metadata from store (we don't have direct access, so use color token if available)
  // For now, we'll use a generic celebration style
  const colors = getGameColorClasses('blue'); // Default color

  const handleDismiss = () => {
    dismissUnlockToast();
  };

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto transition-all duration-300 ${
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}
    >
      <style>{`
        @keyframes bounce-up {
          0% { transform: translateY(20px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-10px); }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-100%) rotateZ(0deg); opacity: 1; }
          100% { transform: translateY(300px) rotateZ(720deg); opacity: 0; }
        }
        .unlock-toast { animation: bounce-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .confetti { animation: confetti-fall 2.5s ease-out forwards; }
      `}</style>

      {/* Confetti particles */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="confetti fixed pointer-events-none"
          style={{
            left: `calc(50% + ${(Math.random() - 0.5) * 200}px)`,
            top: `calc(50% - 100px)`,
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: ['#FFD700', '#FFA500', '#FF69B4', '#87CEEB'][i % 4],
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}

      {/* Toast card */}
      <div className="unlock-toast bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-2 border-amber-300 dark:border-amber-600 px-8 py-5 max-w-xs text-center">
        <div className="text-5xl mb-2">🎉</div>
        <h2 className="font-black text-lg text-slate-800 dark:text-slate-100 mb-1">
          כל הכבוד!
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          שלב {recentUnlock.step} נפתח לשחק! 🚀
        </p>
        <button
          onClick={handleDismiss}
          className="text-xs font-black px-4 py-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
        >
          בסדר, בואו נשחק!
        </button>
      </div>
    </div>
  );
}
